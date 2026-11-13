"use client"

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import CustomCursor from "@/components/chrome/CustomCursor"
import HeaderLogo from "@/components/chrome/HeaderLogo"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import { useLanguage } from "@/contexts/LanguageContext"
import AdminPromotions from "./AdminPromotions"
import InterventionPanel from "@/components/shop/InterventionPanel"
import { api, translate } from "@/lib/interventions/view"
import { adminCopy, type AdminLabel } from "@/lib/admin/view"

type Row = Record<string, string | number | boolean | null>
type Page = { rows: Row[]; total: number; offset: number; limit: number }
type Overview = {
  counts: Row
  finances: Array<Record<string, string | number>>
  generatedAt: string
  from: string
  to: string
}

type NavId = "overview" | "clients" | "billing" | "interventions" | "promotions" | "journal"
type RecordKind =
  | "clients"
  | "subscriptions"
  | "invoices"
  | "payments"
  | "refunds"
  | "interventions"
  | "redemptions"
  | "history"
  | "audit"

const NAV: { id: NavId; label: AdminLabel }[] = [
  { id: "overview", label: "overview" },
  { id: "clients", label: "clients" },
  { id: "billing", label: "billing" },
  { id: "interventions", label: "interventions" },
  { id: "promotions", label: "promotions" },
  { id: "journal", label: "journal" },
]

const BILLING_KINDS: { id: RecordKind; label: AdminLabel }[] = [
  { id: "subscriptions", label: "subscriptions" },
  { id: "invoices", label: "invoices" },
  { id: "payments", label: "payments" },
  { id: "refunds", label: "refunds" },
]

const JOURNAL_KINDS: { id: RecordKind; label: AdminLabel }[] = [
  { id: "history", label: "history" },
  { id: "audit", label: "audit" },
  { id: "redemptions", label: "redemptions" },
]

const card = "min-w-0 border border-black bg-white p-4 md:p-5"
const field =
  "mt-1 w-full min-w-0 border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
const ghostBtn =
  "font-kode inline-flex min-h-9 items-center justify-center border border-black bg-white px-4 text-[0.625rem] uppercase tracking-[0.12em] text-black transition-colors hover:border-cyan-500 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-40"
const solidBtn =
  "font-kode inline-flex min-h-9 items-center justify-center border border-black bg-black px-4 text-[0.625rem] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-40"

function parseNav(raw: string | null): NavId {
  if (raw && NAV.some((item) => item.id === raw)) return raw as NavId
  return "overview"
}

function defaultKind(nav: NavId): RecordKind | null {
  if (nav === "clients") return "clients"
  if (nav === "billing") return "subscriptions"
  if (nav === "interventions") return "interventions"
  if (nav === "journal") return "audit"
  return null
}

function TextCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${card} ${className}`.trim()}>{children}</div>
}

export default function AdminConsole() {
  const { language } = useLanguage()
  const lang = language === "en" ? "en" : "fr"
  const t = (key: string) =>
    key in adminCopy ? adminCopy[key as AdminLabel][lang === "en" ? 1 : 0] : translate(key, lang)

  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const nav = parseNav(params.get("section"))
  const client = params.get("client") ?? ""
  const subscription = params.get("subscription") ?? ""

  const kindParam = params.get("kind")
  const kind: RecordKind | null =
    kindParam &&
    [...BILLING_KINDS, ...JOURNAL_KINDS, { id: "clients" as const }, { id: "interventions" as const }].some(
      (item) => item.id === kindParam,
    )
      ? (kindParam as RecordKind)
      : defaultKind(nav)

  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)).toISOString().slice(0, 10)

  const [filter, setFilter] = useState({
    from: start,
    to: end,
    q: "",
    status: "",
    priority: "",
  })
  const [offset, setOffset] = useState(0)
  const [version, setVersion] = useState(0)
  const [data, setData] = useState<Page | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [profile, setProfile] = useState<Row | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setOffset(0)
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }

  function goNav(next: NavId) {
    setFilter((current) => ({ ...current, status: "", priority: "" }))
    navigate({
      section: next,
      kind: defaultKind(next),
      request: null,
      subscription: null,
      client: next === "overview" || next === "journal" ? null : client || null,
    })
  }

  const query = useCallback(() => {
    const search = new URLSearchParams({
      from: filter.from,
      to: filter.to,
      offset: String(offset),
    })
    if (kind) search.set("kind", kind)
    if (client) search.set("clientId", client)
    if (subscription && kind === "history") search.set("subscriptionId", subscription)
    if (filter.q) search.set("q", filter.q)
    if (filter.status) search.set("status", filter.status)
    if (filter.priority && kind === "interventions") search.set("priority", filter.priority)
    return search.toString()
  }, [kind, filter, offset, client, subscription])

  useEffect(() => {
    if (nav === "promotions" && kind !== "redemptions") {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError("")
    setData(null)
    setOverview(null)
    setProfile(null)

    const url = nav === "overview" ? "/api/admin/overview?" : "/api/admin/records?"
    void Promise.all([
      api<{ data: Page | Overview }>(url + query()),
      client ? api<{ data: Row }>("/api/admin/clients/" + client) : Promise.resolve(null),
    ])
      .then(([result, who]) => {
        if (!active) return
        if (nav === "overview") setOverview(result.data as Overview)
        else setData(result.data as Page)
        setProfile(who?.data ?? null)
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "unavailable")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [nav, kind, query, version, client])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFilter({
      from: String(form.get("from")),
      to: String(form.get("to")),
      q: String(form.get("q") ?? ""),
      status: String(form.get("status") ?? ""),
      priority: String(form.get("priority") ?? ""),
    })
    setOffset(0)
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    window.location.assign("/")
  }

  const format = (key: string, value: Row[string], currency = "EUR") => {
    if (value === null || value === "") return "—"
    if (key.endsWith("Cents") && typeof value === "number") {
      return new Intl.NumberFormat(lang === "en" ? "en-GB" : "fr-FR", {
        style: "currency",
        currency,
      }).format(value / 100)
    }
    if (key.endsWith("At") || key.startsWith("currentPeriod") || key === "cancelEffectiveAt") {
      return `${new Date(String(value)).toLocaleString(lang === "en" ? "en-GB" : "fr-FR", { timeZone: "UTC" })} UTC`
    }
    if (key === "lastEventCreated") {
      return Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : "—"
    }
    if (typeof value === "boolean") return lang === "fr" ? (value ? "Oui" : "Non") : value ? "Yes" : "No"
    return ["status", "internalPriority", "billingInterval"].includes(key) ? t(String(value)) : String(value)
  }

  function details(row: Row) {
    return (
      <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
        {Object.entries(row)
          .filter(([k]) => k !== "userId")
          .map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="font-kode text-[0.5625rem] uppercase tracking-[0.12em] text-black/55">{t(k)}</dt>
              <dd className="mt-1 break-words whitespace-pre-wrap font-home-title text-sm">
                {format(k, v, String(row.currency ?? "EUR"))}
              </dd>
            </div>
          ))}
      </dl>
    )
  }

  const statusOptions =
    kind === "subscriptions"
      ? ["incomplete", "incomplete_expired", "trialing", "active", "past_due", "unpaid", "canceled"]
      : kind === "invoices"
        ? ["draft", "open", "paid", "uncollectible", "void"]
        : kind === "interventions"
          ? ["submitted", "analyzing", "accepted", "in_progress", "waiting_client", "completed", "rejected", "cancelled"]
          : kind === "redemptions"
            ? ["reserved", "consumed", "released"]
            : kind === "payments" || kind === "refunds"
              ? ["pending", "succeeded", "failed", "canceled"]
              : []

  const showFilters = nav !== "promotions" || kind === "redemptions"
  const showList = Boolean(kind) && (nav !== "promotions" || kind === "redemptions")
  const subTabs = nav === "billing" ? BILLING_KINDS : nav === "journal" ? JOURNAL_KINDS : null

  return (
    <div className="fixed inset-0 overflow-hidden bg-white text-black">
      <CustomCursor />
      <div className="relative z-10 flex h-dvh flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <a href="/" aria-label="NOMAD403">
              <HeaderLogo mode="day" variant="loader" />
            </a>
            <h1 className="font-electric-blue text-[1.25rem] lowercase leading-none tracking-[0.02em] md:text-[1.5rem]">
              admin
            </h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <LanguageSwitcher mode="day" />
            <a href="/shop" className={ghostBtn}>
              {t("adminHome")}
            </a>
            <button type="button" className={ghostBtn} onClick={() => void logout()}>
              {t("adminSignOut")}
            </button>
          </div>
        </header>

        <main className="site-grid flex min-h-0 flex-1 flex-col pb-3 pt-1 md:pb-8">
          <div className="site-grid-inner flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-black bg-transparent">
              <nav
                aria-label={t("adminNav")}
                className="relative z-40 shrink-0 overflow-x-auto border-b border-black bg-white"
              >
                <ul className="flex min-h-10 items-stretch">
                  {NAV.map((item) => {
                    const active = item.id === nav
                    return (
                      <li key={item.id} className="flex border-r border-black">
                        <button
                          type="button"
                          aria-current={active ? "page" : undefined}
                          onClick={() => goNav(item.id)}
                          className={`flex h-full min-h-10 items-center whitespace-nowrap px-4 py-2 font-kode text-[0.625rem] uppercase tracking-[0.12em] transition-colors md:px-5 md:text-[0.6875rem] ${
                            active
                              ? "bg-cyan-50/80 text-cyan-700"
                              : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                          }`}
                        >
                          {t(item.label)}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
                <div className="mb-5 flex flex-col gap-3">
                  <h2 className="font-electric-blue text-[1.5rem] lowercase leading-[0.95] tracking-[0.02em] md:text-[1.75rem]">
                    {t(nav)}
                  </h2>
                  <p className="max-w-3xl font-home-title text-[0.75rem] leading-[1.45] text-black/65">
                    {t("local")}
                  </p>
                </div>

                {subTabs ? (
                  <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t(nav)}>
                    {subTabs.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={kind === item.id}
                        className={kind === item.id ? solidBtn : ghostBtn}
                        onClick={() => navigate({ kind: item.id, subscription: null })}
                      >
                        {t(item.label)}
                      </button>
                    ))}
                  </div>
                ) : null}

                {client ? (
                  <TextCard className="mb-5 max-w-xl">
                    <p className="font-kode text-[0.5625rem] uppercase tracking-[0.12em] text-black/55">
                      {t("clientFilter")}
                    </p>
                    <p className="mt-2 break-all font-home-title text-sm">{profile?.email ?? client}</p>
                    <button type="button" className={`${ghostBtn} mt-3`} onClick={() => navigate({ client: null })}>
                      {t("resetClient")}
                    </button>
                  </TextCard>
                ) : null}

                {showFilters ? (
                  <TextCard className="mb-5">
                    <form key={`${nav}-${kind}-${filter.from}-${filter.to}`} onSubmit={apply} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="font-home-title text-sm">
                        {t("from")}
                        <input name="from" type="date" required defaultValue={filter.from} className={field} />
                      </label>
                      <label className="font-home-title text-sm">
                        {t("to")}
                        <input name="to" type="date" required defaultValue={filter.to} className={field} />
                      </label>
                      {nav !== "overview" ? (
                        <label className="font-home-title text-sm">
                          {t("search")}
                          <input name="q" maxLength={120} defaultValue={filter.q} className={field} />
                        </label>
                      ) : null}
                      {statusOptions.length > 0 ? (
                        <label className="font-home-title text-sm">
                          {t("status")}
                          <select name="status" defaultValue={filter.status} className={field}>
                            <option value="">{t("any")}</option>
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {t(status)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {kind === "interventions" ? (
                        <label className="font-home-title text-sm">
                          {t("priority")}
                          <select name="priority" defaultValue={filter.priority} className={field}>
                            <option value="">{t("any")}</option>
                            {["low", "normal", "high", "urgent"].map((priority) => (
                              <option key={priority} value={priority}>
                                {t(priority)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
                        <button type="submit" className={solidBtn} disabled={loading}>
                          {t("apply")}
                        </button>
                        <button
                          type="button"
                          className={ghostBtn}
                          onClick={() => {
                            setOffset(0)
                            setFilter((current) => ({ ...current, from: start, to: end }))
                          }}
                        >
                          {t("month")}
                        </button>
                        <button
                          type="button"
                          className={ghostBtn}
                          onClick={() => {
                            setOffset(0)
                            setFilter((current) => ({ ...current, from: "2000-01-01", to: end }))
                          }}
                        >
                          {t("all")}
                        </button>
                        <button type="button" className={ghostBtn} onClick={() => setVersion((v) => v + 1)}>
                          {t("refresh")}
                        </button>
                      </div>
                    </form>
                  </TextCard>
                ) : null}

                {loading ? (
                  <TextCard className="max-w-md">
                    <p role="status">{t("loading")}</p>
                  </TextCard>
                ) : null}

                {error ? (
                  <div role="alert">
                    <TextCard className="max-w-xl">
                      <p>{t(error)}</p>
                      <button type="button" className={`${ghostBtn} mt-3`} onClick={() => setVersion((v) => v + 1)}>
                        {t("retry")}
                      </button>
                    </TextCard>
                  </div>
                ) : null}

                {overview ? (
                  <div className="flex flex-col gap-5">
                    <TextCard>
                      <p>
                        {t("generated")} : {format("recordedAt", overview.generatedAt)}
                      </p>
                      <p className="mt-2">
                        {t("received")} :{" "}
                        {overview.counts.lastReceivedAt
                          ? format("recordedAt", overview.counts.lastReceivedAt)
                          : t("never")}
                      </p>
                      <p className="mt-3 border-l-2 border-cyan-500 pl-3 text-black/70">{t("rules")}</p>
                    </TextCard>

                    <div>
                      <h3 className="mb-3 font-kode text-[0.6875rem] uppercase tracking-[0.14em]">{t("stocks")}</h3>
                      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(overview.counts)
                          .filter(([k]) => !["lastReceivedAt", "newClients", "newInterventions"].includes(k))
                          .map(([k, v]) => (
                            <div key={k} className={card}>
                              <dt className="font-home-title text-sm text-black/70">{t(k)}</dt>
                              <dd className="mt-2 font-kode text-2xl">{String(v)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>

                    <TextCard>
                      <h3 className="font-kode text-[0.6875rem] uppercase tracking-[0.14em]">{t("flows")}</h3>
                      <p className="mt-3">
                        {t("newClients")} : {overview.counts.newClients} · {t("newInterventions")} :{" "}
                        {overview.counts.newInterventions}
                      </p>
                    </TextCard>

                    {(overview.finances ?? []).length === 0 ? <TextCard>{t("empty")}</TextCard> : null}
                    {(overview.finances ?? []).map((finance) => (
                      <section key={String(finance.currency)} className="flex flex-col gap-3">
                        <h4 className="font-kode text-[0.8125rem] uppercase tracking-[0.12em]">
                          {finance.currency}
                        </h4>
                        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {["mrrCents", "arrCents", "issuedCents", "collectedCents", "refundedCents", "unpaidCents"].map(
                            (key) => (
                              <div key={key} className={card}>
                                <dt className="font-home-title text-sm text-black/70">{t(key)}</dt>
                                <dd className="mt-2 break-words font-kode text-xl">
                                  {format(key, Number(finance[key]), String(finance.currency))}
                                </dd>
                              </div>
                            ),
                          )}
                        </dl>
                        {[
                          "excludedSubscriptions",
                          "missingInvoiceDates",
                          "missingPaymentDates",
                          "missingRefundDates",
                          "missingInvoiceTotals",
                          "unlinkedPaidInvoices",
                        ].some((key) => Number(finance[key]) > 0) ? (
                          <TextCard>
                            <p className="font-kode text-[0.5625rem] uppercase tracking-[0.12em]">{t("missing")}</p>
                            {[
                              "excludedSubscriptions",
                              "missingInvoiceDates",
                              "missingPaymentDates",
                              "missingRefundDates",
                              "missingInvoiceTotals",
                              "unlinkedPaidInvoices",
                            ].map((key) =>
                              Number(finance[key]) > 0 ? (
                                <p key={key} className="mt-2">
                                  {t(key)} : {finance[key]}
                                </p>
                              ) : null,
                            )}
                          </TextCard>
                        ) : null}
                      </section>
                    ))}
                  </div>
                ) : null}

                {profile ? (
                  <details className={`${card} mb-5`}>
                    <summary className="cursor-pointer font-kode text-[0.6875rem] uppercase tracking-[0.12em]">
                      {t("selected")}
                    </summary>
                    <div className="mt-4">{details(profile)}</div>
                  </details>
                ) : null}

                {kind === "history" ? (
                  <p className="mb-4 max-w-3xl font-home-title text-[0.75rem] text-black/65">{t("historyNote")}</p>
                ) : null}

                {showList && data ? (
                  <div className="flex flex-col gap-4">
                    <p className="font-kode text-[0.6875rem] uppercase tracking-[0.12em]">
                      {data.total} {lang === "fr" ? "résultat(s)" : "result(s)"}
                    </p>
                    {data.rows.length === 0 ? (
                      <TextCard>{t("empty")}</TextCard>
                    ) : (
                      <ul className="flex flex-col border border-black bg-white">
                        {data.rows.map((row) => (
                          <li
                            key={String(row.id)}
                            className="min-w-0 border-t border-black p-4 first:border-t-0 md:p-5"
                          >
                            <p className="break-words font-kode text-[0.8125rem] uppercase tracking-[0.08em]">
                              {row.email ?? row.actorEmail ?? row.action}
                            </p>
                            {row.planCode ? (
                              <p className="mt-2 font-home-title text-sm">
                                {row.planCode} ·{" "}
                                {format("amountCents", row.amountCents, String(row.currency ?? "EUR"))}
                              </p>
                            ) : null}
                            {row.subject ? (
                              <p className="mt-2 break-words font-home-title text-sm">{row.subject}</p>
                            ) : null}
                            {row.status ? <p className="mt-2 font-home-title text-sm">{t(String(row.status))}</p> : null}
                            {kind === "subscriptions" ? (
                              <p className="mt-2 text-sm text-black/65">
                                {row.reviewRequired
                                  ? t("review")
                                  : Number(row.lastEventCreated) > 0
                                    ? t("confirmed")
                                    : t("noSync")}
                              </p>
                            ) : null}
                            <details className="mt-3">
                              <summary className="cursor-pointer font-kode text-[0.5625rem] uppercase tracking-[0.12em]">
                                {t("details")}
                              </summary>
                              <div className="mt-4">{details(row)}</div>
                            </details>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {kind === "clients" ? (
                                <button
                                  type="button"
                                  className={ghostBtn}
                                  onClick={() =>
                                    navigate({
                                      client: String(row.id),
                                      section: "billing",
                                      kind: "subscriptions",
                                    })
                                  }
                                >
                                  {t("open")}
                                </button>
                              ) : null}
                              {kind === "subscriptions" ? (
                                <button
                                  type="button"
                                  className={ghostBtn}
                                  onClick={() =>
                                    navigate({
                                      section: "journal",
                                      kind: "history",
                                      subscription: String(row.id),
                                    })
                                  }
                                >
                                  {t("history")}
                                </button>
                              ) : null}
                              {kind === "interventions" ? (
                                <button
                                  type="button"
                                  className={ghostBtn}
                                  onClick={() => navigate({ request: String(row.id) })}
                                >
                                  {t("open")}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={ghostBtn}
                        disabled={!offset || loading}
                        onClick={() => setOffset(Math.max(0, offset - 25))}
                      >
                        {t("previous")}
                      </button>
                      <button
                        type="button"
                        className={ghostBtn}
                        disabled={offset + 25 >= data.total || loading}
                        onClick={() => setOffset(offset + 25)}
                      >
                        {t("next")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {nav === "promotions" && kind !== "redemptions" ? <AdminPromotions /> : null}

                {nav === "interventions" ? (
                  <div className="mt-6">
                    <InterventionPanel admin hideList language={lang} onChanged={() => setVersion((v) => v + 1)} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
