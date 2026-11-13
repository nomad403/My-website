"use client"

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { api, translate, type Dashboard } from "@/lib/interventions/view"
import ShopAuthPanel from "./ShopAuthPanel"
import InterventionPanel from "./InterventionPanel"
import ShopSubscribeButton from "./ShopSubscribeButton"

/** Solid text surface — body of the shop grid stays transparent behind. */
const card = "min-w-0 border border-black bg-white p-4 md:p-5"
const control =
  "mt-1 w-full border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline-cyan-500"

const PLAN_NAMES: Record<string, string> = {
  essential: "Essential",
  plus: "Plus",
  premium: "Premium",
  friend_host: "Friend Host",
  friend_care: "Friend Care",
}

function ActionButton({
  children,
  disabled,
  onClick,
  type = "button",
  className = "",
}: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit"
  className?: string
}) {
  return (
    <ShopSubscribeButton
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`!w-auto ${className}`.trim()}
    >
      {children}
    </ShopSubscribeButton>
  )
}

function TextCard({
  children,
  className = "",
  role,
  "aria-live": ariaLive,
}: {
  children: ReactNode
  className?: string
  role?: string
  "aria-live"?: "off" | "polite" | "assertive"
}) {
  return (
    <div className={`${card} ${className}`.trim()} role={role} aria-live={ariaLive}>
      {children}
    </div>
  )
}

export default function ClientWorkspace({
  section,
  language,
  onLogout,
}: {
  section: string
  language: "fr" | "en"
  onLogout?: () => void
}) {
  const t = (key: string) => translate(key, language)
  const router = useRouter()
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData((await api<{ dashboard: Dashboard }>("/api/account/dashboard")).dashboard)
    } catch (e) {
      setError(e instanceof Error ? e.message : "unavailable")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const money = (v: number) =>
    new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(v / 100)

  const date = (v: string | null) =>
    v ? new Date(v).toLocaleString(language === "en" ? "en-GB" : "fr-FR") : "—"

  async function portal() {
    setBusy(true)
    setMessage("")
    try {
      const result = await api<{ url: string }>("/api/account/portal", { method: "POST" })
      window.location.assign(result.url)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "portal_failed")
    } finally {
      setBusy(false)
    }
  }

  async function profile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = new FormData(event.currentTarget)
    try {
      await api("/api/account/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
        }),
      })
      setMessage("saved")
      await load()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "unavailable")
    } finally {
      setBusy(false)
    }
  }

  async function project(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = event.currentTarget
    try {
      await api("/api/account/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: new FormData(form).get("name") }),
      })
      form.reset()
      await load()
      setMessage("saved")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "unavailable")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <TextCard className="max-w-xl">
        <p role="status" className="font-home-title text-sm">
          {t("loading")}
        </p>
      </TextCard>
    )
  }

  if (error) {
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <TextCard role="alert">
          <p className="font-home-title text-sm">{t(error)}</p>
          <div className="mt-4">
            <ActionButton onClick={() => void load()}>{t("retry")}</ActionButton>
          </div>
        </TextCard>
        {error === "auth_required" ? (
          <TextCard>
            <ShopAuthPanel language={language} />
          </TextCard>
        ) : null}
      </div>
    )
  }

  if (!data) return null

  const showIdentityHeader = section === "account"

  const subscriptions = (
    <div className="grid gap-5 lg:grid-cols-2">
      {data.subscriptions.length === 0 ? (
        <TextCard>
          <p>{t("emptySubscriptions")}</p>
        </TextCard>
      ) : (
        data.subscriptions.map((sub) => {
          const scheduled = sub.status === "active" && (sub.cancelRequestedAt || sub.cancelEffectiveAt)
          return (
            <article key={sub.id} className={`${card} overflow-hidden`}>
              <h3 className="font-kode text-lg uppercase">{PLAN_NAMES[sub.planCode] ?? sub.planCode}</h3>
              <p className="mt-2">{t(scheduled ? "scheduled" : sub.status)}</p>
              <p className="mt-3 font-kode text-xl">
                {money(sub.amountCents)} / {t(sub.billingInterval)}
              </p>
              <p className="mt-3 text-sm">
                {t("periodStart")} : {date(sub.currentPeriodStart)}
                <br />
                {t("periodEnd")} : {date(sub.currentPeriodEnd)}
              </p>
              {scheduled ? (
                <p className="mt-2 text-sm">
                  {t("cancellation")} : {date(sub.cancelEffectiveAt ?? sub.currentPeriodEnd)}
                </p>
              ) : null}

              <div className="-mx-4 mt-5 border-t border-black px-4 pt-4 md:-mx-5 md:px-5">
                <h4 className="font-kode text-xs uppercase">{t("quota")}</h4>
                <p className="mt-2 text-sm">{t(sub.quota.reason)}</p>
                <dl className="mt-3 grid grid-cols-3 gap-0 text-center">
                  {(["included", "consumed", "remaining"] as const).map((key, index) => (
                    <div key={key} className={`p-2 ${index > 0 ? "border-l border-black" : ""}`}>
                      <dt className="text-xs">{t(key)}</dt>
                      <dd className="font-kode text-xl">{sub.quota[key]}</dd>
                    </div>
                  ))}
                </dl>
                {sub.quota.start ? (
                  <p className="mt-2 text-xs">
                    {date(sub.quota.start)} → {date(sub.quota.end)}
                  </p>
                ) : null}
                {["premium", "friend_care"].includes(sub.planCode) ? (
                  <p className="mt-3 text-sm text-black/70">{t("rules")}</p>
                ) : null}
              </div>

              <details className="-mx-4 mt-4 border-t border-black px-4 pt-4 md:-mx-5 md:px-5">
                <summary className="cursor-pointer font-kode text-xs uppercase">{t("timeHistory")}</summary>
                {sub.timeEntries.length === 0 ? (
                  <p className="mt-2 text-sm">{t("noTime")}</p>
                ) : (
                  <ul className="mt-2">
                    {sub.timeEntries.map((entry) => (
                      <li
                        key={entry.id}
                        className="-mx-4 border-t border-black px-4 py-2 text-sm first:border-t-0 md:-mx-5 md:px-5"
                      >
                        {date(entry.performedAt)} · {entry.minutes} {t("minutes")} · {t(entry.coverage)}
                        <br />
                        <Link
                          className="underline"
                          href={`/shop?section=interventions&request=${entry.requestId}`}
                        >
                          {t("detail")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </article>
          )
        })
      )}
    </div>
  )

  return (
    <section className="font-home-title text-sm" aria-label={t(section)}>
      <div
        className={`mb-5 flex flex-wrap items-start gap-4 ${
          showIdentityHeader ? "justify-between" : "justify-end"
        }`}
      >
        {showIdentityHeader ? (
          <TextCard className="max-w-md">
            <h2 className="font-kode text-xl uppercase tracking-wider">{t(section)}</h2>
            <p className="mt-2">
              {[data.profile.firstName, data.profile.lastName].filter(Boolean).join(" ")}
            </p>
            <p className="mt-1 break-all text-black/65">{data.profile.email}</p>
          </TextCard>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => router.push("/shop?section=billing")}>{t("billing")}</ActionButton>
          <ActionButton onClick={() => router.push("/shop?section=interventions")}>
            {t("interventions")}
          </ActionButton>
          <ActionButton disabled={busy} onClick={() => void load()}>
            {t("refresh")}
          </ActionButton>
        </div>
      </div>

      {message ? (
        <TextCard className="mb-4 max-w-xl" role="status" aria-live="polite">
          <p>{t(message)}</p>
        </TextCard>
      ) : null}

      {(section === "subscriptions" || section === "account") && subscriptions}

      {section === "account" ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <form onSubmit={profile} className={`grid gap-3 ${card}`}>
            <label>
              {t("firstName")}
              <input
                className={control}
                name="firstName"
                maxLength={80}
                defaultValue={data.profile.firstName ?? ""}
                autoComplete="given-name"
              />
            </label>
            <label>
              {t("lastName")}
              <input
                className={control}
                name="lastName"
                maxLength={80}
                defaultValue={data.profile.lastName ?? ""}
                autoComplete="family-name"
              />
            </label>
            <ActionButton type="submit" disabled={busy}>
              {t("save")}
            </ActionButton>
          </form>
          <div className={card}>
            <h3 className="font-kode text-sm uppercase">{t("projects")}</h3>
            <ul className="mt-3">
              {data.projects.map((p) => (
                <li key={p.id} className="break-words border-t border-black py-2 first:border-t-0">
                  {p.name}
                </li>
              ))}
            </ul>
            <form className="mt-4" onSubmit={project}>
              <label>
                {t("newProject")}
                <input className={control} name="name" required maxLength={100} />
              </label>
              <div className="mt-3">
                <ActionButton type="submit" disabled={busy}>
                  {t("addProject")}
                </ActionButton>
              </div>
            </form>
          </div>
          {onLogout ? (
            <div className="md:col-span-2">
              <ActionButton onClick={onLogout}>
                {language === "en" ? "Sign out" : "Déconnexion"}
              </ActionButton>
            </div>
          ) : null}
        </div>
      ) : null}

      {section === "billing" ? (
        <div className="flex max-w-4xl flex-col gap-5">
          <TextCard>
            <ActionButton disabled={busy} onClick={() => void portal()}>
              {t("portal")}
            </ActionButton>
            <p className="mt-3 text-xs text-black/60">{t("recent")}</p>
          </TextCard>
          <TextCard>
            <h3 className="font-kode text-sm uppercase">{t("invoices")}</h3>
            {data.invoices.length === 0 ? (
              <p className="mt-3">{t("emptyInvoices")}</p>
            ) : (
              <ul className="-mx-4 mt-3 border-t border-black md:-mx-5">
                {data.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="border-t border-black px-4 py-4 first:border-t-0 md:px-5"
                  >
                    <p>
                      {t(invoice.status)} · {date(invoice.issuedAt)}
                    </p>
                    <p className="mt-1">
                      {t("due")} : {money(invoice.amountDueCents)} · {t("received")} :{" "}
                      {money(invoice.amountPaidCents)} · {t("balance")} :{" "}
                      {money(invoice.amountRemainingCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </TextCard>
          <TextCard>
            <h3 className="font-kode text-sm uppercase">{t("payments")}</h3>
            {data.payments.length === 0 ? (
              <p className="mt-3">{t("emptyPayments")}</p>
            ) : (
              <ul className="-mx-4 mt-3 border-t border-black md:-mx-5">
                {data.payments.map((payment) => (
                  <li
                    key={payment.id}
                    className="border-t border-black px-4 py-3 first:border-t-0 md:px-5"
                  >
                    {t(payment.status)} · {money(payment.amountCents)} · {date(payment.paidAt)}
                  </li>
                ))}
              </ul>
            )}
          </TextCard>
        </div>
      ) : null}

      {section === "interventions" ? (
        <InterventionPanel language={language} dashboard={data} onChanged={() => void load()} />
      ) : null}
    </section>
  )
}
