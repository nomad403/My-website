import type { Metadata } from "next"
import HomePageClient from "../HomePageClient"
import { BRAND_KEYWORDS } from "@/config/metadata"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
  description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
  keywords: BRAND_KEYWORDS,
  alternates: {
    canonical: 'https://www.nomad403.com/contact'
  },
  openGraph: {
    title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
    description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
    url: 'https://www.nomad403.com/contact',
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
    title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
    description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function ContactPage() {
  return <HomePageClient initialPage="contact" />
}
