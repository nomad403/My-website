"use client"

import AuthFrame from "@/components/auth/AuthFrame"
import { useLanguage } from "@/contexts/LanguageContext"

const buttonClass =
  "font-kode min-h-12 rounded-full border border-black bg-black px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"

export default function VerifyForm({ token, error }: { token: string; error?: string }) {
  const { t } = useLanguage()
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token)
  const errorKey =
    error === "limited"
      ? "auth.verifyLimited"
      : error === "unavailable"
        ? "auth.verifyUnavailable"
        : error
          ? "auth.verifyInvalid"
          : ""

  return (
    <AuthFrame titleKey="auth.verifyTitle">
      <p>{t("auth.verifyBody")}</p>
      {errorKey ? (
        <p role="alert">{t(errorKey)}</p>
      ) : null}
      {validToken ? (
        <form method="post" action="/api/auth/verify" className="flex flex-col gap-4">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className={buttonClass}>
            {t("auth.verifyContinue")}
          </button>
        </form>
      ) : (
        <p>{t("auth.verifyMissing")}</p>
      )}
    </AuthFrame>
  )
}
