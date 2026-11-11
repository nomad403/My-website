export type SubscriptionWrite = "apply" | "ignore" | "tie"

/**
 * Un horodatage plus ancien est ignoré.
 * Le même horodatage, à la seconde, impose une relecture de Stripe, même
 * si le statut est identique : les dates de résiliation peuvent avoir changé.
 */
export function subscriptionWrite(
  eventCreated: number,
  lastEventCreated: number,
): SubscriptionWrite {
  if (eventCreated > lastEventCreated) return "apply"
  if (eventCreated < lastEventCreated) return "ignore"
  return "tie"
}

const INVOICE_RANK: Record<string, number> = {
  draft: 0,
  open: 1,
  uncollectible: 2,
  paid: 3,
  void: 4,
}

/** À la même seconde, une facture peut avancer vers payée ou void, pas revenir à ouverte. */
export function invoiceWrite(eventCreated: number, lastEventCreated: number, currentStatus: string, incomingStatus: string) {
  if (eventCreated > lastEventCreated) return true
  if (eventCreated < lastEventCreated) return false
  return (INVOICE_RANK[incomingStatus] ?? -1) > (INVOICE_RANK[currentStatus] ?? -1)
}

/** À la même seconde, un paiement réussi n'est pas ramené à un échec. */
export function paymentWrite(eventCreated: number, lastEventCreated: number, currentStatus: string, incomingStatus: string) {
  if (eventCreated > lastEventCreated) return true
  if (eventCreated < lastEventCreated) return false
  if (currentStatus === "succeeded") return false
  return incomingStatus === "succeeded"
}

/** À la même seconde, un remboursement réussi reste réussi. */
export function refundWrite(eventCreated: number, lastEventCreated: number, currentStatus: string, incomingStatus: string) {
  if (eventCreated > lastEventCreated) return true
  if (eventCreated < lastEventCreated) return false
  if (currentStatus === "succeeded") return false
  return incomingStatus === "succeeded"
}
