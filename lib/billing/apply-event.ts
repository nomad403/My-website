import type { BillingNotice } from "./notices"
import type { BillingStore, SubscriptionObservation, SubscriptionSnapshot } from "./store"

export type ApplyResult = "duplicate" | "applied" | "retry"

export type ApplyOptions = {
  reconcileSubscription?: (stripeSubscriptionId: string) => Promise<SubscriptionObservation | null>
}

/**
 * L'identifiant d'événement n'est enregistré qu'après un traitement réussi.
 * Un événement plus ancien ne réécrit pas un statut déjà issu d'un événement plus récent.
 * Deux événements de la même seconde ne s'écrasent pas : le statut courant est relu chez Stripe.
 * Le montant, la formule et la période contractuels restent ceux de la création.
 */
export async function applyBillingEvent(
  store: BillingStore,
  notice: BillingNotice,
  options: ApplyOptions = {},
): Promise<ApplyResult> {
  if (await store.hasEvent(notice.id)) return "duplicate"
  const outcome = await dispatch(store, notice, options)
  if (outcome === "retry") return "retry"
  await store.recordEvent(notice.id, notice.type)
  return "applied"
}

async function dispatch(store: BillingStore, notice: BillingNotice, options: ApplyOptions): Promise<"ok" | "retry"> {
  const at = new Date(notice.created * 1000)
  if (notice.type === "checkout.completed" || notice.type === "checkout.async_succeeded") {
    const redemptionId = notice.redemptionId ?? (await store.checkoutByStripeId(notice.checkoutId))?.redemptionId ?? null
    if (notice.paymentSettled) {
      await store.completeCheckout(notice.checkoutId)
      if (redemptionId) await store.consumePromotion(redemptionId, at)
      if (notice.subscription) return savedSubscription(store, notice.subscription, notice.created, options)
      return "ok"
    }
    await store.checkoutByStripeId(notice.checkoutId)
    if (notice.subscription) {
      return savedSubscription(store, pendingSubscription(notice.subscription), notice.created, options)
    }
    return "ok"
  }

  if (notice.type === "checkout.async_failed" || notice.type === "checkout.expired") {
    const redemptionId = notice.redemptionId ?? (await store.checkoutByStripeId(notice.checkoutId))?.redemptionId ?? null
    await store.expireCheckoutByStripeId(notice.checkoutId)
    if (redemptionId) await store.releasePromotion(redemptionId, at)
    return "ok"
  }

  if (notice.type === "subscription.upsert") {
    return savedSubscription(store, notice.subscription, notice.created, options)
  }

  if (notice.type === "subscription.deleted") {
    const canceled = await store.cancelSubscription(notice.stripeSubscriptionId, notice.created, at)
    return finishSubscription(store, canceled, notice.stripeSubscriptionId, options)
  }

  if (notice.type === "invoice.upsert" || notice.type === "invoice.payment_failed") {
    const invoice = await resolveInvoiceUser(store, notice.invoice)
    if (!invoice) return "retry"
    const saved = await store.upsertInvoice(invoice, notice.created)
    if (saved === "missing_user") return "retry"
    if (notice.payment && notice.payment.amountCents > 0) {
      const payment = await store.upsertPayment({ ...notice.payment, userId: invoice.userId }, notice.created)
      if (payment === "missing_payment_target") return "retry"
    }
    return "ok"
  }

  if (notice.type === "refund.upsert") {
    const saved = await store.upsertRefund(notice.refund, notice.created)
    return saved === "missing_payment" ? "retry" : "ok"
  }

  return "ok"
}

async function savedSubscription(
  store: BillingStore,
  subscription: SubscriptionSnapshot,
  eventCreated: number,
  options: ApplyOptions,
): Promise<"ok" | "retry"> {
  const saved = await store.upsertSubscription(subscription, eventCreated)
  if (saved === "missing_user") return "retry"
  return finishSubscription(store, saved, subscription.stripeSubscriptionId, options)
}

async function finishSubscription(
  store: BillingStore,
  outcome: "ok" | "tie" | "missing",
  stripeSubscriptionId: string,
  options: ApplyOptions,
): Promise<"ok" | "retry"> {
  if (outcome === "missing") return "retry"
  if (outcome === "ok") return "ok"
  if (!options.reconcileSubscription) return "retry"
  const current = await options.reconcileSubscription(stripeSubscriptionId)
  if (!current || current.stripeSubscriptionId !== stripeSubscriptionId) return "retry"
  await store.overlaySubscriptionStatus(current)
  return "ok"
}

function pendingSubscription(subscription: SubscriptionSnapshot): SubscriptionSnapshot {
  if (subscription.status === "active" || subscription.status === "trialing") {
    return { ...subscription, status: "incomplete" }
  }
  return subscription
}

async function resolveInvoiceUser<T extends { userId: string; stripeSubscriptionId: string | null }>(
  store: BillingStore,
  invoice: T,
) {
  if (invoice.userId) return invoice
  if (invoice.stripeSubscriptionId) {
    const subscription = await store.findSubscriptionByStripeId(invoice.stripeSubscriptionId)
    if (subscription) return { ...invoice, userId: subscription.userId }
  }
  return null
}
