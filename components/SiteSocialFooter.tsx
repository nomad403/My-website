"use client"

import ShuffleText from "@/components/ShuffleText"

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
    <div className="site-chrome absolute bottom-0 left-0 right-0 z-50 p-6 sm:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-kode text-xs font-light uppercase tracking-wider sm:text-sm">
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
      </div>
    </div>
  )
}
