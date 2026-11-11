"use client"

import type { ReactNode } from "react"
import HeaderLogo from "@/components/chrome/HeaderLogo"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"

export default function AuthFrame({
  titleKey,
  children,
}: {
  titleKey: string
  children: ReactNode
}) {
  const { t } = useLanguage()

  return (
    <main className="min-h-dvh bg-white px-6 py-10 text-black">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <a href="/" aria-label="NOMAD403">
            <HeaderLogo mode="day" variant="loader" />
          </a>
          <LanguageSwitcher mode="day" />
        </div>
        <h1 className="font-kode text-[1.625rem] uppercase leading-none tracking-[0.08em]">
          {t(titleKey)}
        </h1>
        <div className="flex flex-col gap-5 font-home-title text-base leading-relaxed">{children}</div>
      </div>
    </main>
  )
}

export function AuthNote({ code }: { code: string }) {
  const { t } = useLanguage()
  const key = `auth.error.${code}`
  const message = t(key)
  return <p>{message === key ? t("auth.error.unavailable") : message}</p>
}
