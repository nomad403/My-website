import { withAccount } from "@/lib/billing/account-http"
import { startBillingPortal } from "@/lib/billing/checkout"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return withAccount(request, ({ userId, platform }) => {
    if (!platform.gateway) {
      return Promise.resolve({
        status: 503,
        body: { ok: false, code: "stripe_unconfigured", error: "Le paiement n'est pas configuré." },
      })
    }
    return startBillingPortal(
      { store: platform.billing, gateway: platform.gateway, appUrl: platform.env.appUrl },
      userId,
    )
  })
}
