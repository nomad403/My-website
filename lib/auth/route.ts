import { isIP } from "node:net"
import { NextResponse } from "next/server"
import { SESSION_COOKIE } from "./cookie"
import { toResponse, unavailable } from "./http"
import { productionAuth } from "./runtime"
import type { ServiceResult } from "./service"

export function trustedClientIp(request: Request): string | null {
  if (process.env.VERCEL === "1") {
    const value = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? ""
    return isIP(value) ? value : null
  }
  if (process.env.NODE_ENV !== "production") return "127.0.0.1"
  return null
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const expected = new URL(request.url).origin
  if (origin) return origin === expected
  const site = request.headers.get("sec-fetch-site")
  return site === "same-origin" || site === "none"
}

export function cookieFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const separator = part.indexOf("=")
    if (separator === -1) continue
    if (part.slice(0, separator).trim() === SESSION_COOKIE) return part.slice(separator + 1).trim()
  }
  return null
}

export { readJson } from "./read-json"

export function jsonError(status: number, code: string, error: string) {
  return NextResponse.json(
    { ok: false, error, code },
    { status, headers: { "Cache-Control": "no-store" } },
  )
}

export async function withAuth(
  request: Request,
  run: (input: {
    cookie: string | null
    ip: string | null
    service: NonNullable<Awaited<ReturnType<typeof productionAuth>>>["service"]
    appUrl: string
    secure: boolean
  }) => Promise<ServiceResult>,
) {
  if (!isSameOrigin(request)) return jsonError(403, "origin_rejected", "Origine refusée.")
  const auth = await productionAuth()
  if (!auth) return unavailable()
  try {
    const result = await run({
      cookie: cookieFromRequest(request),
      ip: trustedClientIp(request),
      service: auth.service,
      appUrl: auth.env.appUrl,
      secure: auth.env.secureCookies,
    })
    return toResponse(result, auth.env.secureCookies, auth.env.appUrl)
  } catch {
    console.error("[auth] request failed")
    return unavailable()
  }
}
