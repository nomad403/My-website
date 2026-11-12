"use client"

import ClientWorkspace from "./ClientWorkspace"
import ShopAsciiBackground from "./ShopAsciiBackground"
import CustomCursor from "@/components/chrome/CustomCursor"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import SiteChromeNav, { SiteChromeMobileMenu } from "@/components/chrome/SiteChromeNav"
import SiteSocialFooter from "@/components/chrome/SiteSocialFooter"
import { useLanguage } from "@/contexts/LanguageContext"
import ShopAuthPanel from "@/components/shop/ShopAuthPanel"
import ShopSubscribeButton, { ShopSubscribeGooDefs } from "@/components/shop/ShopSubscribeButton"
import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import {
  formatEuro,
  parseShopInterval,
  parseShopSection,
  publicShopOffers,
  SHOP_SECTIONS,
  shopText,
  type Localized,
  type ShopSection,
} from "@/lib/shop/catalog"

const INTENT_KEY = "nomad403-shop-intent"

const solidButtonClass =
  "font-kode inline-flex min-h-10 items-center justify-center rounded-full border border-black bg-black px-5 text-[0.75rem] uppercase tracking-[0.12em] text-white transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"

const ghostButtonClass =
  "font-kode inline-flex min-h-10 items-center justify-center rounded-full border border-black bg-white px-5 text-[0.75rem] uppercase tracking-[0.12em] text-black transition-colors duration-300 hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"

const ui = {
  monthly: { fr: "Mensuel", en: "Monthly" },
  yearly: { fr: "Annuel", en: "Yearly" },
  perMonth: { fr: "/ mois", en: "/ month" },
  perYear: { fr: "/ an", en: "/ year" },
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
    fr: "Validez le lien reçu par e-mail : le paiement s’ouvrira ensuite automatiquement.",
    en: "Confirm the email link: payment will open automatically afterwards.",
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

function IntervalSwitch({
  value,
  language,
  onChange,
  className = "",
}: {
  value: "month" | "year"
  language: string
  onChange: (next: "month" | "year") => void
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value === "year"}
      aria-label={shopText(ui.yearly, language)}
      onClick={() => onChange(value === "month" ? "year" : "month")}
      className={`relative grid h-7 w-[7.25rem] shrink-0 grid-cols-2 items-center rounded-full border border-black bg-white p-0.5 font-kode text-[0.5rem] uppercase tracking-[0.08em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 md:h-8 md:w-36 md:p-1 md:text-[0.5625rem] md:tracking-[0.1em] ${className}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-black transition-transform duration-300 motion-reduce:transition-none md:inset-y-1 md:left-1 md:w-[calc(50%-0.25rem)] ${
          value === "year" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      <span className={`relative z-10 transition-colors ${value === "month" ? "text-white" : "text-black/60"}`}>
        {shopText(ui.monthly, language)}
      </span>
      <span className={`relative z-10 transition-colors ${value === "year" ? "text-white" : "text-black/60"}`}>
        {shopText(ui.yearly, language)}
      </span>
    </button>
  )
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
  const [offerIntervals, setOfferIntervals] = useState<Record<string, "month" | "year">>({})
  const offers = publicShopOffers()
  const visibleSections: readonly ShopSection[] = session.status === "ready" ? SHOP_SECTIONS : ["offers", "account"]

  function offerInterval(code: string): "month" | "year" {
    return offerIntervals[code] ?? interval
  }

  function setOfferInterval(code: string, next: "month" | "year") {
    setOfferIntervals((current) => ({ ...current, [code]: next }))
  }

  useEffect(() => {
    const raw = window.sessionStorage.getItem(INTENT_KEY)
    if (!raw || searchParams.get("auth") !== "signed-in") return
    try {
      const intent = JSON.parse(raw) as {
        plan?: string
        promotionCode?: string
        interval?: string
      }
      if (typeof intent.promotionCode === "string") setPromoCode(intent.promotionCode)
      if (intent.interval === "year" || intent.interval === "month") {
        // Keep URL in sync with the pending checkout interval.
        const params = new URLSearchParams(searchParams.toString())
        if (intent.interval === "year") params.set("interval", "year")
        else params.delete("interval")
        params.set("auth", "signed-in")
        const next = params.toString()
        if (next !== searchParams.toString()) router.replace(`/shop?${next}`)
      }
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

  // After magic-link sign-in, resume the pending offer straight into Stripe Checkout.
  useEffect(() => {
    if (session.status !== "ready") return
    if (searchParams.get("auth") !== "signed-in") return
    const raw = window.sessionStorage.getItem(INTENT_KEY)
    if (!raw) return
    let intent: { plan?: string; interval?: string; promotionCode?: string }
    try {
      intent = JSON.parse(raw) as { plan?: string; interval?: string; promotionCode?: string }
    } catch {
      window.sessionStorage.removeItem(INTENT_KEY)
      return
    }
    if (!intent.plan) {
      window.sessionStorage.removeItem(INTENT_KEY)
      return
    }
    window.sessionStorage.removeItem(INTENT_KEY)
    setAuthOpen(false)
    if (typeof intent.promotionCode === "string") setPromoCode(intent.promotionCode)
    void subscribe(intent.plan, intent.interval === "year" ? "year" : "month")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when session becomes ready after auth redirect
  }, [session.status, searchParams])

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

  const offersScrollLock = section === "offers" || menuOpen || authOpen

  return (
    <div
      className={`fixed inset-0 overflow-x-hidden bg-white text-black ${
        offersScrollLock ? "overflow-hidden" : "overflow-y-auto"
      }`}
    >
      <ShopAsciiBackground />
      <CustomCursor />
      <ShopSubscribeGooDefs />
      <div className={`relative z-10 flex flex-col ${section === "offers" ? "h-dvh" : "min-h-dvh"}`}>
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
        <main className={`site-grid flex min-h-0 flex-1 flex-col pt-1 ${section === "offers" ? "pb-3 md:pb-20" : "pb-20"}`}>
          <div className="site-grid-inner flex min-h-0 flex-1 flex-col">
          <h1 className="sr-only">Shop Nomad403</h1>
          <div className={`border border-black bg-white/80 ${section === "offers" ? "flex min-h-0 flex-1 flex-col overflow-hidden" : ""}`}>
          {menuOpen ? null : (
          <div className="relative z-40 shrink-0 border-b border-black bg-white">
          <nav aria-label={shopText(ui.sectionNav, language)} className="min-w-0 overflow-x-auto">
            <ul className="flex h-full min-h-10 items-stretch">
              {visibleSections.map((item) => {
                const active = item === section
                return (
                  <li key={item} className="flex border-r border-black">
                    <Link
                      href={sectionHref(item, interval)}
                      aria-current={active ? "page" : undefined}
                      className={`flex h-full min-h-10 w-full items-center justify-center whitespace-nowrap px-4 py-2 font-kode text-[0.625rem] uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 md:px-5 md:text-[0.6875rem] ${
                        active ? "bg-cyan-50/80 text-cyan-700" : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                      }`}
                    >
                      {shopText(ui.sections[item], language)}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration, ease: "easeOut" }}
              className={
                section === "offers"
                  ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain md:overflow-hidden"
                  : "min-w-0 p-5 md:p-6"
              }
            >
              {section === "offers" ? (
                <section aria-labelledby="shop-offers-title" className="flex min-h-0 flex-1 flex-col">
                  <h2 id="shop-offers-title" className="sr-only">
                    {shopText(ui.sections.offers, language)}
                  </h2>
                  {searchParams.get("checkout") === "success" ? (
                    <p role="status" className="mt-2 max-w-2xl px-4 font-home-title text-[0.75rem] leading-[1.45] md:px-5">
                      {shopText(ui.checkoutPending, language)}
                    </p>
                  ) : null}
                  {searchParams.get("checkout") === "cancel" ? (
                    <p role="status" className="mt-2 max-w-2xl px-4 font-home-title text-[0.75rem] leading-[1.45] md:px-5">
                      {shopText(ui.checkoutCancel, language)}
                    </p>
                  ) : null}

                  <ul className="grid min-h-0 flex-1 grid-cols-1 items-stretch md:grid-cols-3 md:grid-rows-[repeat(17,minmax(0,auto))]">
                    {offers.map((offer) => {
                      const billing = offerInterval(offer.code)
                      const cents = billing === "year" ? offer.yearlyAmountCents : offer.monthlyAmountCents
                      return (
                        <li
                          key={offer.code}
                          className="group relative flex h-full min-w-0 flex-col border-b border-black bg-white/85 p-4 last:border-b-0 md:[grid-row:span_17] md:grid md:h-auto md:grid-rows-subgrid md:border-b-0 md:border-r md:last:border-r-0 before:pointer-events-none before:absolute before:inset-0 before:bg-cyan-50/80 before:opacity-0 before:transition-opacity before:duration-500 before:ease-out hover:before:opacity-100 focus-within:before:opacity-100 motion-reduce:before:transition-none"
                        >
                          <h3 className="relative z-10 flex items-center justify-between gap-3 font-electric-blue text-[1.5rem] lowercase leading-[0.95] tracking-[0.02em] transition-colors duration-500 ease-out group-hover:text-cyan-700 md:text-[1.625rem]">
                            <ShuffleDualLines
                              className="min-w-0"
                              enableHover={!reduced}
                              holdDurationMs={2200}
                              shuffleDurationMs={900}
                              lines={[
                                {
                                  primary: shopText(offer.name, language).toLowerCase(),
                                  alternate: shopText(offer.hook, language).toLowerCase(),
                                },
                              ]}
                              lineClassName="font-electric-blue text-[1.5rem] lowercase leading-[0.95] tracking-[0.02em] md:text-[1.625rem]"
                            />
                            <IntervalSwitch
                              value={billing}
                              language={language}
                              onChange={(next) => setOfferInterval(offer.code, next)}
                            />
                          </h3>
                          <p className="relative z-10 mt-1 font-home-title text-[0.75rem] leading-[1.4] text-black/75">
                            {shopText(offer.summary, language)}
                          </p>
                          <p className="relative z-10 mt-2 flex items-baseline gap-2 font-kode text-[1.625rem] tracking-[0.04em]">
                            {formatEuro(cents, language)}
                            <span className="font-home-title text-[0.75rem] tracking-normal text-black/60">
                              {shopText(billing === "year" ? ui.perYear : ui.perMonth, language)}
                            </span>
                          </p>
                          <ul className="relative z-10 -mx-4 mt-2 flex flex-1 flex-col md:[grid-row:span_12] md:grid md:flex-none md:grid-rows-subgrid">
                            {offer.features.map((feature) => (
                              <li
                                key={feature.id}
                                className={`flex min-w-0 items-center justify-between gap-3 border-t border-black px-4 py-1 font-home-title text-[0.75rem] leading-[1.35] ${
                                  feature.included ? "text-black" : "text-black/40"
                                }`}
                              >
                                <span className="min-w-0 break-words">{shopText(feature.label, language)}</span>
                                {feature.included ? (
                                  <span className="max-w-[45%] shrink-0 text-right font-kode text-[0.6875rem] text-black/65">
                                    {shopText(feature.value, language)}
                                  </span>
                                ) : (
                                  <span>
                                    <span aria-hidden="true">—</span>
                                    <span className="sr-only">{shopText(feature.value, language)}</span>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div className="relative z-10">
                          {paymentPlan === offer.code && actionMessage ? (
                            <p role="status" className="mt-2 font-home-title text-[0.75rem] leading-[1.4]">
                              {shopText(actionMessage, language)}
                            </p>
                          ) : null}
                          </div>
                          <div className="relative z-10 mt-auto pt-3 md:mt-0">
                          <ShopSubscribeButton
                            onClick={() => void subscribe(offer.code, billing)}
                            disabled={session.status === "loading"}
                          >
                            {shopText(ui.subscribe, language)}
                          </ShopSubscribeButton>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                  {unlocked ? (
                    <article className="mt-4 flex min-w-0 max-w-xl flex-col border-2 border-black p-5 md:p-6">
                      <h3 className="font-kode text-[1.5rem] uppercase tracking-[0.08em]">{unlocked.name}</h3>
                      <p className="mt-2 font-home-title text-[0.8125rem] leading-[1.62] text-black/75">{unlocked.summary}</p>
                      {unlocked.usageTerms && <p className="mt-3 whitespace-pre-wrap break-words font-home-title text-[0.8125rem] leading-[1.62]">{unlocked.usageTerms}</p>}
                      <p className="mt-3 flex items-baseline gap-2 font-kode text-[2rem] tracking-[0.04em]">
                        {formatEuro(unlocked.amountCents, language)}
                        <span className="font-home-title text-[0.8125rem] tracking-normal text-black/60">
                          {shopText(ui.perMonth, language)}
                        </span>
                      </p>
                      <ShopSubscribeButton
                        className="mt-4"
                        onClick={() => void subscribe(unlocked.planCode, "month")}
                        disabled={session.status === "loading"}
                      >
                        {shopText(ui.subscribe, language)}
                      </ShopSubscribeButton>
                      {paymentPlan === unlocked.planCode && actionMessage ? (
                        <p role="status" className="mt-4 font-home-title text-[0.8125rem] leading-[1.62]">
                          {shopText(actionMessage, language)}
                        </p>
                      ) : null}
                    </article>
                  ) : null}

                </section>
              ) : null}

              {section !== "offers" && <ClientWorkspace key={session.status === "ready" ? session.email : session.status} section={section} language={language} onLogout={() => void logout()} />}
            </motion.div>
          </AnimatePresence>
          </div>
          </div>
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
