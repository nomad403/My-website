import { isPrivatePlan } from "./promotion"
import { asInterval, asStatus, type BillingNotice } from "./notices"
import type { SubscriptionObservation } from "./store"
import type { InvoiceSnapshot, PaymentSnapshot, SubscriptionSnapshot } from "./store"

type Loose = Record<string, unknown>

function objectOf(value: unknown): Loose | null {
  return value && typeof value === "object" ? (value as Loose) : null
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value
  const row = objectOf(value)
  return row && typeof row.id === "string" ? row.id : null
}

function metadata(value: unknown): Record<string, string> {
  const row = objectOf(value)
  if (!row) return {}
  const entries = Object.entries(row).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  return Object.fromEntries(entries)
}

function unixDate(value: unknown): Date | null {
  return typeof value === "number" ? new Date(value * 1000) : null
}

function cents(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0
}

function subscriptionSnapshot(raw: Loose, fallbackUserId: string | null): SubscriptionSnapshot | null {
  const id = text(raw.id)
  const meta = metadata(raw.metadata)
  const userId = meta.userId || fallbackUserId
  const planCode = meta.planCode
  const interval = asInterval(meta.billingInterval) ?? itemInterval(raw)
  const status = asStatus(raw.status)
  if (!id || !userId || !planCode || !interval || !status) return null
  const amount = Number(meta.amountCents)
  const itemAmount = itemUnitAmount(raw)
  const amountCents = Number.isFinite(amount) && amount > 0 ? amount : itemAmount
  if (!amountCents) return null
  const item = firstItem(raw)
  return {
    stripeSubscriptionId: id,
    userId,
    planCode,
    status,
    billingInterval: interval,
    amountCents,
    privateOffer: meta.privateOffer === "1" || isPrivatePlan(planCode),
    promotionRedemptionId: meta.redemptionId || null,
    serviceAnchorAt: unixDate(raw.billing_cycle_anchor),
    observedAmountCents: itemUnitAmount(raw) || null,
    observedBillingInterval: itemInterval(raw),
    currentPeriodStart: unixDate(item?.current_period_start ?? raw.current_period_start),
    currentPeriodEnd: unixDate(item?.current_period_end ?? raw.current_period_end),
    cancelRequestedAt: unixDate(raw.canceled_at),
    cancelEffectiveAt: unixDate(raw.cancel_at),
  }
}

function firstItem(raw: Loose): Loose | null {
  const items = objectOf(raw.items)
  const data = items && Array.isArray(items.data) ? items.data : []
  return objectOf(data[0])
}

function itemInterval(raw: Loose) {
  const price = objectOf(firstItem(raw)?.price)
  const recurring = objectOf(price?.recurring)
  return asInterval(recurring?.interval)
}

function itemUnitAmount(raw: Loose) {
  const price = objectOf(firstItem(raw)?.price)
  return cents(price?.unit_amount)
}

function invoiceSnapshot(raw: Loose): InvoiceSnapshot | null {
  const id = text(raw.id)
  const currency = typeof raw.currency === "string" ? raw.currency.toLowerCase() : ""
  if (!id || currency !== "eur") return null
  const meta = metadata(raw.metadata)
  const transitions = objectOf(raw.status_transitions)
  const status = typeof raw.status === "string" ? raw.status : ""
  if (!["draft", "open", "paid", "uncollectible", "void"].includes(status)) return null
  return {
    stripeInvoiceId: id,
    userId: meta.userId ?? "",
    stripeSubscriptionId: text(raw.subscription) ?? nestedSubscription(raw),
    status,
    amountDueCents: cents(raw.amount_due),
    amountPaidCents: cents(raw.amount_paid),
    amountRemainingCents: cents(raw.amount_remaining),
    currency: "EUR",
    issuedAt: unixDate(transitions?.finalized_at),
    paidAt: unixDate(transitions?.paid_at),
    ...invoiceServicePeriod(raw),
  }
}

function nestedSubscription(raw: Loose) {
  const parent = objectOf(raw.parent)
  const details = objectOf(parent?.subscription_details)
  return text(details?.subscription)
}

function paymentIntentId(raw: Loose): string | null {
  return text(raw.payment_intent) ?? text(objectOf(raw.payment_intent)?.id)
}

function paymentFromInvoice(invoice: InvoiceSnapshot, raw: Loose, status: "succeeded" | "failed"): PaymentSnapshot | null {
  const intent = paymentIntentId(raw)
  const amount = status === "succeeded" ? invoice.amountPaidCents : invoice.amountDueCents
  if (!intent || amount <= 0) return null
  const error = objectOf(raw.last_finalization_error)
  return {
    stripePaymentIntentId: intent,
    userId: invoice.userId,
    stripeInvoiceId: invoice.stripeInvoiceId,
    status,
    amountCents: amount,
    currency: "EUR",
    failureCode: status === "failed" && typeof error?.code === "string" ? error.code : null,
    paidAt: status === "succeeded" ? invoice.paidAt : null,
  }
}

export function readStripeSubscriptionState(value: unknown): SubscriptionObservation | null {
  const raw = objectOf(value)
  if (!raw) return null
  const stripeSubscriptionId = text(raw.id)
  const status = asStatus(raw.status)
  if (!stripeSubscriptionId || !status) return null
  const item = firstItem(raw)
  return {
    stripeSubscriptionId,
    status,
    serviceAnchorAt: unixDate(raw.billing_cycle_anchor),
    observedAmountCents: itemUnitAmount(raw) || null,
    observedBillingInterval: itemInterval(raw),
    observedPlanCode: metadata(raw.metadata).planCode ?? null,
    currentPeriodStart: unixDate(item?.current_period_start ?? raw.current_period_start),
    currentPeriodEnd: unixDate(item?.current_period_end ?? raw.current_period_end),
    cancelRequestedAt: unixDate(raw.canceled_at),
    cancelEffectiveAt: unixDate(raw.cancel_at),
  }
}

export function toBillingNotice(event: { id: string; type: string; created: number; data: { object: unknown } }): BillingNotice | null {
  const raw = objectOf(event.data.object)
  if (!raw) return null
  const meta = metadata(raw.metadata)
  const redemptionId = meta.redemptionId || null

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const checkoutId = text(raw.id)
    if (!checkoutId) return null
    const settled = event.type === "checkout.session.async_payment_succeeded" || raw.payment_status === "paid" || raw.payment_status === "no_payment_required"
    const subscriptionRaw = objectOf(raw.subscription)
    return {
      id: event.id,
      created: event.created,
      type: event.type === "checkout.session.completed" ? "checkout.completed" : "checkout.async_succeeded",
      checkoutId,
      paymentSettled: settled,
      redemptionId,
      subscription: subscriptionRaw ? subscriptionSnapshot(subscriptionRaw, meta.userId || text(raw.client_reference_id)) : null,
    }
  }

  if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
    const checkoutId = text(raw.id)
    if (!checkoutId) return null
    return {
      id: event.id,
      created: event.created,
      type: event.type === "checkout.session.expired" ? "checkout.expired" : "checkout.async_failed",
      checkoutId,
      redemptionId,
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const subscription = subscriptionSnapshot(raw, null)
    if (!subscription) return null
    return { id: event.id, created: event.created, type: "subscription.upsert", subscription }
  }

  if (event.type === "customer.subscription.deleted") {
    const stripeSubscriptionId = text(raw.id)
    if (!stripeSubscriptionId) return null
    return { id: event.id, created: event.created, type: "subscription.deleted", stripeSubscriptionId }
  }

  if (
    event.type === "invoice.finalized" ||
    event.type === "invoice.paid" ||
    event.type === "invoice.updated" ||
    event.type === "invoice.payment_failed"
  ) {
    const invoice = invoiceSnapshot(raw)
    if (!invoice) return null
    const failed = event.type === "invoice.payment_failed"
    return {
      id: event.id,
      created: event.created,
      type: failed ? "invoice.payment_failed" : "invoice.upsert",
      invoice,
      payment: failed
        ? paymentFromInvoice(invoice, raw, "failed")
        : invoice.status === "paid"
          ? paymentFromInvoice(invoice, raw, "succeeded")
          : null,
    }
  }

  if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "charge.refunded") {
    const refunds = event.type === "charge.refunded" && Array.isArray(objectOf(raw.refunds)?.data)
      ? (objectOf(raw.refunds)?.data as unknown[])
      : [raw]
    const refund = objectOf(refunds[0])
    if (!refund) return null
    const stripeRefundId = text(refund.id)
    const stripePaymentIntentId = text(refund.payment_intent) ?? paymentIntentId(raw)
    const currency = typeof refund.currency === "string" ? refund.currency.toLowerCase() : ""
    const amountCents = cents(refund.amount)
    const status = typeof refund.status === "string" ? refund.status : ""
    if (!stripeRefundId || !stripePaymentIntentId || currency !== "eur" || amountCents <= 0) return null
    if (!["pending", "succeeded", "failed", "canceled"].includes(status)) return null
    return {
      id: event.id,
      created: event.created,
      type: "refund.upsert",
      refund: { stripeRefundId, stripePaymentIntentId, status, amountCents, currency: "EUR" },
    }
  }

  return null
}

/** Only a single non-prorated subscription line is accepted as evidence of service coverage. */
function invoiceServicePeriod(raw: Loose): { servicePeriodStart: Date | null; servicePeriodEnd: Date | null } {
 const lines = objectOf(raw.lines)
 const id = text(raw.subscription) ?? nestedSubscription(raw)
 if (!id || lines?.has_more === true) return {servicePeriodStart:null,servicePeriodEnd:null}
 const rows = (Array.isArray(lines?.data) ? lines.data : []).map(objectOf).filter((line): line is Loose => Boolean(line))
 const recurring = rows.filter(line => {
  const details = objectOf(objectOf(line.parent)?.subscription_item_details)
  return (text(line.subscription) === id || text(details?.subscription) === id)
    && line.proration !== true && details?.proration !== true
 })
 if (recurring.length !== 1) return {servicePeriodStart:null,servicePeriodEnd:null}
 const period = objectOf(recurring[0].period)
 const start = unixDate(period?.start), end = unixDate(period?.end)
 return start && end && end > start ? {servicePeriodStart:start,servicePeriodEnd:end} : {servicePeriodStart:null,servicePeriodEnd:null}
}
