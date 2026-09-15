import type { PageId } from "@/lib/home/page-config"

export type DemoLang = "fr" | "en"
export type DemoScope = "all" | PageId

/** Cible d’affichage du texte narré. */
export type DemoVoiceTarget = "page" | "focus"

/** Une réplique « sous-titre » : shuffle primary → alternate. */
export type DemoVoice = {
  lines: readonly string[]
  alternate: readonly string[]
  /** Détail projet : type / angle (eyebrow). */
  detailEyebrow?: string
  /** Détail projet : pitch court du sujet. */
  detailSummary?: string
}

export type DemoBeat =
  | { type: "goto"; page: PageId }
  | { type: "wait"; ms: number }
  | { type: "speak"; voice: DemoVoice; target?: DemoVoiceTarget }
  | { type: "projects.focus"; index: number; voice?: DemoVoice }
  | { type: "specialist.open"; serviceId: string; voice?: DemoVoice }
  | { type: "specialist.close" }

export const DEMO_COPY = {
  fr: {
    launch: "Lancer",
    launchHint: "La capture démarre après le compte à rebours",
    scopeAll: "Parcours complet",
    pages: {
      home: "Home",
      projects: "Projets",
      specialist: "Expertise",
      contact: "Contact",
    } satisfies Record<PageId, string>,
  },
  en: {
    launch: "Play",
    launchHint: "Recording starts after the countdown",
    scopeAll: "Full tour",
    pages: {
      home: "Home",
      projects: "Projects",
      specialist: "Expertise",
      contact: "Contact",
    } satisfies Record<PageId, string>,
  },
} as const

/** Timings speak démo — timeline fixe pour tous les beats. */
export const DEMO_SHUFFLE_MS = 800
export const DEMO_HOLD_MS = 1500
/** arrive → primary → alternate → lecture : 2 shuffles + 2 holds. */
export const DEMO_SPEAK_SEQUENCE_MS =
  DEMO_SHUFFLE_MS + DEMO_HOLD_MS + DEMO_SHUFFLE_MS + DEMO_HOLD_MS
/** Temps supplémentaire pour lire description + stack du détail projet. */
export const DEMO_PROJECT_DETAIL_READ_MS = 2400
export const DEMO_PROJECT_FOCUS_MS =
  DEMO_SPEAK_SEQUENCE_MS + DEMO_PROJECT_DETAIL_READ_MS

/**
 * Titres projets : 1 ligne courte (même typo que la liste).
 * detailEyebrow / detailSummary : pitch rapide dans le panneau détail.
 */
const V = {
  fr: {
    homeIntro: {
      lines: ["Nomad403,", "dev fullstack."],
      alternate: ["Web · mobile · IA", "du front au back."],
    },
    homeValue: {
      lines: ["Tout type de dev,", "du besoin au ship."],
      alternate: ["Apps, APIs, outils —", "alignés sur le métier."],
    },
    projectsIntro: {
      lines: ["Projets livrés"],
      alternate: ["Idée → produit"],
      detailEyebrow: "Portfolio",
      detailSummary:
        "Livraisons fullstack — apps, sites, APIs, automatisations — de l’idée au produit.",
    },
    projectMonday: {
      lines: ["Android + IA"],
      alternate: ["Quotidien"],
      detailEyebrow: "App mobile · IA",
      detailSummary:
        "App Android + IA : logique métier, interface et intégration des services côté produit.",
    },
    projectRas: {
      lines: ["Site énergie"],
      alternate: ["Au contact"],
      detailEyebrow: "Site vitrine",
      detailSummary:
        "Vitrine secteur énergie : front soigné, contenus structurés, parcours vers le contact.",
    },
    projectSavage: {
      lines: ["Site + shop"],
      alternate: ["Live"],
      detailEyebrow: "Vitrine · e-commerce",
      detailSummary:
        "Site + e-commerce : catalogue, parcours d’achat et mise en prod pour Savage Block Party.",
    },
    projectAutomatIA: {
      lines: ["Auto + IA"],
      alternate: ["Mails & docs"],
      detailEyebrow: "Back · IA · workflow",
      detailSummary:
        "Pipeline back + IA : analyse, qualification et routage des e-mails et documents métier.",
    },
    projectTurnUp: {
      lines: ["App musique"],
      alternate: ["App sociale"],
      detailEyebrow: "App Android",
      detailSummary:
        "App mobile sociale : features produit, données et interactions entre utilisateurs.",
    },
    projectMessage: {
      lines: ["Expé web"],
      alternate: ["Fullstack"],
      detailEyebrow: "Web fullstack",
      detailSummary:
        "Expérience web Next.js/React — front, back, intégrations et logique applicative bout en bout.",
    },
    specialistIntro: {
      lines: ["Fullstack,", "tous types de dev."],
      alternate: ["Web, mobile, APIs,", "IA et automatisation."],
    },
    serviceVitrine: {
      lines: ["Site vitrine"],
      alternate: ["Qui convertit"],
    },
    serviceIos: {
      lines: ["Apps iOS"],
      alternate: ["Pour le terrain"],
    },
    serviceAi: {
      lines: ["IA métier"],
      alternate: ["Moins de tâches"],
    },
    serviceWebApp: {
      lines: ["Apps web"],
      alternate: ["Front + back"],
    },
    serviceAndroid: {
      lines: ["Apps Android"],
      alternate: ["Solides, évolutives"],
    },
    serviceAutomation: {
      lines: ["Automatisation"],
      alternate: ["Moins de friction"],
    },
    contactClose: {
      lines: ["Besoin digital ?", "Parlons-en."],
      alternate: ["Fullstack,", "on construit ensemble."],
    },
  },
  en: {
    homeIntro: {
      lines: ["Nomad403,", "fullstack dev."],
      alternate: ["Web · mobile · AI", "front through back."],
    },
    homeValue: {
      lines: ["Any kind of build,", "need to ship."],
      alternate: ["Apps, APIs, tools —", "tied to the business."],
    },
    projectsIntro: {
      lines: ["Shipped work"],
      alternate: ["Idea → product"],
      detailEyebrow: "Portfolio",
      detailSummary:
        "Fullstack deliveries — apps, sites, APIs, automation — from idea to product.",
    },
    projectMonday: {
      lines: ["Android + AI"],
      alternate: ["Daily use"],
      detailEyebrow: "Mobile app · AI",
      detailSummary:
        "Android + AI app: business logic, UI, and service integration end to end.",
    },
    projectRas: {
      lines: ["Energy site"],
      alternate: ["To contact"],
      detailEyebrow: "Showcase site",
      detailSummary:
        "Energy-sector site: solid front, structured content, contact-oriented flow.",
    },
    projectSavage: {
      lines: ["Site + shop"],
      alternate: ["Live"],
      detailEyebrow: "Showcase · shop",
      detailSummary:
        "Site + e-commerce: catalog, checkout flow, and production for Savage Block Party.",
    },
    projectAutomatIA: {
      lines: ["Auto + AI"],
      alternate: ["Mail & docs"],
      detailEyebrow: "Back · AI · workflow",
      detailSummary:
        "Back + AI pipeline: analyze, qualify, and route business emails and documents.",
    },
    projectTurnUp: {
      lines: ["Music app"],
      alternate: ["Social app"],
      detailEyebrow: "Android app",
      detailSummary:
        "Social mobile app: product features, data, and user-to-user interactions.",
    },
    projectMessage: {
      lines: ["Web exp"],
      alternate: ["Fullstack"],
      detailEyebrow: "Web fullstack",
      detailSummary:
        "Next.js/React web experience — front, back, integrations, and app logic end to end.",
    },
    specialistIntro: {
      lines: ["Fullstack,", "any kind of build."],
      alternate: ["Web, mobile, APIs,", "AI and automation."],
    },
    serviceVitrine: {
      lines: ["Showcase site"],
      alternate: ["That converts"],
    },
    serviceIos: {
      lines: ["iOS apps"],
      alternate: ["Field-ready"],
    },
    serviceAi: {
      lines: ["Business AI"],
      alternate: ["Fewer chores"],
    },
    serviceWebApp: {
      lines: ["Web apps"],
      alternate: ["Front + back"],
    },
    serviceAndroid: {
      lines: ["Android apps"],
      alternate: ["Solid, scalable"],
    },
    serviceAutomation: {
      lines: ["Automation"],
      alternate: ["Less friction"],
    },
    contactClose: {
      lines: ["Digital need?", "Let’s talk."],
      alternate: ["Fullstack —", "let’s build it."],
    },
  },
} as const


function tourFor(lang: DemoLang): DemoBeat[] {
  const v = V[lang]
  return [
    { type: "goto", page: "home" },
    { type: "wait", ms: 700 },
    { type: "speak", voice: { ...v.homeIntro }, target: "page" },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
    { type: "speak", voice: { ...v.homeValue }, target: "page" },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },

    { type: "goto", page: "projects" },
    { type: "wait", ms: 800 },
    {
      type: "projects.focus",
      index: 0,
      voice: { ...v.projectMonday },
    },
    { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
    {
      type: "projects.focus",
      index: 2,
      voice: { ...v.projectRas },
    },
    { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
    {
      type: "projects.focus",
      index: 4,
      voice: { ...v.projectSavage },
    },
    { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },

    { type: "goto", page: "specialist" },
    { type: "wait", ms: 800 },
    { type: "speak", voice: { ...v.specialistIntro }, target: "page" },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
    {
      type: "specialist.open",
      serviceId: "web-site-vitrine",
      voice: { ...v.serviceVitrine },
    },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
    {
      type: "specialist.open",
      serviceId: "mobile-ios",
      voice: { ...v.serviceIos },
    },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
    {
      type: "specialist.open",
      serviceId: "ai-assistant-metier",
      voice: { ...v.serviceAi },
    },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
    { type: "specialist.close" },

    { type: "goto", page: "contact" },
    { type: "wait", ms: 700 },
    { type: "speak", voice: { ...v.contactClose }, target: "page" },
    { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
  ]
}

function pageTour(lang: DemoLang, page: PageId): DemoBeat[] {
  const v = V[lang]
  switch (page) {
    case "home":
      return [
        { type: "goto", page: "home" },
        { type: "wait", ms: 600 },
        { type: "speak", voice: { ...v.homeIntro }, target: "page" },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        { type: "speak", voice: { ...v.homeValue }, target: "page" },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
      ]
    case "projects":
      return [
        { type: "goto", page: "projects" },
        { type: "wait", ms: 700 },
        {
          type: "projects.focus",
          index: 0,
          voice: { ...v.projectsIntro },
        },
        { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
        {
          type: "projects.focus",
          index: 1,
          voice: { ...v.projectTurnUp },
        },
        { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
        {
          type: "projects.focus",
          index: 3,
          voice: { ...v.projectAutomatIA },
        },
        { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
        {
          type: "projects.focus",
          index: 5,
          voice: { ...v.projectMessage },
        },
        { type: "wait", ms: DEMO_PROJECT_FOCUS_MS },
      ]
    case "specialist":
      return [
        { type: "goto", page: "specialist" },
        { type: "wait", ms: 700 },
        { type: "speak", voice: { ...v.specialistIntro }, target: "page" },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        {
          type: "specialist.open",
          serviceId: "web-application",
          voice: { ...v.serviceWebApp },
        },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        {
          type: "specialist.open",
          serviceId: "mobile-android",
          voice: { ...v.serviceAndroid },
        },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        {
          type: "specialist.open",
          serviceId: "automation-metier",
          voice: { ...v.serviceAutomation },
        },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        { type: "specialist.close" },
        { type: "wait", ms: 500 },
      ]
    case "contact":
      return [
        { type: "goto", page: "contact" },
        { type: "wait", ms: 600 },
        { type: "speak", voice: { ...v.contactClose }, target: "page" },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
        { type: "speak", voice: { ...v.homeValue }, target: "page" },
        { type: "wait", ms: DEMO_SPEAK_SEQUENCE_MS },
      ]
  }
}

export function getDemoBeats(scope: DemoScope, lang: DemoLang): DemoBeat[] {
  if (scope === "all") return tourFor(lang)
  return pageTour(lang, scope)
}

export const DEMO_PAGE_SETTLE_MS = 750
export const DEMO_COUNTDOWN_STEP_MS = 700
