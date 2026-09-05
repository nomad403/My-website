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
      "Application mobile de planification adaptative, assistée par l'intelligence artificielle.",
      "Mobile planning app with adaptive scheduling powered by artificial intelligence.",
    ),
    stack: ["Kotlin", "Jetpack Compose", "Azure OpenAI"],
  },
  {
    id: 2,
    name: "TurnUpSphere",
    description: L("Application Android", "Android app"),
    summary: L(
      "Plateforme événementielle géolocalisée pour découvrir et rejoindre des événements autour de soi.",
      "Geolocated event platform to discover and join what's happening nearby.",
    ),
    stack: ["Kotlin", "Jetpack Compose"],
  },
  {
    id: 3,
    name: "ras-energies.com",
    url: "https://paris.ras-energies.com",
    description: L("Site web vitrine", "Showcase website"),
    summary: L(
      "Vitrine professionnelle responsive pour Refrig'Air Services / RAS Energies.",
      "Responsive professional showcase for Refrig'Air Services / RAS Energies.",
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
      "Solution d'automatisation assistée par l'IA, orientée identification de processus et conformité RGPD — notamment pour le secteur public.",
      "AI-assisted automation focused on process discovery and GDPR compliance — including public-sector use cases.",
    ),
    stack: ["Azure OpenAI", "Power Automate"],
  },
  {
    id: 5,
    name: "Nomad403",
    description: L("Site web intéractif", "Interactive website"),
    summary: L(
      "Portfolio génératif interactif : expérience web 3D, typographie vivante et navigation immersive.",
      "Interactive generative portfolio: 3D web experience, living typography, and immersive navigation.",
    ),
    stack: ["Next.js", "Three.js", "React Three Fiber", "TypeScript"],
  },
  {
    id: 6,
    name: "Savage Block Party",
    url: "https://savage-block-party.glennrichard-dev.workers.dev/",
    description: L("Site web vitrine, E-commerce", "Showcase site, E-commerce"),
    summary: L(
      "Site vitrine e-commerce pour un événement / univers Savage Block Party.",
      "Showcase e-commerce site for the Savage Block Party universe.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 7,
    name: "The Message",
    url: "https://wearethemessage.fr",
    description: L("Site web expérience", "Experience website"),
    summary: L(
      "Site expérience pour We Are The Message — narration web immersive.",
      "Experience site for We Are The Message — immersive web storytelling.",
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
