import type { Metadata } from "next"
import HomePage from "../page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
  description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.",
}

export default function ProjectsPage() {
  return <HomePage initialPage="projects" />
}
