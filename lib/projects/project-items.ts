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
      "Application Android de planification assistée par IA.\nMonday explore une organisation adaptative des tâches et de l’emploi du temps pour simplifier le quotidien et limiter la saisie manuelle.",
      "An AI-assisted Android planning app.\nMonday explores adaptive task and schedule management to simplify everyday organization and reduce manual input.",
    ),
    stack: ["Kotlin", "Jetpack Compose", "Azure OpenAI"],
  },
  {
    id: 2,
    name: "TurnUpSphere",
    description: L("Application Android", "Android app"),
    summary: L(
      "Application Android pour découvrir les événements et activités à proximité grâce à la géolocalisation.\nTurnUpSphere rassemble les sorties dans une seule interface pour faciliter les découvertes spontanées.",
      "An Android app for discovering nearby events and activities through geolocation.\nTurnUpSphere brings local outings into one interface to make spontaneous discovery easier.",
    ),
    stack: ["Kotlin", "Jetpack Compose"],
  },
  {
    id: 3,
    name: "ras-energies",
    url: "https://paris.ras-energies.com",
    description: L("Site web vitrine", "Showcase website"),
    summary: L(
      "Spécialiste de l’installation et de la maintenance frigorifique pour particuliers et professionnels, RAS Énergies souhaitait moderniser sa présence en ligne.\nUn site vitrine pour valoriser son savoir-faire et renforcer son image professionnelle.",
      "A refrigeration installation and maintenance specialist serving residential and business customers, RAS Énergies wanted to modernize its online presence.\nA showcase website to highlight its expertise and strengthen its professional image.",
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
      "Système d’IA conçu pour analyser, classer et orienter les courriels d’une collectivité territoriale.\nAutomatIA vise à alléger le traitement des demandes en s’intégrant aux outils existants, avec une attention particulière aux données sensibles.",
      "An AI system designed to analyze, classify, and route emails for a local authority.\nAutomatIA aims to streamline request handling within existing tools, with particular attention to sensitive data.",
    ),
    stack: ["Azure OpenAI", "Power Automate"],
  },
  {
    id: 5,
    name: "Savage",
    url: "https://savage-block-party.glennrichard-dev.workers.dev/",
    description: L("Site web vitrine, E-commerce", "Showcase site, E-commerce"),
    summary: L(
      "Collectif d’artistes, danseurs et DJs de la scène underground parisienne, actif à l’international.\nLe projet vise à créer une première présence numérique fidèle à son identité, pour mettre en valeur ses événements et réunir sa communauté.",
      "A Paris underground collective of artists, dancers, and DJs with an international presence.\nThe project aims to establish its first digital home, reflecting its identity, showcasing its events, and bringing its community together.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 6,
    name: "The Message",
    url: "https://wearethemessage.fr",
    description: L("Site web expérience", "Experience website"),
    summary: L(
      "The Message réunit danseurs et beatmakers autour de créations vidéo communes.\nUne expérience web pensée pour traduire cette rencontre artistique, valoriser les capsules et réunir les contenus dans une identité cohérente.",
      "The Message brings dancers and beatmakers together through collaborative video creations.\nA web experience designed to express this artistic exchange, showcase the videos, and unite the content within a cohesive identity.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 7,
    name: "Saki",
    url: "https://nefersaki-com.glennrichard-dev.workers.dev/",
    description: L("Site web marque, e-commerce", "Brand website, e-commerce"),
    summary: L(
      "Artiste et directrice artistique, SAKI mêle 3D, graphisme, photographie, motion design et vidéo.\nUn portfolio immersif centré sur l’image, pensé pour valoriser ses projets et unifier ses disciplines dans un univers cohérent.",
      "Artist and art director SAKI works across 3D, graphic design, photography, motion design, and video.\nAn immersive, image-led portfolio designed to showcase her projects and unite her disciplines within a cohesive visual world.",
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
