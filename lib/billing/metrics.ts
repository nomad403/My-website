import type { BillingInterval } from "../shop/plans"

export type BillingInputs = {
  subscriptions: Array<{
    status: string
    amountCents: number
    billingInterval: BillingInterval
  }>
  invoices: Array<{
    status: string
    amountDueCents: number
    amountRemainingCents: number
  }>
  payments: Array<{ status: string; amountCents: number }>
  refunds: Array<{ status: string; amountCents: number }>
}

export type BillingSummary = {
  theoreticalMrrCents: number
  theoreticalArrCents: number
  issuedCents: number
  collectedCents: number
  refundedCents: number
  unpaidCents: number
}

const ISSUED = new Set(["open", "paid", "uncollectible"])
const UNPAID = new Set(["open", "uncollectible"])

function total<T>(rows: T[], amount: (row: T) => number) {
  return rows.reduce((sum, row) => sum + amount(row), 0)
}

/**
 * Les six montants restent séparés.
 * Le récurrent théorique ne compte que les abonnements actifs.
 * L'encaissé ne déduit pas les remboursements, et l'impayé vient du reste à payer des factures.
 */
export function summarizeBilling(input: BillingInputs): BillingSummary {
  let theoreticalMrrCents = 0
  let theoreticalArrCents = 0
  for (const subscription of input.subscriptions) {
    if (subscription.status !== "active") continue
    if (subscription.billingInterval === "year") {
      theoreticalMrrCents += Math.round(subscription.amountCents / 12)
      theoreticalArrCents += subscription.amountCents
    } else {
      theoreticalMrrCents += subscription.amountCents
      theoreticalArrCents += subscription.amountCents * 12
    }
  }

  return {
    theoreticalMrrCents,
    theoreticalArrCents,
    issuedCents: total(
      input.invoices.filter((invoice) => ISSUED.has(invoice.status)),
      (invoice) => invoice.amountDueCents,
    ),
    collectedCents: total(
      input.payments.filter((payment) => payment.status === "succeeded"),
      (payment) => payment.amountCents,
    ),
    refundedCents: total(
      input.refunds.filter((refund) => refund.status === "succeeded"),
      (refund) => refund.amountCents,
    ),
    unpaidCents: total(
      input.invoices.filter((invoice) => UNPAID.has(invoice.status)),
      (invoice) => invoice.amountRemainingCents,
    ),
  }
}
