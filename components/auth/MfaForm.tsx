"use client"

import { useState, type FormEvent } from "react"
import AuthFrame, { AuthNote } from "@/components/auth/AuthFrame"
import { useLanguage } from "@/contexts/LanguageContext"

const buttonClass =
  "font-kode min-h-12 rounded-full border border-black bg-black px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
const inputClass =
  "min-h-12 w-full rounded-xl border border-black/20 bg-white px-4 font-kode text-base focus-visible:border-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"

type Enrollment = {
  secret: string
  otpauthUrl: string
  recoveryCodes: string[]
}

export default function MfaForm() {
  const { t } = useLanguage()
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function enroll() {
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/mfa/enroll", { method: "POST" })
      const body = (await response.json()) as Enrollment & { code?: string }
      if (!response.ok) {
        setError(body.code ?? "unavailable")
        return
      }
      setEnrollment(body)
    } catch {
      setError("unavailable")
    } finally {
      setPending(false)
    }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const body = (await response.json()) as { code?: string }
      if (!response.ok) {
        setError(body.code ?? "unavailable")
        return
      }
      window.location.assign("/admin")
    } catch {
      setError("unavailable")
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthFrame titleKey="auth.mfaTitle">
      <p>{t("auth.mfaBody")}</p>
      {error ? <AuthNote code={error} /> : null}
      <button type="button" className={buttonClass} onClick={enroll} disabled={pending}>
        {t("auth.mfaStart")}
      </button>
      {enrollment ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-black/60">
              {t("auth.mfaSecret")}
            </p>
            <p className="mt-2 break-all font-kode text-sm">{enrollment.secret}</p>
          </div>
          <div>
            <p className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-black/60">
              {t("auth.mfaRecovery")}
            </p>
            <ul className="mt-2 space-y-1 font-kode text-sm">
              {enrollment.recoveryCodes.map((recovery) => (
                <li key={recovery}>{recovery}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <form onSubmit={verify} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-black/60">
            {t("auth.mfaCode")}
          </span>
          <input
            className={inputClass}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            inputMode="text"
            required
          />
        </label>
        <button type="submit" className={buttonClass} disabled={pending}>
          {t("auth.mfaConfirm")}
        </button>
      </form>
    </AuthFrame>
  )
}
