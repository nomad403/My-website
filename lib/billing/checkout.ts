import type { RateLimiter } from "../auth/rate-limit"
import { lockPlanPrice, PLANS, type BillingInterval, type PlanCode } from "../shop/plans"
import type { PaymentGateway } from "./gateway"
import { hashPromotionCode, isPrivatePlan, normalizePromotionCode, privateOfferCopy } from "./promotion"
import type { BillingStore } from "./store"

const OPEN_MS = 30 * 60 * 1000

export type CheckoutResult = { status: number; body: Record<string, unknown> }

function isPlanCode(value: unknown): value is PlanCode {
  return typeof value === "string" && PLANS.some((plan) => plan.code === value)
}

function isInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year"
}

function fail(status: number, code: string, error: string): CheckoutResult {
  const publicCode = ["expired", "disabled", "exhausted", "restricted"].includes(code) ? "invalid" : code
  return { status, body: { ok: false, code: publicCode, error } }
}

export async function previewOffer(
  store: BillingStore,
  input: { code: unknown; email: string; language: string; at: Date },
  protection?: { limiter: RateLimiter; userId: string; clientKey?: string },
): Promise<CheckoutResult> {
  if (protection) {
    try {
      const user = await protection.limiter.consume("promotion-preview:user:" + protection.userId, 30, 3600)
      if (!user.allowed) return fail(429, "rate_limited", "Trop de demandes.")
      if (protection.clientKey && !(await protection.limiter.consume("promotion-preview:client:" + protection.clientKey, 60, 3600)).allowed)
        return fail(429, "rate_limited", "Trop de demandes.")
    } catch { return fail(503, "unavailable", "Service temporairement indisponible.") }
  }
  const code = normalizePromotionCode(input.code)
  if (!code) return fail(400, "invalid", "Ce code n'est pas valable.")
  const preview = await store.previewPromotion({
    codeHash: hashPromotionCode(code),
    email: input.email,
    at: input.at,
  })
  if (!preview.ok) return fail(400, preview.reason, "Ce code n'est pas valable.")
  const copy = privateOfferCopy(preview.planCode, input.language)
  return {
    status: 200,
    body: {
      ok: true,
      planCode: preview.planCode,
      amountCents: preview.amountCents,
      interval: "month",
      name: copy.name,
      summary: copy.summary,
      usageTerms: preview.usageTerms,
    },
  }
}

export async function startCheckout(
  deps: {
    store: BillingStore
    gateway: PaymentGateway
    prices: Partial<Record<PlanCode, Partial<Record<BillingInterval, string>>>>
    limiter?: RateLimiter
    now: () => Date
    appUrl: string
  },
  input: {
    userId: string
    email: string
    planCode: unknown
    interval: unknown
    promotionCode: unknown
  },
): Promise<CheckoutResult> {
  try {
    if (deps.limiter) {
      const decision = await deps.limiter.consume(`checkout:${input.userId}`, 8, 3600)
      if (!decision.allowed) return fail(429, "rate_limited", "Trop de demandes. Réessayez plus tard.")
    }
  } catch {
    return fail(503, "unavailable", "Service temporairement indisponible.")
  }

  const promotionCode = input.promotionCode == null || input.promotionCode === ""
    ? null
    : normalizePromotionCode(input.promotionCode)
  if (input.promotionCode && !promotionCode) return fail(400, "invalid", "Ce code n'est pas valable.")

  let planCode: PlanCode | null = isPlanCode(input.planCode) ? input.planCode : null
  let interval: BillingInterval | null = isInterval(input.interval) ? input.interval : null
  let redemptionId: string | null = null
  let holdReason: string | null = null

  if (promotionCode) {
    const reserved = await deps.store.reservePromotion({
      codeHash: hashPromotionCode(promotionCode),
      userId: input.userId,
      email: input.email,
      at: deps.now(),
    })
    if (!reserved.ok) return fail(400, reserved.reason, "Ce code n'est pas valable.")
    planCode = reserved.planCode
    interval = "month"
    redemptionId = reserved.redemptionId
    holdReason = reserved.holdReason
  }

  if (!planCode || !interval || (isPrivatePlan(planCode) && !redemptionId)) {
    return fail(400, "plan_invalid", "Cette formule n'est pas disponible.")
  }

  const locked = lockPlanPrice(planCode, interval, redemptionId ? "private" : "public")
  if (!locked) {
    if (redemptionId) await deps.store.releasePromotion(redemptionId, deps.now())
    return fail(400, "plan_invalid", "Cette formule n'est pas disponible.")
  }

  const priceId = deps.prices[locked.planCode]?.[locked.billingInterval]
  if (!priceId) {
    if (redemptionId) await deps.store.releasePromotion(redemptionId, deps.now())
    return fail(503, "stripe_unconfigured", "Le paiement n'est pas configuré.")
  }

  const existing = await deps.store.findOpenCheckout(input.userId, locked.planCode, locked.billingInterval)
  if (existing?.stripeSessionId && deps.now().getTime() - existing.createdAt.getTime() >= OPEN_MS) {
    try {
      const status = await deps.gateway.retrieveCheckoutStatus(existing.stripeSessionId)
      if (status === "open" && existing.url) {
        if (redemptionId && redemptionId !== existing.redemptionId) await deps.store.releasePromotion(redemptionId, deps.now())
        return { status: 200, body: { ok: true, url: existing.url, reused: true } }
      }
      if (status !== "expired") return fail(409, "checkout_in_progress", "Synchronisation du paiement en cours.")
    } catch { return fail(503, "unavailable", "Vérification Stripe temporairement indisponible.") }
  }
  if (holdReason) {
    const ageOk = Boolean(existing && deps.now().getTime() - existing.createdAt.getTime() < OPEN_MS)
    if (ageOk && existing?.url && existing.redemptionId === redemptionId) {
      return { status: 200, body: { ok: true, url: existing.url, reused: true } }
    }
    if (ageOk && existing && !existing.url) {
      return fail(409, "checkout_in_progress", "Une souscription est déjà en cours.")
    }
    if (existing) {
      await deps.store.expireCheckout(existing.id)
      if (existing.redemptionId) await deps.store.releasePromotion(existing.redemptionId, deps.now())
    } else if (redemptionId) {
      await deps.store.releasePromotion(redemptionId, deps.now())
    }
    return fail(400, holdReason, "Ce code n'est pas valable.")
  }
  if (existing) {
    const fresh = deps.now().getTime() - existing.createdAt.getTime() < OPEN_MS
    if (fresh && existing.url) {
      if (redemptionId && redemptionId !== existing.redemptionId) {
        await deps.store.releasePromotion(redemptionId, deps.now())
      }
      return { status: 200, body: { ok: true, url: existing.url, reused: true } }
    }
    if (fresh && !existing.url) {
      if (redemptionId && redemptionId !== existing.redemptionId) {
        await deps.store.releasePromotion(redemptionId, deps.now())
      }
      return fail(409, "checkout_in_progress", "Une souscription est déjà en cours.")
    }
    await deps.store.expireCheckout(existing.id)
    if (existing.redemptionId) await deps.store.releasePromotion(existing.redemptionId, deps.now())
    if (promotionCode && redemptionId === existing.redemptionId) {
      const renewed = await deps.store.reservePromotion({
        codeHash: hashPromotionCode(promotionCode), userId: input.userId, email: input.email, at: deps.now(),
      })
      if (!renewed.ok) return fail(400, renewed.reason, "Ce code n'est pas valable.")
      if (renewed.holdReason) return fail(409, "checkout_in_progress", "Une souscription est déjà en cours.")
      redemptionId = renewed.redemptionId
    }
  }

  const begun = await deps.store.beginCheckout({
    userId: input.userId,
    planCode: locked.planCode,
    interval: locked.billingInterval,
    amountCents: locked.amountCents,
    redemptionId,
    at: deps.now(),
  })
  if (!begun.created) {
    if (redemptionId && redemptionId !== begun.checkout.redemptionId) {
      await deps.store.releasePromotion(redemptionId, deps.now())
    }
    if (begun.checkout.url) return { status: 200, body: { ok: true, url: begun.checkout.url, reused: true } }
    return fail(409, "checkout_in_progress", "Une souscription est déjà en cours.")
  }

  try {
    const quoted = await deps.gateway.retrievePrice(priceId)
    if (
      quoted.currency !== "eur" ||
      quoted.unitAmount !== locked.amountCents ||
      quoted.interval !== locked.billingInterval
    ) {
      await deps.store.failCheckout(begun.id)
      if (redemptionId) await deps.store.releasePromotion(redemptionId, deps.now())
      return fail(503, "price_mismatch", "Le tarif Stripe ne correspond pas au catalogue.")
    }

    const customerId = await ensureCustomer(deps, input.userId, input.email)
    const session = await deps.gateway.createSubscriptionCheckout({
      customerId,
      priceId,
      userId: input.userId,
      planCode: locked.planCode,
      interval: locked.billingInterval,
      amountCents: locked.amountCents,
      privateOffer: locked.privateOffer,
      redemptionId,
      successUrl: `${deps.appUrl}/shop?section=subscriptions&checkout=success`,
      cancelUrl: `${deps.appUrl}/shop?section=offers&checkout=cancel`,
      idempotencyKey: `checkout-${begun.id}`,
    })
    await deps.store.attachCheckoutSession(begun.id, session.id, session.url)
    return { status: 200, body: { ok: true, url: session.url } }
  } catch {
    await deps.store.failCheckout(begun.id)
    if (redemptionId) await deps.store.releasePromotion(redemptionId, deps.now())
    return fail(503, "checkout_failed", "Le paiement n'a pas pu être ouvert.")
  }
}

async function ensureCustomer(
  deps: { store: BillingStore; gateway: PaymentGateway },
  userId: string,
  email: string,
) {
  const existing = await deps.store.getStripeCustomerId(userId)
  if (existing) return existing
  const created = await deps.gateway.createCustomer({ email, userId })
  return deps.store.saveStripeCustomerId(userId, email, created.id)
}

export async function startBillingPortal(
  deps: { store: BillingStore; gateway: PaymentGateway; appUrl: string },
  userId: string,
): Promise<CheckoutResult> {
  const customerId = await deps.store.getStripeCustomerId(userId)
  if (!customerId) {
    return fail(409, "portal_unavailable", "Le portail sera disponible après un paiement confirmé.")
  }
  try {
    const session = await deps.gateway.createPortal({
      customerId,
      returnUrl: `${deps.appUrl}/shop?section=billing`,
    })
    return { status: 200, body: { ok: true, url: session.url } }
  } catch {
    return fail(503, "portal_failed", "Le portail de facturation n'a pas pu être ouvert.")
  }
}
