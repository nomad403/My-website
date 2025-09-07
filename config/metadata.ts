import type { Metadata } from "next"

export const pageMetadata: Record<string, Metadata> = {
  home: {
    title: "NOMAD403 - Web, Mobile & AI Developer",
    description: "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio."
  },
  projects: {
    title: "NOMAD403 - Portfolio Projects | Web, Mobile & AI",
    description: "Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact."
  },
  specialist: {
    title: "NOMAD403 - Skills & Expertise | Web, Mobile & AI",
    description: "Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs."
  },
  contact: {
    title: "NOMAD403 - Contact | Hire a Web, Mobile & AI Developer",
    description: "Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations."
  }
}

export function getPageMetadata(page: string): Metadata {
  return pageMetadata[page] || pageMetadata.home
}
