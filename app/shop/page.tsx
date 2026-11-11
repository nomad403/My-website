import type { Metadata } from "next"
import { Suspense } from "react"
import ShopExperience from "@/components/shop/ShopExperience"

const title = "NOMAD403 — Shop | Hébergement, maintenance et suivi"
const description =
  "Abonnements Essential, Plus et Premium pour l'hébergement, la maintenance et le suivi. Hosting, maintenance and follow-up plans."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://www.nomad403.com/shop" },
  openGraph: {
    title,
    description,
    url: "https://www.nomad403.com/shop",
    siteName: "NOMAD403",
    locale: "fr_FR",
    images: [
      {
        url: "https://www.nomad403.com/preview.jpg",
        width: 1200,
        height: 630,
        alt: "Nomad403 portfolio preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@nomad403",
    creator: "@nomad403",
    title,
    description,
    images: ["https://www.nomad403.com/preview.jpg"],
  },
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-white" />}>
      <ShopExperience />
    </Suspense>
  )
}
