import type { Metadata } from "next"

export const BRAND_KEYWORDS = [
  "Nomad403",
  "Nomad 403",
  "nomad403",
  "Nomad403 developer",
  "Nomad403 portfolio",
  "web developer",
  "workflow automation",
  "web mobile developer",
  "AI developer",
  "freelance developer Paris",
]

export const pageMetadata: Record<string, Record<string, Metadata>> = {
  fr: {
    home: {
      title: "NOMAD403 - Développeur Web Mobile Freelance Paris | React Next.js Kotlin Swift",
      description: "Nomad403, développeur freelance à Paris, conçoit des applications web React Next.js, mobiles iOS Android Kotlin Swift et intégrations IA avec un portfolio 3D immersif.",
      keywords: BRAND_KEYWORDS,
    },
    projects: {
      title: "Portfolio Développeur Web Mobile - Projets React Next.js Kotlin Swift | NOMAD403",
      description: "Découvrez le portfolio Nomad403 : projets web React Next.js, applications mobiles iOS Android Kotlin Swift et solutions IA pour marques ambitieuses.",
      keywords: BRAND_KEYWORDS,
    },
    specialist: {
      title: "Offres Web, Mobile, IA & Consulting — Développeur Freelance | NOMAD403",
      description: "Catalogue Nomad403 : sites web, applications mobiles, automatisation, intelligence artificielle et consulting technique pour projets ambitieux.",
      keywords: BRAND_KEYWORDS,
    },
    contact: {
      title: "Contact Développeur Web Mobile Freelance Paris - React Next.js Kotlin Swift | NOMAD403",
      description: "Contactez Nomad403 pour discuter d’un projet web, mobile ou IA : React Next.js, Kotlin, Swift et automatisations workflow.",
      keywords: BRAND_KEYWORDS,
    }
  },
  en: {
    home: {
      title: "NOMAD403 - Freelance Web Mobile Developer Paris | React Next.js Kotlin Swift",
      description: "Nomad403 is a Paris-based freelance developer crafting React Next.js web apps, Kotlin/Swift mobile apps, and AI integrations with an immersive 3D portfolio.",
      keywords: BRAND_KEYWORDS,
    },
    projects: {
      title: "Web Mobile Developer Portfolio - React Next.js Kotlin Swift Projects | NOMAD403",
      description: "Explore the Nomad403 portfolio: React Next.js builds, Kotlin/Swift mobile products, and AI-driven automation for premium brands.",
      keywords: BRAND_KEYWORDS,
    },
    specialist: {
      title: "Web, Mobile, AI & Consulting Services — Freelance Developer | NOMAD403",
      description: "Nomad403 service catalog: websites, mobile apps, automation, artificial intelligence, and technical consulting for ambitious projects.",
      keywords: BRAND_KEYWORDS,
    },
    contact: {
      title: "Contact Freelance Web Mobile Developer Paris - React Next.js Kotlin Swift | NOMAD403",
      description: "Reach out to Nomad403 for collaborative web, mobile, or AI initiatives powered by React, Kotlin, Swift, and workflow automation.",
      keywords: BRAND_KEYWORDS,
    }
  }
}

export function getPageMetadata(page: string, language: string = 'fr'): Metadata {
  return pageMetadata[language]?.[page] || pageMetadata[language]?.home || pageMetadata.fr.home
}
