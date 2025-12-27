import type { Metadata } from "next"
import HomePageClient from "../HomePageClient"
import { BRAND_KEYWORDS } from "@/config/metadata"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "Couche de décision — NOMAD403",
  description: "Interface de réflexion structurée pour évaluer la pertinence et la faisabilité de votre projet digital.",
  keywords: BRAND_KEYWORDS,
  alternates: {
    canonical: 'https://www.nomad403.com/decision'
  },
  openGraph: {
    title: "Couche de décision — NOMAD403",
    description: "Interface de réflexion structurée pour évaluer la pertinence et la faisabilité de votre projet digital.",
    url: 'https://www.nomad403.com/decision',
    siteName: "NOMAD403",
    images: [
      {
        url: 'https://www.nomad403.com/preview.jpg',
        width: 1200,
        height: 630,
        alt: "Nomad403 decision layer",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nomad403',
    creator: '@nomad403',
    title: "Couche de décision — NOMAD403",
    description: "Interface de réflexion structurée pour évaluer la pertinence et la faisabilité de votre projet digital.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function DecisionPage() {
  return <HomePageClient initialPage="decision" />
}

