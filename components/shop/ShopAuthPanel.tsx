"use client"

import { useState, type FormEvent } from "react"
import { shopText, type Localized } from "@/lib/shop/catalog"
import ShopSubscribeButton from "./ShopSubscribeButton"

const fieldClass =
  "min-h-12 w-full rounded-xl border border-gray-300/50 bg-white px-4 py-3 font-home-title text-base leading-[1.62] text-gray-800 transition-all duration-300 placeholder:text-gray-500 focus:border-cyan-400 focus:outline-none"

const copy = {
  signIn: { fr: "Connexion", en: "Sign in" },
  signUp: { fr: "Créer un compte", en: "Create an account" },
  signInBody: {
    fr: "Recevez un lien à usage unique (15 min). Une fois validé, la souscription reprend automatiquement vers le paiement.",
    en: "Get a single-use link (15 min). After you confirm it, checkout resumes automatically.",
  },
  signUpBody: {
    fr: "Le premier lien valide crée le compte client. Ensuite vous êtes renvoyé au Shop pour payer l'offre choisie.",
    en: "The first valid link creates the client account. You then return to Shop to pay for the selected plan.",
  },
  email: { fr: "Adresse e-mail", en: "Email address" },
  submit: { fr: "Recevoir le lien", en: "Email me the link" },
  sending: { fr: "Envoi…", en: "Sending…" },
  sent: {
    fr: "Si cette adresse peut recevoir un lien, il vient d'être envoyé. Ouvrez-le depuis cet appareil pour reprendre ici.",
    en: "If this address can receive a link, it has been sent. Open it on this device to continue here.",
  },
  invalid: { fr: "Indiquez une adresse e-mail valide.", en: "Enter a valid email address." },
  limited: { fr: "Trop de demandes. Réessayez plus tard.", en: "Too many requests. Try again later." },
  unavailable: {
    fr: "La connexion n'est pas disponible dans cet environnement.",
    en: "Sign-in is not available in this environment.",
  },
  failed: { fr: "Le lien n'a pas pu être demandé.", en: "The link could not be requested." },
} satisfies Record<string, Localized>

type AuthMode = "signin" | "signup"

export default function ShopAuthPanel({
  language,
  purpose,
}: {
  language: string
  purpose?: Localized | null
}) {
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<Localized | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus(null)
    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email }),
      })
      const body = (await response.json().catch(() => null)) as { code?: string } | null
      if (response.ok) setStatus(copy.sent)
      else if (body?.code === "email_invalid") setStatus(copy.invalid)
      else if (body?.code === "rate_limited") setStatus(copy.limited)
      else if (response.status === 503 || body?.code === "unavailable") setStatus(copy.unavailable)
      else setStatus(copy.failed)
    } catch {
      setStatus(copy.failed)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <div className="flex flex-wrap gap-x-5 gap-y-2" role="tablist" aria-label={shopText(copy.signIn, language)}>
        {(["signin", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={mode === item}
            onClick={() => setMode(item)}
            className={`font-kode text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-300 ${
              mode === item ? "text-cyan-600" : "text-black/45 hover:text-cyan-600"
            }`}
          >
            {shopText(item === "signin" ? copy.signIn : copy.signUp, language)}
          </button>
        ))}
      </div>
      <p className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">
        {shopText(mode === "signin" ? copy.signInBody : copy.signUpBody, language)}
      </p>
      {purpose ? (
        <p className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">{shopText(purpose, language)}</p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-2">
          <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
            {shopText(copy.email, language)}
          </span>
          <input
            id="shop-auth-email"
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
        <ShopSubscribeButton type="submit" className="!w-auto" disabled={pending}>
          {shopText(pending ? copy.sending : copy.submit, language)}
        </ShopSubscribeButton>
      </form>
      {status ? (
        <p role="status" className="font-home-title text-[0.8125rem] leading-[1.62] text-black">
          {shopText(status, language)}
        </p>
      ) : null}
    </div>
  )
}
