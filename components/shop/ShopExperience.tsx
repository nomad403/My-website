"use client"

import ClientWorkspace from "./ClientWorkspace"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import SiteChromeNav, { SiteChromeMobileMenu } from "@/components/chrome/SiteChromeNav"
import SiteSocialFooter from "@/components/chrome/SiteSocialFooter"
import { useLanguage } from "@/contexts/LanguageContext"
import ShopAuthPanel from "@/components/shop/ShopAuthPanel"
import {
  formatEuro,
  parseShopInterval,
  parseShopSection,
  publicShopOffers,
  SHOP_CONDITIONS,
  SHOP_SECTIONS,
  shopText,
  type Localized,
  type ShopSection,
} from "@/lib/shop/catalog"

const INTENT_KEY = "nomad403-shop-intent"

const solidButtonClass =
  "font-kode inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-black px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"

const buttonClass = `${solidButtonClass} w-full`

const ghostButtonClass =
  "font-kode min-h-12 rounded-full border border-black/30 bg-white px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-black transition-colors duration-300 hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"

const ui = {
  eyebrow: { fr: "Abonnements", en: "Subscriptions" },
  title: { fr: "Shop", en: "Shop" },
  intro: {
    fr: "Hébergement, maintenance et suivi des projets déjà en ligne. Les prestations de création restent sur la page Expertise.",
    en: "Hosting, maintenance and follow-up for projects already online. Creation work stays on the Expertise page.",
  },
  expertise: { fr: "Voir Expertise", en: "View Expertise" },
  monthly: { fr: "Mensuel", en: "Monthly" },
  yearly: { fr: "Annuel", en: "Yearly" },
  perMonth: { fr: "par mois", en: "per month" },
  perYear: { fr: "par an, débité en une fois", en: "per year, charged once" },
  included: { fr: "Prestations incluses", en: "Included services" },
  conditions: { fr: "Conditions essentielles", en: "Essential conditions" },
  subscribe: { fr: "Souscrire", en: "Subscribe" },
  priority: { fr: "Prioritaire", en: "Priority" },
  checkoutPending: {
    fr: "Retour Stripe reçu. L'abonnement devient actif seulement après confirmation du paiement, pas depuis cette page.",
    en: "Stripe sent the browser back. The subscription becomes active only after payment confirmation, not from this page.",
  },
  checkoutCancel: {
    fr: "Paiement annulé. Aucun débit n'a été confirmé.",
    en: "Payment cancelled. No charge was confirmed.",
  },
  checkoutFailed: {
    fr: "Le paiement n'a pas pu être ouvert.",
    en: "Payment could not be opened.",
  },
  checkoutUnconfigured: {
    fr: "Le paiement n'est pas configuré dans cet environnement.",
    en: "Payment is not configured in this environment.",
  },
  checkoutMismatch: {
    fr: "Le tarif Stripe ne correspond pas au catalogue. Aucun paiement n'a été ouvert.",
    en: "The Stripe price does not match the catalogue. No payment was opened.",
  },
  checkoutBusy: {
    fr: "Une souscription est déjà en cours pour cette formule.",
    en: "A subscription is already in progress for this plan.",
  },
  signInToPay: {
    fr: "Connectez-vous pour souscrire. Aucun paiement n'est lancé avant la session.",
    en: "Sign in to subscribe. No payment starts before the session.",
  },
  prepareAccount: {
    fr: "Le paiement n'est pas encore ouvert. Vous pouvez déjà préparer le compte qui reprendra cette offre.",
    en: "Payment is not open yet. You can already prepare the account that will resume this offer.",
  },
  promoLabel: { fr: "Code promotionnel", en: "Promotion code" },
  promoAction: { fr: "Vérifier", en: "Check" },
  promoInvalid: { fr: "Ce code n'est pas valable.", en: "This code is not valid." },
  promoExpired: { fr: "Ce code a expiré.", en: "This code has expired." },
  promoDisabled: { fr: "Ce code est désactivé.", en: "This code is disabled." },
  promoExhausted: {
    fr: "Ce code a atteint sa limite d'utilisation.",
    en: "This code has reached its usage limit.",
  },
  promoRestricted: {
    fr: "Ce code n'est pas disponible pour cette adresse.",
    en: "This code is not available for this address.",
  },
  promoAuth: {
    fr: "Connectez-vous pour vérifier un code.",
    en: "Sign in to check a code.",
  },
  promoReady: {
    fr: "Code accepté. L'offre privée est affichée pour cette session.",
    en: "Code accepted. The private offer is shown for this session.",
  },
  sections: {
    offers: { fr: "Offres", en: "Offers" },
    subscriptions: { fr: "Mes abonnements", en: "My subscriptions" },
    billing: { fr: "Facturation", en: "Billing" },
    interventions: { fr: "Interventions", en: "Interventions" },
    account: { fr: "Mon compte", en: "My account" },
  } satisfies Record<ShopSection, Localized>,
  sectionNav: { fr: "Sections du shop", en: "Shop sections" },
  signedOutSubscriptions: {
    fr: "Connectez-vous pour consulter vos abonnements.",
    en: "Sign in to view your subscriptions.",
  },
  emptySubscriptions: {
    fr: "Aucun abonnement enregistré. Le paiement n'est pas encore ouvert.",
    en: "No subscription on record. Payment is not open yet.",
  },
  emptyBilling: {
    fr: "Aucune facture synchronisée pour ce compte.",
    en: "No invoice synced for this account.",
  },
  portal: { fr: "Gérer la facturation", en: "Manage billing" },
  portalWait: {
    fr: "Le portail Stripe sera disponible après un paiement confirmé.",
    en: "The Stripe portal will be available after a confirmed payment.",
  },
  emptyInterventions: {
    fr: "Aucune intervention. Les demandes ne sont pas encore ouvertes.",
    en: "No intervention. Requests are not open yet.",
  },
  accountIntro: {
    fr: "La même adresse sert à ouvrir une session ou à créer le compte.",
    en: "The same address opens a session or creates the account.",
  },
  signedIn: {
    fr: "Session ouverte. Le parcours reprend sur ce compte.",
    en: "Session open. The journey continues on this account.",
  },
  email: { fr: "Adresse", en: "Address" },
  projects: { fr: "Projets associés", en: "Linked projects" },
  emptyProjects: { fr: "Aucun projet associé.", en: "No linked project." },
  logout: { fr: "Fermer la session", en: "Sign out" },
  goAccount: { fr: "Mon compte", en: "My account" },
  loading: { fr: "Vérification de la session…", en: "Checking the session…" },
  unavailable: {
    fr: "Les données du compte ne sont pas disponibles dans cet environnement.",
    en: "Account data is not available in this environment.",
  },
  close: { fr: "Fermer", en: "Close" },
  dialogTitle: { fr: "Préparer le compte", en: "Prepare the account" },
  intervalName: { fr: "Période de facturation", en: "Billing period" },
  renewed: { fr: "Échéance", en: "Renews" },
  privateNote: { fr: "Offre privée déjà attribuée", en: "Private offer already granted" },
}

type SessionState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "anonymous" }
  | { status: "ready"; email: string }

type UnlockedOffer = {
  usageTerms?: string
  planCode: string
  name: string
  summary: string
  amountCents: number
  interval: "month"
}

type InvoiceRow = {
  id: string
  status: string
  amountDueCents: number
  amountPaidCents: number
  amountRemainingCents: number
  currency: string
  issuedAt: string | null
  paidAt: string | null
}

type ProjectRow = { id: string; name: string }
type SubscriptionRow = {
  id: string
  planCode: string
  status: string
  billingInterval: string
  amountCents: number
  currency: string
  privateOffer?: boolean
  currentPeriodEnd: string | null
}

function sectionHref(section: ShopSection, interval: "month" | "year") {
  const params = new URLSearchParams()
  if (section !== "offers") params.set("section", section)
  if (interval === "year") params.set("interval", "year")
  const query = params.toString()
  return query ? `/shop?${query}` : "/shop"
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])
  return reduced
}

export default function ShopExperience() {
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const reduced = useReducedMotion()
  const section = parseShopSection(searchParams.get("section"))
  const interval = parseShopInterval(searchParams.get("interval"))
  const [menuOpen, setMenuOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [session, setSession] = useState<SessionState>({ status: "loading" })
  const [projects, setProjects] = useState<ProjectRow[] | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[] | null>(null)
  const [accountUnavailable, setAccountUnavailable] = useState(false)
  const [paymentPlan, setPaymentPlan] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<Localized | null>(null)
  const [promoMessage, setPromoMessage] = useState<Localized | null>(null)
  const [promoCode, setPromoCode] = useState("")
  const [unlocked, setUnlocked] = useState<UnlockedOffer | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null)
  const offers = publicShopOffers()

  useEffect(() => {
    const raw = window.sessionStorage.getItem(INTENT_KEY)
    if (!raw || searchParams.get("auth") !== "signed-in") return
    window.sessionStorage.removeItem(INTENT_KEY)
    try {
      const intent = JSON.parse(raw) as { promotionCode?: string; interval?: string }
      if (typeof intent.promotionCode === "string") setPromoCode(intent.promotionCode)
      const params = new URLSearchParams()
      if (intent.interval === "year") params.set("interval", "year")
      params.set("auth", "signed-in")
      router.replace(`/shop?${params.toString()}`)
    } catch {
      window.sessionStorage.removeItem(INTENT_KEY)
    }
  }, [router, searchParams])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await fetch("/api/auth/session", { headers: { Accept: "application/json" } })
        if (cancelled) return
        if (response.status === 503) {
          setSession({ status: "unavailable" })
          return
        }
        const body = (await response.json()) as { authenticated?: boolean; email?: string }
        if (!body.authenticated || !body.email) {
          setSession({ status: "anonymous" })
          setProjects([])
          setSubscriptions([])
          return
        }
        const [subscriptionResponse, projectResponse] = await Promise.all([
          fetch("/api/account/subscriptions", { headers: { Accept: "application/json" } }),
          fetch("/api/account/projects", { headers: { Accept: "application/json" } }),
        ])
        if (cancelled) return
        if (subscriptionResponse.status === 401 || projectResponse.status === 401) {
          setSession({ status: "anonymous" })
          return
        }
        setSession({ status: "ready", email: body.email })
        if (!subscriptionResponse.ok || !projectResponse.ok) {
          setAccountUnavailable(true)
          setProjects(null)
          setSubscriptions(null)
          return
        }
        const subscriptionBody = (await subscriptionResponse.json()) as { subscriptions?: SubscriptionRow[] }
        const projectBody = (await projectResponse.json()) as { projects?: ProjectRow[] }
        setAccountUnavailable(false)
        setSubscriptions(Array.isArray(subscriptionBody.subscriptions) ? subscriptionBody.subscriptions : [])
        setProjects(Array.isArray(projectBody.projects) ? projectBody.projects : [])
      } catch {
        if (!cancelled) setSession({ status: "unavailable" })
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    if (!authOpen) return
    const field = document.getElementById("shop-auth-email")
    field?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAuthOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [authOpen])

  function checkoutCopy(code: string | undefined): Localized {
    if (code === "stripe_unconfigured" || code === "unavailable") return ui.checkoutUnconfigured
    if (code === "price_mismatch") return ui.checkoutMismatch
    if (code === "checkout_in_progress") return ui.checkoutBusy
    if (code === "invalid" || code === "expired" || code === "disabled" || code === "exhausted" || code === "restricted") {
      return promoCopy(code)
    }
    return ui.checkoutFailed
  }

  function promoCopy(code: string | undefined): Localized {
    if (code === "expired") return ui.promoExpired
    if (code === "disabled") return ui.promoDisabled
    if (code === "exhausted") return ui.promoExhausted
    if (code === "restricted") return ui.promoRestricted
    return ui.promoInvalid
  }

  async function subscribe(code: string, offerInterval: "month" | "year" = interval) {
    setPaymentPlan(code)
    if (session.status !== "ready") {
      window.sessionStorage.setItem(
        INTENT_KEY,
        JSON.stringify({ plan: code, interval: offerInterval, promotionCode: promoCode }),
      )
      setActionMessage(ui.signInToPay)
      if (session.status === "anonymous" || session.status === "unavailable") setAuthOpen(true)
      return
    }
    setActionMessage(null)
    const response = await fetch("/api/account/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        planCode: code,
        interval: offerInterval,
        promotionCode: unlocked?.planCode === code ? promoCode : undefined,
      }),
    })
    const body = (await response.json().catch(() => null)) as { url?: string; code?: string } | null
    if (response.ok && body?.url) {
      window.location.assign(body.url)
      return
    }
    setActionMessage(checkoutCopy(body?.code))
  }

  async function checkPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setUnlocked(null)
    if (session.status !== "ready") {
      setPromoMessage(ui.promoAuth)
      if (session.status === "anonymous" || session.status === "unavailable") setAuthOpen(true)
      return
    }
    const response = await fetch("/api/account/promotion", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code: promoCode, language }),
    })
    const body = (await response.json().catch(() => null)) as (UnlockedOffer & { code?: string }) | null
    if (response.ok && body?.planCode && body.name && typeof body.amountCents === "number") {
      setUnlocked({
        planCode: body.planCode,
        name: body.name,
        summary: body.summary,
        usageTerms: body.usageTerms,
        amountCents: body.amountCents,
        interval: "month",
      })
      setPromoMessage(ui.promoReady)
      return
    }
    setPromoMessage(promoCopy(body?.code))
  }

  async function openPortal() {
    const response = await fetch("/api/account/portal", { method: "POST" })
    const body = (await response.json().catch(() => null)) as { url?: string; code?: string } | null
    if (response.ok && body?.url) {
      window.location.assign(body.url)
      return
    }
    setActionMessage(body?.code === "portal_unavailable" ? ui.portalWait : ui.checkoutUnconfigured)
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    setSession({ status: "anonymous" })
    setProjects([])
    setSubscriptions([])
    router.replace("/shop?section=account")
  }

  const motionDuration = reduced ? 0 : 0.45

  return (
    <div
      className={`fixed inset-0 overflow-x-hidden bg-white text-black ${
        menuOpen || authOpen ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      <div className="relative min-h-full">
        <SiteChromeNav
          mode="day"
          currentPage="shop"
          isMobileMenuOpen={menuOpen}
          onToggleMobileMenu={() => setMenuOpen((open) => !open)}
          onPageChange={() => setMenuOpen(false)}
          documentNavigation
        />
        <SiteChromeMobileMenu
          mode="day"
          currentPage="shop"
          isOpen={menuOpen}
          onPageChange={() => setMenuOpen(false)}
          documentNavigation
        />
        <main className="mx-auto w-full max-w-7xl px-4 pb-36 md:px-8">
          <header className="max-w-3xl pt-6 md:pt-8">
            <p className="font-kode text-[0.625rem] uppercase tracking-[0.16em] text-cyan-600">
              {shopText(ui.eyebrow, language)}
            </p>
            <h1 className="mt-3 font-kode text-[2rem] uppercase tracking-[0.08em] md:text-[2.75rem]">
              {shopText(ui.title, language)}
            </h1>
            <p className="mt-4 font-home-title text-[0.8125rem] leading-[1.62] text-black/80">
              {shopText(ui.intro, language)}
            </p>
            <Link
              href="/specialist"
              className="mt-4 inline-flex font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-black/60 transition-colors duration-300 hover:text-cyan-600"
            >
              {shopText(ui.expertise, language)}
            </Link>
          </header>

          <nav aria-label={shopText(ui.sectionNav, language)} className="mt-10 border-y-2 border-black/30 py-4">
            <ul className="flex flex-wrap gap-x-5 gap-y-3">
              {SHOP_SECTIONS.map((item) => {
                const active = item === section
                return (
                  <li key={item}>
                    <Link
                      href={sectionHref(item, interval)}
                      aria-current={active ? "page" : undefined}
                      className={`font-kode text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-300 ${
                        active ? "text-cyan-600" : "text-black/45 hover:text-cyan-600"
                      }`}
                    >
                      {shopText(ui.sections[item], language)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration, ease: "easeOut" }}
              className="pt-8"
            >
              {section === "offers" ? (
                <section aria-labelledby="shop-offers-title">
                  <h2 id="shop-offers-title" className="sr-only">
                    {shopText(ui.sections.offers, language)}
                  </h2>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div role="group" aria-label={shopText(ui.intervalName, language)} className="flex flex-wrap gap-3">
                      {(["month", "year"] as const).map((item) => (
                        <Link
                          key={item}
                          href={item === "year" ? "/shop?interval=year" : "/shop"}
                          aria-current={interval === item ? "true" : undefined}
                          className={interval === item ? solidButtonClass : ghostButtonClass}
                        >
                          {shopText(item === "month" ? ui.monthly : ui.yearly, language)}
                        </Link>
                      ))}
                    </div>
                    <form
                      className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-end"
                      onSubmit={(event) => void checkPromo(event)}
                    >
                      <label className="flex min-w-0 flex-1 flex-col gap-2">
                        <span className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/60">
                          {shopText(ui.promoLabel, language)}
                        </span>
                        <input
                          value={promoCode}
                          onChange={(event) => {
                            setPromoCode(event.target.value)
                            setPromoMessage(null)
                            setUnlocked(null)
                          }}
                          autoComplete="off"
                          maxLength={40}
                          className="min-h-12 w-full rounded-xl border border-gray-300/50 bg-white px-4 font-home-title text-base text-gray-800 transition-all duration-300 focus:border-cyan-400 focus:outline-none"
                        />
                      </label>
                      <button type="submit" className={`${ghostButtonClass} sm:w-auto`}>
                        {shopText(ui.promoAction, language)}
                      </button>
                    </form>
                  </div>
                  {promoMessage ? (
                    <p role="status" className="mt-4 max-w-2xl font-home-title text-[0.8125rem] leading-[1.62]">
                      {shopText(promoMessage, language)}
                    </p>
                  ) : null}
                  {searchParams.get("checkout") === "success" ? (
                    <p role="status" className="mt-4 max-w-2xl font-home-title text-[0.8125rem] leading-[1.62]">
                      {shopText(ui.checkoutPending, language)}
                    </p>
                  ) : null}
                  {searchParams.get("checkout") === "cancel" ? (
                    <p role="status" className="mt-4 max-w-2xl font-home-title text-[0.8125rem] leading-[1.62]">
                      {shopText(ui.checkoutCancel, language)}
                    </p>
                  ) : null}

                  <ul className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {offers.map((offer) => {
                      const cents = interval === "year" ? offer.yearlyAmountCents : offer.monthlyAmountCents
                      return (
                        <li
                          key={offer.code}
                          className={`flex min-w-0 flex-col border-2 p-5 md:p-6 ${
                            offer.emphasized ? "border-cyan-500" : "border-black/20"
                          }`}
                        >
                          <p className="font-kode text-[0.6875rem] uppercase tracking-[0.14em] text-cyan-600">
                            {offer.emphasized ? shopText(ui.priority, language) : "NOMAD403"}
                          </p>
                          <h3 className="mt-3 font-kode text-[1.5rem] uppercase tracking-[0.08em]">
                            {shopText(offer.name, language)}
                          </h3>
                          <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/75">
                            {shopText(offer.summary, language)}
                          </p>
                          <p className="mt-6 font-kode text-[2rem] tracking-[0.04em]">
                            {formatEuro(cents, language)}
                          </p>
                          <p className="font-home-title text-[0.8125rem] text-black/60">
                            {shopText(interval === "year" ? ui.perYear : ui.perMonth, language)}
                          </p>
                          <h4 className="mt-6 font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/50">
                            {shopText(ui.included, language)}
                          </h4>
                          <ul className="mt-3 flex flex-col">
                            {offer.features.map((feature) => (
                              <li
                                key={feature.fr}
                                className="border-t border-black/15 py-2 font-home-title text-[0.8125rem] leading-[1.62]"
                              >
                                {shopText(feature, language)}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className={`${buttonClass} mt-6`}
                            onClick={() => void subscribe(offer.code)}
                            disabled={session.status === "loading"}
                          >
                            {shopText(ui.subscribe, language)}
                          </button>
                          {paymentPlan === offer.code && actionMessage ? (
                            <p role="status" className="mt-4 font-home-title text-[0.8125rem] leading-[1.62]">
                              {shopText(actionMessage, language)}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                  {unlocked ? (
                    <article className="mt-4 flex min-w-0 max-w-xl flex-col border-2 border-black p-5 md:p-6">
                      <h3 className="font-kode text-[1.5rem] uppercase tracking-[0.08em]">{unlocked.name}</h3>
                      <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/75">{unlocked.summary}</p>
                      {unlocked.usageTerms && <p className="mt-3 whitespace-pre-wrap break-words font-home-title text-sm">{unlocked.usageTerms}</p>}
                      <p className="mt-6 font-kode text-[2rem] tracking-[0.04em]">
                        {formatEuro(unlocked.amountCents, language)}
                      </p>
                      <p className="font-home-title text-[0.8125rem] text-black/60">{shopText(ui.perMonth, language)}</p>
                      <button
                        type="button"
                        className={`${buttonClass} mt-6`}
                        onClick={() => void subscribe(unlocked.planCode, "month")}
                        disabled={session.status === "loading"}
                      >
                        {shopText(ui.subscribe, language)}
                      </button>
                      {paymentPlan === unlocked.planCode && actionMessage ? (
                        <p role="status" className="mt-4 font-home-title text-[0.8125rem] leading-[1.62]">
                          {shopText(actionMessage, language)}
                        </p>
                      ) : null}
                    </article>
                  ) : null}

                  <section aria-labelledby="shop-conditions-title" className="mt-10 border-y-2 border-black/30 py-6">
                    <h2 id="shop-conditions-title" className="font-kode text-[0.6875rem] uppercase tracking-[0.14em]">
                      {shopText(ui.conditions, language)}
                    </h2>
                    <ul className="mt-4 flex max-w-3xl flex-col gap-3">
                      {SHOP_CONDITIONS.map((condition) => (
                        <li key={condition.fr} className="font-home-title text-[0.8125rem] leading-[1.62] text-black/75">
                          {shopText(condition, language)}
                        </li>
                      ))}
                    </ul>
                  </section>
                </section>
              ) : null}

              {section !== "offers" && <ClientWorkspace key={session.status === "ready" ? session.email : session.status} section={section} language={language} onLogout={() => void logout()} />}
            </motion.div>
          </AnimatePresence>
        </main>
        {menuOpen ? null : <SiteSocialFooter mode="day" />}
      </div>

      {authOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shop-auth-dialog-title"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border-2 border-black bg-white p-5 md:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h2 id="shop-auth-dialog-title" className="font-kode text-[1.125rem] uppercase tracking-[0.08em]">
                {shopText(ui.dialogTitle, language)}
              </h2>
              <button type="button" onClick={() => setAuthOpen(false)} className={ghostButtonClass}>
                {shopText(ui.close, language)}
              </button>
            </div>
            <ShopAuthPanel language={language} purpose={ui.prepareAccount} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EmptyCopy({ language, copy }: { language: string; copy: Localized }) {
  return (
    <p role="status" className="max-w-2xl font-home-title text-[0.8125rem] leading-[1.62] text-black/80">
      {shopText(copy, language)}
    </p>
  )
}

function AccountGate({
  language,
  session,
  unavailable,
  signedOut,
  children,
}: {
  language: string
  session: SessionState
  unavailable: boolean
  signedOut: Localized
  children: ReactNode
}) {
  if (session.status === "loading") return <EmptyCopy language={language} copy={ui.loading} />
  if (session.status === "anonymous" || session.status === "unavailable") {
    return (
      <div className="flex flex-col items-start gap-4">
        <EmptyCopy language={language} copy={signedOut} />
        <Link href="/shop?section=account" className={ghostButtonClass}>
          {shopText(ui.goAccount, language)}
        </Link>
      </div>
    )
  }
  if (unavailable) return <EmptyCopy language={language} copy={ui.unavailable} />
  return <>{children}</>
}
