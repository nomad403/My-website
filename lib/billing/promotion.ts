import { hashToken } from "../auth/crypto"
import { lockPlanPrice, type PlanCode } from "../shop/plans"

const PRIVATE_PLANS = new Set<PlanCode>(["friend_host", "friend_care"])

export function normalizePromotionCode(value: unknown): string | null {
  if (typeof value !== "string") return null
  const code = value.trim().toUpperCase().replace(/\s+/g, "")
  if (!/^[A-Z0-9-]{6,32}$/.test(code)) return null
  return code
}

export function hashPromotionCode(code: string) {
  return hashToken(code)
}

export function isPrivatePlan(code: string): code is PlanCode {
  return PRIVATE_PLANS.has(code as PlanCode)
}

export function privateOfferCopy(planCode: PlanCode, language: string) {
  const french = language !== "en"
  if (planCode === "friend_host") {
    return {
      name: "Friend Host",
      summary: french
        ? "Hébergement privé, au tarif réservé par ce code."
        : "Private hosting, at the price reserved by this code.",
    }
  }
  return {
    name: "Friend Care",
    summary: french
      ? "Hébergement et suivi privés, au tarif réservé par ce code."
      : "Private hosting and follow-up, at the price reserved by this code.",
  }
}

export function lockedPrivateMonthly(planCode: PlanCode) {
  return lockPlanPrice(planCode, "month", "private")
}
