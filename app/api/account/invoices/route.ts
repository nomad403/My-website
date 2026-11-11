import { withAccount } from "@/lib/billing/account-http"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return withAccount(request, async ({ userId, platform }) => ({
    status: 200,
    body: { ok: true, invoices: await platform.billing.listInvoices(userId) },
  }))
}
