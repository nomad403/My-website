"use client"

import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
type Offer = { planCode: string; name: string; amountCents: number; terms: string }
type Promotion = {
  id: string; codeHint: string | null; planCode: string; createdAt: string; expiresAt: string | null
  disabledAt: string | null; maxRedemptions: number | null; consumed: number; reserved: number
  restrictedEmail: string | null; usageTerms: string; internalNotes: string
}
type Detail = {
  id: string; codeHint: string | null; legacy: boolean; offset: number; hasMore: boolean
  reservations: { id: string; email: string; status: string; createdAt: string; updatedAt: string
    subscriptionId: string | null; subscriptionStatus: string | null; amountCents: number | null; commercialTerms: string | null }[]
  history: { id: string; action: string; createdAt: string; actorId: string | null }[]
}
const copy = {
  title: ["Promotions", "Promotions"], intro: ["Les prix viennent du catalogue serveur. Les conditions sont figées à la création.", "Prices come from the server catalogue. Terms are locked at creation."],
  create: ["Créer un code", "Create a code"], mode: ["Mode", "Mode"], auto: ["Génération sécurisée", "Secure generation"], manual: ["Code personnalisé", "Custom code"],
  code: ["Code", "Code"], offer: ["Offre privée", "Private offer"], expires: ["Expiration (heure locale)", "Expiry (local time)"],
  max: ["Limite d’utilisations (vide : illimitée)", "Usage limit (blank: unlimited)"], client: ["E-mail autorisé (facultatif)", "Allowed email (optional)"],
  terms: ["Conditions d’utilisation", "Usage terms"], notes: ["Notes internes", "Internal notes"], submit: ["Créer et afficher le code", "Create and reveal code"],
  once: ["Copiez ce code maintenant : il ne sera plus affiché.", "Copy this code now: it will not be shown again."], copy: ["Copier le code", "Copy code"],
  copied: ["Code copié.", "Code copied."], refresh: ["Actualiser", "Refresh"], empty: ["Aucun code.", "No codes."],
  active: ["Actif", "Active"], disabled: ["Désactivé", "Disabled"], expired: ["Expiré", "Expired"], exhausted: ["Épuisé", "Exhausted"],
  reserved: ["Réservations", "Reservations"], consumed: ["Consommations", "Consumed"], disable: ["Désactiver", "Disable"],
  details: ["Historique et abonnements", "History and subscriptions"], save: ["Enregistrer les notes", "Save notes"],
  history: ["Historique", "History"], subscriptions: ["Clients et abonnements", "Customers and subscriptions"],
  legacy: ["Ancien code : texte original non récupérable. L’historique commence avec la migration.", "Legacy code: original text cannot be recovered. History starts with this migration."],
  noHistory: ["Aucune opération enregistrée.", "No recorded operation."], noReservations: ["Aucune réservation.", "No reservation."],
  error: ["Opération impossible. Vérifiez votre session administrateur et le second facteur.", "Operation failed. Check your administrator session and second factor."],
  invalid: ["Paramètres invalides.", "Invalid parameters."], duplicate: ["Ce code existe déjà.", "This code already exists."],
  immutable: ["Les conditions d’un code sont immuables.", "Code terms are immutable."], rate_limited: ["Trop de demandes. Réessayez plus tard.", "Too many requests. Try later."],
  previous: ["Précédent", "Previous"], next: ["Suivant", "Next"], busy: ["Chargement…", "Loading…"],
  saved: ["Modification enregistrée.", "Change saved."], close: ["Fermer", "Close"], until: ["Expiration", "Expiry"],
  promotionCreated: ["Création", "Created"], promotionDisabled: ["Désactivation", "Disabled"], promotionNotes: ["Notes modifiées", "Notes updated"],
  promotionReserved: ["Réservation", "Reserved"], promotionConsumed: ["Consommation", "Consumed"], promotionReleased: ["Libération", "Released"],
} as const
type CopyKey = keyof typeof copy
const control = "mt-1 w-full border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
const button = "border border-black/25 px-3 py-2 font-kode text-xs uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 disabled:opacity-40"
export default function AdminPromotions() {
  const { language } = useLanguage()
  const text = (key: CopyKey) => copy[key][language === "en" ? 1 : 0]
  const [rows, setRows] = useState<Promotion[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [offset, setOffset] = useState(0)
  const [mode, setMode] = useState("auto")
  const [plan, setPlan] = useState("friend_host")
  const [revealed, setRevealed] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<CopyKey | "">("")
  const [selected, setSelected] = useState<Detail | null>(null)
  const [notes, setNotes] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/promotions?offset=" + offset, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error()
      setRows(data.promotions); setOffers(data.offers)
    } catch { setMessage("error"); setRows([]) }
    finally { setLoading(false) }
  }, [offset])
  useEffect(() => { void load() }, [load])
  async function mutation(url: string, method: string, body: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" })
    const data = await response.json()
    if (!response.ok) { setMessage(data.code in copy ? data.code : "error"); return null }
    return data
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setRevealed("")
    const form = event.currentTarget
    const values = new FormData(form)
    try {
      const expires = String(values.get("expires") || "")
      const max = String(values.get("max") || "")
      const result = await mutation("/api/admin/promotions", "POST", {
        mode, ...(mode === "manual" ? { code: values.get("code") } : {}), planCode: plan,
        expiresAt: expires ? new Date(expires).toISOString() : null,
        maxRedemptions: max ? Number(max) : null, restrictedEmail: values.get("email") || null,
        usageTerms: values.get("terms") || "", internalNotes: values.get("notes") || "",
      })
      if (result) { setRevealed(result.code); form.reset(); await load() }
    } catch { setMessage("error") }
    finally { setBusy(false) }
  }
  async function change(id: string, input: { disable?: true; internalNotes?: string }) {
    setBusy(true); setMessage("")
    try { if (await mutation("/api/admin/promotions/" + id, "PATCH", input)) { setMessage("saved"); await load() } }
    catch { setMessage("error") } finally { setBusy(false) }
  }
  async function detail(row: Pick<Promotion, "id" | "internalNotes">, pageOffset = 0) {
    setMessage(""); setSelected(null)
    try {
      const response = await fetch("/api/admin/promotions/" + row.id + "?offset=" + pageOffset, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error()
      setSelected(data.promotion); setNotes(typeof data.promotion.internalNotes === "string" ? data.promotion.internalNotes : row.internalNotes)
    } catch { setMessage("error") }
  }
  const date = (value: string | null) => value ? new Date(value).toLocaleString(language === "en" ? "en-GB" : "fr-FR") : "—"
  const money = (cents: number) => new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100)
  const actionKeys: Record<string, CopyKey> = { "promotion.created": "promotionCreated", "promotion.disabled": "promotionDisabled", "promotion.notes_updated": "promotionNotes", "promotion.reserved": "promotionReserved", "promotion.consumed": "promotionConsumed", "promotion.released": "promotionReleased" }
  return (
    <section aria-labelledby="admin-promotions-title" className="mt-10 border-t border-black/20 pt-6">
      <h2 id="admin-promotions-title" className="font-kode text-xl uppercase tracking-wider">{text("title")}</h2>
      <p className="mt-2 text-sm text-black/70">{text("intro")}</p>
      <details className="mt-5 border border-black/20 p-4">
        <summary className="cursor-pointer font-kode text-sm uppercase focus-visible:outline-cyan-500">{text("create")}</summary>
        <form onSubmit={create} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">{text("mode")}<select className={control} value={mode} onChange={e => setMode(e.target.value)}><option value="auto">{text("auto")}</option><option value="manual">{text("manual")}</option></select></label>
          {mode === "manual" && <label className="text-sm">{text("code")}<input name="code" className={control} required minLength={6} maxLength={32} autoComplete="off" spellCheck={false} /></label>}
          <label className="text-sm">{text("offer")}<select name="plan" className={control} value={plan} onChange={e => setPlan(e.target.value)}>{offers.map(offer => <option key={offer.planCode} value={offer.planCode}>{offer.name} · {money(offer.amountCents)}/{language === "en" ? "month" : "mois"}</option>)}</select></label>
          <label className="text-sm">{text("expires")}<input name="expires" type="datetime-local" className={control} /></label>
          <label className="text-sm">{text("max")}<input name="max" type="number" min={1} max={1000000} step={1} className={control} /></label>
          <label className="text-sm">{text("client")}<input name="email" type="email" maxLength={254} className={control} autoComplete="off" /></label>
          <p className="text-sm text-black/70 sm:col-span-2">{offers.find(offer => offer.planCode === plan)?.terms}</p>
          <label className="text-sm sm:col-span-2">{text("terms")}<textarea name="terms" maxLength={2000} className={control} rows={3} /></label>
          <label className="text-sm sm:col-span-2">{text("notes")}<textarea name="notes" maxLength={2000} className={control} rows={2} /></label>
          <button disabled={busy || offers.length === 0} className={button + " bg-cyan-300 sm:col-span-2"} type="submit">{text("submit")}</button>
        </form>
      </details>
      <div aria-live="polite" role="status" className="mt-4 text-sm">{message && text(message)}{busy && " " + text("busy")}</div>
      {revealed && <div className="mt-4 border border-cyan-500 bg-cyan-50 p-4"><p className="text-sm">{text("once")}</p><output className="my-3 block break-all font-kode text-lg">{revealed}</output><button className={button} onClick={() => { void navigator.clipboard.writeText(revealed).then(() => setMessage("copied")).catch(() => setMessage("error")) }}>{text("copy")}</button><button className={button + " ml-2"} onClick={() => setRevealed("")}>{text("close")}</button></div>}
      <button className={button + " mt-4"} disabled={busy || loading} onClick={() => { void load() }}>{text("refresh")}</button>
      {loading ? <p className="mt-3 text-sm">{text("busy")}</p> : rows.length === 0 ? <p className="mt-3">{text("empty")}</p> : <ul className="mt-4 grid gap-4 lg:grid-cols-2">
        {rows.map(row => {
          const status: CopyKey = row.disabledAt ? "disabled" : row.expiresAt && new Date(row.expiresAt) <= new Date() ? "expired" : row.maxRedemptions !== null && row.consumed + row.reserved >= row.maxRedemptions ? "exhausted" : "active"
          return <li key={row.id} className="min-w-0 border border-black/20 p-4 text-sm">
            <h3 className="break-all font-kode">{row.codeHint ? "••••-" + row.codeHint : row.id.slice(0, 8)} · {offers.find(offer => offer.planCode === row.planCode)?.name || row.planCode}</h3>
            <p className="mt-2">{text(status)} · {text("promotionCreated")} {date(row.createdAt)}</p>
            <p>{text("until")} : {date(row.expiresAt)}</p><p>{text("consumed")} : {row.consumed} · {text("reserved")} : {row.reserved} · {row.maxRedemptions ?? "∞"}</p>
            {row.restrictedEmail && <p className="mt-2 break-all">{row.restrictedEmail}</p>}
            <p className="mt-2 whitespace-pre-wrap break-words">{row.usageTerms}</p>
            <div className="mt-3 flex flex-wrap gap-2"><button className={button} onClick={() => { void detail(row) }}>{text("details")}</button><button className={button} disabled={busy || !!row.disabledAt} onClick={() => { void change(row.id, { disable: true }) }}>{text("disable")}</button></div>
          </li>
        })}
      </ul>}
      <div className="mt-4 flex gap-2"><button className={button} disabled={offset === 0 || loading} onClick={() => { setSelected(null); setOffset(Math.max(0, offset - 50)) }}>{text("previous")}</button><button className={button} disabled={rows.length < 50 || loading} onClick={() => { setSelected(null); setOffset(offset + 50) }}>{text("next")}</button></div>
      {selected && <section aria-label={text("details")} className="mt-6 border-t border-black/20 pt-4">
        <div className="flex items-start justify-between gap-3"><h3 className="font-kode text-sm uppercase">{text("details")} · {selected.codeHint ? "••••-" + selected.codeHint : selected.id.slice(0, 8)}</h3><button className={button} onClick={() => setSelected(null)}>{text("close")}</button></div>
        {selected.legacy && <p className="my-3 text-sm">{text("legacy")}</p>}
        <label className="mt-4 block text-sm">{text("notes")}<textarea className={control} maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} /></label>
        <button className={button + " mt-2"} disabled={busy} onClick={() => { void change(selected.id, { internalNotes: notes }) }}>{text("save")}</button>
        <div className="mt-4 flex gap-2"><button className={button} disabled={selected.offset === 0} onClick={() => { void detail({ id: selected.id, internalNotes: notes }, Math.max(0, selected.offset - 200)) }}>{text("previous")}</button><button className={button} disabled={!selected.hasMore} onClick={() => { void detail({ id: selected.id, internalNotes: notes }, selected.offset + 200) }}>{text("next")}</button></div>
        <h4 className="mt-6 font-kode text-xs uppercase">{text("subscriptions")}</h4>
        {selected.reservations.length === 0 ? <p className="mt-2 text-sm">{text("noReservations")}</p> : <ul className="mt-2 divide-y divide-black/15">{selected.reservations.map((item, index) => <li key={item.id + index} className="break-all py-3 text-sm"><p>{item.email} · {text(actionKeys["promotion." + item.status] || "reserved")}</p><p>{date(item.createdAt)} → {date(item.updatedAt)}</p>{item.subscriptionId && <p>{item.subscriptionId} · {item.subscriptionStatus} · {money(item.amountCents ?? 0)}<br />{item.commercialTerms}</p>}</li>)}</ul>}
        <h4 className="mt-6 font-kode text-xs uppercase">{text("history")}</h4>
        {selected.history.length === 0 ? <p className="mt-2 text-sm">{text("noHistory")}</p> : <ol className="mt-2 divide-y divide-black/15">{selected.history.map(item => <li key={item.id} className="py-2 text-sm">{date(item.createdAt)} · {text(actionKeys[item.action] || "history")}{item.actorId && <span className="block break-all text-xs text-black/60">{item.actorId}</span>}</li>)}</ol>}
      </section>}
    </section>
  )
}
