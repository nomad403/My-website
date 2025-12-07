import type { Metadata } from "next"
import HomePageClient from "./HomePageClient"
import { pageMetadata } from "@/config/metadata"

const BASE_URL = "https://www.nomad403.com"
const PREVIEW_IMAGE = `${BASE_URL}/preview.jpg`

const homeMeta = pageMetadata.fr.home
const resolvedTitle =
  typeof homeMeta.title === "string"
    ? homeMeta.title
    : "NOMAD403 - Web, Mobile & AI Developer"
const resolvedDescription =
  typeof homeMeta.description === "string"
    ? homeMeta.description
    : "Nomad403, freelance web & mobile developer in Paris."

export const metadata: Metadata = {
  title: resolvedTitle,
  description: resolvedDescription,
  keywords: homeMeta.keywords,
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "NOMAD403",
    title: resolvedTitle,
    description: resolvedDescription,
    images: [
      {
        url: PREVIEW_IMAGE,
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
    title: resolvedTitle,
    description: resolvedDescription,
    images: [PREVIEW_IMAGE],
  },
}

export default function HomePage() {
  return <HomePageClient initialPage="home" />
}

