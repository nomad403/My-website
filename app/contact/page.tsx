import type { Metadata } from "next"
import HomePage from "../page"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
  description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
  alternates: {
    canonical: 'https://www.nomad403.com/contact'
  },
  openGraph: {
    title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
    description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
    url: 'https://www.nomad403.com/contact',
    images: ['https://www.nomad403.com/preview.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
    description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.",
    images: ['https://www.nomad403.com/preview.jpg'],
  }
}

export default function ContactPage() {
  return <HomePage initialPage="contact" />
}
