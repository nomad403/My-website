import type { Metadata } from "next"
import MfaForm from "@/components/auth/MfaForm"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Second facteur — NOMAD403",
  robots: { index: false, follow: false },
}

export default function MfaPage() {
  return <MfaForm />
}
