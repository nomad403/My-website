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
      "Monday est une application mobile de planification pensée pour simplifier l’organisation du quotidien. Le projet explore une approche plus adaptative de la gestion du temps, où l’intelligence artificielle accompagne l’utilisateur dans l’organisation de ses tâches et de son emploi du temps, plutôt que de lui imposer une planification entièrement manuelle.",
      "Monday is a mobile planning app designed to simplify everyday organization. The project explores a more adaptive approach to time management, where artificial intelligence supports users in organizing their tasks and schedule instead of forcing a fully manual planning process.",
    ),
    stack: ["Kotlin", "Jetpack Compose", "Azure OpenAI"],
  },
  {
    id: 2,
    name: "TurnUpSphere",
    description: L("Application Android", "Android app"),
    summary: L(
      "TurnUpSphere est une application mobile pensée pour faciliter la découverte d’événements et d’activités autour de soi. Le projet est né de l’idée de rendre la recherche de sorties plus spontanée et intuitive, en réunissant les événements disponibles au sein d’une expérience centrée sur la géolocalisation et la proximité. L’objectif était de permettre à chacun de découvrir simplement ce qui se passe autour de lui, sans multiplier les plateformes et les recherches.",
      "TurnUpSphere is a mobile app designed to make it easier to discover events and activities nearby. The project came from the idea of making the search for outings more spontaneous and intuitive by bringing available events together within an experience centered on geolocation and proximity. The goal was to let anyone easily discover what is happening around them without multiplying platforms and searches.",
    ),
    stack: ["Kotlin", "Jetpack Compose"],
  },
  {
    id: 3,
    name: "ras-energies",
    url: "https://paris.ras-energies.com",
    description: L("Site web vitrine", "Showcase website"),
    summary: L(
      "RAS Énergies accompagne particuliers et professionnels dans l’installation, l’entretien et la maintenance de leurs systèmes frigorifiques. Forte d’une solide expérience dans son domaine, l’entreprise souhaitait moderniser sa présence numérique afin de mieux valoriser son savoir-faire et de construire une image à la hauteur de son expertise.",
      "RAS Énergies supports individuals and professionals with the installation, servicing, and maintenance of their refrigeration systems. With solid experience in its field, the company wanted to modernize its digital presence in order to better showcase its expertise and build an image that reflects the quality of its work.",
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
      "AutomatIA est un système intelligent de traitement et de classification des courriels conçu pour une collectivité territoriale. Face à un volume quotidien important de demandes et de documents, le projet vise à automatiser leur analyse, leur catégorisation et leur orientation grâce à l’intelligence artificielle. Pensé pour s’intégrer aux outils et aux processus existants, AutomatIA accompagne les agents dans le traitement des demandes tout en tenant compte des contraintes propres à un environnement public et aux données sensibles.",
      "AutomatIA is an intelligent email processing and classification system designed for a local authority. Faced with a high daily volume of requests and documents, the project aims to automate their analysis, categorization, and routing through artificial intelligence. Designed to integrate with existing tools and processes, AutomatIA supports staff in handling requests while taking into account the constraints of a public-sector environment and sensitive data.",
    ),
    stack: ["Azure OpenAI", "Power Automate"],
  },
  {
    id: 5,
    name: "Savage",
    url: "https://savage-block-party.glennrichard-dev.workers.dev/",
    description: L("Site web vitrine, E-commerce", "Showcase site, E-commerce"),
    summary: L(
      "Savage Block Party est un collectif d’artistes, danseurs et DJs, figure de la scène underground parisienne et présent également à l’international. Actif depuis plus de cinq ans, le collectif fédère une communauté importante autour de ses événements et de son univers, sans avoir jusqu’alors développé de véritable présence numérique. Le projet devait ainsi transposer cette identité forte en ligne et lui offrir un espace à la hauteur de son rayonnement.",
      "Savage Block Party is a collective of artists, dancers, and DJs, a key figure in the Paris underground scene with an international presence as well. Active for more than five years, the collective has built a strong community around its events and universe without previously developing a true digital presence. The project therefore had to transpose this strong identity online and provide a space worthy of its reach.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 6,
    name: "The Message",
    url: "https://wearethemessage.fr",
    description: L("Site web expérience", "Experience website"),
    summary: L(
      "The Message est un collectif artistique à la croisée des danses non institutionnelles et du beatmaking. À travers une série de capsules vidéo, le projet réunit un danseur et un beatmaker pour confronter leurs univers et donner naissance à une création commune. Porté par cette rencontre entre les disciplines, The Message avait besoin d’une identité numérique forte, capable de traduire son univers artistique tout en offrant un espace cohérent à la diversité de ses contenus.",
      "The Message is an artistic collective at the crossroads of non-institutional dance and beatmaking. Through a series of video capsules, the project brings together a dancer and a beatmaker to confront their worlds and give rise to a shared creation. Built around this meeting between disciplines, The Message needed a strong digital identity capable of translating its artistic universe while providing a coherent space for the diversity of its content.",
    ),
    stack: ["Next.js", "React"],
  },
  {
    id: 7,
    name: "Saki",
    url: "https://nefersaki-com.glennrichard-dev.workers.dev/",
    description: L("Site web marque, e-commerce", "Brand website, e-commerce"),
    summary: L(
      "SAKI est une artiste et directrice artistique dont la pratique navigue entre direction artistique, 3D, graphisme, photographie, motion design et vidéo. Face à la diversité de ses disciplines et de ses collaborations, son portfolio devait dépasser la simple présentation de projets pour devenir une véritable extension de son univers. L’enjeu était de concevoir une expérience numérique forte et immersive, capable de laisser une place centrale aux images tout en réunissant ses différentes pratiques au sein d’une identité cohérente.",
      "SAKI is an artist and art director whose practice moves between art direction, 3D, graphic design, photography, motion design, and video. Given the diversity of her disciplines and collaborations, her portfolio needed to go beyond a simple presentation of projects and become a true extension of her universe. The challenge was to design a strong and immersive digital experience that gives images a central role while bringing her different practices together within a coherent identity.",
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
