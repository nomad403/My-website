"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { categories, transitions, type RequestStatus } from "@/lib/interventions/contract"
import {
  api,
  translate,
  type Dashboard,
  type RequestView,
  type RequestDetail,
} from "@/lib/interventions/view"

const card = "min-w-0 border border-black bg-white p-4 md:p-5"
const field =
  "mt-1 w-full border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline focus-visible:outline-cyan-500"
const button =
  "border border-black/25 bg-white px-3 py-2 font-kode text-xs uppercase tracking-wide focus-visible:outline-cyan-500 disabled:opacity-40"

function TextCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${card} ${className}`.trim()}>{children}</div>
}

export default function InterventionPanel({
  admin = false,
  hideList = false,
  language,
  dashboard,
  onChanged,
}: {
  admin?: boolean
  hideList?: boolean
  language: "fr" | "en"
  dashboard?: Dashboard
  onChanged?: () => void
}) {
  const t = (key: string) => translate(key, language)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const selectedId = params.get("request")
  const base = admin ? "/api/admin/interventions" : "/api/account/interventions"
  const [rows, setRows] = useState<RequestView[]>([])
  const [offset, setOffset] = useState(0)
  const [detailOffset, setDetailOffset] = useState(0)
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [next, setNext] = useState("analyzing")
  const pending = useRef<{ signature: string; key: string } | null>(null)

  const load = useCallback(async () => {
    if (hideList) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setRows((await api<{ requests: RequestView[] }>(base + "?offset=" + offset)).requests)
    } catch (e) {
      setError(e instanceof Error ? e.message : "unavailable")
    } finally {
      setLoading(false)
    }
  }, [base, offset, hideList])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError("")
    if (!selectedId) return
    setLoadingDetail(true)
    void api<{ request: RequestDetail }>(base + "/" + selectedId + "?offset=" + detailOffset)
      .then((data) => {
        if (!cancelled) setDetail(data.request)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "unavailable")
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, base, detailOffset])

  useEffect(() => {
    setNext(
      detail
        ? (transitions[detail.status as RequestStatus]?.filter((s) => s !== "completed")[0] ?? "")
        : "analyzing",
    )
  }, [detail?.status])

  function open(id: string | null) {
    setDetailOffset(0)
    const query = new URLSearchParams(params.toString())
    if (id) query.set("request", id)
    else query.delete("request")
    router.replace(pathname + "?" + query.toString(), { scroll: false })
  }

  async function refresh() {
    await load()
    if (selectedId) {
      setDetail(
        (await api<{ request: RequestDetail }>(base + "/" + selectedId + "?offset=" + detailOffset))
          .request,
      )
    }
    onChanged?.()
  }

  async function command(
    url: string,
    payload: Record<string, unknown>,
    method = "PATCH",
  ): Promise<{ id?: string } | null> {
    setBusy(true)
    setNotice("")
    setError("")
    const signature = JSON.stringify([url, payload])
    if (pending.current?.signature !== signature) {
      pending.current = { signature, key: crypto.randomUUID() }
    }
    try {
      const result = await api<{ id?: string }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, operationKey: pending.current.key }),
      })
      setNotice("saved")
      await refresh()
      pending.current = null
      return result
    } catch (e) {
      setError(e instanceof Error ? e.message : "unavailable")
      return null
    } finally {
      setBusy(false)
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    const result = await command(
      base,
      {
        projectId: values.get("projectId"),
        subscriptionId: values.get("subscriptionId") || null,
        subject: values.get("subject"),
        description: values.get("description"),
        category: values.get("category"),
        urgency: values.get("urgency"),
        additionalInfo: values.get("additionalInfo") || "",
      },
      "POST",
    )
    if (result?.id) {
      form.reset()
      open(result.id)
    }
  }

  async function message(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    if (
      await command(base + "/" + selectedId, {
        action: "message",
        body: values.get("body"),
        ...(admin ? { internal: values.get("internal") === "on" } : {}),
      })
    ) {
      form.reset()
    }
  }

  async function transition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    await command(base + "/" + selectedId, {
      action: "transition",
      status: next,
      body: values.get("body") || "",
      ...(next === "accepted"
        ? {
            coverage: values.get("coverage"),
            minorScopeConfirmed: values.get("minorScopeConfirmed") === "on",
          }
        : {}),
    })
  }

  async function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const dateValue = String(values.get("performedAt") || "")
    await command(base + "/" + selectedId, {
      action: "complete",
      minutes: Number(values.get("minutes")),
      body: values.get("body") || "",
      ...(dateValue ? { performedAt: new Date(dateValue).toISOString() } : {}),
    })
  }

  const date = (value: string) =>
    new Date(value).toLocaleString(language === "en" ? "en-GB" : "fr-FR")
  const closed = detail && ["completed", "cancelled", "rejected"].includes(detail.status)

  return (
    <section
      aria-labelledby={admin ? "admin-interventions-title" : "client-interventions-title"}
      className={
        admin ? "mt-10 border-t border-black/20 pt-6 font-home-title text-sm" : "font-home-title text-sm"
      }
    >
      <div className="flex flex-col gap-5">
        <TextCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2
              id={admin ? "admin-interventions-title" : "client-interventions-title"}
              className="font-kode text-xl uppercase tracking-wider"
            >
              {t("interventions")}
            </h2>
            <button
              className={button}
              disabled={busy || loading}
              onClick={() => {
                setError("")
                void refresh().catch(() => setError("unavailable"))
              }}
            >
              {t("refresh")}
            </button>
          </div>
          <p className="mt-3 text-sm text-black/70">{t("notice")}</p>
          <div role="status" aria-live="polite" className="mt-3">
            {notice ? t(notice) : null}
            {busy ? ` ${t("loading")}` : null}
          </div>
          {error ? (
            <p role="alert" className="mt-3 border-l-2 border-cyan-500 pl-3">
              {t(error)}
            </p>
          ) : null}
        </TextCard>

        {!admin ? (
          <details className={card}>
            <summary className="cursor-pointer font-kode text-sm uppercase">{t("newRequest")}</summary>
            {!dashboard?.projects.length ? (
              <p className="mt-3">{t("noProjects")}</p>
            ) : (
              <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  {t("project")}
                  <select name="projectId" className={field} required>
                    {dashboard.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("subscription")}
                  <select name="subscriptionId" className={field}>
                    <option value="">{t("none")}</option>
                    {dashboard.subscriptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.planCode} · {t(s.status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="md:col-span-2">
                  {t("subject")}
                  <input name="subject" required minLength={3} maxLength={160} className={field} />
                </label>
                <label className="md:col-span-2">
                  {t("description")}
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={4000}
                    rows={5}
                    className={field}
                  />
                </label>
                <label>
                  {t("category")}
                  <select name="category" className={field}>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("urgency")}
                  <select name="urgency" className={field} defaultValue="normal">
                    {["low", "normal", "high"].map((c) => (
                      <option key={c} value={c}>
                        {t(c)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="md:col-span-2">
                  {t("additional")}
                  <textarea name="additionalInfo" maxLength={2000} rows={2} className={field} />
                </label>
                <button disabled={busy} className={button + " bg-cyan-300 md:col-span-2"}>
                  {t("submit")}
                </button>
              </form>
            )}
          </details>
        ) : null}

        {!hideList ? (
          loading ? (
            <TextCard>
              <p role="status">{t("loading")}</p>
            </TextCard>
          ) : rows.length === 0 ? (
            <TextCard>
              <p>{t("emptyRequests")}</p>
            </TextCard>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.map((row) => (
                <li key={row.id} className={card}>
                  <h3 className="break-words font-kode text-sm">{row.subject}</h3>
                  <p className="mt-2 break-words">
                    {row.projectName}
                    {admin ? ` · ${row.clientEmail}` : null}
                  </p>
                  <p className="mt-1">
                    {t(row.status)} · {t(row.coverage)}
                  </p>
                  <p className="mt-2 text-xs text-black/65">{date(row.updatedAt)}</p>
                  <button className={button + " mt-3"} onClick={() => open(row.id)}>
                    {t("detail")}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {!hideList ? (
          <div className="flex gap-2">
            <button
              className={button}
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              {t("previous")}
            </button>
            <button
              className={button}
              disabled={rows.length < 50 || loading}
              onClick={() => setOffset(offset + 50)}
            >
              {t("next")}
            </button>
          </div>
        ) : null}

        {loadingDetail ? (
          <TextCard>
            <p role="status">{t("loading")}</p>
          </TextCard>
        ) : null}

        {detail ? (
          <section className={card} aria-label={t("detail")}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="break-words font-kode text-lg">{detail.subject}</h3>
              <button className={button} onClick={() => open(null)}>
                {t("back")}
              </button>
            </div>
            <p className="mt-3">
              {detail.projectName} · {t(detail.status)} · {t(detail.category)} · {t(detail.coverage)}
            </p>
            {detail.contract ? (
              <div className="mt-3 border border-black/20 p-3">
                <p className="font-kode">
                  {detail.contract.planCode} ·{" "}
                  {new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  }).format(detail.contract.amountCents / 100)}{" "}
                  / {t(detail.contract.billingInterval)}
                </p>
                <p className="mt-2">
                  {t(detail.contract.quota.reason)} · {t("remaining")} :{" "}
                  {detail.contract.quota.remaining} {t("minutes")}
                </p>
              </div>
            ) : null}
            <p className="mt-2 text-sm">
              {t("urgency")} : {t(detail.urgency)}
            </p>
            <p className="mt-4 whitespace-pre-wrap break-words">{detail.description}</p>
            {detail.additionalInfo ? (
              <p className="mt-3 whitespace-pre-wrap break-words">{detail.additionalInfo}</p>
            ) : null}
            {detail.time ? (
              <p className="mt-4 border border-cyan-400 bg-cyan-50 p-3">
                {detail.time.minutes} {t("minutes")} · {t(detail.time.coverage)} ·{" "}
                {date(detail.time.performedAt)}
              </p>
            ) : null}
            <ol className="-mx-4 my-5 border-y border-black md:-mx-5">
              {detail.events
                .slice()
                .reverse()
                .map((item) => (
                  <li
                    key={item.id}
                    className={`border-t border-black px-4 py-4 first:border-t-0 md:px-5 ${
                      item.internal ? "border-l-2 border-l-black/50" : ""
                    }`}
                  >
                    <p className="font-kode text-xs uppercase">
                      {t(item.actorRole)} · {date(item.createdAt)}
                      {item.internal ? ` · ${t("internal")}` : null}
                    </p>
                    {item.toStatus ? (
                      <p className="mt-2">
                        {item.fromStatus ? `${t(item.fromStatus)} → ` : ""}
                        {t(item.toStatus)}
                      </p>
                    ) : null}
                    {item.body ? (
                      <p className="mt-2 whitespace-pre-wrap break-words">{item.body}</p>
                    ) : null}
                  </li>
                ))}
            </ol>
            <div className="mb-5 flex gap-2">
              <button
                className={button}
                disabled={detailOffset === 0}
                onClick={() => setDetailOffset(Math.max(0, detailOffset - 100))}
              >
                {t("previous")}
              </button>
              <button
                className={button}
                disabled={!detail.hasMore}
                onClick={() => setDetailOffset(detailOffset + 100)}
              >
                {t("next")}
              </button>
            </div>
            {!closed ? (
              <form onSubmit={message} className="grid gap-3 border border-black/20 p-4">
                <label>
                  {t("message")}
                  <textarea name="body" className={field} required maxLength={4000} rows={3} />
                </label>
                {admin ? (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="internal" />
                    {t("internal")}
                  </label>
                ) : null}
                <button className={button + " w-fit"} disabled={busy}>
                  {t("send")}
                </button>
                <p className="text-xs text-black/60">{t("emailNotice")}</p>
              </form>
            ) : null}
            {!admin &&
            detail &&
            ["submitted", "analyzing", "waiting_client"].includes(detail.status) ? (
              <button
                disabled={busy}
                className={button + " mt-4"}
                onClick={() =>
                  void command(base + "/" + selectedId, {
                    action: "transition",
                    status: "cancelled",
                  })
                }
              >
                {t("cancelRequest")}
              </button>
            ) : null}
            {admin ? (
              <form
                className="my-5 flex flex-wrap items-end gap-3 border border-black/25 p-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  const f = new FormData(event.currentTarget)
                  void command(base + "/" + selectedId, {
                    action: "priority",
                    internalPriority: f.get("internalPriority"),
                  })
                }}
              >
                <label>
                  {t("internalPriority")}
                  <select
                    name="internalPriority"
                    key={detail.id + detail.internalPriority}
                    defaultValue={detail.internalPriority ?? "normal"}
                    className={field}
                  >
                    {["low", "normal", "high", "urgent"].map((p) => (
                      <option key={p} value={p}>
                        {t(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={button} disabled={busy}>
                  {t("savePriority")}
                </button>
              </form>
            ) : null}
            {admin && !closed ? (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <form onSubmit={transition} className="grid gap-3 border border-black/25 p-4">
                  <label>
                    {t("status")}
                    <select
                      className={field}
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                    >
                      {transitions[detail.status as RequestStatus]
                        .filter((s) => s !== "completed")
                        .map((s) => (
                          <option key={s} value={s}>
                            {t(s)}
                          </option>
                        ))}
                    </select>
                  </label>
                  {next === "accepted" ? (
                    <>
                      <label>
                        {t("coverage")}
                        <select name="coverage" className={field} defaultValue="outside">
                          <option value="outside">{t("outside")}</option>
                          <option value="included">{t("included")}</option>
                        </select>
                      </label>
                      <label className="flex items-start gap-2">
                        <input type="checkbox" name="minorScopeConfirmed" className="mt-1" />
                        {t("minorConfirm")}
                      </label>
                    </>
                  ) : null}
                  <label>
                    {t("note")}
                    <textarea name="body" maxLength={4000} rows={3} className={field} />
                  </label>
                  <button disabled={busy || !next} className={button}>
                    {t("change")}
                  </button>
                </form>
                {detail.status === "in_progress" ? (
                  <form onSubmit={complete} className="grid gap-3 border border-cyan-400 p-4">
                    <h4 className="font-kode text-sm">{t("complete")}</h4>
                    <label>
                      {t("actualMinutes")}
                      <input
                        name="minutes"
                        required
                        type="number"
                        min={1}
                        max={1440}
                        step={1}
                        className={field}
                      />
                    </label>
                    <label>
                      {t("performed")}
                      <input name="performedAt" type="datetime-local" className={field} />
                    </label>
                    <label>
                      {t("note")}
                      <textarea name="body" maxLength={4000} className={field} rows={2} />
                    </label>
                    <button disabled={busy} className={button + " bg-cyan-300"}>
                      {t("complete")}
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  )
}
