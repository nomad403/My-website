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
  "font-kode inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-black px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity duration-300 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"

const buttonClass = `${solidButtonClass} w-full`

const ghostButtonClass =
  "font-kode inline-flex min-h-12 items-center justify-center rounded-full border border-black bg-white px-6 text-[0.8125rem] uppercase tracking-[0.12em] text-black transition-colors duration-300 hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"

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
  const visibleSections: readonly ShopSection[] = session.status === "ready" ? SHOP_SECTIONS : ["offers", "account"]

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
      <ShopAsciiBackground />
      <CustomCursor />
      <div className="relative z-10 min-h-full">
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
        <main className="mx-auto w-full max-w-[84rem] px-4 pb-24 pt-3 md:px-8">
          <h1 className="sr-only">Shop Nomad403</h1>
          <div className="border border-black bg-white/80">
          <div className="flex flex-col gap-x-8 border-b border-black lg:flex-row lg:items-center">
          <nav aria-label={shopText(ui.sectionNav, language)} className="min-w-0 flex-1 overflow-x-auto">
            <ul className="flex min-h-12 items-stretch">
              {visibleSections.map((item) => {
                const active = item === section
                return (
                  <li key={item} className="flex border-r border-black">
                    <Link
                      href={sectionHref(item, interval)}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 w-full items-center justify-center whitespace-nowrap px-5 py-2 font-kode text-[0.625rem] uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 ${
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
          <div className="flex shrink-0 items-center justify-center px-4 pb-2 lg:py-2 lg:pl-0 lg:pr-5">
            <button
              type="button"
              role="switch"
              aria-checked={interval === "year"}
              aria-label={shopText(ui.yearly, language)}
              onClick={() => router.replace(sectionHref(section, interval === "month" ? "year" : "month"), {scroll:false})}
              className="relative grid min-h-9 w-48 grid-cols-2 items-center rounded-full border border-black bg-white p-1 font-kode text-[0.5625rem] uppercase tracking-[0.1em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-black transition-transform duration-300 motion-reduce:transition-none ${interval === "year" ? "translate-x-full" : "translate-x-0"}`} />
              <span className={`relative z-10 transition-colors ${interval === "month" ? "text-white" : "text-black/60"}`}>{shopText(ui.monthly, language)}</span>
              <span className={`relative z-10 transition-colors ${interval === "year" ? "text-white" : "text-black/60"}`}>{shopText(ui.yearly, language)}</span>
            </button>
          </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration, ease: "easeOut" }}
              className={section === "offers" ? "min-w-0" : "min-w-0 p-5 md:p-6"}
            >
              {section === "offers" ? (
                <section aria-labelledby="shop-offers-title">
                  <h2 id="shop-offers-title" className="sr-only">
                    {shopText(ui.sections.offers, language)}
                  </h2>
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

                  <ul className="grid grid-cols-1 items-stretch md:grid-cols-3 md:grid-rows-[repeat(11,auto)]">
                    {offers.map((offer) => {
                      const cents = interval === "year" ? offer.yearlyAmountCents : offer.monthlyAmountCents
                      return (
                        <li
                          key={offer.code}
                          className="group flex min-w-0 flex-col border-b border-black bg-white/85 p-4 transition-colors duration-300 last:border-b-0 hover:bg-cyan-50/80 focus-within:bg-cyan-50/80 md:[grid-row:span_11] md:grid md:grid-rows-subgrid md:border-b-0 md:border-r md:last:border-r-0"
                        >
                          <h3 className="font-kode text-[1.25rem] uppercase tracking-[0.08em] transition-colors duration-300 group-hover:text-cyan-700">
                            {shopText(offer.name, language)}
                          </h3>
                          <p className="mt-1.5 font-home-title text-[0.75rem] leading-[1.4] text-black/70">
                            {shopText(offer.summary, language)}
                          </p>
                          <p className="mt-2.5 flex items-baseline gap-2 font-kode text-[1.75rem] tracking-[0.04em]">
                            {formatEuro(cents, language)}
                            <span className="font-home-title text-[0.75rem] tracking-normal text-black/55">
                              {shopText(interval === "year" ? ui.perYear : ui.perMonth, language)}
                            </span>
                          </p>
                          <ul className="-mx-4 mt-2.5 flex flex-col md:[grid-row:span_7] md:grid md:grid-rows-subgrid">
                            {offer.features.map((feature) => (
                              <li
                                key={feature.id}
                                className={`flex min-w-0 items-start justify-between gap-3 border-t border-black px-4 py-1 font-home-title text-[0.75rem] leading-[1.35] ${feature.included ? "text-black/80" : "text-black/40"}`}
                              >
                                <span className="min-w-0 break-words">{shopText(feature.label, language)}</span>
                                {feature.included ? (
                                  <span className="max-w-[42%] shrink-0 text-right font-kode text-[0.6875rem]">
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
                          <div>
                          {paymentPlan === offer.code && actionMessage ? (
                            <p role="status" className="mt-2 font-home-title text-[0.75rem] leading-[1.4]">
                              {shopText(actionMessage, language)}
                            </p>
                          ) : null}
                          </div>
                          <div className="mt-auto pt-3 md:mt-0">
                          <button
                            type="button"
                            className={buttonClass}
                            onClick={() => void subscribe(offer.code)}
                            disabled={session.status === "loading"}
                          >
                            {shopText(ui.subscribe, language)}
                          </button>
                          </div>
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

                </section>
              ) : null}

              {section !== "offers" && <ClientWorkspace key={session.status === "ready" ? session.email : session.status} section={section} language={language} onLogout={() => void logout()} />}
            </motion.div>
          </AnimatePresence>
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
