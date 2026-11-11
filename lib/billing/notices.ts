import type { BillingInterval } from "../shop/plans"
import type { InvoiceSnapshot, PaymentSnapshot, RefundSnapshot, SubscriptionSnapshot } from "./store"

export type BillingNotice =
  | {
      id: string
      created: number
      type: "checkout.completed" | "checkout.async_succeeded"
      checkoutId: string
      paymentSettled: boolean
      redemptionId: string | null
      subscription: SubscriptionSnapshot | null
    }
  | {
      id: string
      created: number
      type: "checkout.async_failed" | "checkout.expired"
      checkoutId: string
      redemptionId: string | null
    }
  | {
      id: string
      created: number
      type: "subscription.upsert"
      subscription: SubscriptionSnapshot
    }
  | {
      id: string
      created: number
      type: "subscription.deleted"
      stripeSubscriptionId: string
    }
  | {
      id: string
      created: number
      type: "invoice.upsert" | "invoice.payment_failed"
      invoice: InvoiceSnapshot
      payment: PaymentSnapshot | null
    }
  | {
      id: string
      created: number
      type: "refund.upsert"
      refund: RefundSnapshot
    }

export type SubscriptionStatus =
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"

export function asInterval(value: unknown): BillingInterval | null {
  return value === "month" || value === "year" ? value : null
}

export function asStatus(value: unknown): SubscriptionStatus | null {
  if (
    value === "incomplete" ||
    value === "incomplete_expired" ||
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "unpaid" ||
    value === "canceled"
  ) {
    return value
  }
  return null
}
