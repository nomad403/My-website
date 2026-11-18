import { hashToken } from "../auth/crypto"
import { PLANS, lockPlanPrice, type PlanCode } from "../shop/plans"

export const privateOffers = PLANS.filter(plan => plan.visibility === "private").map(plan => ({
  planCode: plan.code, name: plan.code === "friend_host" ? "Friend Host" : "Friend Care",
  amountCents: plan.monthlyAmountCents,
  terms: plan.code === "friend_host"
    ? "Hébergement administré / Managed hosting."
    : "Hébergement et maintenance évolutive légère, maximum 1 heure par période mensuelle / Hosting and light maintenance, maximum 1 hour per monthly period.",
}))
const PRIVATE_PLANS = new Set<string>(privateOffers.map(offer => offer.planCode))

export function normalizePromotionCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const code = value.trim().toUpperCase().replace(/\s+/g, "")
  return /^[A-Z0-9-]{6,32}$/.test(code) ? code : null
}
export function hashPromotionCode(code: string) { return hashToken(code) }
export function isPrivatePlan(code: string): code is PlanCode { return PRIVATE_PLANS.has(code) }
export function privateOfferCopy(planCode: PlanCode, language: string) {
  const host = planCode === "friend_host"
  return {
    name: host ? "Friend Host" : "Friend Care",
    summary: language === "en"
      ? host ? "Managed hosting, at the price reserved by this code." : "Hosting and light maintenance, maximum one hour per monthly period."
      : host ? "Hébergement administré, au tarif réservé par ce code." : "Hébergement et maintenance évolutive légère, maximum une heure par période mensuelle.",
  }
}
export function lockedPrivateMonthly(planCode: PlanCode) { return lockPlanPrice(planCode, "month", "private") }
