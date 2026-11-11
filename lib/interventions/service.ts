import type { RateLimiter } from "../auth/rate-limit"
import type { ServiceResult } from "../auth/service"
import { categories, requestStatuses, InterventionError, type Actor } from "./contract"
export interface InterventionStore {
 dashboard(actor: Actor, now: Date): Promise<unknown>
 profile(actor: Actor, input: { firstName: string; lastName: string }): Promise<void>
 list(actor: Actor, offset: number): Promise<unknown>
 create(actor: Actor, input: Record<string, unknown>, now: Date): Promise<{ id: string }>
 detail(actor: Actor, id: string, offset: number, now?: Date): Promise<unknown>
 mutate(actor: Actor, id: string, operation: "message" | "transition" | "complete", input: Record<string, unknown>, now: Date): Promise<void>
}
export type Operation = "dashboard" | "profile" | "list" | "create" | "detail" | "message" | "transition" | "complete"
export type InterventionDeps = {
 authorize: (cookie: string | null) => Promise<ServiceResult>
 store: InterventionStore; limiter: RateLimiter; now: () => Date; admin: boolean
}
export const objectId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
function fail(status: number, code: string): ServiceResult { return { status, body: { ok: false, code } } }
function validText(v: unknown, min: number, max: number): v is string {
 return typeof v === "string" && v.trim().length >= min && v.length <= max && !/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v)
}
export async function interventionOperation(deps: InterventionDeps, cookie: string | null, operation: Operation, value: unknown = {}, id?: string): Promise<ServiceResult> {
 const identity = await deps.authorize(cookie)
 if (identity.status !== 200) return identity
 if (typeof identity.body.userId !== "string") return fail(503, "unavailable")
 const actor = { id: identity.body.userId, admin: deps.admin }
 if (!value || typeof value !== "object" || Array.isArray(value)) return fail(400, "invalid")
 const input = value as Record<string, unknown>
 try {
  const read = ["dashboard","list","detail"].includes(operation)
  const limit = read ? 240 : operation === "create" ? 12 : 60
  if (!(await deps.limiter.consume("interventions:" + operation + ":" + actor.id, limit, 3600)).allowed) return fail(429, "rate_limited")
  const now = deps.now()
  if (operation === "dashboard") return { status: 200, body: { ok: true, dashboard: await deps.store.dashboard({ ...actor, admin: false }, now) } }
  if (operation === "profile") {
   if (Object.keys(input).some(k => !["firstName","lastName"].includes(k)) || !validText(input.firstName, 0, 80) || !validText(input.lastName, 0, 80)) return fail(400, "invalid")
   await deps.store.profile(actor, { firstName: input.firstName.trim(), lastName: input.lastName.trim() })
  } else if (operation === "list" || operation === "detail") {
   const offset = input.offset ?? 0
   if (!Number.isSafeInteger(offset) || (offset as number) < 0 || (offset as number) > 100000) return fail(400, "invalid")
   if (operation === "detail" && !objectId(id)) return fail(400, "invalid")
   return { status: 200, body: { ok: true, ...(operation === "list" ? { requests: await deps.store.list(actor, offset as number) } : { request: await deps.store.detail(actor, id!, offset as number, now) }) } }
  } else if (operation === "create") {
   if (actor.admin || Object.keys(input).some(k => !["projectId","subscriptionId","subject","description","category","urgency","additionalInfo","operationKey"].includes(k))) return fail(400, "invalid")
   if (!objectId(input.projectId) || (input.subscriptionId != null && !objectId(input.subscriptionId)) || !objectId(input.operationKey)
    || !validText(input.subject,3,160) || !validText(input.description,10,4000) || !categories.includes(input.category as typeof categories[number])
    || !["low","normal","high"].includes(input.urgency as string) || (input.additionalInfo !== undefined && !validText(input.additionalInfo,0,2000))) return fail(400, "invalid")
   return { status: 201, body: { ok: true, ...await deps.store.create(actor, input, now) } }
  } else {
   if (!objectId(id) || !objectId(input.operationKey)) return fail(400, "invalid")
   const fields = operation === "message" ? ["operationKey","body","internal"] : operation === "transition" ? ["operationKey","status","coverage","minorScopeConfirmed","body"] : ["operationKey","minutes","performedAt","body"]
   if (Object.keys(input).some(k => !fields.includes(k))) return fail(400, "invalid")
   if (operation === "message") {
    if (!validText(input.body,1,4000) || (input.internal !== undefined && typeof input.internal !== "boolean")) return fail(400, "invalid")
    if (input.internal && !actor.admin) return fail(403, "forbidden")
   } else if (operation === "transition") {
    if (!requestStatuses.includes(input.status as typeof requestStatuses[number]) || input.status === "completed") return fail(400, "invalid")
    if (!actor.admin && (input.status !== "cancelled" || input.coverage !== undefined)) return fail(403, "forbidden")
    if (input.minorScopeConfirmed !== undefined && typeof input.minorScopeConfirmed !== "boolean") return fail(400, "invalid")
    if (input.coverage !== undefined && !["included","outside"].includes(input.coverage as string)) return fail(400, "invalid")
   } else {
    if (!actor.admin) return fail(403, "forbidden")
    if (!Number.isInteger(input.minutes) || (input.minutes as number) < 1 || (input.minutes as number) > 1440) return fail(400, "invalid")
    if (input.performedAt !== undefined && (typeof input.performedAt !== "string" || !Number.isFinite(Date.parse(input.performedAt)))) return fail(400, "invalid")
   }
   if (operation !== "message" && input.body !== undefined && !validText(input.body,0,4000)) return fail(400, "invalid")
   await deps.store.mutate(actor, id!, operation, input, now)
  }
  return { status: 200, body: { ok: true } }
 } catch (error) {
  if (error instanceof InterventionError) return fail(error.status, error.code)
  return fail(503, "unavailable")
 }
}
