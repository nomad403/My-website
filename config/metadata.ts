import type { Metadata } from "next"

export const pageMetadata: Record<string, Record<string, Metadata>> = {
  fr: {
    home: {
      title: "NOMAD403 - Développeur Web, Mobile & IA",
      description: "Développeur freelance créant des applications web personnalisées, des applications mobiles et des outils alimentés par l'IA. Explorez mon portfolio 3D interactif."
    },
    projects: {
      title: "NOMAD403 - Projets Portfolio | Web, Mobile & IA",
      description: "Parcourez les projets sélectionnés en développement web, applications mobiles et solutions IA. De qualité, évolutifs et conçus pour l'impact."
    },
    specialist: {
      title: "NOMAD403 - Compétences & Expertise | Web, Mobile & IA",
      description: "Expertise en développement frontend, mobile (iOS & Android) et intégration IA. Solutions modernes et évolutives adaptées à vos besoins."
    },
    contact: {
      title: "NOMAD403 - Contact | Engagez un Développeur Web, Mobile & IA",
      description: "Contactez-moi pour discuter de votre projet. Disponible pour des collaborations de développement web, mobile et IA freelance."
    }
  },
  en: {
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
}

export function getPageMetadata(page: string, language: string = 'fr'): Metadata {
  return pageMetadata[language]?.[page] || pageMetadata[language]?.home || pageMetadata.fr.home
}
