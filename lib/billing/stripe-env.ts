import type { BillingInterval, PlanCode } from "../shop/plans"

export type StripePriceMap = Record<PlanCode, Partial<Record<BillingInterval, string>>>

export type StripeEnv = {
  secretKey: string
  publishableKey: string
  webhookSecret: string
  live: boolean
  prices: StripePriceMap
}

const PRICE_ENV: Record<PlanCode, Partial<Record<BillingInterval, string>>> = {
  essential: { month: "STRIPE_PRICE_ESSENTIAL_MONTHLY", year: "STRIPE_PRICE_ESSENTIAL_YEARLY" },
  plus: { month: "STRIPE_PRICE_PLUS_MONTHLY", year: "STRIPE_PRICE_PLUS_YEARLY" },
  premium: { month: "STRIPE_PRICE_PREMIUM_MONTHLY", year: "STRIPE_PRICE_PREMIUM_YEARLY" },
  friend_host: { month: "STRIPE_PRICE_FRIEND_HOST_MONTHLY" },
  friend_care: { month: "STRIPE_PRICE_FRIEND_CARE_MONTHLY" },
}

function priceId(source: NodeJS.ProcessEnv, name: string) {
  const value = source[name]?.trim() ?? ""
  return value.startsWith("price_") ? value : null
}

/**
 * Refuse une clé live tant que STRIPE_ALLOW_LIVE n'est pas exactement "true".
 * Une clé secrète et une clé publique de modes différents sont refusées.
 */
export function readStripeEnv(source: NodeJS.ProcessEnv = process.env): StripeEnv | null {
  const secretKey = source.STRIPE_SECRET_KEY?.trim() ?? ""
  const publishableKey = source.STRIPE_PUBLISHABLE_KEY?.trim() ?? ""
  const webhookSecret = source.STRIPE_WEBHOOK_SECRET?.trim() ?? ""
  const liveSecret = secretKey.startsWith("sk_live_")
  const livePublishable = publishableKey.startsWith("pk_live_")
  const testSecret = secretKey.startsWith("sk_test_")
  const testPublishable = publishableKey.startsWith("pk_test_")
  if (liveSecret !== livePublishable) return null
  if (!((liveSecret && livePublishable) || (testSecret && testPublishable))) return null
  if ((liveSecret || livePublishable) && source.STRIPE_ALLOW_LIVE !== "true") return null
  if (!webhookSecret.startsWith("whsec_")) return null

  const prices = {
    essential: {},
    plus: {},
    premium: {},
    friend_host: {},
    friend_care: {},
  } as StripePriceMap

  for (const [plan, intervals] of Object.entries(PRICE_ENV) as Array<
    [PlanCode, Partial<Record<BillingInterval, string>>]
  >) {
    for (const [interval, envName] of Object.entries(intervals) as Array<[BillingInterval, string]>) {
      const id = priceId(source, envName)
      if (!id) return null
      prices[plan][interval] = id
    }
  }

  return { secretKey, publishableKey, webhookSecret, live: liveSecret, prices }
}
