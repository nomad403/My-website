import { createHmac } from "node:crypto"
import { trustedClientIp } from "@/lib/auth/route"
import { jsonError } from "@/lib/auth/route"
import { readAccountBody, withAccount } from "@/lib/billing/account-http"
import { previewOffer } from "@/lib/billing/checkout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readAccountBody(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const value = body.value && typeof body.value === "object" ? body.value : {}
  return withAccount(request, ({ userId, email, platform }) =>
    previewOffer(platform.billing, {
      code: "code" in value ? value.code : null,
      email,
      language: "language" in value && value.language === "en" ? "en" : "fr",
      at: new Date(),
    }, {
      limiter: platform.limiter, userId,
      clientKey: trustedClientIp(request) ? createHmac("sha256", platform.env.authSecret).update(trustedClientIp(request)!).digest("hex") : undefined,
    }),
  )
}
