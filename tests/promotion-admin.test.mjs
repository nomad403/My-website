import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { eq } from "drizzle-orm"
import * as schema from "../lib/db/schema.ts"
import { sqlStatements } from "../lib/db/statements.ts"
import { DrizzleBillingStore } from "../lib/db/billing-store.ts"
import { DrizzlePromotionAdminStore } from "../lib/db/promotion-admin-store.ts"
import { administerPromotions, generatePromotionCode } from "../lib/billing/promotion-admin.ts"
import { hashPromotionCode } from "../lib/billing/promotion.ts"
import { MemoryRateLimiter } from "../lib/auth/rate-limit.ts"
import { applyBillingEvent } from "../lib/billing/apply-event.ts"

const NOW = new Date("2026-11-11T12:00:00Z")
async function fixture() {
  const client = new PGlite()
  for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter(f => f.endsWith(".sql")).sort()) {
    for (const statement of sqlStatements(readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"))) await client.exec(statement)
  }
  const db = drizzle(client, { schema })
  const people = await db.insert(schema.users).values([
    { email: "admin@example.com", role: "admin" }, { email: "a@example.com" }, { email: "b@example.com" },
  ]).returning()
  const store = new DrizzlePromotionAdminStore(db)
  const billing = new DrizzleBillingStore(db)
  const deps = { store, limiter: new MemoryRateLimiter(), now: () => NOW,
    authorize: async () => ({ status: 200, body: { userId: people[0].id } }) }
  const create = (code, extra = {}) => administerPromotions(deps, null, "create", {
    mode: "manual", code, planCode: "friend_host", ...extra,
  })
  const reserve = (code, person = people[1], at = NOW) => billing.reservePromotion({
    codeHash: hashPromotionCode(code), userId: person.id, email: person.email, at,
  })
  return { client, db, people, store, billing, deps, create, reserve }
}
async function withFixture(run) { const f = await fixture(); try { await run(f) } finally { await f.client.close() } }

test("migration splitter supports dollar bodies, quotes, comments and rejects truncated SQL", () => {
  const input = "-- comment;\nCREATE FUNCTION f() RETURNS void LANGUAGE plpgsql AS $x$ BEGIN PERFORM 'a;b'; END; $x$;\nSELECT 'it''s;ok';"
  assert.equal(sqlStatements(input).length, 2)
  assert.throws(() => sqlStatements("select $broken$ x"))
})

test("automatic codes are cryptographically generated, normalized and unique", async () => {
  const codes = new Set(Array.from({ length: 1000 }, generatePromotionCode))
  assert.equal(codes.size, 1000)
  assert.ok([...codes].every(code => /^NOMAD-[A-F0-9]{24}$/.test(code)))
  await withFixture(async f => {
    const result = await administerPromotions(f.deps, null, "create", { mode: "auto", planCode: "friend_care" })
    assert.equal(result.status, 201)
    const [row] = await f.db.select().from(schema.promotionCodes)
    assert.equal(row.codeHash, hashPromotionCode(result.body.code))
    assert.equal(row.codeHint, result.body.code.slice(-4))
    assert.ok(row.usageTerms.includes("1 hour"))
    const listed = await administerPromotions(f.deps, null, "list", {})
    assert.equal(JSON.stringify(listed).includes(result.body.code), false)
    assert.equal(JSON.stringify(listed).includes(row.codeHash), false)
  })
})

test("manual codes normalize and duplicate inserts are rejected under concurrent callers", () => withFixture(async f => {
  const results = await Promise.all([f.create("  hello - 2026  "), f.create("HELLO-2026")])
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409])
  assert.equal((await f.db.select().from(schema.promotionCodes)).length, 1)
}))

test("strict input refuses arbitrary prices, unknown offers, invalid limits and immutable changes", () => withFixture(async f => {
  for (const extra of [
    { amountCents: 1 }, { code: "CODE\'; DROP TABLE users;--" }, { planCode: "essential" }, { planCode: "made_up" }, { maxRedemptions: 0 },
    { maxRedemptions: 1.5 }, { expiresAt: "bad" }, { expiresAt: "2020-01-01T00:00:00Z" },
    { restrictedEmail: "not-an-email" }, { restrictedEmail: false }, { internalNotes: "x".repeat(2001) },
  ]) assert.equal((await f.create("VALID-2026", extra)).status, 400)
  const result = await f.create("VALID-2026")
  assert.equal((await administerPromotions(f.deps, null, "change", { planCode: "friend_care" }, result.body.id)).status, 400)
  await assert.rejects(() => f.db.update(schema.promotionCodes).set({ planCode: "friend_care" }).where(eq(schema.promotionCodes.id, result.body.id)))
}))

test("expired codes cannot create new reservations", () => withFixture(async f => {
  await f.create("EXPIRE-2026", { expiresAt: "2026-11-12T00:00:00Z" })
  assert.equal((await f.reserve("EXPIRE-2026", f.people[1], new Date("2026-11-13T00:00:00Z"))).reason, "expired")
}))

test("disabled codes block new reservations while existing reservations remain held", () => withFixture(async f => {
  const created = await f.create("DISABLE-2026")
  const existing = await f.reserve("DISABLE-2026")
  assert.equal(existing.ok, true)
  assert.equal(await f.store.change(created.body.id, f.people[0].id, { disable: true }), true)
  const reused = await f.reserve("DISABLE-2026")
  assert.equal(reused.redemptionId, existing.redemptionId)
  assert.equal(reused.holdReason, "disabled")
  assert.equal((await f.reserve("DISABLE-2026", f.people[2])).reason, "disabled")
  await assert.rejects(() => f.db.update(schema.promotionCodes).set({ disabledAt: null }).where(eq(schema.promotionCodes.id, created.body.id)))
}))

test("code restricted to a normalized client email rejects another account", () => withFixture(async f => {
  await f.create("CLIENT-2026", { restrictedEmail: " A@EXAMPLE.COM " })
  assert.equal((await f.reserve("CLIENT-2026", f.people[2])).reason, "restricted")
  assert.equal((await f.reserve("CLIENT-2026")).ok, true)
}))

test("concurrent reservation attempts cannot exceed a one-use code", () => withFixture(async f => {
  await f.create("SINGLE-2026", { maxRedemptions: 1 })
  const results = await Promise.all(f.people.slice(1).map(p => f.reserve("SINGLE-2026", p)))
  assert.equal(results.filter(r => r.ok).length, 1)
  assert.equal(results.filter(r => r.reason === "exhausted").length, 1)
  const [code] = await f.db.select().from(schema.promotionCodes)
  assert.equal(code.redemptionCount, 1)
  const reused = await f.reserve("SINGLE-2026", f.people[1])
  assert.equal(reused.ok, true)
  assert.equal((await f.db.select().from(schema.promotionRedemptions)).length, 1)
}))

test("reservation release is atomic and idempotent, and frees capacity", () => withFixture(async f => {
  await f.create("RELEASE-2026", { maxRedemptions: 1 })
  const reserved = await f.reserve("RELEASE-2026")
  await Promise.all([f.billing.releasePromotion(reserved.redemptionId, NOW), f.billing.releasePromotion(reserved.redemptionId, NOW)])
  assert.equal((await f.db.select().from(schema.promotionCodes))[0].redemptionCount, 0)
  assert.equal((await f.reserve("RELEASE-2026", f.people[2])).ok, true)
  const logs = await f.db.select().from(schema.auditLogs).where(eq(schema.auditLogs.action, "promotion.released"))
  assert.equal(logs.length, 1)
}))

test("settled webhook consumes once and associates subscription and immutable terms", () => withFixture(async f => {
  const created = await f.create("SETTLED-2026", { maxRedemptions: 1, usageTerms: "Reserved for a specific project." })
  const reservation = await f.reserve("SETTLED-2026")
  const snapshot = {
    stripeSubscriptionId: "sub_private", userId: f.people[1].id, planCode: "friend_host",
    status: "active", billingInterval: "month", amountCents: 1000, privateOffer: true,
    currentPeriodStart: NOW, currentPeriodEnd: new Date("2026-12-11T12:00:00Z"),
    cancelRequestedAt: null, cancelEffectiveAt: null, promotionRedemptionId: reservation.redemptionId,
  }
  const notice = { id: "evt_private_paid", created: 100, type: "checkout.completed",
    checkoutId: "cs_private", redemptionId: reservation.redemptionId, paymentSettled: true, subscription: snapshot }
  const pending = { ...notice, id: "evt_private_pending", created: 99, paymentSettled: false }
  await applyBillingEvent(f.billing, pending)
  assert.equal((await f.db.select().from(schema.promotionRedemptions))[0].status, "reserved")
  assert.equal(await applyBillingEvent(f.billing, notice), "applied")
  assert.equal(await applyBillingEvent(f.billing, notice), "duplicate")
  assert.equal((await f.db.select().from(schema.promotionRedemptions))[0].status, "consumed")
  await f.store.change(created.body.id, f.people[0].id, { disable: true })
  await applyBillingEvent(f.billing, { type: "subscription.upsert", id: "evt_private_update", created: 101,
    subscription: { ...snapshot, planCode: "friend_care", amountCents: 2000 } })
  const [subscription] = await f.db.select().from(schema.subscriptions)
  assert.equal(subscription.amountCents, 1000)
  assert.equal(subscription.planCode, "friend_host")
  assert.equal(subscription.promotionRedemptionId, reservation.redemptionId)
  assert.ok(subscription.commercialTerms.includes("Reserved for a specific project."))
  const detail = await f.store.detail(created.body.id)
  assert.equal(detail.reservations[0].subscriptionId, subscription.id)
  assert.equal((await f.store.list(50, 0))[0].consumed, 1)
  assert.equal((await f.store.list(50, 0))[0].reserved, 0)
  assert.equal(detail.history.filter(e => e.action === "promotion.consumed").length, 1)
  await f.billing.releasePromotion(reservation.redemptionId, NOW)
  assert.equal((await f.db.select().from(schema.promotionCodes))[0].redemptionCount, 1)
}))

test("private subscription cannot link another client's redemption", () => withFixture(async f => {
  await f.create("OWNER-2026")
  const grant = await f.reserve("OWNER-2026")
  const saved = await f.billing.upsertSubscription({
    stripeSubscriptionId: "sub_wrong_owner", userId: f.people[2].id, planCode: "friend_host",
    status: "active", billingInterval: "month", amountCents: 1000, privateOffer: true,
    currentPeriodStart: NOW, currentPeriodEnd: NOW, cancelRequestedAt: null, cancelEffectiveAt: null,
    promotionRedemptionId: grant.redemptionId,
  }, 100)
  assert.equal(saved, "missing_user")
  assert.equal((await f.db.select().from(schema.subscriptions)).length, 0)
}))

test("legacy script inserts remain valid and original hashes need no migration", () => withFixture(async f => {
  await f.db.insert(schema.promotionCodes).values({ codeHash: hashPromotionCode("LEGACY-2026"), planCode: "friend_care" })
  assert.equal((await f.reserve("LEGACY-2026")).ok, true)
  const list = await f.store.list(50, 0)
  const detail = await f.store.detail(list[0].id)
  assert.equal(detail.legacy, true)
  assert.equal(list[0].codeHint, null)
}))

test("administrative history records creation, notes and disable exactly once", () => withFixture(async f => {
  const result = await f.create("AUDIT-2026")
  await f.store.change(result.body.id, f.people[0].id, { internalNotes: "Private operator note.", disable: true })
  await f.store.change(result.body.id, f.people[0].id, { disable: true })
  const detail = await f.store.detail(result.body.id)
  assert.deepEqual(detail.history.map(e => e.action).sort(), ["promotion.created", "promotion.disabled", "promotion.notes_updated"])
  assert.ok(detail.history.every(e => e.actorId === f.people[0].id))
  const logs = JSON.stringify(await f.db.select().from(schema.auditLogs))
  assert.equal(logs.includes("AUDIT-2026"), false)
  assert.equal(logs.includes("Private operator note."), false)
  assert.equal(logs.includes(hashPromotionCode("AUDIT-2026")), false)
}))

test("failure writing the audit rolls back the mutation", () => withFixture(async f => {
  const result = await f.create("ATOMIC-2026")
  await f.client.exec("CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END; $$; CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_audit();")
  await assert.rejects(() => f.store.change(result.body.id, f.people[0].id, { disable: true }))
  assert.equal((await f.db.select().from(schema.promotionCodes))[0].disabledAt, null)
}))

test("creation flood and limiter failure are rejected before persistence", () => withFixture(async f => {
  const limited = { ...f.deps, limiter: { consume: async () => ({ allowed: false, retryAfter: 3600 }) } }
  assert.equal((await administerPromotions(limited, null, "create", { mode: "auto", planCode: "friend_host" })).status, 429)
  limited.limiter.consume = async () => { throw new Error("offline") }
  assert.equal((await administerPromotions(limited, null, "create", { mode: "auto", planCode: "friend_host" })).status, 503)
  assert.equal((await f.db.select().from(schema.promotionCodes)).length, 0)
}))

test("invalid IDs, mutable notes limits and pagination are strictly validated", () => withFixture(async f => {
  assert.equal((await administerPromotions(f.deps, null, "detail", {}, "' OR 1=1")).status, 400)
  assert.equal((await administerPromotions(f.deps, null, "list", { offset: -1 })).status, 400)
  assert.equal((await administerPromotions(f.deps, null, "change", { disable: false }, f.people[0].id)).status, 400)
  assert.equal((await administerPromotions(f.deps, null, "change", { internalNotes: "x".repeat(2001) }, f.people[0].id)).status, 400)
}))

test("migration upgrades pre-Lot-4 rows without changing codes, reservations or contractual prices", async () => {
  const client = new PGlite()
  try {
    for (const name of ["0001_foundations.sql", "0002_stripe.sql"]) {
      for (const statement of sqlStatements(readFileSync(new URL("../drizzle/" + name, import.meta.url), "utf8"))) await client.exec(statement)
    }
    const user = (await client.query("insert into users(email) values ('legacy@example.com') returning id")).rows[0]
    const code = (await client.query("insert into promotion_codes(code_hash, plan_code, max_redemptions, redemption_count) values ($1, 'friend_host', 1, 1) returning id", [hashPromotionCode("OLD-SAFE-2026")])).rows[0]
    const redemption = (await client.query("insert into promotion_redemptions(promotion_code_id,user_id,status) values ($1,$2,'consumed') returning id", [code.id, user.id])).rows[0]
    await client.query("insert into subscriptions(user_id,plan_code,status,billing_interval,amount_cents,private_offer,commercial_terms,stripe_subscription_id) values ($1,'friend_host','active','month',1000,true,'original-terms','sub_legacy')", [user.id])
    const before = (await client.query("select amount_cents, commercial_terms, status from subscriptions")).rows
    await client.transaction(async tx => {
      for (const statement of sqlStatements(readFileSync(new URL("../drizzle/0003_promotion_admin.sql", import.meta.url), "utf8"))) await tx.exec(statement)
    })
    assert.deepEqual((await client.query("select amount_cents, commercial_terms, status from subscriptions")).rows, before)
    const db = drizzle(client, { schema })
    const billing = new DrizzleBillingStore(db)
    const preview = await billing.previewPromotion({ codeHash: hashPromotionCode("OLD-SAFE-2026"), email: user.email, at: NOW })
    assert.equal(preview.reason, "exhausted")
    assert.equal((await db.select().from(schema.promotionRedemptions))[0].id, redemption.id)
    assert.equal((await db.select().from(schema.promotionCodes))[0].codeHash, hashPromotionCode("OLD-SAFE-2026"))
    assert.equal((await db.select().from(schema.auditLogs)).length, 0)
  } finally { await client.close() }
})
test("only authorized private preview contains usage terms, never internal operator notes", () => withFixture(async f => {
  await f.create("TERMS-2026", { restrictedEmail: "a@example.com", usageTerms: "A dedicated site.", internalNotes: "Operator-only note." })
  const preview = await f.billing.previewPromotion({ codeHash: hashPromotionCode("TERMS-2026"), email: "a@example.com", at: NOW })
  assert.equal(preview.ok, true)
  assert.ok(preview.usageTerms.includes("A dedicated site."))
  assert.equal(JSON.stringify(preview).includes("Operator-only"), false)
  assert.equal((await f.billing.previewPromotion({ codeHash: hashPromotionCode("TERMS-2026"), email: "b@example.com", at: NOW })).ok, false)
}))

test("real creation quota stops the twenty-first creation without another store call", async () => {
  let writes = 0
  const deps = {
    authorize: async () => ({ status: 200, body: { userId: "admin-quota" } }),
    store: { create: async () => { writes++; return { id: "created" } } },
    limiter: new MemoryRateLimiter(), now: () => NOW,
  }
  for (let i = 0; i < 20; i++) assert.equal((await administerPromotions(deps, null, "create", { mode: "auto", planCode: "friend_host" })).status, 201)
  assert.equal((await administerPromotions(deps, null, "create", { mode: "auto", planCode: "friend_host" })).status, 429)
  assert.equal(writes, 20)
})
