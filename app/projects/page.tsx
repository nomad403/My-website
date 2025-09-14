import type { Metadata } from "next"
import HomePage from "../page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
  description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
  alternates: {
    canonical: 'https://nomad403.com/projects'
  },
  openGraph: {
    title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
    description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
    url: 'https://nomad403.com/projects',
    images: ['https://nomad403.com/preview.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
    description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
    images: ['https://nomad403.com/preview.jpg'],
  }
}

export default function ProjectsPage() {
  return <HomePage initialPage="projects" />
}
