import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { eq } from "drizzle-orm"
import { DrizzleAuthStore } from "../lib/db/auth-store.ts"
import { sqlStatements } from "../lib/db/statements.ts"
import * as schema from "../lib/db/schema.ts"
import { PLANS } from "../lib/shop/plans.ts"
import { createAuthService } from "../lib/auth/service.ts"
import { MemoryRateLimiter } from "../lib/auth/rate-limit.ts"
import { DrizzleBillingStore } from "../lib/db/billing-store.ts"
import { applyBillingEvent } from "../lib/billing/apply-event.ts"
import { toBillingNotice, readStripeSubscriptionState } from "../lib/billing/stripe-map.ts"

async function database() {
  const client = new PGlite()
  const directory = new URL("../drizzle/", import.meta.url)
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort()
  for (const file of files) {
    const migration = readFileSync(new URL(file, directory), "utf8")
    for (const statement of sqlStatements(migration)) await client.exec(`${statement};`)
  }
  return { client, db: drizzle(client, { schema }) }
}

test("SQL billing reconciles same-second cancellation dates, retries failures and preserves terms", async () => {
  const { client, db } = await database()
  try {
    const [user] = await db.insert(schema.users).values({ email: "billing@example.com" }).returning()
    const store = new DrizzleBillingStore(db)
    const raw = (overrides = {}) => ({
      id: "sub_dates", status: "active", canceled_at: null, cancel_at: null,
      current_period_start: 100, current_period_end: 200,
      metadata: { userId: user.id, planCode: "essential", billingInterval: "month", amountCents: "1900" },
      ...overrides,
    })
    const notice = (id, created, object, type = "customer.subscription.updated") =>
      toBillingNotice({ id, created, type, data: { object } })
    const row = async () => (await db.select().from(schema.subscriptions)
      .where(eq(schema.subscriptions.stripeSubscriptionId, "sub_dates")))[0]
    const first = notice("evt_dates_first", 100, raw())
    assert.equal(await applyBillingEvent(store, first), "applied")
    const scheduled = notice("evt_dates_scheduled", 100, raw({ canceled_at: 101, cancel_at: 200 }))
    // A missing reconciler must leave the event available for retry.
    assert.equal(await applyBillingEvent(store, scheduled), "retry")
    assert.equal(await store.hasEvent(scheduled.id), false)
    assert.equal((await row()).cancelEffectiveAt, null)
    const down = { reconcileSubscription: async () => { throw new Error("temporary outage") } }
    await assert.rejects(() => applyBillingEvent(store, scheduled, down))
    assert.equal(await store.hasEvent(scheduled.id), false)
    assert.equal(await applyBillingEvent(store, scheduled, {
      reconcileSubscription: async () => null,
    }), "retry")
    assert.equal(await applyBillingEvent(store, scheduled, {
      reconcileSubscription: async () => readStripeSubscriptionState(raw({ id: "sub_other" })),
    }), "retry")
    let reads = 0
    const current = raw({ canceled_at: 102, cancel_at: 250, current_period_end: 250 })
    const reconcile = { reconcileSubscription: async (id) => {
      assert.equal(id, "sub_dates")
      reads++
      return readStripeSubscriptionState(current)
    } }
    assert.equal(await applyBillingEvent(store, scheduled, reconcile), "applied")
    let saved = await row()
    assert.equal(reads, 1)
    assert.equal(saved.status, "active")
    assert.equal(saved.cancelRequestedAt.getTime(), 102000)
    assert.equal(saved.cancelEffectiveAt.getTime(), 250000)
    assert.equal(saved.currentPeriodEnd.getTime(), 250000)
    // Replay a stale same-status snapshot: the current Stripe state wins.
    assert.equal(await applyBillingEvent(store, notice("evt_dates_stale", 100, raw()), reconcile), "applied")
    assert.equal((await row()).cancelEffectiveAt.getTime(), 250000)
    assert.equal(await applyBillingEvent(store, scheduled, reconcile), "duplicate")
    assert.equal(reads, 2)
    current.canceled_at = null
    current.cancel_at = null
    await applyBillingEvent(store, notice("evt_dates_undo", 100, raw({ cancel_at: 200 })), reconcile)
    assert.equal((await row()).cancelEffectiveAt, null)
    assert.equal((await row()).cancelRequestedAt, null)
    // Deletion before creation remains retryable and cannot create an ownerless row.
    const deleted = notice("evt_delete_early", 120, { id: "sub_late" }, "customer.subscription.deleted")
    assert.equal(await applyBillingEvent(store, deleted, reconcile), "retry")
    assert.equal(await store.hasEvent(deleted.id), false)
    await applyBillingEvent(store, notice("evt_create_late", 110, raw({ id: "sub_late" })))
    assert.equal(await applyBillingEvent(store, deleted), "applied")
    assert.equal(await applyBillingEvent(store, deleted), "duplicate")
    // Same-second deletion against an existing row must reconcile, including canceled -> canceled.
    const cancel = notice("evt_dates_delete", 100, { id: "sub_dates" }, "customer.subscription.deleted")
    const canceled = { reconcileSubscription: async () => readStripeSubscriptionState(raw({
      status: "canceled", canceled_at: 105, cancel_at: 106,
    })) }
    assert.equal(await applyBillingEvent(store, cancel, canceled), "applied")
    assert.equal(await applyBillingEvent(store, { ...cancel, id: "evt_dates_delete_again" }), "retry")
    assert.equal(await store.hasEvent("evt_dates_delete_again"), false)
    assert.equal(await applyBillingEvent(store, { ...cancel, id: "evt_dates_delete_again" }, canceled), "applied")
    await applyBillingEvent(store, notice("evt_dates_older", 99, raw()), reconcile)
    saved = await row()
    assert.equal(saved.status, "canceled")
    assert.equal(saved.cancelEffectiveAt.getTime(), 106000)
    assert.equal(saved.amountCents, 1900)
    assert.equal(saved.planCode, "essential")
    assert.equal(saved.billingInterval, "month")
    assert.equal(saved.privateOffer, false)
  } finally {
    await client.close()
  }
})

test("migration matches the plan catalog and rejects unsafe prices", async () => {
  const { client } = await database()
  const plans = await client.query("select code, visibility, monthly_amount_cents, yearly_amount_cents from plans order by code")
  assert.deepEqual(
    plans.rows.map((row) => [row.code, row.visibility, row.monthly_amount_cents, row.yearly_amount_cents]),
    PLANS.map((plan) => [plan.code, plan.visibility, plan.monthlyAmountCents, plan.yearlyAmountCents]).sort((a, b) =>
      String(a[0]).localeCompare(String(b[0])),
    ),
  )

  const user = await client.query("insert into users (email) values ('owner@example.com') returning id")
  const userId = user.rows[0].id
  await client.query("insert into projects (user_id, name) values ($1, 'Alpha')", [userId])
  await client.query("insert into projects (user_id, name) values ($1, 'Beta')", [userId])
  await client.query(
    "insert into subscriptions (user_id, plan_code, status, billing_interval, amount_cents, private_offer) values ($1, 'essential', 'active', 'month', 1900, false)",
    [userId],
  )
  await client.query(
    "insert into subscriptions (user_id, plan_code, status, billing_interval, amount_cents, private_offer, commercial_terms) values ($1, 'friend_care', 'active', 'month', 2000, true, 'catalog-v1')",
    [userId],
  )
  const subscriptions = await client.query("select count(*)::int as count from subscriptions where user_id = $1", [userId])
  assert.equal(subscriptions.rows[0].count, 2)
  await assert.rejects(() =>
    client.query(
      "insert into subscriptions (user_id, plan_code, status, billing_interval, amount_cents) values ($1, 'essential', 'active', 'month', 0)",
      [userId],
    ),
  )
  await assert.rejects(() => client.query("insert into users (email) values ('owner@example.com')"))
  await assert.rejects(() =>
    client.query("insert into promotion_codes (code_hash, plan_code) values ('abc', 'essential')"),
  )
  await client.query(
    "insert into promotion_codes (code_hash, plan_code, max_redemptions) values ('hash-host', 'friend_host', 1)",
  )
  await client.query(
    "insert into checkout_sessions (user_id, plan_code, billing_interval, amount_cents, status) values ($1, 'essential', 'month', 1900, 'open')",
    [userId],
  )
  await assert.rejects(() =>
    client.query(
      "insert into checkout_sessions (user_id, plan_code, billing_interval, amount_cents, status) values ($1, 'essential', 'month', 1900, 'open')",
      [userId],
    ),
  )
  await client.close()
})

test("drizzle store consumes one magic link and keeps projects on their owner", async () => {
  const { client, db } = await database()
  const store = new DrizzleAuthStore(db)
  const sent = []
  let now = new Date("2026-11-11T12:00:00.000Z")
  const service = createAuthService({
    store,
    limiter: new MemoryRateLimiter(() => now.getTime()),
    mailer: {
      configured: true,
      async sendMagicLink(to, url) {
        sent.push({ to, url })
      },
    },
    env: {
      authSecret: "database-secret-database-secret-ok",
      appUrl: "http://localhost:3000",
      adminEmails: new Set(["admin@example.com"]),
      mfaKey: Buffer.from("0123456789abcdef0123456789abcdef"),
      secureCookies: false,
    },
    now: () => now,
  })

  await service.requestMagicLink({ email: "owner@example.com", ip: "203.0.113.8" })
  const token = new URL(sent[0].url).searchParams.get("token")
  const session = await service.verifyMagicLink({ token, ip: "203.0.113.8" })
  assert.equal(session.body.role, "client")
  const replay = await service.verifyMagicLink({ token, ip: "203.0.113.8" })
  assert.equal(replay.body.code, "link_invalid")
  await service.createProject({ cookieValue: session.cookie.value, name: "Projet un" })
  await service.createProject({ cookieValue: session.cookie.value, name: "Projet deux" })

  const users = await db.select().from(schema.users).where(eq(schema.users.email, "owner@example.com"))
  assert.equal(users.length, 1)
  assert.equal(users[0].role, "client")
  const projects = await db.select().from(schema.projects).where(eq(schema.projects.userId, users[0].id))
  assert.equal(projects.length, 2)
  const profiles = await db.select().from(schema.customerProfiles).where(eq(schema.customerProfiles.userId, users[0].id))
  assert.equal(profiles.length, 1)
  const links = await db.select().from(schema.magicLinks)
  assert.equal(links.length, 1)
  assert.ok(links[0].consumedAt)
  assert.equal(links[0].tokenHash.includes(token), false)
  await client.close()
})
