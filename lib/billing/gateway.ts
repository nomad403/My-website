import type { BillingInterval } from "../shop/plans"

export type PriceQuote = {
  unitAmount: number | null
  currency: string
  interval: BillingInterval | null
}

export interface PaymentGateway {
  retrievePrice(priceId: string): Promise<PriceQuote>
  retrieveCheckoutStatus(stripeSessionId: string): Promise<"open" | "complete" | "expired">
  createCustomer(input: { email: string; userId: string }): Promise<{ id: string }>
  createSubscriptionCheckout(input: {
    customerId: string
    priceId: string
    userId: string
    planCode: string
    interval: BillingInterval
    amountCents: number
    privateOffer: boolean
    redemptionId: string | null
    successUrl: string
    cancelUrl: string
    idempotencyKey: string
  }): Promise<{ id: string; url: string }>
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ url: string }>
}
