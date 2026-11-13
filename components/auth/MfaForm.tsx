"use client"

import { useEffect } from "react"
import AuthFrame from "@/components/auth/AuthFrame"
import { useLanguage } from "@/contexts/LanguageContext"

const buttonClass =
  "font-kode inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-black px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"

/**
 * TOTP enrollment is retired: admin access is gated by Cloudflare Access + ADMIN_EMAILS.
 * Keep this route as a soft redirect so old bookmarks do not trap operators.
 */
export default function MfaForm() {
  const { t } = useLanguage()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.replace("/admin")
    }, 1600)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <AuthFrame titleKey="auth.mfaTitle">
      <p>{t("auth.mfaBody")}</p>
      <a href="/admin" className={`${buttonClass} mt-6 w-fit`}>
        {t("auth.mfaContinue")}
      </a>
    </AuthFrame>
  )
}
