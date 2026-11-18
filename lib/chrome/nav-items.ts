export const NAV_ITEMS = [
  {
    id: "home",
    href: "/",
    labelKey: "nav.home",
    ariaLabel: "Accueil - Développeur web mobile freelance Paris NOMAD403",
  },
  {
    id: "projects",
    href: "/projects",
    labelKey: "nav.projects",
    ariaLabel:
      "Portfolio projets - Développement web React Next.js mobile Kotlin Swift",
  },
  {
    id: "specialist",
    href: "/specialist",
    labelKey: "nav.specialist",
    ariaLabel: "Compétences techniques - Expert React Next.js Kotlin Swift IA",
  },
  {
    id: "shop",
    href: "/shop",
    labelKey: "nav.shop",
    ariaLabel: "Shop NOMAD403 - Hébergement, maintenance et suivi",
  },
  {
    id: "contact",
    href: "/contact",
    labelKey: "nav.contact",
    ariaLabel:
      "Contact développeur freelance - Devis gratuit projet web mobile",
    alignEnd: true,
  },
] as const

export type NavItemId = (typeof NAV_ITEMS)[number]["id"]

/** Lien qui quitte le shell du portfolio pour une page document. */
export function leavesPortfolioShell(id: string) {
  return id === "shop"
}
