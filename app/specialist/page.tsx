import type { Metadata } from "next"
import HomePage from "../page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
  description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
  alternates: {
    canonical: 'https://www.nomad403.com/specialist'
  },
  openGraph: {
    title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
    description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
    url: 'https://www.nomad403.com/specialist',
    images: ['https://www.nomad403.com/preview.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
    description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function SpecialistPage() {
  return <HomePage initialPage="specialist" />
}
