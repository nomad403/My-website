import { publicPlans, type BillingInterval, type PlanCode } from "./plans"

export const SHOP_SECTIONS = [
  "offers",
  "subscriptions",
  "billing",
  "interventions",
  "account",
] as const

export type ShopSection = (typeof SHOP_SECTIONS)[number]
export type ShopLanguage = "fr" | "en"

export type Localized = { fr: string; en: string }

const PUBLIC_OFFER_CODES = ["essential", "plus", "premium"] as const satisfies readonly PlanCode[]

type PublicOfferCode = (typeof PUBLIC_OFFER_CODES)[number]

type ServiceLevel = { value: Localized; included: boolean; note?: Localized }

// One ordered set of criteria keeps the three existing cards comparable.
// Setup notes distinguish commercial inclusion from verified operation.
type ServiceCriterion = { id: string; label: Localized; levels: Record<PublicOfferCode, ServiceLevel> }

function sharedService(id: string, label: Localized, level: ServiceLevel): ServiceCriterion {
  return { id, label, levels: { essential: level, plus: level, premium: level } }
}

export const SHOP_SERVICE_CRITERIA: ServiceCriterion[] = [
  sharedService("hosting", {"fr":"Hébergement du site","en":"Website hosting"}, {"included":true,"value":{"fr":"Inclus","en":"Included"}}),
  sharedService("https", {"fr":"Certificat HTTPS","en":"HTTPS certificate"}, {"included":true,"value":{"fr":"Inclus","en":"Included"}}),
  sharedService("monitoring", {"fr":"Surveillance du site","en":"Website monitoring"}, {"included":true,"value":{"fr":"Continue","en":"Continuous"},"note":{"fr":"À configurer","en":"Setup required"}}),
  sharedService("protection", {"fr":"Protection contre les attaques courantes","en":"Protection against common attacks"}, {"included":true,"value":{"fr":"Incluse","en":"Included"},"note":{"fr":"À configurer et vérifier","en":"Setup and verification required"}}),
  sharedService("security_review", {"fr":"Contrôle de sécurité","en":"Security review"}, {"included":true,"value":{"fr":"Mensuel","en":"Monthly"},"note":{"fr":"À planifier","en":"Scheduling required"}}),
  sharedService("backups", {"fr":"Sauvegardes","en":"Backups"}, {"included":true,"value":{"fr":"Automatiques","en":"Automatic"},"note":{"fr":"À configurer et tester","en":"Setup and recovery testing required"}}),
  {
    id: "content_changes", label: {"fr":"Modifications de contenu","en":"Content changes"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"60 min/mois","en":"60 min/month"},"note":{"fr":"Mineures, sans report ; développements sur devis.","en":"Minor changes, no rollover; development quoted separately."}},
    },
  },
  {
    id: "activity_report", label: {"fr":"Rapport d'activité","en":"Activity report"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":true,"value":{"fr":"Simplifié","en":"Summary"},"note":{"fr":"Remise manuelle à organiser","en":"Manual delivery to arrange"}},
      premium: {"included":true,"value":{"fr":"Détaillé","en":"Detailed"},"note":{"fr":"Remise manuelle à organiser","en":"Manual delivery to arrange"}},
    },
  },
  {
    id: "priority_support", label: {"fr":"Assistance prioritaire","en":"Priority support"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"Incluse","en":"Included"},"note":{"fr":"Sans délai garanti","en":"No guaranteed response time"}},
    },
  },
  {
    id: "personal_support", label: {"fr":"Accompagnement personnalisé","en":"Personal guidance"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"Bilan trimestriel","en":"Quarterly review"},"note":{"fr":"À planifier","en":"Scheduling required"}},
    },
  },
]

const OFFER_COPY: Record<PublicOfferCode, { name: Localized; summary: Localized; emphasized?: boolean }> = {
  "essential": {
    "name": {
      "fr": "Essential",
      "en": "Essential"
    },
    "summary": {
      "fr": "Votre site hébergé, surveillé et protégé.",
      "en": "Your website hosted, monitored and protected."
    }
  },
  "plus": {
    "name": {
      "fr": "Plus",
      "en": "Plus"
    },
    "summary": {
      "fr": "Votre site protégé et suivi régulièrement.",
      "en": "Your website protected and regularly maintained."
    }
  },
  "premium": {
    "name": {
      "fr": "Premium",
      "en": "Premium"
    },
    "summary": {
      "fr": "Votre site protégé, entretenu et accompagné.",
      "en": "Your website protected, maintained and supported."
    },
    "emphasized": true
  }
}

export const SHOP_CONDITIONS: Localized[] = [
  {
    fr: "Aucune garantie de disponibilité permanente.",
    en: "No promise of continuous availability.",
  },
  {
    fr: "Les coûts d'API et de services tiers restent hors forfait, sauf plafond convenu.",
    en: "Third-party API and service costs stay outside the plan, unless a cap is agreed.",
  },
  {
    fr: "Un projet complexe peut être exclu et faire l'objet d'un devis.",
    en: "A complex project may be excluded and quoted separately.",
  },
  {
    fr: "L'abonnement annuel est débité en une fois. Il correspond à dix mois : deux mois sont inclus.",
    en: "The yearly plan is charged once. It equals ten months, so two months are included.",
  },
  {
    fr: "L'heure Premium est un plafond d'intervention, pas une réserve de développement.",
    en: "The Premium hour is an intervention ceiling, not a development reserve.",
  },
]

export function shopText(value: Localized, language: string) {
  return language === "en" ? value.en : value.fr
}

export function parseShopSection(value: string | null): ShopSection {
  if (value && (SHOP_SECTIONS as readonly string[]).includes(value)) return value as ShopSection
  return "offers"
}

export function parseShopInterval(value: string | null): BillingInterval {
  return value === "year" ? "year" : "month"
}

export function formatEuro(cents: number, language: string) {
  return new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function publicShopOffers() {
  const plans = publicPlans()
  return PUBLIC_OFFER_CODES.map((code) => {
    const plan = plans.find((item) => item.code === code)
    const copy = OFFER_COPY[code]
    if (!plan || plan.visibility !== "public" || plan.yearlyAmountCents == null) return null
    return {
      code,
      emphasized: Boolean(copy.emphasized),
      name: copy.name,
      summary: copy.summary,
      features: SHOP_SERVICE_CRITERIA.map(criterion => ({ id: criterion.id, label: criterion.label, ...criterion.levels[code] })),
      monthlyAmountCents: plan.monthlyAmountCents,
      yearlyAmountCents: plan.yearlyAmountCents,
    }
  }).filter((offer): offer is NonNullable<typeof offer> => offer !== null)
}

const PRIVATE_CODES = ["friend_host", "friend_care"]

export function catalogExposesPrivateOffers() {
  const serialized = JSON.stringify(publicShopOffers())
  return PRIVATE_CODES.some((code) => serialized.includes(code))
}
