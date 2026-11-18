import { NextResponse } from "next/server"
import { SESSION_COOKIE } from "./cookie"
import type { ServiceResult } from "./service"

const baseCookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
}

export function toResponse(result: ServiceResult, secure: boolean, appUrl: string) {
  const headers = new Headers({ "Cache-Control": "no-store" })
  if (result.retryAfter) headers.set("Retry-After", String(result.retryAfter))
  const response = result.redirectPath
    ? NextResponse.redirect(new URL(result.redirectPath, appUrl), { status: 303, headers })
    : NextResponse.json(result.body, { status: result.status, headers })

  if (result.cookie && "clear" in result.cookie) {
    response.cookies.set(SESSION_COOKIE, "", { ...baseCookie, secure, maxAge: 0 })
  } else if (result.cookie) {
    response.cookies.set(SESSION_COOKIE, result.cookie.value, {
      ...baseCookie,
      secure,
      maxAge: result.cookie.maxAge,
    })
  }
  return response
}

export function unavailable() {
  return NextResponse.json(
    { ok: false, error: "Service temporairement indisponible.", code: "unavailable" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  )
}
