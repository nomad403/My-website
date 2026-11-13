import { NextResponse, type NextRequest } from "next/server"
import { accessEmailFromRequest, isAllowedAdminEmail } from "@/lib/auth/access"
import { openSessionCookie, SESSION_COOKIE } from "@/lib/auth/cookie"

function denied(request: NextRequest, status: number, code: string) {
  if (status === 503) {
    const body = { ok: false, error: "Service temporairement indisponible.", code }
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } })
    }
    return new NextResponse(body.error, { status, headers: { "Cache-Control": "no-store" } })
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        ok: false,
        error: status === 401 ? "Authentification requise." : "Accès refusé.",
        code,
      },
      { status, headers: { "Cache-Control": "no-store" } },
    )
  }
  return NextResponse.redirect(new URL("/auth/verify", request.url))
}

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")
}

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) return denied(request, 503, "unavailable")
  const raw = request.cookies.get(SESSION_COOKIE)?.value
  const session = raw ? await openSessionCookie(raw, secret) : null
  const fresh = Boolean(session && session.absoluteExpiresAt * 1000 > Date.now())
  if (fresh && session) return NextResponse.next()

  // Admin: Cloudflare Access JWT alone is enough when the email is in ADMIN_EMAILS.
  if (isAdminPath(request.nextUrl.pathname)) {
    const accessEmail = await accessEmailFromRequest(request)
    if (accessEmail && isAllowedAdminEmail(accessEmail)) return NextResponse.next()
  }

  return denied(request, 401, "auth_required")
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/account/:path*",
    "/api/auth/mfa/:path*",
    "/api/auth/logout",
  ],
}
