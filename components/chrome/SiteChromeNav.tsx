"use client"

import Link from "next/link"
import type { MouseEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import HeaderLogo from "@/components/chrome/HeaderLogo"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import ShuffleText from "@/components/ascii/ShuffleText"
import { useLanguage } from "@/contexts/LanguageContext"
import { leavesPortfolioShell, NAV_ITEMS } from "@/lib/chrome/nav-items"

type NavMode = "day" | "night"

interface SiteChromeNavProps {
  mode: NavMode
  currentPage: string
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onPageChange: (page: string) => void
  /** Page document : les liens du portfolio sont de vraies navigations. */
  documentNavigation?: boolean
}

function followNavLink(
  event: MouseEvent<HTMLAnchorElement>,
  itemId: string,
  documentNavigation: boolean,
  onPageChange: (page: string) => void,
) {
  if (documentNavigation || leavesPortfolioShell(itemId)) {
    if (documentNavigation) onPageChange(itemId)
    return
  }
  event.preventDefault()
  onPageChange(itemId)
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
  documentNavigation = false,
}: SiteChromeNavProps) {
  const { t } = useLanguage()
  const logo = <HeaderLogo mode={mode} />

  return (
    <nav
      className={`site-chrome site-grid top-0 left-0 right-0 z-50 py-4 md:py-8 ${
        documentNavigation ? "sticky bg-white" : "absolute"
      }`}
    >
      <div className="site-grid-inner flex items-start justify-between gap-4">
        {documentNavigation ? (
          <Link
            href="/"
            onClick={() => onPageChange("home")}
            aria-label="Accueil — Glenn Richard"
            data-header-align="logo"
            className="py-2 text-left transition-colors duration-300"
          >
            {logo}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onPageChange("home")}
            aria-label="Accueil — Glenn Richard"
            data-header-align="logo"
            className="py-2 text-left transition-colors duration-300"
          >
            {logo}
          </button>
        )}

        <div className="flex items-start gap-3 md:gap-5">
        <div className="hidden items-center gap-x-4 font-kode text-[0.75rem] font-normal uppercase tracking-[0.08em] md:flex lg:gap-x-8 lg:text-[0.8125rem]">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => followNavLink(e, item.id, documentNavigation, onPageChange)}
              aria-label={item.ariaLabel}
              aria-current={currentPage === item.id ? "page" : undefined}
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
        {documentNavigation && currentPage !== "shop" ? (
          <div className="pt-2">
            <LanguageSwitcher mode={mode} />
          </div>
        ) : null}

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
      </div>
    </nav>
  )
}

interface SiteChromeMobileMenuProps {
  mode: NavMode
  currentPage: string
  isOpen: boolean
  onPageChange: (page: string) => void
  documentNavigation?: boolean
}

export function SiteChromeMobileMenu({
  mode,
  currentPage,
  isOpen,
  onPageChange,
  documentNavigation = false,
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
          className={`${documentNavigation ? "fixed z-40 bg-white" : "absolute z-30"} inset-0 flex flex-col justify-center overflow-y-auto px-6 pb-24 pt-24 md:hidden ${
            mode === "night" ? "text-white" : "text-black"
          }`}
        >
          <div className="flex flex-col gap-5 font-kode text-[1.625rem] font-normal uppercase leading-[1.08] tracking-[0.06em]">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={(e) => followNavLink(e, item.id, documentNavigation, onPageChange)}
                aria-label={item.ariaLabel}
                aria-current={currentPage === item.id ? "page" : undefined}
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
          <div className="mt-10 flex flex-col items-start gap-4">
            <LanguageSwitcher isMobile={true} />
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  )
}
