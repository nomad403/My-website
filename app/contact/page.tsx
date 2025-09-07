import type { Metadata } from "next"
import HomePage from "../page"

export const metadata: Metadata = {
  title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
  description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
}

export default function ContactPage() {
  return <HomePage initialPage="contact" />
}
