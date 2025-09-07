import type { Metadata } from "next"
import HomePage from "../page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
  description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.",
}

export default function SpecialistPage() {
  return <HomePage initialPage="specialist" />
}
