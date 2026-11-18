"use client"

import { useLanguage } from "@/contexts/LanguageContext"

const LABELS = [
  ["accounts", "auth.admin.accounts"],
  ["theoreticalMrrCents", "auth.admin.mrr"],
  ["theoreticalArrCents", "auth.admin.arr"],
  ["issuedCents", "auth.admin.issued"],
  ["collectedCents", "auth.admin.collected"],
  ["refundedCents", "auth.admin.refunded"],
  ["unpaidCents", "auth.admin.unpaid"],
] as const

export default function AdminSummary({
  data,
}: {
  data: Record<(typeof LABELS)[number][0], number>
}) {
  const { t, language } = useLanguage()
  const money = new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
  })

  return (
    <dl className="divide-y divide-black/15 border-y border-black/15">
      {LABELS.map(([key, label]) => (
        <div key={key} className="flex items-baseline justify-between gap-4 py-3">
          <dt className="font-kode text-[0.6875rem] uppercase tracking-[0.12em] text-black/60">
            {t(label)}
          </dt>
          <dd className="font-kode text-sm">
            {key === "accounts" ? data[key] : money.format(data[key] / 100)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
