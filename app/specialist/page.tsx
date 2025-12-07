import type { Metadata } from "next"
import HomePageClient from "../HomePageClient"
import { BRAND_KEYWORDS } from "@/config/metadata"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
  description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
  keywords: BRAND_KEYWORDS,
  alternates: {
    canonical: 'https://www.nomad403.com/specialist'
  },
  openGraph: {
    title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
    description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
    url: 'https://www.nomad403.com/specialist',
    siteName: "NOMAD403",
    images: [
      {
        url: 'https://www.nomad403.com/preview.jpg',
        width: 1200,
        height: 630,
        alt: "Nomad403 portfolio preview",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nomad403',
    creator: '@nomad403',
    title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
    description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function SpecialistPage() {
  return <HomePageClient initialPage="specialist" />
}
