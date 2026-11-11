/**
 * Catalogue des abonnements récurrents du Shop.
 * Distinct du catalogue Expertise (`lib/specialist`), qui décrit les prestations de création.
 * Le montant copié sur un abonnement reste celui de la souscription : ce catalogue ne le réécrit pas.
 */

export const COMMERCIAL_TERMS = "catalog-v1"

export const PLANS = [
  {
    code: "essential",
    visibility: "public",
    monthlyAmountCents: 1900,
    yearlyAmountCents: 19000,
  },
  {
    code: "plus",
    visibility: "public",
    monthlyAmountCents: 4900,
    yearlyAmountCents: 49000,
  },
  {
    code: "premium",
    visibility: "public",
    monthlyAmountCents: 6900,
    yearlyAmountCents: 69000,
  },
  {
    code: "friend_host",
    visibility: "private",
    monthlyAmountCents: 1000,
    yearlyAmountCents: null,
  },
  {
    code: "friend_care",
    visibility: "private",
    monthlyAmountCents: 2000,
    yearlyAmountCents: null,
  },
] as const

export type PlanCode = (typeof PLANS)[number]["code"]
export type PlanVisibility = "public" | "private"
export type BillingInterval = "month" | "year"

export type LockedPrice = {
  planCode: PlanCode
  billingInterval: BillingInterval
  amountCents: number
  currency: "EUR"
  privateOffer: boolean
  commercialTerms: typeof COMMERCIAL_TERMS
}

export function publicPlans() {
  return PLANS.filter((plan) => plan.visibility === "public")
}

export function lockPlanPrice(
  code: PlanCode,
  interval: BillingInterval,
  audience: PlanVisibility,
): LockedPrice | null {
  const plan = PLANS.find((item) => item.code === code)
  if (!plan || plan.visibility !== audience) return null
  const amountCents = interval === "year" ? plan.yearlyAmountCents : plan.monthlyAmountCents
  if (amountCents == null) return null
  return {
    planCode: plan.code,
    billingInterval: interval,
    amountCents,
    currency: "EUR",
    privateOffer: plan.visibility === "private",
    commercialTerms: COMMERCIAL_TERMS,
  }
}
