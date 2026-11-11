import { NextResponse } from "next/server"
import { productionPlatform } from "../auth/runtime"
import { cookieFromRequest, isSameOrigin, jsonError, readJson } from "../auth/route"
import { toResponse, unavailable } from "../auth/http"
import type { CheckoutResult } from "./checkout"

export async function readAccountBody(request: Request) {
  return readJson(request)
}

export async function withAccount(
  request: Request,
  run: (input: {
    userId: string
    email: string
    platform: NonNullable<Awaited<ReturnType<typeof productionPlatform>>>
  }) => Promise<CheckoutResult>,
) {
  if (!isSameOrigin(request)) return jsonError(403, "origin_rejected", "Origine refusée.")
  const platform = await productionPlatform()
  if (!platform) return unavailable()
  const identity = await platform.service.accountIdentity(cookieFromRequest(request))
  if (identity.status !== 200) return toResponse(identity, platform.env.secureCookies, platform.env.appUrl)
  const userId = identity.body.userId
  const email = identity.body.email
  if (typeof userId !== "string" || typeof email !== "string") return unavailable()
  try {
    const result = await run({ userId, email, platform })
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    console.error("[billing] request failed")
    return unavailable()
  }
}
