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

const OFFER_COPY: Record<
  (typeof PUBLIC_OFFER_CODES)[number],
  { name: Localized; summary: Localized; features: Localized[]; emphasized?: boolean }
> = {
  essential: {
    name: { fr: "Essential", en: "Essential" },
    summary: {
      fr: "Hébergement suivi, sans maintenance évolutive.",
      en: "Looked-after hosting, without evolutive maintenance.",
    },
    features: [
      { fr: "Hébergement administré", en: "Managed hosting" },
      { fr: "Certificat SSL", en: "SSL certificate" },
      { fr: "Surveillance de disponibilité", en: "Availability monitoring" },
      { fr: "Sauvegardes adaptées au projet", en: "Backups suited to the project" },
      { fr: "Aucune maintenance évolutive incluse", en: "No evolutive maintenance included" },
    ],
  },
  plus: {
    name: { fr: "Plus", en: "Plus" },
    summary: {
      fr: "Maintenance préventive et assistance standard.",
      en: "Preventive maintenance and standard assistance.",
    },
    features: [
      { fr: "Ensemble Essential", en: "Everything in Essential" },
      { fr: "Maintenance préventive", en: "Preventive maintenance" },
      { fr: "Contrôles de sécurité", en: "Security checks" },
      { fr: "Assistance technique standard", en: "Standard technical assistance" },
      { fr: "Bilan technique trimestriel", en: "Quarterly technical review" },
      {
        fr: "Modifications de contenu à la demande non incluses",
        en: "On-demand content changes are not included",
      },
    ],
  },
  premium: {
    name: { fr: "Premium", en: "Premium" },
    summary: {
      fr: "Suivi prioritaire et évolutions légères, dans un plafond clair.",
      en: "Priority follow-up and light changes, within a clear ceiling.",
    },
    emphasized: true,
    features: [
      { fr: "Ensemble Plus", en: "Everything in Plus" },
      { fr: "Maintenance évolutive légère", en: "Light evolutive maintenance" },
      { fr: "Ajustements mineurs de l'existant", en: "Minor adjustments to what already exists" },
      {
        fr: "Une heure d'intervention par mois, non cumulable",
        en: "One intervention hour per month, not bankable",
      },
      { fr: "Traitement prioritaire", en: "Priority handling" },
      { fr: "Bilan technique mensuel", en: "Monthly technical review" },
    ],
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
      features: copy.features,
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
