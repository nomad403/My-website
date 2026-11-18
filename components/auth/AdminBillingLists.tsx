"use client"

import { useLanguage } from "@/contexts/LanguageContext"
import type { AdminBillingSnapshot } from "@/lib/billing/store"

const copy = {
  customers: { fr: "Clients Stripe", en: "Stripe customers" },
  subscriptions: { fr: "Abonnements", en: "Subscriptions" },
  invoices: { fr: "Factures", en: "Invoices" },
  payments: { fr: "Paiements", en: "Payments" },
  emptyCustomers: { fr: "Aucun client Stripe.", en: "No Stripe customer." },
  emptySubscriptions: { fr: "Aucun abonnement synchronisé.", en: "No synced subscription." },
  emptyInvoices: { fr: "Aucune facture synchronisée.", en: "No synced invoice." },
  emptyPayments: { fr: "Aucun paiement synchronisé.", en: "No synced payment." },
}

function text(value: { fr: string; en: string }, language: string) {
  return language === "en" ? value.en : value.fr
}

export default function AdminBillingLists({ data }: { data: AdminBillingSnapshot }) {
  const { language } = useLanguage()
  const money = new Intl.NumberFormat(language === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency: "EUR",
  })

  return (
    <div className="mt-8 flex flex-col gap-8">
      <section>
        <h2 className="font-kode text-[0.6875rem] uppercase tracking-[0.12em]">{text(copy.customers, language)}</h2>
        {data.customers.length === 0 ? (
          <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/70">{text(copy.emptyCustomers, language)}</p>
        ) : (
          <ul className="mt-3 border-y border-black/15">
            {data.customers.map((customer) => (
              <li key={customer.stripeCustomerId} className="border-b border-black/10 py-3 font-home-title text-[0.8125rem] last:border-b-0">
                {customer.email}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-kode text-[0.6875rem] uppercase tracking-[0.12em]">{text(copy.subscriptions, language)}</h2>
        {data.subscriptions.length === 0 ? (
          <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/70">{text(copy.emptySubscriptions, language)}</p>
        ) : (
          <ul className="mt-3 border-y border-black/15">
            {data.subscriptions.map((item, index) => (
              <li key={`${item.email}-${item.planCode}-${index}`} className="border-b border-black/10 py-3 last:border-b-0">
                <p className="font-kode text-[0.8125rem] uppercase tracking-[0.08em]">{item.planCode}</p>
                <p className="mt-1 font-home-title text-[0.8125rem] text-black/70">
                  {item.email} · {item.status} · {money.format(item.amountCents / 100)} · {item.billingInterval}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-kode text-[0.6875rem] uppercase tracking-[0.12em]">{text(copy.invoices, language)}</h2>
        {data.invoices.length === 0 ? (
          <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/70">{text(copy.emptyInvoices, language)}</p>
        ) : (
          <ul className="mt-3 border-y border-black/15">
            {data.invoices.map((item, index) => (
              <li key={`${item.email}-${item.status}-${index}`} className="border-b border-black/10 py-3 font-home-title text-[0.8125rem] last:border-b-0">
                {item.email} · {item.status} · {money.format(item.amountDueCents / 100)} · {money.format(item.amountRemainingCents / 100)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-kode text-[0.6875rem] uppercase tracking-[0.12em]">{text(copy.payments, language)}</h2>
        {data.payments.length === 0 ? (
          <p className="mt-3 font-home-title text-[0.8125rem] leading-[1.62] text-black/70">{text(copy.emptyPayments, language)}</p>
        ) : (
          <ul className="mt-3 border-y border-black/15">
            {data.payments.map((item, index) => (
              <li key={`${item.email}-${item.status}-${index}`} className="border-b border-black/10 py-3 font-home-title text-[0.8125rem] last:border-b-0">
                {item.email} · {item.status} · {money.format(item.amountCents / 100)}
                {item.failureCode ? ` · ${item.failureCode}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
