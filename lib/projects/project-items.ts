export type ProjectLang = "fr" | "en"

export interface LocalizedCopy {
  fr: string
  en: string
}

const L = (fr: string, en: string): LocalizedCopy => ({ fr, en })

export interface ProjectItem {
  id: number
  name: string
  url?: string
  /** Tagline courte (type / domaines). */
  description: LocalizedCopy
  /** Pitch 1–2 phrases. */
  summary?: LocalizedCopy
  stack?: string[]
}

export const PROJECT_ITEMS: ProjectItem[] = [
  {
    id: 1,
    name: "Monday",
    description: L("Application android, IA", "Android app, AI"),
    summary: L(
      "Application mobile intégrant des fonctionnalités d’intelligence artificielle autour de l’organisation et des usages du quotidien. Conception de l’expérience, de l’interface et du fonctionnement applicatif.",
      "Mobile app with AI features for everyday organization and usage. Experience, interface, and application behavior design.",
    ),
    stack: ["Kotlin", "Jetpack Compose", "Azure OpenAI"],
  },
  {
    id: 2,
    name: "TurnUpSphere",
    description: L("Application Android", "Android app"),
    summary: L(
      "Application mobile dédiée à la découverte musicale et aux interactions entre utilisateurs. Le projet réunit conception produit, expérience mobile et fonctionnalités sociales.",
      "Mobile app for music discovery and user interactions. Product design, mobile experience, and social features.",
    ),
    stack: ["Kotlin", "Jetpack Compose"],
  },
  {
    id: 3,
    name: "ras-energies",
    url: "https://paris.ras-energies.com",
    description: L("Site web vitrine", "Showcase website"),
    summary: L(
      "Site vitrine réalisé pour une entreprise du secteur de l’énergie. Présentation des services, structuration des contenus et mise en place d’un parcours facilitant la prise de contact.",
      "Showcase website for an energy-sector company. Service presentation, content structure, and a contact-oriented user journey.",
    ),
    stack: ["Next.js", "React", "TypeScript"],
  },
  {
    id: 4,
    name: "AutomatIA",
    description: L(
      "Automatisation, IA, Identification de processus, RGPD",
      "Automation, AI, process discovery, GDPR",
    ),
    summary: L(
      "Automatisation du traitement des e-mails et documents métier à l’aide de l’IA. La solution analyse les demandes reçues, leurs pièces jointes et leur contenu afin de faciliter leur qualification et leur orientation.",
      "AI-powered automation for business emails and documents. The solution analyzes incoming requests, attachments, and content to support qualification and routing.",
    ),
    stack: ["Azure OpenAI", "Power Automate"],
  },
  {
    id: 5,
    name: "Savage",
    url: "https://savage-block-party.glennrichard-dev.workers.dev/",
    description: L("Site web vitrine, E-commerce", "Showcase site, E-commerce"),
    summary: L(
      "Site web du collectif Savage Block Party, conçu pour présenter son univers, ses événements et ses contenus. Le projet intègre également une dimension e-commerce pour la vente de produits et de merchandising.",
      "Website for the Savage Block Party collective, built to present its universe, events, and content. It also includes e-commerce for products and merchandising.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 6,
    name: "The Message",
    url: "https://wearethemessage.fr",
    description: L("Site web expérience", "Experience website"),
    summary: L(
      "Expérience web interactive centrée sur la direction artistique, l’animation et la mise en scène du contenu. Un projet davantage orienté creative development et expérimentation web.",
      "Interactive web experience focused on art direction, animation, and content staging. A project oriented toward creative development and web experimentation.",
    ),
    stack: ["Next.js", "React"],
  },
]

export function projectCopy(
  copy: LocalizedCopy | undefined,
  lang: ProjectLang,
): string {
  if (!copy) return ""
  return copy[lang] || copy.fr
}
