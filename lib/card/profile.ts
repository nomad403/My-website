export interface CardProfile {
  fullName: string
  givenName: string
  familyName: string
  displayName: string
  company: string
  role: string
  introduction: string
  website: string
  cardUrl: string
  canonicalUrl: string
  email: string
  phone: string
  phoneDisplay: string
  expertise: readonly string[]
  socials: readonly { label: string; url: string }[]
}

export const cardProfile: CardProfile = {
  fullName: "Glenn-Richard BISSANGOU MBOMA",
  givenName: "Glenn-Richard",
  familyName: "BISSANGOU MBOMA",
  displayName: "Glenn-Richard",
  company: "NOMAD403",
  role: "Développeur & Consultant",
  introduction: "Du premier échange à l’expérience finale. Je conçois des outils et des expériences numériques sur mesure.",
  website: "https://nomad403.com",
  cardUrl: "https://nomad403.com/card",
  canonicalUrl: "https://www.nomad403.com/card",
  email: "glennrichard.dev@gmail.com",
  phone: "+33769500472",
  phoneDisplay: "07 69 50 04 72",
  expertise: ["Web", "Android & iOS", "Intelligence artificielle", "Automatisation", "Expériences interactives"],
  // Existing public links verified in SiteSocialFooter.tsx.
  socials: [
    { label: "LinkedIn", url: "https://www.linkedin.com/in/glenn-richard/" },
    { label: "GitHub", url: "https://github.com/nomad403" },
  ],
}
