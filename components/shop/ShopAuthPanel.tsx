"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { shopText, type Localized } from "@/lib/shop/catalog"
import ShopSubscribeButton from "./ShopSubscribeButton"

const fieldClass =
  "min-h-12 w-full rounded-xl border border-gray-300/50 bg-white px-4 py-3 font-home-title text-base leading-[1.62] text-gray-800 transition-all duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none"

const copy = {
  signIn: { fr: "Connexion", en: "Sign in" },
  signUp: { fr: "Créer un compte", en: "Create an account" },
  forgot: { fr: "Mot de passe oublié", en: "Forgot password" },
  reset: { fr: "Nouveau mot de passe", en: "New password" },
  verify: { fr: "Confirmation e-mail", en: "Email confirmation" },
  signInBody: {
    fr: "Connectez-vous avec votre e-mail et votre mot de passe.",
    en: "Sign in with your email and password.",
  },
  signUpBody: {
    fr: "Créez votre compte. Un e-mail de confirmation (15 min) sera envoyé pour l’activer.",
    en: "Create your account. A confirmation email (15 min) will be sent to activate it.",
  },
  forgotBody: {
    fr: "Indiquez votre e-mail : si un compte existe, un lien de réinitialisation (15 min) sera envoyé.",
    en: "Enter your email: if an account exists, a reset link (15 min) will be sent.",
  },
  resetBody: {
    fr: "Choisissez un nouveau mot de passe (8 caractères minimum).",
    en: "Choose a new password (8 characters minimum).",
  },
  verifyBody: {
    fr: "Confirmation de votre adresse e-mail en cours…",
    en: "Confirming your email address…",
  },
  email: { fr: "Adresse e-mail", en: "Email address" },
  firstName: { fr: "Prénom", en: "First name" },
  lastName: { fr: "Nom", en: "Last name" },
  password: { fr: "Mot de passe", en: "Password" },
  submitSignIn: { fr: "Se connecter", en: "Sign in" },
  submitSignUp: { fr: "Créer le compte", en: "Create account" },
  submitForgot: { fr: "Envoyer le lien", en: "Send reset link" },
  submitReset: { fr: "Enregistrer", en: "Save password" },
  submitResend: { fr: "Renvoyer l’e-mail", en: "Resend email" },
  sending: { fr: "Envoi…", en: "Sending…" },
  working: { fr: "Patientez…", en: "Please wait…" },
  forgotLink: { fr: "Mot de passe oublié ?", en: "Forgot password?" },
  backSignIn: { fr: "Retour à la connexion", en: "Back to sign in" },
  forgotSent: {
    fr: "Si un compte existe pour cette adresse, un e-mail vient d’être envoyé.",
    en: "If an account exists for this address, an email has just been sent.",
  },
  pendingVerification: {
    fr: "Compte créé. Ouvrez le lien reçu par e-mail (15 min) pour activer votre accès.",
    en: "Account created. Open the email link (15 min) to activate access.",
  },
  unverified: {
    fr: "Confirmez d’abord votre adresse e-mail. Vous pouvez renvoyer le lien ci-dessous.",
    en: "Confirm your email first. You can resend the link below.",
  },
  invalid: { fr: "Indiquez une adresse e-mail valide.", en: "Enter a valid email address." },
  passwordInvalid: {
    fr: "Le mot de passe doit contenir entre 8 et 128 caractères.",
    en: "Password must be between 8 and 128 characters.",
  },
  nameInvalid: { fr: "Indiquez un prénom et un nom valides.", en: "Enter a valid first and last name." },
  credentials: { fr: "E-mail ou mot de passe incorrect.", en: "Incorrect email or password." },
  emailTaken: { fr: "Cette adresse e-mail est déjà utilisée.", en: "This email address is already in use." },
  limited: { fr: "Trop de demandes. Réessayez plus tard.", en: "Too many requests. Try again later." },
  unavailable: {
    fr: "Service temporairement indisponible. Réessayez plus tard.",
    en: "Service temporarily unavailable. Try again later.",
  },
  resetInvalid: { fr: "Lien invalide ou expiré.", en: "Link is invalid or expired." },
  failed: { fr: "La demande a échoué.", en: "The request failed." },
} satisfies Record<string, Localized>

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "verify"

function mapError(code?: string): Localized {
  if (code === "email_invalid") return copy.invalid
  if (code === "password_invalid") return copy.passwordInvalid
  if (code === "name_invalid") return copy.nameInvalid
  if (code === "credentials_invalid") return copy.credentials
  if (code === "email_taken") return copy.emailTaken
  if (code === "email_unverified") return copy.unverified
  if (code === "rate_limited") return copy.limited
  if (code === "link_invalid") return copy.resetInvalid
  if (code === "unavailable") return copy.unavailable
  return copy.failed
}

export default function ShopAuthPanel({
  language,
  purpose,
  onAuthenticated,
}: {
  language: string
  purpose?: Localized | null
  onAuthenticated?: () => void
}) {
  const params = useSearchParams()
  const resetToken = params.get("reset") ?? ""
  const verifyToken = params.get("verify") ?? ""
  const [mode, setMode] = useState<AuthMode>(verifyToken ? "verify" : resetToken ? "reset" : "signin")
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<Localized | null>(null)
  const verifyStarted = useRef(false)

  function finishAuth(role?: string) {
    if (onAuthenticated) {
      onAuthenticated()
      return
    }
    window.location.assign(role === "admin" ? "/admin" : "/shop?auth=signed-in&section=account")
  }

  async function post(endpoint: string, payload: Record<string, string | undefined>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    })
    const body = (await response.json().catch(() => null)) as {
      code?: string
      role?: string
      pendingVerification?: boolean
    } | null
    return { response, body }
  }

  useEffect(() => {
    if (resetToken) setMode("reset")
    if (verifyToken) setMode("verify")
  }, [resetToken, verifyToken])

  useEffect(() => {
    if (!verifyToken || verifyStarted.current) return
    verifyStarted.current = true
    setPending(true)
    setStatus(null)
    void post("/api/auth/verify-email", { token: verifyToken })
      .then(({ response, body }) => {
        if (response.ok) {
          finishAuth(body?.role)
          return
        }
        setStatus(mapError(body?.code ?? (response.status === 503 ? "unavailable" : undefined)))
        setMode("signin")
      })
      .catch(() => setStatus(copy.failed))
      .finally(() => setPending(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per verify token
  }, [verifyToken])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus(null)
    try {
      const endpoint =
        mode === "signin"
          ? "/api/auth/login"
          : mode === "signup"
            ? "/api/auth/signup"
            : mode === "forgot"
              ? "/api/auth/password/forgot"
              : "/api/auth/password/reset"
      const payload =
        mode === "signin"
          ? { email, password }
          : mode === "signup"
            ? { email, password, firstName, lastName }
            : mode === "forgot"
              ? { email }
              : { token: resetToken, password }
      const { response, body } = await post(endpoint, payload)
      if (response.ok) {
        if (mode === "forgot") {
          setStatus(copy.forgotSent)
          return
        }
        if (mode === "signup" || body?.pendingVerification) {
          setStatus(copy.pendingVerification)
          setMode("signin")
          setPassword("")
          return
        }
        finishAuth(body?.role)
        return
      }
      setStatus(mapError(body?.code ?? (response.status === 503 ? "unavailable" : undefined)))
    } catch {
      setStatus(copy.failed)
    } finally {
      setPending(false)
    }
  }

  async function resendVerification() {
    if (!email) {
      setStatus(copy.invalid)
      return
    }
    setPending(true)
    setStatus(null)
    try {
      const { response, body } = await post("/api/auth/verify-email/resend", { email })
      if (response.ok) setStatus(copy.pendingVerification)
      else setStatus(mapError(body?.code ?? (response.status === 503 ? "unavailable" : undefined)))
    } catch {
      setStatus(copy.failed)
    } finally {
      setPending(false)
    }
  }

  const bodyCopy =
    mode === "signin"
      ? copy.signInBody
      : mode === "signup"
        ? copy.signUpBody
        : mode === "forgot"
          ? copy.forgotBody
          : mode === "verify"
            ? copy.verifyBody
            : copy.resetBody

  const submitCopy =
    mode === "signin"
      ? copy.submitSignIn
      : mode === "signup"
        ? copy.submitSignUp
        : mode === "forgot"
          ? copy.submitForgot
          : copy.submitReset

  if (mode === "verify") {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <p className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-cyan-600">
          {shopText(copy.verify, language)}
        </p>
        <p className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">
          {shopText(copy.verifyBody, language)}
        </p>
        {status ? (
          <p role="status" className="font-home-title text-[0.8125rem] leading-[1.62] text-black">
            {shopText(status, language)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      {mode === "signin" || mode === "signup" ? (
        <div className="flex flex-wrap gap-x-5 gap-y-2" role="tablist" aria-label={shopText(copy.signIn, language)}>
          {(["signin", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              onClick={() => {
                setMode(item)
                setStatus(null)
              }}
              className={`font-kode text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-300 ${
                mode === item ? "text-cyan-600" : "text-black/45 hover:text-cyan-600"
              }`}
            >
              {shopText(item === "signin" ? copy.signIn : copy.signUp, language)}
            </button>
          ))}
        </div>
      ) : (
        <p className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-cyan-600">
          {shopText(mode === "forgot" ? copy.forgot : copy.reset, language)}
        </p>
      )}

      <p className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">
        {shopText(bodyCopy, language)}
      </p>
      {purpose && mode !== "forgot" && mode !== "reset" ? (
        <p className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">{shopText(purpose, language)}</p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {mode === "signup" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
                {shopText(copy.firstName, language)}
              </span>
              <input
                type="text"
                name="firstName"
                autoComplete="given-name"
                required
                maxLength={80}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
                {shopText(copy.lastName, language)}
              </span>
              <input
                type="text"
                name="lastName"
                autoComplete="family-name"
                required
                maxLength={80}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        ) : null}

        {mode !== "reset" ? (
          <label className="flex flex-col gap-2">
            <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
              {shopText(copy.email, language)}
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={fieldClass}
            />
          </label>
        ) : null}

        {mode === "signin" || mode === "signup" || mode === "reset" ? (
          <label className="flex flex-col gap-2">
            <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
              {shopText(copy.password, language)}
            </span>
            <input
              type="password"
              name="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
            />
          </label>
        ) : null}

        <ShopSubscribeButton type="submit" className="!w-auto" disabled={pending || (mode === "reset" && !resetToken)}>
          {shopText(pending ? (mode === "forgot" || mode === "signup" ? copy.sending : copy.working) : submitCopy, language)}
        </ShopSubscribeButton>
      </form>

      {mode === "signin" ? (
        <div className="flex flex-col items-start gap-3">
          <button
            type="button"
            className="font-kode text-[0.625rem] uppercase tracking-[0.12em] text-black/55 transition-colors hover:text-cyan-600"
            onClick={() => {
              setMode("forgot")
              setStatus(null)
            }}
          >
            {shopText(copy.forgotLink, language)}
          </button>
          <ShopSubscribeButton
            type="button"
            className="!w-auto"
            disabled={pending || !email}
            onClick={() => void resendVerification()}
          >
            {shopText(pending ? copy.sending : copy.submitResend, language)}
          </ShopSubscribeButton>
        </div>
      ) : null}

      {mode === "forgot" || mode === "reset" ? (
        <button
          type="button"
          className="self-start font-kode text-[0.625rem] uppercase tracking-[0.12em] text-black/55 transition-colors hover:text-cyan-600"
          onClick={() => {
            setMode("signin")
            setStatus(null)
          }}
        >
          {shopText(copy.backSignIn, language)}
        </button>
      ) : null}

      {status ? (
        <p role="status" className="font-home-title text-[0.8125rem] leading-[1.62] text-black">
          {shopText(status, language)}
        </p>
      ) : null}
    </div>
  )
}
