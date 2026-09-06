"use client"

import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import HeaderLogo from "@/components/HeaderLogo"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import ShuffleText from "@/components/ShuffleText"
import { useLanguage } from "@/app/contexts/LanguageContext"

type NavMode = "day" | "night"

const NAV_ITEMS = [
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
    id: "contact",
    href: "/contact",
    labelKey: "nav.contact",
    ariaLabel:
      "Contact développeur freelance - Devis gratuit projet web mobile",
    alignEnd: true,
  },
] as const

interface SiteChromeNavProps {
  mode: NavMode
  currentPage: string
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onPageChange: (page: string) => void
}

function navLinkClass(mode: NavMode, isActive: boolean) {
  const base = "nav-link transition-all duration-300"
  const active = isActive ? "active" : ""
  const tone =
    mode === "night"
      ? "text-white hover:text-cyan-400 night-mode"
      : "text-black hover:text-cyan-400 day-mode"
  return `${base} ${active} ${tone}`
}

function mobileLinkClass(mode: NavMode, isActive: boolean) {
  if (isActive) {
    return mode === "night" ? "text-cyan-400" : "text-cyan-500"
  }
  return mode === "night"
    ? "text-white/80 hover:text-cyan-400"
    : "text-black/75 hover:text-cyan-500"
}

export default function SiteChromeNav({
  mode,
  currentPage,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onPageChange,
}: SiteChromeNavProps) {
  const { t } = useLanguage()

  return (
    <nav className="site-chrome absolute top-0 left-0 right-0 z-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl items-start justify-between">
        <button
          type="button"
          onClick={() => onPageChange("home")}
          aria-label="Accueil — Glenn Richard"
          data-header-align="logo"
          className="py-2 text-left transition-colors duration-300"
        >
          <HeaderLogo mode={mode} />
        </button>

        <div className="hidden items-center space-x-8 font-kode text-[0.95rem] font-light uppercase tracking-[0.04em] md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => {
                e.preventDefault()
                onPageChange(item.id)
              }}
              aria-label={item.ariaLabel}
              data-header-align={
                "alignEnd" in item && item.alignEnd ? "nav-end" : undefined
              }
              className={navLinkClass(mode, currentPage === item.id)}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>
                {t(item.labelKey)}
              </ShuffleText>
            </Link>
          ))}
        </div>

        <button
          type="button"
          onClick={onToggleMobileMenu}
          data-header-align="nav-end-mobile"
          className={`self-start p-2 transition-colors duration-300 md:hidden ${
            mode === "night"
              ? isMobileMenuOpen
                ? "text-cyan-400"
                : "text-white"
              : isMobileMenuOpen
                ? "text-cyan-500"
                : "text-black"
          }`}
          aria-expanded={isMobileMenuOpen}
          aria-label="Menu"
        >
          <div className="relative h-6 w-6">
            <motion.span
              className="absolute left-0 right-0 top-1/2 block h-[2px] w-6 rounded-full bg-current will-change-transform"
              style={{ transformOrigin: "50% 50%" }}
              animate={
                isMobileMenuOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -6 }
              }
              transition={{ duration: 0.18, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute left-0 right-0 top-1/2 block h-[2px] w-6 rounded-full bg-current will-change-transform"
              style={{ transformOrigin: "50% 50%" }}
              animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.12, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute left-0 right-0 top-1/2 block h-[2px] w-6 rounded-full bg-current will-change-transform"
              style={{ transformOrigin: "50% 50%" }}
              animate={
                isMobileMenuOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 6 }
              }
              transition={{ duration: 0.18, ease: "easeInOut" }}
            />
          </div>
        </button>
      </div>
    </nav>
  )
}

interface SiteChromeMobileMenuProps {
  mode: NavMode
  currentPage: string
  isOpen: boolean
  onPageChange: (page: string) => void
}

export function SiteChromeMobileMenu({
  mode,
  currentPage,
  isOpen,
  onPageChange,
}: SiteChromeMobileMenuProps) {
  const { t } = useLanguage()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.nav
          key="mobile-body-menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          aria-label="Navigation mobile"
          className={`absolute inset-0 z-30 flex flex-col justify-center px-6 pb-24 pt-24 md:hidden ${
            mode === "night" ? "text-white" : "text-black"
          }`}
        >
          <div className="flex flex-col gap-5 font-kode text-2xl font-light uppercase tracking-[0.05em]">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault()
                  onPageChange(item.id)
                }}
                aria-label={item.ariaLabel}
                className={`w-fit text-left transition-colors duration-300 ${mobileLinkClass(
                  mode,
                  currentPage === item.id,
                )}`}
              >
                <ShuffleText shuffleDuration={150} letterDelay={12}>
                  {t(item.labelKey)}
                </ShuffleText>
              </Link>
            ))}
          </div>
          <div className="mt-10">
            <LanguageSwitcher isMobile={true} />
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
