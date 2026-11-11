export const requestStatuses = ["submitted", "analyzing", "accepted", "in_progress", "waiting_client", "completed", "rejected", "cancelled"] as const
export type RequestStatus = typeof requestStatuses[number]
export const categories = ["minor_fix", "content", "visual", "maintenance", "incident", "other"] as const
export const transitions: Record<RequestStatus, readonly RequestStatus[]> = {
 submitted: ["analyzing", "cancelled"],
 analyzing: ["accepted", "waiting_client", "rejected", "cancelled"],
 accepted: ["in_progress", "cancelled"],
 in_progress: ["waiting_client", "completed", "cancelled"],
 waiting_client: ["analyzing", "in_progress", "cancelled"],
 completed: [], rejected: [], cancelled: [],
}
export function mayTransition(from: RequestStatus, to: RequestStatus, admin: boolean) {
 return transitions[from].includes(to) && (admin || (to === "cancelled" && ["submitted","analyzing","waiting_client"].includes(from)))
}
export type ContractSubscription = {
 id: string; planCode: string; status: string; serviceAnchorAt: Date | null
 currentPeriodStart: Date | null; currentPeriodEnd: Date | null; cancelEffectiveAt: Date | null
 entitlementReviewRequired: boolean
}
function boundary(anchor: Date, months: number) {
 const first = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + months, 1))
 const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
 return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(anchor.getUTCDate(), last),
  anchor.getUTCHours(), anchor.getUTCMinutes(), anchor.getUTCSeconds(), anchor.getUTCMilliseconds()))
}
/** UTC, anchored anniversary months. Never add 30 days or reuse a clipped previous boundary. */
export function monthlyWindow(anchor: Date, at: Date): { start: Date; end: Date } | null {
 if (!Number.isFinite(anchor.getTime()) || !Number.isFinite(at.getTime()) || at < anchor) return null
 let months = (at.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + at.getUTCMonth() - anchor.getUTCMonth()
 if (boundary(anchor, months) > at) months--
 return { start: boundary(anchor, months), end: boundary(anchor, months + 1) }
}
export function contractWindow(subscription: ContractSubscription, now: Date) {
 if (!["premium","friend_care"].includes(subscription.planCode)) return { reason: "outside_plan" } as const
 if (subscription.entitlementReviewRequired) return { reason: "contract_review" } as const
 if (subscription.status !== "active") return { reason: "inactive" } as const
 if (!subscription.serviceAnchorAt || !subscription.currentPeriodStart || !subscription.currentPeriodEnd) return { reason: "unverified_period" } as const
 if (now < subscription.currentPeriodStart || now >= subscription.currentPeriodEnd || (subscription.cancelEffectiveAt && now >= subscription.cancelEffectiveAt)) return { reason: "outside_period" } as const
 const window = monthlyWindow(subscription.serviceAnchorAt, now)
 if (!window) return { reason: "unverified_period" } as const
 const end = new Date(Math.min(window.end.getTime(), subscription.currentPeriodEnd.getTime(), subscription.cancelEffectiveAt?.getTime() ?? Infinity))
 return { reason: "eligible", start: window.start, end } as const
}
export class InterventionError extends Error {
 constructor(public readonly code: string, public readonly status = 400) { super(code) }
}
export type Actor = { id: string; admin: boolean }
