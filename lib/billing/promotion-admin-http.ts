import { NextResponse } from "next/server"
import { productionPlatform } from "../auth/runtime"
import { cookieFromRequest, isSameOrigin, readJson } from "../auth/route"
import { unavailable, toResponse } from "../auth/http"
import { getDb } from "../db/client"
import { DrizzlePromotionAdminStore } from "../db/promotion-admin-store"
import { administerPromotions } from "./promotion-admin"

export async function promotionAdminRequest(request: Request, operation: "list" | "detail" | "create" | "change", id?: string) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, code: "origin_rejected" }, { status: 403, headers: { "Cache-Control": "no-store" } })
  try {
    const platform = await productionPlatform()
    if (!platform) return unavailable()
    const cookie = cookieFromRequest(request)
    // Authorize before reading a mutation body or querying promotion data.
    const identity = await platform.service.adminIdentity(cookie)
    if (identity.status !== 200) return toResponse(identity, platform.env.secureCookies, platform.env.appUrl)
    let value: unknown = {}
    if (operation === "create" || operation === "change") {
      const body = await readJson(request)
      if (!body.ok) return NextResponse.json({ ok: false, code: body.code }, { status: body.status, headers: { "Cache-Control": "no-store" } })
      value = body.value
    } else if (operation === "list" || operation === "detail") {
      const offset = new URL(request.url).searchParams.get("offset")
      value = { offset: offset === null ? 0 : Number(offset) }
    }
    const result = await administerPromotions({
      authorize: c => platform.service.adminIdentity(c), store: new DrizzlePromotionAdminStore(getDb()),
      limiter: platform.limiter, now: () => new Date(),
    }, cookie, operation, value, id)
    return toResponse(result, platform.env.secureCookies, platform.env.appUrl)
  } catch {
    console.error("[promotions] administrative request failed")
    return unavailable()
  }
}
