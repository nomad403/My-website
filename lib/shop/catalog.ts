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
  sharedService("monitoring", {"fr":"Surveillance continue","en":"Continuous monitoring"}, {"included":true,"value":{"fr":"Continue","en":"Continuous"}}),
  sharedService("protection", {"fr":"Protection contre les attaques courantes","en":"Protection against common attacks"}, {"included":true,"value":{"fr":"Incluse","en":"Included"}}),
  sharedService("security_review", {"fr":"Contrôle de sécurité mensuel","en":"Monthly security review"}, {"included":true,"value":{"fr":"Mensuel","en":"Monthly"}}),
  sharedService("backups", {"fr":"Sauvegardes automatiques","en":"Automatic backups"}, {"included":true,"value":{"fr":"Automatiques","en":"Automatic"}}),
  {
    id: "admin_panel",
    label: {"fr":"Espace d'administration","en":"Admin panel"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":true,"value":{"fr":"Inclus","en":"Included"}},
      premium: {"included":true,"value":{"fr":"Inclus","en":"Included"}},
    },
  },
  {
    id: "content_changes",
    label: {"fr":"Modifications de contenu","en":"Content changes"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non incluses","en":"Not included"}},
      plus: {"included":true,"value":{"fr":"30 min/mois","en":"30 min/month"}},
      premium: {"included":true,"value":{"fr":"90 min/mois","en":"90 min/month"}},
    },
  },
  {
    id: "activity_report",
    label: {"fr":"Rapport d'activité","en":"Activity report"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":true,"value":{"fr":"Simplifié","en":"Summary"}},
      premium: {"included":true,"value":{"fr":"Détaillé","en":"Detailed"}},
    },
  },
  {
    id: "priority_support",
    label: {"fr":"Assistance prioritaire","en":"Priority support"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non incluse","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non incluse","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"Incluse","en":"Included"}},
    },
  },
  {
    id: "personal_support",
    label: {"fr":"Accompagnement personnalisé","en":"Personal guidance"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non inclus","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"Bilan trimestriel","en":"Quarterly review"}},
    },
  },
  {
    id: "major_evolution_discount",
    label: {"fr":"Réduction sur les évolutions majeures","en":"Discount on major evolutions"},
    levels: {
      essential: {"included":false,"value":{"fr":"Non incluse","en":"Not included"}},
      plus: {"included":false,"value":{"fr":"Non incluse","en":"Not included"}},
      premium: {"included":true,"value":{"fr":"−10 %","en":"−10%"}},
    },
  },
]

const OFFER_COPY: Record<
  PublicOfferCode,
  { name: Localized; summary: Localized; hook: Localized; emphasized?: boolean }
> = {
  essential: {
    name: { fr: "Essential", en: "Essential" },
    summary: {
      fr: "Hébergement, protection et surveillance.",
      en: "Hosting, protection and monitoring.",
    },
    hook: { fr: "C'EST PARTI", en: "LET'S GO" },
  },
  plus: {
    name: { fr: "Plus", en: "Plus" },
    summary: {
      fr: "Essential, avec admin et modifications mensuelles.",
      en: "Essential, with admin panel and monthly edits.",
    },
    hook: { fr: "LEVEL UP", en: "LEVEL UP" },
  },
  premium: {
    name: { fr: "Premium", en: "Premium" },
    summary: {
      fr: "Plus, accompagnement et −10 % sur les évolutions majeures.",
      en: "Plus, guidance and −10% on major evolutions.",
    },
    hook: { fr: "FULL SEND", en: "FULL SEND" },
    emphasized: true,
  },
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
    fr: "Les minutes de modification sont un plafond mensuel non cumulable, pas une réserve de développement.",
    en: "Content-change minutes are a monthly ceiling, not bankable, and not a development reserve.",
  },
  {
    fr: "L'espace d'administration couvre l'accès et la maintenance d'un panneau existant ; son développement initial n'est pas inclus.",
    en: "The admin panel covers access and maintenance of an existing panel; building one from scratch is not included.",
  },
  {
    fr: "La réduction Premium de 10 % s'applique aux nouveaux devis Nomad403, hors hébergement et services tiers, sans cumul promotionnel.",
    en: "The Premium 10% discount applies to new Nomad403 quotes only, excluding hosting and third-party services, and does not stack with other promotions.",
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
      hook: copy.hook,
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
