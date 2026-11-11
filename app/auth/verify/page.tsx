import type { Metadata } from "next"
import VerifyForm from "@/components/auth/VerifyForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Connexion — NOMAD403",
  robots: { index: false, follow: false },
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const params = await searchParams
  return <VerifyForm token={params.token ?? ""} error={params.error} />
}
