"use client"

import { useLanguage } from "@/app/contexts/LanguageContext"
import { useBackground } from "@/app/contexts/BackgroundContext"

interface LanguageSwitcherProps {
  isMobile?: boolean
}

const LANGUAGES = [
  { code: "fr" as const, label: "FR" },
  { code: "en" as const, label: "EN" },
]

export default function LanguageSwitcher({ isMobile = false }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage()
  const { mode } = useBackground()

  const tone =
    mode === "night"
      ? "text-white"
      : "text-black"

  const inactive =
    mode === "night"
      ? "text-white/35 hover:text-white/70"
      : "text-black/35 hover:text-black/70"

  return (
    <div
      className={`flex items-center gap-2.5 font-kode text-[0.7rem] font-light uppercase tracking-[0.22em] ${tone} ${
        isMobile ? "justify-start" : ""
      }`}
      role="group"
      aria-label={t("lang.switch")}
    >
      {LANGUAGES.map((lang, index) => {
        const isActive = language === lang.code
        return (
          <span key={lang.code} className="flex items-center gap-2.5">
            {index > 0 ? (
              <span
                className={`select-none ${mode === "night" ? "text-white/20" : "text-black/20"}`}
                aria-hidden
              >
                /
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setLanguage(lang.code)}
              aria-pressed={isActive}
              aria-label={t(`lang.${lang.code}`)}
              title={t(`lang.${lang.code}`)}
              className={`transition-colors duration-300 ${
                isActive ? "text-current" : inactive
              }`}
            >
              {lang.label}
            </button>
          </span>
        )
      })}
    </div>
  )
}
