import Stripe from "stripe"
import type { PaymentGateway } from "./gateway"
import { asInterval } from "./notices"
import type { StripeEnv } from "./stripe-env"

let cached: { key: string; stripe: Stripe } | null = null

export function getStripe(secretKey: string) {
  if (!cached || cached.key !== secretKey) cached = { key: secretKey, stripe: new Stripe(secretKey) }
  return cached.stripe
}

export function createStripeGateway(env: StripeEnv): PaymentGateway {
  const stripe = getStripe(env.secretKey)
  return {
    async retrievePrice(priceId) {
      const price = await stripe.prices.retrieve(priceId)
      return {
        unitAmount: price.unit_amount,
        currency: price.currency,
        interval: asInterval(price.recurring?.interval ?? null),
      }
    },
    async retrieveCheckoutStatus(id) {
      const session = await stripe.checkout.sessions.retrieve(id)
      if (session.status === "open") return "open"
      if (session.status === "complete") return "complete"
      if (session.status === "expired") return "expired"
      throw new Error("Unknown Checkout status")
    },
    async createCustomer(input) {
      const customer = await stripe.customers.create({
        email: input.email,
        metadata: { userId: input.userId },
      })
      return { id: customer.id }
    },
    async createSubscriptionCheckout(input) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "subscription",
          expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
          customer: input.customerId,
          client_reference_id: input.userId,
          line_items: [{ price: input.priceId, quantity: 1 }],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          allow_promotion_codes: false,
          metadata: {
            userId: input.userId,
            planCode: input.planCode,
            billingInterval: input.interval,
            amountCents: String(input.amountCents),
            privateOffer: input.privateOffer ? "1" : "0",
            redemptionId: input.redemptionId ?? "",
          },
          subscription_data: {
            metadata: {
              userId: input.userId,
              planCode: input.planCode,
              billingInterval: input.interval,
              amountCents: String(input.amountCents),
              privateOffer: input.privateOffer ? "1" : "0",
              redemptionId: input.redemptionId ?? "",
            },
          },
        },
        { idempotencyKey: input.idempotencyKey },
      )
      if (!session.url) throw new Error("Checkout session has no URL")
      return { id: session.id, url: session.url }
    },
    async createPortal(input) {
      const session = await stripe.billingPortal.sessions.create({
        customer: input.customerId,
        return_url: input.returnUrl,
      })
      return { url: session.url }
    },
  }
}

export function constructStripeEvent(env: StripeEnv, payload: string, signature: string) {
  return getStripe(env.secretKey).webhooks.constructEvent(payload, signature, env.webhookSecret)
}
