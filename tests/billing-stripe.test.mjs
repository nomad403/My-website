import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import Stripe from "stripe"
import { MemoryAuthStore } from "../lib/auth/memory-store.ts"
import { MemoryRateLimiter } from "../lib/auth/rate-limit.ts"
import { createAuthService } from "../lib/auth/service.ts"
import { applyBillingEvent } from "../lib/billing/apply-event.ts"
import { previewOffer, startBillingPortal, startCheckout } from "../lib/billing/checkout.ts"
import { summarizeBilling } from "../lib/billing/metrics.ts"
import { MemoryBillingStore } from "../lib/billing/memory-store.ts"
import { hashPromotionCode } from "../lib/billing/promotion.ts"
import { readStripeEnv } from "../lib/billing/stripe-env.ts"
import { readStripeSubscriptionState, toBillingNotice } from "../lib/billing/stripe-map.ts"
import { publicPlans } from "../lib/shop/plans.ts"

const NOW = new Date("2026-11-11T12:00:00.000Z")

const PRICES = {
  essential: { month: "price_essential_month", year: "price_essential_year" },
  plus: { month: "price_plus_month", year: "price_plus_year" },
  premium: { month: "price_premium_month", year: "price_premium_year" },
  friend_host: { month: "price_friend_host_month" },
  friend_care: { month: "price_friend_care_month" },
}

const QUOTES = {
  price_essential_month: { unitAmount: 1900, currency: "eur", interval: "month" },
  price_essential_year: { unitAmount: 19000, currency: "eur", interval: "year" },
  price_plus_month: { unitAmount: 4900, currency: "eur", interval: "month" },
  price_plus_year: { unitAmount: 49000, currency: "eur", interval: "year" },
  price_premium_month: { unitAmount: 6900, currency: "eur", interval: "month" },
  price_premium_year: { unitAmount: 69000, currency: "eur", interval: "year" },
  price_friend_host_month: { unitAmount: 1000, currency: "eur", interval: "month" },
  price_friend_care_month: { unitAmount: 2000, currency: "eur", interval: "month" },
}

function fakeGateway(options = {}) {
  const calls = []
  return {
    calls,
    async retrievePrice(id) {
      calls.push({ op: "price", id })
      const quote = QUOTES[id]
      if (!quote) throw new Error("missing price")
      return options.quote ? options.quote(id, quote) : quote
    },
    async createCustomer(input) {
      calls.push({ op: "customer", input })
      return { id: "cus_test" }
    },
    async createSubscriptionCheckout(input) {
      calls.push({ op: "checkout", input })
      if (options.failCheckout) throw new Error("stripe down")
      return { id: `cs_${calls.length}`, url: `https://checkout.stripe.com/c/pay/cs_${calls.length}` }
    },
    async createPortal() {
      calls.push({ op: "portal" })
      return { url: "https://billing.stripe.com/p/session/test" }
    },
  }
}

function world(options = {}) {
  const store = new MemoryBillingStore()
  store.addUser("user-1", "client@example.com")
  store.addUser("user-2", "other@example.com")
  const gateway = fakeGateway(options)
  return {
    store,
    gateway,
    deps: {
      store,
      gateway,
      prices: options.prices ?? PRICES,
      now: () => NOW,
      appUrl: "http://localhost:3000",
    },
  }
}

function addCode(store, code, extras = {}) {
  store.addPromotion({
    codeHash: hashPromotionCode(code),
    planCode: "friend_host",
    expiresAt: null,
    maxRedemptions: null,
    restrictedEmail: null,
    disabledAt: null,
    ...extras,
  })
}

async function figures(store) {
  return summarizeBilling(await store.loadBillingInputs())
}

function subscription(overrides = {}) {
  return {
    stripeSubscriptionId: "sub_1",
    userId: "user-1",
    planCode: "essential",
    status: "active",
    billingInterval: "month",
    amountCents: 1900,
    privateOffer: false,
    currentPeriodStart: NOW,
    currentPeriodEnd: new Date("2026-12-11T12:00:00.000Z"),
    cancelRequestedAt: null,
    cancelEffectiveAt: null,
    ...overrides,
  }
}

function invoice(overrides = {}) {
  return {
    stripeInvoiceId: "in_1",
    userId: "user-1",
    stripeSubscriptionId: "sub_1",
    status: "paid",
    amountDueCents: 1900,
    amountPaidCents: 1900,
    amountRemainingCents: 0,
    currency: "EUR",
    issuedAt: NOW,
    paidAt: NOW,
    ...overrides,
  }
}

function payment(overrides = {}) {
  return {
    stripePaymentIntentId: "pi_1",
    userId: "user-1",
    stripeInvoiceId: "in_1",
    status: "succeeded",
    amountCents: 1900,
    currency: "EUR",
    failureCode: null,
    paidAt: NOW,
    ...overrides,
  }
}

function stripeEnv(overrides = {}) {
  return {
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_PUBLISHABLE_KEY: "pk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    STRIPE_PRICE_ESSENTIAL_MONTHLY: "price_essential_month",
    STRIPE_PRICE_ESSENTIAL_YEARLY: "price_essential_year",
    STRIPE_PRICE_PLUS_MONTHLY: "price_plus_month",
    STRIPE_PRICE_PLUS_YEARLY: "price_plus_year",
    STRIPE_PRICE_PREMIUM_MONTHLY: "price_premium_month",
    STRIPE_PRICE_PREMIUM_YEARLY: "price_premium_year",
    STRIPE_PRICE_FRIEND_HOST_MONTHLY: "price_friend_host_month",
    STRIPE_PRICE_FRIEND_CARE_MONTHLY: "price_friend_care_month",
    ...overrides,
  }
}

test("monthly and yearly checkout use the server price", async () => {
  const { store, gateway, deps } = world()
  const month = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "month",
    promotionCode: null,
    amountCents: 1,
  })
  assert.equal(month.status, 200)
  assert.match(String(month.body.url), /^https:\/\/checkout\.stripe\.com\//)
  const year = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "year",
    promotionCode: null,
  })
  assert.equal(year.status, 200)
  const checkouts = gateway.calls.filter((call) => call.op === "checkout")
  assert.deepEqual(
    checkouts.map((call) => [call.input.planCode, call.input.interval, call.input.amountCents, call.input.priceId]),
    [
      ["essential", "month", 1900, "price_essential_month"],
      ["essential", "year", 19000, "price_essential_year"],
    ],
  )
  assert.equal(checkouts[0].input.successUrl, "http://localhost:3000/shop?section=subscriptions&checkout=success")
  assert.equal(checkouts[0].input.cancelUrl, "http://localhost:3000/shop?section=offers&checkout=cancel")
  assert.equal(store.subscriptions.length, 0)
  assert.equal(gateway.calls.filter((call) => call.op === "customer").length, 1)
  assert.equal(await store.getStripeCustomerId("user-1"), "cus_test")
})

test("a valid private code unlocks the locked monthly price", async () => {
  const { gateway, deps } = world()
  addCode(deps.store, "HOST-2026", { planCode: "friend_host", maxRedemptions: 1 })
  addCode(deps.store, "CARE-2026", { planCode: "friend_care" })
  const host = await previewOffer(deps.store, {
    code: " host-2026 ",
    email: "client@example.com",
    language: "fr",
    at: NOW,
  })
  assert.equal(host.status, 200)
  assert.equal(host.body.amountCents, 1000)
  assert.equal(host.body.planCode, "friend_host")
  assert.equal(publicPlans().some((plan) => plan.code === "friend_host"), false)
  const care = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "year",
    promotionCode: "CARE-2026",
  })
  assert.equal(care.status, 200)
  const created = gateway.calls.find((call) => call.op === "checkout")
  assert.equal(created.input.planCode, "friend_care")
  assert.equal(created.input.interval, "month")
  assert.equal(created.input.amountCents, 2000)
  assert.equal(created.input.privateOffer, true)
})

test("invalid, expired, disabled, exhausted and restricted codes stay closed", async () => {
  const { store, gateway, deps } = world()
  addCode(store, "OLD-CODE", { expiresAt: new Date("2026-01-01T00:00:00.000Z") })
  addCode(store, "STOP-CODE", { disabledAt: NOW })
  addCode(store, "ONCE-CODE", { maxRedemptions: 1 })
  addCode(store, "MINE-CODE", { restrictedEmail: "client@example.com" })
  const cases = [
    ["NO-SUCH", "invalid"],
    ["OLD-CODE", "expired"],
    ["STOP-CODE", "disabled"],
    ["MINE-CODE", "restricted"],
  ]
  for (const [code, reason] of cases) {
    const result = await previewOffer(store, { code, email: "other@example.com", language: "fr", at: NOW })
    assert.equal(result.body.code, reason)
    assert.equal(result.body.planCode, undefined)
  }
  const first = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: "ONCE-CODE",
  })
  assert.equal(first.status, 200)
  const second = await startCheckout(deps, {
    userId: "user-2",
    email: "other@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: "ONCE-CODE",
  })
  assert.equal(second.body.code, "exhausted")
  assert.equal(gateway.calls.filter((call) => call.op === "checkout").length, 1)
  const bare = await startCheckout(deps, {
    userId: "user-2",
    email: "other@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: null,
  })
  assert.equal(bare.body.code, "plan_invalid")
})

test("a repeated checkout reuses the open session", async () => {
  const { gateway, deps } = world()
  const first = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "plus",
    interval: "month",
    promotionCode: null,
  })
  const second = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "plus",
    interval: "month",
    promotionCode: null,
  })
  assert.equal(second.body.reused, true)
  assert.equal(second.body.url, first.body.url)
  assert.equal(gateway.calls.filter((call) => call.op === "checkout").length, 1)
})

test("a mismatched or missing Stripe price opens no session", async () => {
  const mismatch = world({
    quote: () => ({ unitAmount: 1, currency: "eur", interval: "month" }),
  })
  addCode(mismatch.store, "HOST-2026")
  const wrong = await startCheckout(mismatch.deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "month",
    promotionCode: "HOST-2026",
  })
  assert.equal(wrong.body.code, "price_mismatch")
  assert.equal(mismatch.gateway.calls.some((call) => call.op === "checkout"), false)
  const again = await previewOffer(mismatch.store, {
    code: "HOST-2026",
    email: "client@example.com",
    language: "fr",
    at: NOW,
  })
  assert.equal(again.status, 200)

  const missing = world({ prices: { essential: { month: "price_essential_month" } } })
  const unconfigured = await startCheckout(missing.deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "plus",
    interval: "month",
    promotionCode: null,
  })
  assert.equal(unconfigured.body.code, "stripe_unconfigured")
})

test("payment, refusal, deferral, renewal, cancellation and refund stay separated", async () => {
  const { store } = world()
  const activated = toBillingNotice({
    id: "evt_paid",
    type: "checkout.session.completed",
    created: 100,
    data: {
      object: {
        id: "cs_paid",
        payment_status: "paid",
        metadata: { userId: "user-1", redemptionId: "" },
        subscription: {
          id: "sub_paid",
          status: "active",
          metadata: { userId: "user-1", planCode: "essential", billingInterval: "month", amountCents: "1900" },
        },
      },
    },
  })
  assert.equal(await applyBillingEvent(store, activated), "applied")
  assert.equal(store.subscriptions[0].status, "active")
  assert.equal(store.subscriptions[0].amountCents, 1900)

  const deferred = toBillingNotice({
    id: "evt_deferred",
    type: "checkout.session.completed",
    created: 110,
    data: {
      object: {
        id: "cs_wait",
        payment_status: "unpaid",
        metadata: { userId: "user-1" },
        subscription: {
          id: "sub_wait",
          status: "active",
          metadata: { userId: "user-1", planCode: "plus", billingInterval: "month", amountCents: "4900" },
        },
      },
    },
  })
  assert.equal(deferred.paymentSettled, false)
  assert.equal(await applyBillingEvent(store, deferred), "applied")
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_wait").status, "incomplete")

  const issued = toBillingNotice({
    id: "evt_finalized",
    type: "invoice.finalized",
    created: 120,
    data: {
      object: {
        id: "in_wait",
        currency: "eur",
        status: "open",
        amount_due: 4900,
        amount_paid: 0,
        amount_remaining: 4900,
        subscription: "sub_wait",
        metadata: { userId: "user-1" },
        payment_intent: "pi_wait",
      },
    },
  })
  assert.equal(issued.payment, null)
  assert.equal(await applyBillingEvent(store, issued), "applied")

  const settled = toBillingNotice({
    id: "evt_async",
    type: "checkout.session.async_payment_succeeded",
    created: 130,
    data: {
      object: {
        id: "cs_wait",
        payment_status: "paid",
        metadata: { userId: "user-1" },
        subscription: {
          id: "sub_wait",
          status: "active",
          metadata: { userId: "user-1", planCode: "plus", billingInterval: "month", amountCents: "4900" },
        },
      },
    },
  })
  assert.equal(await applyBillingEvent(store, settled), "applied")
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_wait").status, "active")
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_wait").amountCents, 4900)
  await applyBillingEvent(store, {
    id: "evt_wait_paid",
    created: 135,
    type: "invoice.upsert",
    invoice: invoice({
      stripeInvoiceId: "in_wait",
      stripeSubscriptionId: "sub_wait",
      status: "paid",
      amountDueCents: 4900,
      amountPaidCents: 4900,
      amountRemainingCents: 0,
    }),
    payment: payment({ stripePaymentIntentId: "pi_wait", stripeInvoiceId: "in_wait", amountCents: 4900 }),
  })

  await applyBillingEvent(store, {
    id: "evt_invoice_paid",
    created: 140,
    type: "invoice.upsert",
    invoice: invoice({
      stripeInvoiceId: "in_paid",
      stripeSubscriptionId: "sub_paid",
      amountDueCents: 1900,
      amountPaidCents: 1900,
      amountRemainingCents: 0,
    }),
    payment: payment({ stripePaymentIntentId: "pi_paid", stripeInvoiceId: "in_paid", amountCents: 1900 }),
  })
  await applyBillingEvent(store, {
    id: "evt_renewal",
    created: 200,
    type: "invoice.upsert",
    invoice: invoice({
      stripeInvoiceId: "in_renewal",
      stripeSubscriptionId: "sub_paid",
      amountDueCents: 1900,
      amountPaidCents: 1900,
    }),
    payment: payment({ stripePaymentIntentId: "pi_renewal", stripeInvoiceId: "in_renewal", amountCents: 1900 }),
  })
  await applyBillingEvent(store, {
    id: "evt_amount_rewrite",
    created: 210,
    type: "subscription.upsert",
    subscription: subscription({ stripeSubscriptionId: "sub_paid", amountCents: 1, status: "active" }),
  })
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_paid").amountCents, 1900)

  await applyBillingEvent(store, {
    id: "evt_declined",
    created: 220,
    type: "invoice.payment_failed",
    invoice: invoice({
      stripeInvoiceId: "in_fail",
      stripeSubscriptionId: "sub_wait",
      status: "open",
      amountDueCents: 4900,
      amountPaidCents: 0,
      amountRemainingCents: 4900,
      paidAt: null,
    }),
    payment: payment({
      stripePaymentIntentId: "pi_fail",
      stripeInvoiceId: "in_fail",
      status: "failed",
      amountCents: 4900,
      failureCode: "card_declined",
      paidAt: null,
    }),
  })

  const beforeCancel = await figures(store)
  assert.equal(beforeCancel.collectedCents, 8700)
  assert.equal(beforeCancel.refundedCents, 0)
  assert.equal(beforeCancel.unpaidCents, 4900)
  assert.equal(beforeCancel.issuedCents, 4900 + 1900 + 1900 + 4900)
  assert.equal(beforeCancel.theoreticalMrrCents, 1900 + 4900)

  await applyBillingEvent(store, {
    id: "evt_cancel",
    created: 300,
    type: "subscription.deleted",
    stripeSubscriptionId: "sub_paid",
  })
  await applyBillingEvent(store, {
    id: "evt_refund_early",
    created: 310,
    type: "refund.upsert",
    refund: {
      stripeRefundId: "re_1",
      stripePaymentIntentId: "pi_missing",
      status: "succeeded",
      amountCents: 1900,
      currency: "EUR",
    },
  })
  assert.equal(await store.hasEvent("evt_refund_early"), false)
  await applyBillingEvent(store, {
    id: "evt_refund",
    created: 320,
    type: "refund.upsert",
    refund: {
      stripeRefundId: "re_1",
      stripePaymentIntentId: "pi_paid",
      status: "succeeded",
      amountCents: 1900,
      currency: "EUR",
    },
  })

  const after = await figures(store)
  assert.equal(after.theoreticalMrrCents, 4900)
  assert.equal(after.collectedCents, 8700)
  assert.equal(after.refundedCents, 1900)
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_paid").status, "canceled")
  const own = await store.listInvoices("user-1")
  const other = await store.listInvoices("user-2")
  assert.equal(own.length, 4)
  assert.equal(other.length, 0)
  assert.equal(JSON.stringify(own).includes("in_"), false)
})

test("duplicate and older events do not rewrite the newer state", async () => {
  const { store } = world()
  const newer = {
    id: "evt_new",
    created: 500,
    type: "subscription.upsert",
    subscription: subscription({ status: "past_due", amountCents: 1900 }),
  }
  const older = {
    id: "evt_old",
    created: 100,
    type: "subscription.upsert",
    subscription: subscription({ status: "active", amountCents: 1900 }),
  }
  assert.equal(await applyBillingEvent(store, newer), "applied")
  assert.equal(await applyBillingEvent(store, newer), "duplicate")
  assert.equal(await applyBillingEvent(store, older), "applied")
  assert.equal(store.subscriptions.length, 1)
  assert.equal(store.subscriptions[0].status, "past_due")
  const summary = await figures(store)
  assert.equal(summary.theoreticalMrrCents, 0)
})

test("a granted private price stays locked after the code is disabled", async () => {
  const { store } = world()
  addCode(store, "HOST-2026", { maxRedemptions: 1 })
  const reserved = await store.reservePromotion({
    codeHash: hashPromotionCode("HOST-2026"),
    userId: "user-1",
    email: "client@example.com",
    at: NOW,
  })
  await applyBillingEvent(store, {
    id: "evt_private",
    created: 10,
    type: "checkout.completed",
    checkoutId: "cs_private",
    paymentSettled: true,
    redemptionId: reserved.redemptionId,
    subscription: subscription({
      planCode: "friend_host",
      amountCents: 1000,
      privateOffer: true,
    }),
  })
  store.promos[0].disabledAt = NOW
  const blocked = await previewOffer(store, {
    code: "HOST-2026",
    email: "other@example.com",
    language: "en",
    at: NOW,
  })
  assert.equal(blocked.body.code, "disabled")
  await applyBillingEvent(store, {
    id: "evt_private_later",
    created: 20,
    type: "subscription.upsert",
    subscription: subscription({ planCode: "friend_host", amountCents: 1900, privateOffer: true, status: "active" }),
  })
  assert.equal(store.subscriptions[0].amountCents, 1000)
  assert.equal((await figures(store)).theoreticalMrrCents, 1000)
})

test("an unauthenticated client cannot open checkout or another account", async () => {
  const auth = createAuthService({
    store: new MemoryAuthStore(),
    limiter: new MemoryRateLimiter(),
    mailer: { configured: true, async sendMagicLink() {} },
    env: {
      authSecret: "test-secret-test-secret-test-secret",
      appUrl: "http://localhost:3000",
      adminEmails: new Set(),
      mfaKey: null,
      secureCookies: false,
    },
    now: () => NOW,
  })
  const identity = await auth.accountIdentity(null)
  assert.equal(identity.status, 401)
  const route = readFileSync(new URL("../app/api/account/checkout/route.ts", import.meta.url), "utf8")
  assert.equal(route.includes("withAccount"), true)
  assert.equal(route.includes("amountCents"), false)
  const invoices = readFileSync(new URL("../app/api/account/invoices/route.ts", import.meta.url), "utf8")
  assert.equal(invoices.includes("listInvoices(userId)"), true)
  const webhook = readFileSync(new URL("../app/api/stripe/webhook/route.ts", import.meta.url), "utf8")
  assert.equal(webhook.includes("constructStripeEvent"), true)
  assert.equal(webhook.includes("accountIdentity"), false)
})

test("Stripe test configuration rejects live and mixed keys", () => {
  assert.equal(readStripeEnv(stripeEnv())?.live, false)
  assert.equal(
    readStripeEnv(stripeEnv({ STRIPE_SECRET_KEY: "sk_live_example", STRIPE_PUBLISHABLE_KEY: "pk_live_example" })),
    null,
  )
  assert.equal(
    readStripeEnv(
      stripeEnv({
        STRIPE_SECRET_KEY: "sk_live_example",
        STRIPE_PUBLISHABLE_KEY: "pk_live_example",
        STRIPE_ALLOW_LIVE: "true",
      }),
    )?.live,
    true,
  )
  assert.equal(readStripeEnv(stripeEnv({ STRIPE_PUBLISHABLE_KEY: "pk_live_example" })), null)
  assert.equal(readStripeEnv(stripeEnv({ STRIPE_WEBHOOK_SECRET: "not-a-webhook" })), null)
  assert.equal(readStripeEnv(stripeEnv({ STRIPE_PRICE_PLUS_YEARLY: "prod_example" })), null)
})

test("webhook signatures are verified locally", () => {
  const secret = "whsec_test_secret_value"
  const payload = JSON.stringify({
    id: "evt_signature",
    object: "event",
    type: "checkout.session.expired",
    created: 1,
    data: { object: { id: "cs_signature" } },
  })
  const stripe = new Stripe("sk_test_signature_only")
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret })
  const event = stripe.webhooks.constructEvent(payload, header, secret)
  assert.equal(event.id, "evt_signature")
  assert.throws(() => stripe.webhooks.constructEvent(payload, `${header}x`, secret))
  const notice = toBillingNotice(event)
  assert.equal(notice.type, "checkout.expired")
})

test("the billing portal stays closed until a Stripe customer exists", async () => {
  const { store, deps } = world()
  const closed = await startBillingPortal(deps, "user-1")
  assert.equal(closed.body.code, "portal_unavailable")
  await store.saveStripeCustomerId("user-1", "client@example.com", "cus_test")
  const open = await startBillingPortal(deps, "user-1")
  assert.equal(open.status, 200)
  assert.match(String(open.body.url), /^https:\/\/billing\.stripe\.com\//)
})

test("checkout rate limiting and gateway failure release a reserved code", async () => {
  const limited = world()
  limited.deps.limiter = {
    async consume() {
      return { allowed: false, retryAfter: 60 }
    },
  }
  const denied = await startCheckout(limited.deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "month",
    promotionCode: null,
  })
  assert.equal(denied.status, 429)

  const failed = world({ failCheckout: true })
  addCode(failed.store, "HOST-2026", { maxRedemptions: 1 })
  const down = await startCheckout(failed.deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: "HOST-2026",
  })
  assert.equal(down.body.code, "checkout_failed")
  const released = await previewOffer(failed.store, {
    code: "HOST-2026",
    email: "other@example.com",
    language: "fr",
    at: NOW,
  })
  assert.equal(released.status, 200)
})

test("same-second events keep the stored state unless Stripe is reread", async () => {
  const { store } = world()
  await applyBillingEvent(store, {
    id: "evt_first_status",
    created: 100,
    type: "subscription.upsert",
    subscription: subscription({ status: "past_due" }),
  })
  await applyBillingEvent(store, {
    id: "evt_same_second_blind",
    created: 100,
    type: "subscription.upsert",
    subscription: subscription({ status: "active", amountCents: 6900, planCode: "premium" }),
  })
  assert.equal(store.subscriptions[0].status, "past_due")
  assert.equal(store.subscriptions[0].amountCents, 1900)
  assert.equal(store.subscriptions[0].planCode, "essential")

  await assert.rejects(() =>
    applyBillingEvent(
      store,
      {
        id: "evt_same_second_down",
        created: 100,
        type: "subscription.upsert",
        subscription: subscription({ status: "active" }),
      },
      {
        reconcileSubscription: async () => {
          throw new Error("stripe unavailable")
        },
      },
    ),
  )
  assert.equal(await store.hasEvent("evt_same_second_down"), false)
  assert.equal(store.subscriptions[0].status, "past_due")

  await applyBillingEvent(
    store,
    {
      id: "evt_same_second_reconcile",
      created: 100,
      type: "subscription.upsert",
      subscription: subscription({ status: "active", amountCents: 6900, planCode: "premium", privateOffer: false }),
    },
    {
      reconcileSubscription: async () => ({
        stripeSubscriptionId: "sub_1",
        status: "canceled",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelRequestedAt: NOW,
        cancelEffectiveAt: NOW,
      }),
    },
  )
  assert.equal(store.subscriptions[0].status, "canceled")
  assert.equal(store.subscriptions[0].amountCents, 1900)
  assert.equal(store.subscriptions[0].planCode, "essential")
  assert.equal(store.subscriptions[0].privateOffer, false)

  const early = await applyBillingEvent(store, {
    id: "evt_delete_first",
    created: 80,
    type: "subscription.deleted",
    stripeSubscriptionId: "sub_late",
  })
  assert.equal(early, "retry")
  assert.equal(await store.hasEvent("evt_delete_first"), false)
  await applyBillingEvent(store, {
    id: "evt_late_create",
    created: 70,
    type: "subscription.upsert",
    subscription: subscription({ stripeSubscriptionId: "sub_late", status: "active" }),
  })
  assert.equal(await applyBillingEvent(store, {
    id: "evt_delete_first",
    created: 80,
    type: "subscription.deleted",
    stripeSubscriptionId: "sub_late",
  }), "applied")
  assert.equal(store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_late").status, "canceled")
  assert.equal(await applyBillingEvent(store, {
    id: "evt_delete_first",
    created: 80,
    type: "subscription.deleted",
    stripeSubscriptionId: "sub_late",
  }), "duplicate")
})

test("a paid invoice and a succeeded payment survive a same-second replay", async () => {
  const { store } = world()
  await applyBillingEvent(store, {
    id: "evt_open",
    created: 100,
    type: "invoice.upsert",
    invoice: invoice({ status: "open", amountPaidCents: 0, amountRemainingCents: 1900, paidAt: null }),
    payment: null,
  })
  await applyBillingEvent(store, {
    id: "evt_paid_same_second",
    created: 100,
    type: "invoice.upsert",
    invoice: invoice(),
    payment: payment(),
  })
  await applyBillingEvent(store, {
    id: "evt_regress",
    created: 100,
    type: "invoice.payment_failed",
    invoice: invoice({ status: "open", amountPaidCents: 0, amountRemainingCents: 1900, paidAt: null }),
    payment: payment({ status: "failed", failureCode: "card_declined", paidAt: null }),
  })
  await applyBillingEvent(store, {
    id: "evt_paid_same_second",
    created: 100,
    type: "invoice.upsert",
    invoice: invoice(),
    payment: payment(),
  })
  assert.equal(store.invoices[0].status, "paid")
  assert.equal(store.payments.length, 1)
  assert.equal(store.payments[0].status, "succeeded")
  const summary = await figures(store)
  assert.equal(summary.collectedCents, 1900)
  assert.equal(summary.unpaidCents, 0)

  await applyBillingEvent(store, {
    id: "evt_refund_ok",
    created: 110,
    type: "refund.upsert",
    refund: { stripeRefundId: "re_tie", stripePaymentIntentId: "pi_1", status: "succeeded", amountCents: 1900, currency: "EUR" },
  })
  await applyBillingEvent(store, {
    id: "evt_refund_tie",
    created: 110,
    type: "refund.upsert",
    refund: { stripeRefundId: "re_tie", stripePaymentIntentId: "pi_1", status: "pending", amountCents: 1, currency: "EUR" },
  })
  assert.equal(store.refunds[0].status, "succeeded")
  assert.equal(store.refunds[0].amountCents, 1900)
  assert.equal((await figures(store)).refundedCents, 1900)
  assert.equal((await figures(store)).collectedCents, 1900)
})

test("private-code bypasses and a portal price change keep the contractual price", async () => {
  let now = new Date("2026-11-11T12:00:00.000Z")
  const { store, gateway, deps } = world()
  deps.now = () => now
  addCode(store, "HOST-2026", {
    maxRedemptions: 1,
    expiresAt: new Date("2026-11-11T12:10:00.000Z"),
  })
  const opened = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "essential",
    interval: "year",
    promotionCode: "HOST-2026",
  })
  assert.equal(opened.status, 200)
  const otherPlan = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "plus",
    interval: "month",
    promotionCode: null,
  })
  assert.equal(otherPlan.status, 200)
  const stranger = await startCheckout(deps, {
    userId: "user-2",
    email: "other@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: "HOST-2026",
  })
  assert.equal(stranger.body.code, "exhausted")
  now = new Date("2026-11-11T12:20:00.000Z")
  const reused = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "premium",
    interval: "year",
    promotionCode: "HOST-2026",
  })
  assert.equal(reused.body.reused, true)
  assert.equal(reused.body.url, opened.body.url)
  now = new Date("2026-11-11T13:00:00.000Z")
  const expired = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "friend_host",
    interval: "month",
    promotionCode: "HOST-2026",
  })
  assert.equal(expired.body.code, "expired")
  assert.equal(gateway.calls.filter((call) => call.op === "checkout").length, 2)

  addCode(store, "CARE-ONCE", { planCode: "friend_care", maxRedemptions: 1, restrictedEmail: "client@example.com" })
  const care = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "friend_care",
    interval: "year",
    promotionCode: "CARE-ONCE",
  })
  assert.equal(care.status, 200)
  const careRedemption = store.redemptions.find((item) => item.userId === "user-1" && item.status === "reserved")
  await applyBillingEvent(store, {
    id: "evt_care",
    created: 400,
    type: "checkout.completed",
    checkoutId: "cs_care",
    paymentSettled: true,
    redemptionId: careRedemption.id,
    subscription: subscription({
      stripeSubscriptionId: "sub_care",
      planCode: "friend_care",
      amountCents: 2000,
      privateOffer: true,
    }),
  })
  assert.equal(await applyBillingEvent(store, {
    id: "evt_care",
    created: 400,
    type: "checkout.completed",
    checkoutId: "cs_care",
    paymentSettled: true,
    redemptionId: careRedemption.id,
    subscription: subscription({ stripeSubscriptionId: "sub_care", planCode: "friend_care", amountCents: 2000, privateOffer: true }),
  }), "duplicate")
  const again = await startCheckout(deps, {
    userId: "user-2",
    email: "other@example.com",
    planCode: "friend_care",
    interval: "month",
    promotionCode: "CARE-ONCE",
  })
  assert.equal(again.body.code, "restricted")
  const ownerAgain = await startCheckout(deps, {
    userId: "user-1",
    email: "client@example.com",
    planCode: "friend_care",
    interval: "month",
    promotionCode: "CARE-ONCE",
  })
  assert.equal(ownerAgain.body.code, "exhausted")
  assert.equal(store.subscriptions.filter((item) => item.planCode === "friend_care").length, 1)

  const portal = toBillingNotice({
    id: "evt_portal",
    type: "customer.subscription.updated",
    created: 500,
    data: {
      object: {
        id: "sub_care",
        status: "active",
        metadata: {
          userId: "user-1",
          planCode: "friend_care",
          billingInterval: "month",
          amountCents: "2000",
          privateOffer: "1",
        },
        items: { data: [{ price: { unit_amount: 6900, recurring: { interval: "year" } }, current_period_end: 1 }] },
      },
    },
  })
  assert.equal(portal.subscription.amountCents, 2000)
  assert.equal(portal.subscription.planCode, "friend_care")
  assert.equal(portal.subscription.billingInterval, "month")
  await applyBillingEvent(store, portal)
  const cared = store.subscriptions.find((item) => item.stripeSubscriptionId === "sub_care")
  assert.equal(cared.amountCents, 2000)
  assert.equal(cared.planCode, "friend_care")
  assert.equal(cared.billingInterval, "month")
  assert.equal(cared.privateOffer, true)
  assert.equal(readStripeSubscriptionState({ id: "sub_care", status: "canceled" }).status, "canceled")
})
