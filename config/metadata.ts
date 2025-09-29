import type { Metadata } from "next"

export const pageMetadata: Record<string, Record<string, Metadata>> = {
  fr: {
    home: {
      title: "NOMAD403 - Développeur Web Mobile Freelance Paris | React Next.js Kotlin Swift",
      description: "Développeur freelance Paris spécialisé en applications web React Next.js, mobile iOS Android Kotlin Swift, et intégration IA. Portfolio 3D interactif."
    },
    projects: {
      title: "Portfolio Développeur Web Mobile - Projets React Next.js Kotlin Swift | NOMAD403",
      description: "Portfolio de projets développement web React Next.js, applications mobiles iOS Android Kotlin Swift, solutions IA. Développeur freelance Paris."
    },
    specialist: {
      title: "Expert Développeur Web Mobile Freelance - React Next.js Kotlin Swift IA | NOMAD403",
      description: "Expertise développement web React Next.js, mobile iOS Android Kotlin Swift, intégration IA Azure OpenAI. Développeur freelance Paris expérimenté."
    },
    contact: {
      title: "Contact Développeur Web Mobile Freelance Paris - React Next.js Kotlin Swift | NOMAD403",
      description: "Contactez un développeur freelance Paris expert en React Next.js, mobile Kotlin Swift, intégration IA. Devis gratuit pour votre projet web mobile."
    }
  },
  en: {
    home: {
      title: "NOMAD403 - Freelance Web Mobile Developer Paris | React Next.js Kotlin Swift",
      description: "Freelance developer Paris specializing in React Next.js web apps, iOS Android mobile apps Kotlin Swift, and AI integration. Interactive 3D portfolio."
    },
    projects: {
      title: "Web Mobile Developer Portfolio - React Next.js Kotlin Swift Projects | NOMAD403",
      description: "Portfolio of React Next.js web development, iOS Android mobile apps Kotlin Swift, AI solutions. Freelance developer Paris."
    },
    specialist: {
      title: "Expert Freelance Web Mobile Developer - React Next.js Kotlin Swift AI | NOMAD403",
      description: "Expertise in React Next.js web development, iOS Android mobile Kotlin Swift, Azure OpenAI AI integration. Experienced freelance developer Paris."
    },
    contact: {
      title: "Contact Freelance Web Mobile Developer Paris - React Next.js Kotlin Swift | NOMAD403",
      description: "Contact a freelance developer Paris expert in React Next.js, mobile Kotlin Swift, AI integration. Free quote for your web mobile project."
    }
  }
}

export function getPageMetadata(page: string, language: string = 'fr'): Metadata {
  return pageMetadata[language]?.[page] || pageMetadata[language]?.home || pageMetadata.fr.home
}
