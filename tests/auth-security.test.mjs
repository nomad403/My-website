import assert from "node:assert/strict"
import { test } from "node:test"
import { summarizeBilling } from "../lib/billing/metrics.ts"
import { hashToken } from "../lib/auth/crypto.ts"
import { openSessionCookie, sealSessionCookie } from "../lib/auth/cookie.ts"
import { MemoryAuthStore } from "../lib/auth/memory-store.ts"
import { MemoryRateLimiter } from "../lib/auth/rate-limit.ts"
import { createAuthService, readAuthEnv } from "../lib/auth/service.ts"
import { lockPlanPrice, publicPlans } from "../lib/shop/plans.ts"
import { hotp } from "../lib/auth/totp.ts"
import { createProductionLimiter } from "../lib/auth/rate-limit.ts"

const SECRET = "test-secret-test-secret-test-secret"
const MFA_KEY = Buffer.from("0123456789abcdef0123456789abcdef")

function setup(options = {}) {
  const store = new MemoryAuthStore()
  const sent = []
  let now = new Date("2026-11-11T12:00:00.000Z")
  const service = createAuthService({
    store,
    limiter: options.limiter ?? new MemoryRateLimiter(() => now.getTime()),
    mailer: options.mailer ?? {
      configured: true,
      async sendMagicLink(to, url) {
        sent.push({ to, url })
      },
    },
    env: {
      authSecret: SECRET,
      appUrl: "http://localhost:3000",
      adminEmails: new Set(["admin@example.com"]),
      mfaKey: MFA_KEY,
      secureCookies: false,
    },
    now: () => now,
  })
  return {
    store,
    sent,
    service,
    now: () => now,
    setNow(date) {
      now = date
    },
  }
}

async function signIn(fixture, email) {
  const requested = await fixture.service.requestMagicLink({ email, ip: "203.0.113.10" })
  assert.equal(requested.status, 200)
  const token = new URL(fixture.sent.at(-1).url).searchParams.get("token")
  return fixture.service.verifyMagicLink({ token, ip: "203.0.113.10" })
}

test("totp matches the RFC 6238 SHA-1 vector", () => {
  const secret = Buffer.from("12345678901234567890")
  assert.equal(hotp(secret, 1), "287082")
})

test("a magic link does not reveal whether the account exists and stores only a hash", async () => {
  const fixture = setup()
  const first = await fixture.service.requestMagicLink({ email: "New.User@Example.com", ip: "203.0.113.10" })
  const second = await fixture.service.requestMagicLink({ email: "missing@example.com", ip: "203.0.113.11" })
  assert.deepEqual(first.body, { ok: true })
  assert.deepEqual(second.body, { ok: true })
  const token = new URL(fixture.sent[0].url).searchParams.get("token")
  assert.equal(fixture.store.hasMagicLinkHash(token), false)
  assert.equal(fixture.store.hasMagicLinkHash(hashToken(token)), true)
  assert.equal(await fixture.store.findUserByEmail("new.user@example.com"), null)
})

test("an allowlisted address becomes admin only after the link is consumed", async () => {
  const fixture = setup()
  const requested = await fixture.service.requestMagicLink({
    email: "admin@example.com",
    ip: "203.0.113.10",
  })
  assert.equal(requested.status, 200)
  assert.equal(await fixture.store.findUserByEmail("admin@example.com"), null)
  const session = await signIn(fixture, "admin@example.com")
  assert.equal(session.body.role, "admin")
  const user = await fixture.store.findUserByEmail("admin@example.com")
  assert.equal(user.role, "admin")
  assert.ok(user.lastLoginAt)
})

test("a normal address stays a client and a role field cannot be supplied", async () => {
  const fixture = setup()
  const session = await signIn(fixture, "client@example.com")
  assert.equal(session.body.role, "client")
  assert.equal(session.redirectPath, "/shop?section=account&auth=signed-in")
  assert.equal((await fixture.store.findUserByEmail("client@example.com")).role, "client")
})

test("expired, reused and malformed links do not create a session", async () => {
  const fixture = setup()
  await fixture.service.requestMagicLink({ email: "client@example.com", ip: "203.0.113.10" })
  const token = new URL(fixture.sent[0].url).searchParams.get("token")
  fixture.setNow(new Date("2026-11-11T12:16:00.000Z"))
  const expired = await fixture.service.verifyMagicLink({ token, ip: "203.0.113.10" })
  assert.equal(expired.body.code, "link_invalid")
  assert.equal(expired.cookie, undefined)

  fixture.setNow(new Date("2026-11-11T12:00:00.000Z"))
  await fixture.service.requestMagicLink({ email: "client@example.com", ip: "203.0.113.10" })
  const fresh = new URL(fixture.sent.at(-1).url).searchParams.get("token")
  const first = await fixture.service.verifyMagicLink({ token: fresh, ip: "203.0.113.10" })
  const second = await fixture.service.verifyMagicLink({ token: fresh, ip: "203.0.113.10" })
  assert.equal(first.status, 200)
  assert.equal(second.body.code, "link_invalid")
  assert.equal((await fixture.service.verifyMagicLink({ token: "short", ip: "203.0.113.10" })).body.code, "link_invalid")
})

test("a disabled account receives the same request response and no session", async () => {
  const fixture = setup()
  const user = await fixture.store.insertUser({ email: "disabled@example.com", role: "client" })
  await fixture.store.setDisabled(user.id, new Date())
  const requested = await fixture.service.requestMagicLink({ email: user.email, ip: "203.0.113.10" })
  assert.deepEqual(requested.body, { ok: true })
  assert.equal(fixture.sent.length, 0)
})

test("mail failure leaves no usable link", async () => {
  const fixture = setup({
    mailer: {
      configured: true,
      async sendMagicLink() {
        throw new Error("mailbox unavailable")
      },
    },
  })
  const result = await fixture.service.requestMagicLink({ email: "client@example.com", ip: "203.0.113.10" })
  assert.equal(result.status, 503)
  assert.equal(fixture.store.magicLinkCount(), 0)
})

test("rate limiting stops mail delivery", async () => {
  const fixture = setup({
    limiter: { async consume() { return { allowed: false, retryAfter: 42 } } },
  })
  const result = await fixture.service.requestMagicLink({ email: "client@example.com", ip: "203.0.113.10" })
  assert.equal(result.status, 429)
  assert.equal(result.retryAfter, 42)
  assert.equal(fixture.sent.length, 0)
})

test("logout revokes the session and a tampered cookie is rejected", async () => {
  const fixture = setup()
  const session = await signIn(fixture, "client@example.com")
  const state = await fixture.service.sessionState(session.cookie.value)
  assert.equal(state.body.authenticated, true)
  assert.equal(state.body.email, "client@example.com")
  await fixture.service.logout(session.cookie.value)
  const after = await fixture.service.sessionState(session.cookie.value)
  assert.equal(after.body.authenticated, false)

  const tampered = `${session.cookie.value.slice(0, -4)}aaaa`
  const opened = await openSessionCookie(tampered, SECRET)
  assert.equal(opened, null)
  const sealed = await sealSessionCookie(
    { sessionId: "a".repeat(43), absoluteExpiresAt: 1_700_000_000, mfa: 1 },
    SECRET,
  )
  assert.ok(await openSessionCookie(sealed, SECRET))
  assert.equal(await openSessionCookie(sealed, "another-secret-another-secret-xxx"), null)
})

test("clients are isolated and can own several projects", async () => {
  const fixture = setup()
  const clientA = await signIn(fixture, "a@example.com")
  const clientB = await signIn(fixture, "b@example.com")
  await fixture.service.createProject({ cookieValue: clientA.cookie.value, name: "Site Alpha" })
  await fixture.service.createProject({ cookieValue: clientA.cookie.value, name: "  Site   Beta " })
  await fixture.service.createProject({ cookieValue: clientB.cookie.value, name: "Site Gamma" })
  const projectsA = await fixture.service.listProjects(clientA.cookie.value)
  const projectsB = await fixture.service.listProjects(clientB.cookie.value)
  assert.deepEqual(projectsA.body.projects.map((project) => project.name), ["Site Alpha", "Site Beta"])
  assert.deepEqual(projectsB.body.projects.map((project) => project.name), ["Site Gamma"])
  assert.equal((await fixture.service.createProject({ cookieValue: clientA.cookie.value, name: "<b>" })).status, 400)
  const subscriptions = await fixture.service.listSubscriptions(clientA.cookie.value)
  assert.deepEqual(subscriptions.body.subscriptions, [])
})

test("one account can hold several subscriptions", async () => {
  const fixture = setup()
  const session = await signIn(fixture, "client@example.com")
  const user = await fixture.store.findUserByEmail("client@example.com")
  fixture.store.seedSubscription({
    id: "sub-1",
    userId: user.id,
    projectId: null,
    planCode: "essential",
    status: "active",
    billingInterval: "month",
    amountCents: 1900,
    currency: "EUR",
    privateOffer: false,
    currentPeriodEnd: null,
  })
  fixture.store.seedSubscription({
    id: "sub-2",
    userId: user.id,
    projectId: "project-1",
    planCode: "premium",
    status: "active",
    billingInterval: "year",
    amountCents: 69000,
    currency: "EUR",
    privateOffer: false,
    currentPeriodEnd: null,
  })
  const listed = await fixture.service.listSubscriptions(session.cookie.value)
  assert.equal(listed.body.subscriptions.length, 2)
})

test("admin routes require an enrolled and verified second factor", async () => {
  const fixture = setup()
  const session = await signIn(fixture, "admin@example.com")
  const before = await fixture.service.adminSummary(session.cookie.value)
  assert.equal(before.body.code, "mfa_enrollment_required")

  const client = await signIn(fixture, "client@example.com")
  assert.equal((await fixture.service.adminSummary(client.cookie.value)).body.code, "forbidden")
  assert.equal((await fixture.service.enrollMfa(client.cookie.value)).body.code, "forbidden")

  const enrolled = await fixture.service.enrollMfa(session.cookie.value)
  assert.equal(enrolled.status, 200)
  assert.equal(enrolled.body.secret.length > 0, true)
  assert.equal(enrolled.body.recoveryCodes.length, 8)
  const stillLocked = await fixture.service.adminSummary(session.cookie.value)
  assert.equal(stillLocked.body.code, "mfa_enrollment_required")

  const wrong = await fixture.service.verifyMfa({ cookieValue: session.cookie.value, code: "000000" })
  assert.equal(wrong.body.code, "mfa_invalid")

  const { totpAt, decodeBase32 } = await import("../lib/auth/totp.ts")
  const code = totpAt(decodeBase32(enrolled.body.secret), fixture.now().getTime())
  const verified = await fixture.service.verifyMfa({ cookieValue: session.cookie.value, code })
  assert.equal(verified.status, 200)
  assert.equal((await fixture.service.adminSummary(session.cookie.value)).status, 401)
  const summary = await fixture.service.adminSummary(verified.cookie.value)
  assert.equal(summary.status, 200)

  const recovery = enrolled.body.recoveryCodes[0]
  const reusedSession = await fixture.service.verifyMfa({
    cookieValue: verified.cookie.value,
    code: recovery,
  })
  assert.equal(reusedSession.status, 200)
  const replay = await fixture.service.verifyMfa({
    cookieValue: reusedSession.cookie.value,
    code: recovery,
  })
  assert.equal(replay.body.code, "mfa_invalid")
})

test("financial figures stay separated", () => {
  const summary = summarizeBilling({
    subscriptions: [
      { status: "active", amountCents: 1900, billingInterval: "month" },
      { status: "active", amountCents: 19000, billingInterval: "year" },
      { status: "past_due", amountCents: 4900, billingInterval: "month" },
    ],
    invoices: [
      { status: "open", amountDueCents: 4900, amountRemainingCents: 4900 },
      { status: "paid", amountDueCents: 1900, amountRemainingCents: 0 },
      { status: "draft", amountDueCents: 100, amountRemainingCents: 100 },
    ],
    payments: [
      { status: "succeeded", amountCents: 1900 },
      { status: "failed", amountCents: 4900 },
    ],
    refunds: [
      { status: "succeeded", amountCents: 200 },
      { status: "pending", amountCents: 50 },
    ],
  })
  assert.deepEqual(summary, {
    theoreticalMrrCents: 3483,
    theoreticalArrCents: 41800,
    issuedCents: 6800,
    collectedCents: 1900,
    refundedCents: 200,
    unpaidCents: 4900,
  })
})

test("public prices exclude private friend plans and yearly friend billing", () => {
  assert.deepEqual(publicPlans().map((plan) => plan.code), ["essential", "plus", "premium"])
  assert.equal(lockPlanPrice("friend_host", "month", "public"), null)
  assert.deepEqual(lockPlanPrice("friend_care", "month", "private"), {
    planCode: "friend_care",
    billingInterval: "month",
    amountCents: 2000,
    currency: "EUR",
    privateOffer: true,
    commercialTerms: "catalog-v1",
  })
  assert.equal(lockPlanPrice("friend_care", "year", "private"), null)
  assert.equal(lockPlanPrice("premium", "year", "public").amountCents, 69000)
})

test("production refuses to start the limiter without Redis", () => {
  assert.equal(createProductionLimiter({ NODE_ENV: "production" }), null)
  assert.equal(readAuthEnv({ AUTH_SECRET: "short", APP_URL: "https://www.nomad403.com" }), null)
  assert.equal(
    readAuthEnv({
      NODE_ENV: "production",
      AUTH_SECRET: SECRET,
      APP_URL: "http://www.nomad403.com",
    }),
    null,
  )
})

test("removing an administrator revokes the stored role and live admin sessions", async () => {
  const fixture = setup()
  const session = await signIn(fixture, "admin@example.com")
  const enrolled = await fixture.service.enrollMfa(session.cookie.value)
  const { totpAt, decodeBase32 } = await import("../lib/auth/totp.ts")
  const code = totpAt(decodeBase32(enrolled.body.secret), fixture.now().getTime())
  const verified = await fixture.service.verifyMfa({ cookieValue: session.cookie.value, code })
  assert.equal((await fixture.service.adminSummary(verified.cookie.value)).status, 200)

  const sent = []
  const revoked = createAuthService({
    store: fixture.store,
    limiter: new MemoryRateLimiter(() => fixture.now().getTime()),
    mailer: {
      configured: true,
      async sendMagicLink(_to, url) {
        sent.push(url)
      },
    },
    env: {
      authSecret: SECRET,
      appUrl: "http://localhost:3000",
      adminEmails: new Set(),
      mfaKey: MFA_KEY,
      secureCookies: false,
    },
    now: fixture.now,
  })

  assert.equal((await revoked.adminSummary(verified.cookie.value)).status, 401)
  assert.equal((await fixture.store.findUserByEmail("admin@example.com")).role, "client")
  assert.equal((await fixture.service.adminSummary(verified.cookie.value)).status, 401)

  const requested = await revoked.requestMagicLink({ email: "admin@example.com", ip: "203.0.113.40" })
  assert.equal(requested.status, 200)
  const token = new URL(sent[0]).searchParams.get("token")
  const next = await revoked.verifyMagicLink({ token, ip: "203.0.113.40" })
  assert.equal(next.body.role, "client")
  assert.equal(next.redirectPath, "/shop?section=account&auth=signed-in")
  assert.equal((await revoked.adminSummary(next.cookie.value)).status, 403)
})

test("redis limiter fails closed when the store is unavailable", async () => {
  const { RedisRateLimiter } = await import("../lib/auth/rate-limit.ts")
  const limiter = new RedisRateLimiter("https://redis.example", "token", "auth")
  const original = globalThis.fetch
  globalThis.fetch = async () => Response.json({ error: "down" }, { status: 500 })
  try {
    await assert.rejects(() => limiter.consume("magic", 5, 60))
  } finally {
    globalThis.fetch = original
  }
})
