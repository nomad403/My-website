import { Suspense } from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import AdminConsole from "@/components/auth/AdminConsole"
import AuthFrame, { AuthNote } from "@/components/auth/AuthFrame"
import { accessEmailFromRequest } from "@/lib/auth/access"
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

  const accessEmail = await accessEmailFromRequest({ headers: await headers() })
  const result = await auth.service.adminIdentity(await readRequestCookie(), accessEmail)
  if (result.status !== 200) {
    const code = typeof result.body.code === "string" ? result.body.code : "unavailable"
    return (
      <AuthFrame titleKey="auth.admin.title">
        <AuthNote code={code} />
      </AuthFrame>
    )
  }

  return (
    <Suspense fallback={<div className="fixed inset-0 bg-white" />}>
      <AdminConsole />
    </Suspense>
  )
}
