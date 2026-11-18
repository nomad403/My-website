import { randomBytes } from "node:crypto"
import { normalizeEmail } from "../auth/email"
import type { ServiceResult } from "../auth/service"
import type { RateLimiter } from "../auth/rate-limit"
import { hashPromotionCode, normalizePromotionCode, privateOffers } from "./promotion"

export type PromotionInput = {
  codeHash: string; codeHint: string; planCode: string; expiresAt: Date | null
  maxRedemptions: number | null; restrictedEmail: string | null
  usageTerms: string; internalNotes: string; actorId: string
}
export interface PromotionAdminStore {
  create(input: PromotionInput): Promise<{ id: string } | null>
  list(limit: number, offset: number): Promise<unknown[]>
  detail(id: string, offset?: number): Promise<unknown | null>
  change(id: string, actorId: string, input: { disable?: true; internalNotes?: string }): Promise<boolean>
}
type Identity = { status: number; body: Record<string, unknown> }
export type PromotionAdminDeps = {
  authorize: (cookie: string | null) => Promise<Identity>
  store: PromotionAdminStore
  limiter: RateLimiter
  now: () => Date
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const error = (status: number, code: string): ServiceResult => ({ status, body: { ok: false, code } })
function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}
export function generatePromotionCode() { return "NOMAD-" + randomBytes(12).toString("hex").toUpperCase() }
export async function administerPromotions(
  deps: PromotionAdminDeps, cookie: string | null, operation: "list" | "detail" | "create" | "change",
  value: unknown, id?: string,
): Promise<ServiceResult> {
  const identity = await deps.authorize(cookie)
  if (identity.status !== 200) return identity
  const actorId = identity.body.userId
  if (typeof actorId !== "string") return error(503, "unavailable")
  if ((operation === "detail" || operation === "change") && (!id || !UUID.test(id))) return error(400, "invalid")
  try {
    const limit = operation === "create" ? 20 : operation === "change" ? 60 : 240
    if (!(await deps.limiter.consume("admin-promotions:" + operation + ":" + actorId, limit, 3600)).allowed)
      return error(429, "rate_limited")
  } catch { return error(503, "unavailable") }
  const body = record(value)
  if (operation === "list") {
    const offset = body?.offset ?? 0
    if (!Number.isSafeInteger(offset) || (offset as number) < 0 || (offset as number) > 100000) return error(400, "invalid")
    return { status: 200, body: { ok: true, promotions: await deps.store.list(50, offset as number), offers: privateOffers } }
  }
  if (operation === "detail") {
    const offset = body?.offset ?? 0
    if (!Number.isSafeInteger(offset) || (offset as number) < 0 || (offset as number) > 100000) return error(400, "invalid")
    const promotion = await deps.store.detail(id!, offset as number)
    return promotion ? { status: 200, body: { ok: true, promotion } } : error(404, "not_found")
  }
  if (!body) return error(400, "invalid")
  if (operation === "change") {
    if (Object.keys(body).some(key => !["disable", "internalNotes"].includes(key))) return error(400, "immutable")
    if (body.disable !== undefined && body.disable !== true) return error(400, "invalid")
    if (body.internalNotes !== undefined && (typeof body.internalNotes !== "string" || body.internalNotes.length > 2000)) return error(400, "invalid")
    if (body.disable === undefined && body.internalNotes === undefined) return error(400, "invalid")
    const updated = await deps.store.change(id!, actorId, body as { disable?: true; internalNotes?: string })
    return updated ? { status: 200, body: { ok: true } } : error(404, "not_found")
  }
  const fields = ["mode", "code", "planCode", "expiresAt", "maxRedemptions", "restrictedEmail", "usageTerms", "internalNotes"]
  if (Object.keys(body).some(key => !fields.includes(key))) return error(400, "invalid")
  if (body.mode !== "auto" && body.mode !== "manual") return error(400, "invalid")
  const offer = privateOffers.find(item => item.planCode === body.planCode)
  if (!offer) return error(400, "invalid")
  let expiresAt: Date | null = null
  if (body.expiresAt != null && body.expiresAt !== "") {
    if (typeof body.expiresAt !== "string" || !/^\d{4}-\d\d-\d\dT/.test(body.expiresAt)) return error(400, "invalid")
    expiresAt = new Date(body.expiresAt)
    if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= deps.now()) return error(400, "invalid")
  }
  const max = body.maxRedemptions == null ? null : body.maxRedemptions
  if (max !== null && (!Number.isSafeInteger(max) || (max as number) < 1 || (max as number) > 1000000)) return error(400, "invalid")
  if (body.restrictedEmail != null && typeof body.restrictedEmail !== "string") return error(400, "invalid")
  const restrictedEmail = body.restrictedEmail ? normalizeEmail(body.restrictedEmail) : null
  if (body.restrictedEmail && !restrictedEmail) return error(400, "invalid")
  if (body.usageTerms !== undefined && (typeof body.usageTerms !== "string" || body.usageTerms.length > 2000)) return error(400, "invalid")
  if (body.internalNotes !== undefined && (typeof body.internalNotes !== "string" || body.internalNotes.length > 2000)) return error(400, "invalid")
  if (body.mode === "auto" && body.code) return error(400, "invalid")
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = body.mode === "auto" ? generatePromotionCode() : normalizePromotionCode(body.code)
    if (!code) return error(400, "invalid")
    const created = await deps.store.create({
      actorId, codeHash: hashPromotionCode(code), codeHint: code.slice(-4), planCode: offer.planCode,
      expiresAt, maxRedemptions: max as number | null, restrictedEmail,
      usageTerms: offer.terms + ((body.usageTerms as string | undefined)?.trim() ? "\n" + (body.usageTerms as string).trim() : ""),
      internalNotes: (body.internalNotes as string | undefined)?.trim() || "",
    })
    if (created) return { status: 201, body: { ok: true, id: created.id, code } }
    if (body.mode === "manual") return error(409, "duplicate")
  }
  return error(503, "unavailable")
}
