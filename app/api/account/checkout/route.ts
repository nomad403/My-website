import { jsonError } from "@/lib/auth/route"
import { readAccountBody, withAccount } from "@/lib/billing/account-http"
import { startCheckout } from "@/lib/billing/checkout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readAccountBody(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const value = body.value && typeof body.value === "object" ? body.value : {}
  return withAccount(request, ({ userId, email, platform }) => {
    if (!platform.stripe || !platform.gateway) {
      return Promise.resolve({
        status: 503,
        body: { ok: false, code: "stripe_unconfigured", error: "Le paiement n'est pas configuré." },
      })
    }
    return startCheckout(
      {
        store: platform.billing,
        gateway: platform.gateway,
        prices: platform.stripe.prices,
        limiter: platform.limiter,
        now: () => new Date(),
        appUrl: platform.env.appUrl,
      },
      {
        userId,
        email,
        planCode: "planCode" in value ? value.planCode : null,
        interval: "interval" in value ? value.interval : null,
        promotionCode: "promotionCode" in value ? value.promotionCode : null,
      },
    )
  })
}
