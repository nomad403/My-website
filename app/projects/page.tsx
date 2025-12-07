import type { Metadata } from "next"
import HomePageClient from "../HomePageClient"
import { BRAND_KEYWORDS } from "@/config/metadata"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
  description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
  keywords: BRAND_KEYWORDS,
  alternates: {
    canonical: 'https://www.nomad403.com/projects'
  },
  openGraph: {
    title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
    description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
    url: 'https://www.nomad403.com/projects',
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
    title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
    description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function ProjectsPage() {
  return <HomePageClient initialPage="projects" />
}
