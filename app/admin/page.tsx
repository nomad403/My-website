import AdminConsole from "@/components/auth/AdminConsole"
import type { Metadata } from "next"
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

  const result = await auth.service.adminIdentity(await readRequestCookie())
  if (result.status !== 200) {
    const code = typeof result.body.code === "string" ? result.body.code : "unavailable"
    return (
      <AuthFrame titleKey="auth.admin.title">
        <AuthNote code={code} />
      </AuthFrame>
    )
  }

  return (
    <AuthFrame titleKey="auth.admin.title" wide>
      <AdminConsole />
    </AuthFrame>
  )
}
