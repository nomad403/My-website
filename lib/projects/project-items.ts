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
    url: "https://monday-website.glennrichard-dev.workers.dev/",
    description: L("Application android, IA", "Android app, AI"),
    summary: L(
      "Application Android de planification assistée par IA.\nUne approche adaptative pour organiser tâches et emploi du temps avec moins de saisie manuelle.",
      "An AI-assisted Android planning app.\nAn adaptive approach to managing tasks and schedules with less manual input.",
    ),
    stack: ["Kotlin", "Jetpack Compose", "Azure OpenAI"],
  },
  {
    id: 2,
    name: "TurnUpSphere",
    description: L("Application Android", "Android app"),
    summary: L(
      "Application Android de découverte d’événements et d’activités géolocalisés.\nLes sorties à proximité réunies pour simplifier les découvertes spontanées.",
      "An Android app for discovering location-based events and activities.\nNearby outings in one place for easier, spontaneous discovery.",
    ),
    stack: ["Kotlin", "Jetpack Compose"],
  },
  {
    id: 3,
    name: "ras-energies",
    url: "https://paris.ras-energies.com",
    description: L("Site web vitrine", "Showcase website"),
    summary: L(
      "Installation et maintenance frigorifique pour particuliers et professionnels.\nUn site vitrine pour moderniser l’image de RAS Énergies et valoriser son expertise.",
      "Refrigeration installation and maintenance for homes and businesses.\nA website to modernize RAS Énergies’ image and showcase its expertise.",
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
      "Analyse, classement et orientation des courriels par IA pour une collectivité.\nUn système pensé pour les outils existants et les contraintes des données sensibles.",
      "AI-powered email analysis, classification, and routing for a local authority.\nDesigned around existing tools and sensitive-data requirements.",
    ),
    stack: ["Azure OpenAI", "Power Automate"],
  },
  {
    id: 5,
    name: "Savage",
    url: "https://savage-block-party.glennrichard-dev.workers.dev/",
    description: L("Site web vitrine, E-commerce", "Showcase site, E-commerce"),
    summary: L(
      "Collectif underground parisien d’artistes, danseurs et DJs, actif à l’international.\nUne présence web pour valoriser son identité, ses événements et sa communauté.",
      "A Paris underground collective of artists, dancers, and DJs with international reach.\nA website to showcase its identity, events, and community.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 6,
    name: "The Message",
    url: "https://wearethemessage.fr",
    description: L("Site web expérience", "Experience website"),
    summary: L(
      "Un collectif réunissant danseurs et beatmakers dans des créations vidéo.\nUne expérience web pour valoriser leurs rencontres et leur univers artistique.",
      "A collective bringing dancers and beatmakers together through video creations.\nA web experience showcasing their collaborations and artistic world.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 7,
    name: "Saki",
    url: "https://nefersaki-com.glennrichard-dev.workers.dev/",
    description: L("Site web marque, e-commerce", "Brand website, e-commerce"),
    summary: L(
      "Artiste et directrice artistique : 3D, graphisme, photo, motion design et vidéo.\nUn portfolio immersif pour réunir ses pratiques et mettre l’image au premier plan.",
      "Artist and art director working in 3D, graphics, photography, motion design, and video.\nAn immersive portfolio uniting her disciplines with imagery at its heart.",
    ),
    stack: ["Next.js", "React", "TypeScript"],
  },
]

export function projectCopy(
  copy: LocalizedCopy | undefined,
  lang: ProjectLang,
): string {
  if (!copy) return ""
  return copy[lang] || copy.fr
}
