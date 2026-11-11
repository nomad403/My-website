import type { BillingInputs } from "./metrics"
import type { BillingInterval, PlanCode } from "../shop/plans"

export type PromoReason = "invalid" | "expired" | "disabled" | "exhausted" | "restricted"

export type PromotionPreview =
  | { ok: true; planCode: PlanCode; amountCents: number; usageTerms?: string }
  | { ok: false; reason: PromoReason }

export type PromotionHold =
  | {
      ok: true
      redemptionId: string
      planCode: PlanCode
      amountCents: number
      holdReason: PromoReason | null
    }
  | { ok: false; reason: PromoReason }

export type SubscriptionObservation = {
  serviceAnchorAt?: Date | null
  observedAmountCents?: number | null
  observedBillingInterval?: BillingInterval | null
  observedPlanCode?: string | null
  stripeSubscriptionId: string
  status: string
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelRequestedAt: Date | null
  cancelEffectiveAt: Date | null
}

export type OpenCheckout = {
  id: string
  url: string | null
  stripeSessionId: string | null
  redemptionId: string | null
  planCode: string
  billingInterval: BillingInterval
  createdAt: Date
}

export type SubscriptionSnapshot = {
  serviceAnchorAt?: Date | null
  observedAmountCents?: number | null
  observedBillingInterval?: BillingInterval | null
  promotionRedemptionId?: string | null
  stripeSubscriptionId: string
  userId: string
  planCode: string
  status: string
  billingInterval: BillingInterval
  amountCents: number
  privateOffer: boolean
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelRequestedAt: Date | null
  cancelEffectiveAt: Date | null
}

export type InvoiceSnapshot = {
  totalCents?: number | null
  servicePeriodStart?: Date | null
  servicePeriodEnd?: Date | null
  stripeInvoiceId: string
  userId: string
  stripeSubscriptionId: string | null
  status: string
  amountDueCents: number
  amountPaidCents: number
  amountRemainingCents: number
  currency: string
  issuedAt: Date | null
  paidAt: Date | null
}

export type PaymentSnapshot = {
  stripePaymentIntentId: string
  userId: string
  stripeInvoiceId: string | null
  status: string
  amountCents: number
  currency: string
  failureCode: string | null
  paidAt: Date | null
}

export type RefundSnapshot = {
  stripeRefundId: string
  stripePaymentIntentId: string
  status: string
  amountCents: number
  currency: string
}

export type StoredSubscription = {
  id: string
  userId: string
  planCode: string
  status: string
  billingInterval: BillingInterval
  amountCents: number
  privateOffer: boolean
  stripeSubscriptionId: string | null
  lastEventCreated: number
}

export type AdminBillingSnapshot = {
  customers: Array<{ email: string; stripeCustomerId: string }>
  subscriptions: Array<{
    email: string
    planCode: string
    status: string
    amountCents: number
    billingInterval: string
    privateOffer: boolean
  }>
  invoices: Array<{
    email: string
    status: string
    amountDueCents: number
    amountPaidCents: number
    amountRemainingCents: number
    currency: string
  }>
  payments: Array<{ email: string; status: string; amountCents: number; failureCode: string | null }>
}

export type ClientInvoice = {
  id: string
  status: string
  amountDueCents: number
  amountPaidCents: number
  amountRemainingCents: number
  currency: string
  issuedAt: Date | null
  paidAt: Date | null
}

export interface BillingStore {
  previewPromotion(input: { codeHash: string; email: string; at: Date }): Promise<PromotionPreview>
  reservePromotion(input: {
    codeHash: string
    userId: string
    email: string
    at: Date
  }): Promise<PromotionHold>
  consumePromotion(redemptionId: string, at: Date): Promise<void>
  releasePromotion(redemptionId: string, at: Date): Promise<void>
  getStripeCustomerId(userId: string): Promise<string | null>
  saveStripeCustomerId(userId: string, email: string, customerId: string): Promise<string>
  findOpenCheckout(userId: string, planCode: string, interval: BillingInterval): Promise<OpenCheckout | null>
  beginCheckout(input: {
    userId: string
    planCode: string
    interval: BillingInterval
    amountCents: number
    redemptionId: string | null
    at: Date
  }): Promise<{ created: true; id: string } | { created: false; checkout: OpenCheckout }>
  attachCheckoutSession(id: string, stripeSessionId: string, url: string): Promise<void>
  failCheckout(id: string): Promise<void>
  checkoutByStripeId(stripeSessionId: string): Promise<{ redemptionId: string | null; status: string } | null>
  completeCheckout(stripeSessionId: string): Promise<void>
  expireCheckout(id: string): Promise<void>
  expireCheckoutByStripeId(stripeSessionId: string): Promise<void>
  hasEvent(eventId: string): Promise<boolean>
  recordEvent(eventId: string, eventType: string): Promise<void>
  upsertSubscription(input: SubscriptionSnapshot, eventCreated: number): Promise<"ok" | "missing_user" | "tie">
  cancelSubscription(stripeSubscriptionId: string, eventCreated: number, at: Date): Promise<"ok" | "missing" | "tie">
  overlaySubscriptionStatus(input: SubscriptionObservation): Promise<void>
  findSubscriptionByStripeId(stripeSubscriptionId: string): Promise<StoredSubscription | null>
  findUserIdByStripeCustomer(customerId: string): Promise<string | null>
  upsertInvoice(input: InvoiceSnapshot, eventCreated: number): Promise<"ok" | "missing_user">
  upsertPayment(input: PaymentSnapshot, eventCreated: number): Promise<"ok" | "missing_payment_target">
  upsertRefund(input: RefundSnapshot, eventCreated: number): Promise<"ok" | "missing_payment">
  listInvoices(userId: string): Promise<ClientInvoice[]>
  adminSnapshot(): Promise<AdminBillingSnapshot>
  loadBillingInputs(): Promise<BillingInputs>
}
