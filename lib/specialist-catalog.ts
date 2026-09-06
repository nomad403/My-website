export type SpecialistLang = "fr" | "en"

export interface LocalizedCopy {
  fr: string
  en: string
}

export interface SpecialistService {
  id: string
  title: LocalizedCopy
  description: LocalizedCopy
}

export interface SpecialistCategory {
  id: string
  title: LocalizedCopy
  services: SpecialistService[]
}

const L = (fr: string, en: string): LocalizedCopy => ({ fr, en })

export const SPECIALIST_CATALOG: SpecialistCategory[] = [
  {
    id: "web",
    title: L("WEB", "WEB"),
    services: [
      {
        id: "web-site-vitrine",
        title: L("Site vitrine", "Showcase website"),
        description: L(
          "Une présence numérique sur mesure pour présenter votre activité avec clarté et caractère.",
          "A bespoke digital presence to present your business with clarity and character."
        ),
      },
      {
        id: "web-landing-page",
        title: L("Landing page", "Landing page"),
        description: L(
          "Une expérience ciblée autour d'une offre, d'une campagne ou d'un objectif de conversion.",
          "A focused experience built around an offer, a campaign, or a conversion goal."
        ),
      },
      {
        id: "web-e-commerce",
        title: L("E-commerce", "E-commerce"),
        description: L(
          "Une expérience d'achat pensée dans la continuité de votre marque.",
          "A shopping experience designed as a natural extension of your brand."
        ),
      },
      {
        id: "web-application",
        title: L("Application web", "Web application"),
        description: L(
          "Une application accessible depuis le navigateur, conçue autour de fonctionnalités et d'usages spécifiques.",
          "A browser-based application shaped around specific features and use cases."
        ),
      },
      {
        id: "web-outil-metier",
        title: L("Outil métier", "Business tool"),
        description: L(
          "Une interface sur mesure pour simplifier le quotidien de vos équipes.",
          "A custom interface to simplify your teams' day-to-day work."
        ),
      },
      {
        id: "web-dashboard",
        title: L("Tableau de bord", "Dashboard"),
        description: L(
          "Centraliser vos données essentielles dans une interface claire et exploitable.",
          "Centralize your essential data in a clear, actionable interface."
        ),
      },
      {
        id: "web-refonte",
        title: L("Refonte", "Redesign"),
        description: L(
          "Repenser une interface existante pour améliorer son expérience, son identité et ses performances.",
          "Rethink an existing interface to improve experience, identity, and performance."
        ),
      },
      {
        id: "web-reprise-projet",
        title: L("Reprise de projet", "Project takeover"),
        description: L(
          "Comprendre une solution existante et poursuivre son développement sur des bases maîtrisées.",
          "Understand an existing solution and continue its development on solid foundations."
        ),
      },
      {
        id: "web-integration-api",
        title: L("Intégration API", "API integration"),
        description: L(
          "Connecter votre interface aux services et données dont elle a besoin.",
          "Connect your interface to the services and data it relies on."
        ),
      },
      {
        id: "web-maintenance",
        title: L("Maintenance", "Maintenance"),
        description: L(
          "Assurer le suivi technique, les corrections et la stabilité d'une solution existante.",
          "Ensure technical follow-up, fixes, and stability for an existing solution."
        ),
      },
      {
        id: "web-evolution",
        title: L("Évolution", "Enhancement"),
        description: L(
          "Développer de nouvelles fonctionnalités à mesure que vos besoins progressent.",
          "Build new features as your needs evolve."
        ),
      },
    ],
  },
  {
    id: "mobile",
    title: L("MOBILE", "MOBILE"),
    services: [
      {
        id: "mobile-ios",
        title: L("Application iOS", "iOS application"),
        description: L(
          "Une expérience native conçue spécifiquement pour l'écosystème Apple.",
          "A native experience designed specifically for the Apple ecosystem."
        ),
      },
      {
        id: "mobile-android",
        title: L("Application Android", "Android application"),
        description: L(
          "Une expérience native pensée pour l'écosystème Android.",
          "A native experience built for the Android ecosystem."
        ),
      },
      {
        id: "mobile-metier",
        title: L("Application métier", "Business application"),
        description: L(
          "Un outil mobile construit autour des usages de vos collaborateurs et opérations terrain.",
          "A mobile tool built around your teams' workflows and field operations."
        ),
      },
      {
        id: "mobile-mvp",
        title: L("MVP", "MVP"),
        description: L(
          "Une première version fonctionnelle concentrée sur l'essentiel pour confronter rapidement une idée au marché.",
          "A first functional version focused on essentials to quickly test an idea in the market."
        ),
      },
      {
        id: "mobile-prototype",
        title: L("Prototype", "Prototype"),
        description: L(
          "Matérialiser un concept et son expérience avant d'engager son développement complet.",
          "Materialize a concept and its experience before committing to full development."
        ),
      },
      {
        id: "mobile-refonte",
        title: L("Refonte", "Redesign"),
        description: L(
          "Repenser une application existante, de son interface jusqu'à son expérience utilisateur.",
          "Rethink an existing application, from interface to user experience."
        ),
      },
      {
        id: "mobile-reprise-projet",
        title: L("Reprise de projet", "Project takeover"),
        description: L(
          "Reprendre une application existante pour poursuivre, stabiliser ou réorienter son développement.",
          "Take over an existing app to continue, stabilize, or redirect its development."
        ),
      },
      {
        id: "mobile-integration-api",
        title: L("Intégration API", "API integration"),
        description: L(
          "Connecter l'application à vos données et services existants.",
          "Connect the application to your existing data and services."
        ),
      },
      {
        id: "mobile-fonctionnalites-natives",
        title: L("Fonctionnalités natives", "Native features"),
        description: L(
          "Notifications, géolocalisation, caméra, biométrie, stockage local et capacités propres au mobile.",
          "Notifications, geolocation, camera, biometrics, local storage, and mobile-native capabilities."
        ),
      },
      {
        id: "mobile-publication",
        title: L("Publication", "Store release"),
        description: L(
          "Préparer et accompagner la mise en ligne sur les boutiques d'applications.",
          "Prepare and support launch on app stores."
        ),
      },
      {
        id: "mobile-maintenance",
        title: L("Maintenance", "Maintenance"),
        description: L(
          "Assurer la stabilité de l'application et sa compatibilité dans le temps.",
          "Ensure application stability and long-term compatibility."
        ),
      },
      {
        id: "mobile-evolution",
        title: L("Évolution", "Enhancement"),
        description: L(
          "Concevoir et intégrer de nouvelles fonctionnalités au produit existant.",
          "Design and integrate new features into the existing product."
        ),
      },
    ],
  },
  {
    id: "automation",
    title: L("AUTOMATISATION", "AUTOMATION"),
    services: [
      {
        id: "automation-audit-processus",
        title: L("Audit de processus", "Process audit"),
        description: L(
          "Identifier les tâches, flux et opérations où l'automatisation peut créer une valeur concrète.",
          "Identify tasks, flows, and operations where automation can deliver tangible value."
        ),
      },
      {
        id: "automation-metier",
        title: L("Automatisation métier", "Business automation"),
        description: L(
          "Transformer un processus manuel en flux de travail structuré et autonome.",
          "Turn a manual process into a structured, autonomous workflow."
        ),
      },
      {
        id: "automation-emails",
        title: L("Automatisation des e-mails", "Email automation"),
        description: L(
          "Trier, orienter et traiter automatiquement les flux reçus.",
          "Sort, route, and process incoming flows automatically."
        ),
      },
      {
        id: "automation-documentaire",
        title: L("Automatisation documentaire", "Document automation"),
        description: L(
          "Faire circuler, classer et traiter automatiquement documents et pièces jointes.",
          "Automatically route, classify, and process documents and attachments."
        ),
      },
      {
        id: "automation-extraction-donnees",
        title: L("Extraction de données", "Data extraction"),
        description: L(
          "Transformer les informations contenues dans vos documents en données structurées.",
          "Turn information contained in your documents into structured data."
        ),
      },
      {
        id: "automation-synchronisation",
        title: L("Synchronisation d'outils", "Tool synchronization"),
        description: L(
          "Faire circuler automatiquement l'information entre vos applications.",
          "Automatically move information between your applications."
        ),
      },
      {
        id: "automation-administrative",
        title: L("Automatisation administrative", "Administrative automation"),
        description: L(
          "Réduire les opérations manuelles liées aux validations, notifications, relances ou bilans.",
          "Reduce manual work around validations, notifications, follow-ups, and reporting."
        ),
      },
      {
        id: "automation-workflow-api",
        title: L("Orchestration API", "API workflow"),
        description: L(
          "Orchestrer des traitements entre différents services grâce à leurs API.",
          "Orchestrate processing across services through their APIs."
        ),
      },
      {
        id: "automation-reprise",
        title: L("Reprise d'automatisation", "Automation takeover"),
        description: L(
          "Comprendre et reprendre des flux existants pour poursuivre leur exploitation.",
          "Understand and take over existing workflows to keep them running."
        ),
      },
      {
        id: "automation-supervision",
        title: L("Supervision", "Monitoring"),
        description: L(
          "Surveiller les exécutions et identifier les incidents ou comportements anormaux.",
          "Monitor executions and identify incidents or abnormal behavior."
        ),
      },
      {
        id: "automation-maintenance",
        title: L("Maintenance", "Maintenance"),
        description: L(
          "Corriger et maintenir les automatisations utilisées en production.",
          "Fix and maintain automations running in production."
        ),
      },
      {
        id: "automation-evolution",
        title: L("Évolution", "Enhancement"),
        description: L(
          "Étendre un processus existant lorsque les besoins métier évoluent.",
          "Extend an existing process as business needs evolve."
        ),
      },
    ],
  },
  {
    id: "ai",
    title: L("IA", "AI"),
    services: [
      {
        id: "ai-cadrage",
        title: L("Cadrage IA", "AI scoping"),
        description: L(
          "Identifier les cas d'usage où l'intelligence artificielle peut réellement apporter de la valeur.",
          "Identify use cases where artificial intelligence can genuinely add value."
        ),
      },
      {
        id: "ai-integration",
        title: L("Intégration IA", "AI integration"),
        description: L(
          "Ajouter les capacités d'un modèle d'intelligence artificielle à un produit ou outil existant.",
          "Add AI model capabilities to an existing product or tool."
        ),
      },
      {
        id: "ai-assistant-metier",
        title: L("Assistant métier", "Business assistant"),
        description: L(
          "Concevoir une IA spécialisée autour d'un métier, d'un contexte et de règles spécifiques.",
          "Design specialized AI around a trade, context, and specific rules."
        ),
      },
      {
        id: "ai-analyse-contenu",
        title: L("Analyse de contenu", "Content analysis"),
        description: L(
          "Comprendre automatiquement le contenu de textes, demandes ou documents.",
          "Automatically understand the content of texts, requests, or documents."
        ),
      },
      {
        id: "ai-classification",
        title: L("Classification", "Classification"),
        description: L(
          "Identifier automatiquement la nature, l'intention ou la catégorie d'une information.",
          "Automatically identify the nature, intent, or category of information."
        ),
      },
      {
        id: "ai-extraction-intelligente",
        title: L("Extraction intelligente", "Intelligent extraction"),
        description: L(
          "Transformer des contenus non structurés en informations exploitables.",
          "Turn unstructured content into usable information."
        ),
      },
      {
        id: "ai-recherche-documentaire",
        title: L("Recherche documentaire", "Document search"),
        description: L(
          "Permettre de rechercher intelligemment au sein d'un corpus de documents.",
          "Enable intelligent search across a document corpus."
        ),
      },
      {
        id: "ai-rag",
        title: L("RAG", "RAG"),
        description: L(
          "Connecter un modèle d'IA aux connaissances propres à votre organisation.",
          "Connect an AI model to your organization's own knowledge."
        ),
      },
      {
        id: "ai-generation-contenu",
        title: L("Génération de contenu", "Content generation"),
        description: L(
          "Produire des textes et contenus contextualisés à partir de vos informations.",
          "Produce contextualized texts and content from your information."
        ),
      },
      {
        id: "ai-synthese",
        title: L("Synthèse", "Summarization"),
        description: L(
          "Transformer de grands volumes d'informations en éléments essentiels et exploitables.",
          "Turn large volumes of information into essential, actionable insights."
        ),
      },
      {
        id: "ai-prototype",
        title: L("Prototype IA", "AI prototype"),
        description: L(
          "Tester rapidement la faisabilité d'un usage avant son industrialisation.",
          "Quickly test feasibility of a use case before industrialization."
        ),
      },
      {
        id: "ai-reprise-solution",
        title: L("Reprise de solution IA", "AI solution takeover"),
        description: L(
          "Analyser et poursuivre le développement d'une solution existante.",
          "Analyze and continue development of an existing solution."
        ),
      },
      {
        id: "ai-optimisation",
        title: L("Optimisation IA", "AI optimization"),
        description: L(
          "Améliorer la pertinence, les performances ou les coûts d'une solution existante.",
          "Improve relevance, performance, or costs of an existing solution."
        ),
      },
      {
        id: "ai-maintenance",
        title: L("Maintenance", "Maintenance"),
        description: L(
          "Maintenir les composants et intégrations IA utilisés en production.",
          "Maintain AI components and integrations used in production."
        ),
      },
    ],
  },
  {
    id: "consulting",
    title: L("CONSEIL", "CONSULTING"),
    services: [
      {
        id: "consulting-audit-technique",
        title: L("Audit technique", "Technical audit"),
        description: L(
          "Évaluer une solution existante, son architecture, ses dépendances et ses points de vigilance.",
          "Assess an existing solution, its architecture, dependencies, and areas of concern."
        ),
      },
      {
        id: "consulting-architecture",
        title: L("Architecture de solution", "Solution architecture"),
        description: L(
          "Définir la structure technique adaptée aux besoins et contraintes d'un projet.",
          "Define the technical structure suited to a project's needs and constraints."
        ),
      },
      {
        id: "consulting-cadrage",
        title: L("Cadrage technique", "Technical scoping"),
        description: L(
          "Transformer un besoin métier en périmètre technique exploitable avant le développement.",
          "Turn a business need into an actionable technical scope before development."
        ),
      },
      {
        id: "consulting-choix-technologique",
        title: L("Choix technologique", "Technology selection"),
        description: L(
          "Comparer les solutions disponibles selon les contraintes réelles du projet plutôt que selon les tendances.",
          "Compare available solutions based on real project constraints rather than trends."
        ),
      },
      {
        id: "consulting-souverainete",
        title: L("Souveraineté numérique", "Digital sovereignty"),
        description: L(
          "Évaluer les dépendances technologiques, fournisseurs et conditions d'hébergement d'une solution.",
          "Assess technological dependencies, vendors, and hosting conditions of a solution."
        ),
      },
      {
        id: "consulting-donnees",
        title: L("Maîtrise des données", "Data governance"),
        description: L(
          "Identifier où transitent les données, où elles sont stockées et quels acteurs peuvent y accéder.",
          "Identify where data flows, where it is stored, and who can access it."
        ),
      },
      {
        id: "consulting-privacy",
        title: L("Confidentialité dès la conception", "Privacy by design"),
        description: L(
          "Intégrer la protection des données dès les choix de conception et d'architecture.",
          "Integrate data protection from the earliest design and architecture choices."
        ),
      },
      {
        id: "consulting-rgpd",
        title: L("Accompagnement RGPD technique", "GDPR technical support"),
        description: L(
          "Identifier les implications techniques liées au traitement de données personnelles et accompagner leur prise en compte dans la solution.",
          "Identify technical implications of personal data processing and support their integration into the solution. This is not legal advice, compliance certification, or DPO services."
        ),
      },
      {
        id: "consulting-documentation",
        title: L("Documentation technique", "Technical documentation"),
        description: L(
          "Formaliser l'architecture, le fonctionnement, l'exploitation et les choix d'une solution.",
          "Formalize a solution's architecture, operation, maintenance, and key decisions."
        ),
      },
      {
        id: "consulting-faisabilite",
        title: L("Étude de faisabilité", "Feasibility study"),
        description: L(
          "Évaluer les contraintes, risques et solutions possibles avant d'engager un projet.",
          "Assess constraints, risks, and possible solutions before committing to a project."
        ),
      },
    ],
  },
]

export function pickLocalized(copy: LocalizedCopy, lang: SpecialistLang): string {
  return copy[lang]
}
