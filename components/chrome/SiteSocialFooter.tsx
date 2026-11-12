"use client"

import SoundToggle from "@/components/chrome/SoundToggle"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import ShuffleText from "@/components/ascii/ShuffleText"

type FooterMode = "day" | "night"

const SOCIAL_LINKS = [
  {
    href: "https://x.com/_nomad_403",
    label: "X",
    ariaLabel:
      "Suivre NOMAD403 sur X (Twitter) - Développeur freelance Paris",
  },
  {
    href: "https://www.linkedin.com/in/glenn-richard/",
    label: "LINKEDIN",
    ariaLabel:
      "Profil LinkedIn de Glenn Richard - Développeur web mobile freelance",
  },
  {
    href: "https://github.com/nomad403",
    label: "GITHUB",
    ariaLabel:
      "Portfolio GitHub de NOMAD403 - Projets React Next.js Kotlin Swift",
  },
] as const

interface SiteSocialFooterProps {
  mode: FooterMode
}

export default function SiteSocialFooter({ mode }: SiteSocialFooterProps) {
  const linkClass =
    mode === "night"
      ? "text-white hover:text-cyan-400"
      : "text-black hover:text-cyan-400"

  return (
    <div className="site-chrome site-grid absolute bottom-0 left-0 right-0 z-50 py-6 md:py-8">
      <div className="site-grid-inner relative flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-kode text-[0.625rem] font-normal uppercase tracking-[0.12em] sm:text-[0.8125rem]">
          {SOCIAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={link.ariaLabel}
              className={`transition-all duration-300 hover:scale-110 ${linkClass}`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>
                {link.label}
              </ShuffleText>
            </a>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
          <SoundToggle />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
