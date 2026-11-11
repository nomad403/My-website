import AdminPromotions from "@/components/auth/AdminPromotions"
import type { Metadata } from "next"
import AdminBillingLists from "@/components/auth/AdminBillingLists"
import AdminSummary from "@/components/auth/AdminSummary"
import AuthFrame, { AuthNote } from "@/components/auth/AuthFrame"
import { productionPlatform, readRequestCookie } from "@/lib/auth/runtime"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Administration — NOMAD403",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const auth = await productionPlatform()
  if (!auth) {
    return (
      <AuthFrame titleKey="auth.admin.title">
        <AuthNote code="unavailable" />
      </AuthFrame>
    )
  }

  const result = await auth.service.adminSummary(await readRequestCookie())
  if (result.status !== 200 || typeof result.body.accounts !== "number") {
    const code = typeof result.body.code === "string" ? result.body.code : "unavailable"
    return (
      <AuthFrame titleKey="auth.admin.title">
        <AuthNote code={code} />
      </AuthFrame>
    )
  }

  return (
    <AuthFrame titleKey="auth.admin.title" wide>
      <AdminSummary
        data={{
          accounts: Number(result.body.accounts),
          theoreticalMrrCents: Number(result.body.theoreticalMrrCents),
          theoreticalArrCents: Number(result.body.theoreticalArrCents),
          issuedCents: Number(result.body.issuedCents),
          collectedCents: Number(result.body.collectedCents),
          refundedCents: Number(result.body.refundedCents),
          unpaidCents: Number(result.body.unpaidCents),
        }}
      />
      <AdminBillingLists data={await auth.billing.adminSnapshot()} />
      <AdminPromotions />
    </AuthFrame>
  )
}
