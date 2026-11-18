import { randomUUID } from "node:crypto"
import { invoiceWrite, paymentWrite, refundWrite, subscriptionWrite } from "./event-order"
import type { BillingInputs } from "./metrics"
import { lockedPrivateMonthly } from "./promotion"
import type { BillingInterval, PlanCode } from "../shop/plans"
import type {
  AdminBillingSnapshot,
  BillingStore,
  ClientInvoice,
  InvoiceSnapshot,
  OpenCheckout,
  PaymentSnapshot,
  PromotionPreview,
  RefundSnapshot,
  StoredSubscription,
  SubscriptionObservation,
  SubscriptionSnapshot,
} from "./store"

type PromoRow = {
  id: string
  codeHash: string
  planCode: PlanCode
  expiresAt: Date | null
  maxRedemptions: number | null
  redemptionCount: number
  restrictedEmail: string | null
  disabledAt: Date | null
}

type RedemptionRow = {
  id: string
  promotionCodeId: string
  userId: string
  status: "reserved" | "consumed" | "released"
}

type CheckoutRow = OpenCheckout & { userId: string; amountCents: number; status: string }

type UserRow = { id: string; email: string; stripeCustomerId: string | null }

export class MemoryBillingStore implements BillingStore {
  readonly users = new Map<string, UserRow>()
  readonly promos: PromoRow[] = []
  readonly redemptions: RedemptionRow[] = []
  readonly checkouts: CheckoutRow[] = []
  readonly events = new Set<string>()
  readonly subscriptions: Array<StoredSubscription & {
    currentPeriodEnd: Date | null
    stripeCustomerLinked?: string
  }> = []
  readonly invoices: Array<InvoiceSnapshot & { id: string; lastEventCreated: number; subscriptionLocalId: string | null }> = []
  readonly payments: Array<PaymentSnapshot & { id: string; lastEventCreated: number }> = []
  readonly refunds: Array<RefundSnapshot & { id: string; paymentId: string; lastEventCreated: number }> = []

  addUser(id: string, email: string) {
    this.users.set(id, { id, email, stripeCustomerId: null })
  }

  addPromotion(input: Omit<PromoRow, "id" | "redemptionCount"> & { id?: string }) {
    this.promos.push({
      id: input.id ?? randomUUID(),
      redemptionCount: 0,
      ...input,
    })
  }

  private promoState(row: PromoRow, email: string, at: Date): PromotionPreview {
    const locked = lockedPrivateMonthly(row.planCode)
    if (!locked) return { ok: false, reason: "invalid" }
    if (row.disabledAt) return { ok: false, reason: "disabled" }
    if (row.expiresAt && row.expiresAt.getTime() <= at.getTime()) return { ok: false, reason: "expired" }
    if (row.restrictedEmail && row.restrictedEmail !== email) return { ok: false, reason: "restricted" }
    const held = this.redemptions.filter(
      (item) => item.promotionCodeId === row.id && item.status !== "released",
    ).length
    if (row.maxRedemptions != null && held >= row.maxRedemptions) return { ok: false, reason: "exhausted" }
    return { ok: true, planCode: row.planCode, amountCents: locked.amountCents }
  }

  async previewPromotion(input: { codeHash: string; email: string; at: Date }): Promise<PromotionPreview> {
    const row = this.promos.find((item) => item.codeHash === input.codeHash)
    if (!row) return { ok: false, reason: "invalid" }
    return this.promoState(row, input.email, input.at)
  }

  async reservePromotion(input: { codeHash: string; userId: string; email: string; at: Date }) {
    const row = this.promos.find((item) => item.codeHash === input.codeHash)
    if (!row) return { ok: false as const, reason: "invalid" as const }
    const locked = lockedPrivateMonthly(row.planCode)
    if (!locked) return { ok: false as const, reason: "invalid" as const }
    const preview = this.promoState(row, input.email, input.at)
    const own = this.redemptions.find(
      (item) => item.promotionCodeId === row.id && item.userId === input.userId && item.status === "reserved",
    )
    if (own) {
      return {
        ok: true as const,
        redemptionId: own.id,
        planCode: locked.planCode,
        amountCents: locked.amountCents,
        holdReason: preview.ok ? null : preview.reason,
      }
    }
    if (!preview.ok) return preview
    const redemption: RedemptionRow = {
      id: randomUUID(),
      promotionCodeId: row.id,
      userId: input.userId,
      status: "reserved",
    }
    this.redemptions.push(redemption)
    row.redemptionCount += 1
    return {
      ok: true as const,
      redemptionId: redemption.id,
      planCode: preview.planCode,
      amountCents: preview.amountCents,
      holdReason: null,
    }
  }

  async consumePromotion(redemptionId: string) {
    const row = this.redemptions.find((item) => item.id === redemptionId)
    if (row && row.status === "reserved") row.status = "consumed"
  }

  async releasePromotion(redemptionId: string) {
    const row = this.redemptions.find((item) => item.id === redemptionId)
    if (!row || row.status !== "reserved") return
    row.status = "released"
    const promo = this.promos.find((item) => item.id === row.promotionCodeId)
    if (promo && promo.redemptionCount > 0) promo.redemptionCount -= 1
  }

  async getStripeCustomerId(userId: string) {
    return this.users.get(userId)?.stripeCustomerId ?? null
  }

  async saveStripeCustomerId(userId: string, email: string, customerId: string) {
    const user = this.users.get(userId) ?? { id: userId, email, stripeCustomerId: null }
    this.users.set(userId, user)
    if (!user.stripeCustomerId) user.stripeCustomerId = customerId
    return user.stripeCustomerId
  }

  async findOpenCheckout(userId: string, planCode: string, interval: BillingInterval) {
    return (
      this.checkouts.find(
        (item) =>
          item.userId === userId &&
          item.planCode === planCode &&
          item.billingInterval === interval &&
          item.status === "open",
      ) ?? null
    )
  }

  async beginCheckout(input: {
    userId: string
    planCode: string
    interval: BillingInterval
    amountCents: number
    redemptionId: string | null
    at: Date
  }) {
    const existing = await this.findOpenCheckout(input.userId, input.planCode, input.interval)
    if (existing) return { created: false as const, checkout: existing }
    const row: CheckoutRow = {
      id: randomUUID(),
      userId: input.userId,
      url: null,
      stripeSessionId: null,
      redemptionId: input.redemptionId,
      planCode: input.planCode,
      billingInterval: input.interval,
      amountCents: input.amountCents,
      status: "open",
      createdAt: input.at,
    }
    this.checkouts.push(row)
    return { created: true as const, id: row.id }
  }

  async attachCheckoutSession(id: string, stripeSessionId: string, url: string) {
    const row = this.checkouts.find((item) => item.id === id)
    if (!row) return
    row.stripeSessionId = stripeSessionId
    row.url = url
  }

  async failCheckout(id: string) {
    const row = this.checkouts.find((item) => item.id === id)
    if (row && row.status === "open") row.status = "failed"
  }

  async checkoutByStripeId(stripeSessionId: string) {
    const row = this.checkouts.find((item) => item.stripeSessionId === stripeSessionId)
    if (!row) return null
    return { redemptionId: row.redemptionId, status: row.status }
  }

  async completeCheckout(stripeSessionId: string) {
    const row = this.checkouts.find((item) => item.stripeSessionId === stripeSessionId)
    if (row && row.status === "open") row.status = "complete"
  }

  async expireCheckout(id: string) {
    const row = this.checkouts.find((item) => item.id === id)
    if (row && row.status === "open") row.status = "expired"
  }

  async expireCheckoutByStripeId(stripeSessionId: string) {
    const row = this.checkouts.find((item) => item.stripeSessionId === stripeSessionId)
    if (row && row.status === "open") row.status = "expired"
  }

  async hasEvent(eventId: string) {
    return this.events.has(eventId)
  }

  async recordEvent(eventId: string) {
    this.events.add(eventId)
  }

  async upsertSubscription(input: SubscriptionSnapshot, eventCreated: number) {
    if (!this.users.has(input.userId)) return "missing_user" as const
    const existing = this.subscriptions.find((item) => item.stripeSubscriptionId === input.stripeSubscriptionId)
    if (!existing) {
      this.subscriptions.push({
        id: randomUUID(),
        userId: input.userId,
        planCode: input.planCode,
        status: input.status,
        billingInterval: input.billingInterval,
        amountCents: input.amountCents,
        privateOffer: input.privateOffer,
        stripeSubscriptionId: input.stripeSubscriptionId,
        currentPeriodEnd: input.currentPeriodEnd,
        lastEventCreated: eventCreated,
      })
      return "ok" as const
    }
    const order = subscriptionWrite(eventCreated, existing.lastEventCreated)
    if (order === "tie") return "tie" as const
    if (order === "ignore") return "ok" as const
    existing.status = input.status
    existing.currentPeriodEnd = input.currentPeriodEnd
    existing.lastEventCreated = eventCreated
    return "ok" as const
  }

  async cancelSubscription(stripeSubscriptionId: string, eventCreated: number) {
    const existing = this.subscriptions.find((item) => item.stripeSubscriptionId === stripeSubscriptionId)
    if (!existing) return "missing" as const
    if (eventCreated < existing.lastEventCreated) {
      return "ok" as const
    }
    if (eventCreated === existing.lastEventCreated) return "tie" as const
    existing.status = "canceled"
    existing.lastEventCreated = eventCreated
    return "ok" as const
  }

  async overlaySubscriptionStatus(input: SubscriptionObservation) {
    const existing = this.subscriptions.find((item) => item.stripeSubscriptionId === input.stripeSubscriptionId)
    if (!existing) return
    existing.status = input.status
    existing.currentPeriodEnd = input.currentPeriodEnd
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string) {
    return this.subscriptions.find((item) => item.stripeSubscriptionId === stripeSubscriptionId) ?? null
  }

  async findUserIdByStripeCustomer(customerId: string) {
    for (const user of this.users.values()) {
      if (user.stripeCustomerId === customerId) return user.id
    }
    return null
  }

  async upsertInvoice(input: InvoiceSnapshot, eventCreated: number) {
    if (!this.users.has(input.userId)) return "missing_user" as const
    const subscription = input.stripeSubscriptionId
      ? this.subscriptions.find((item) => item.stripeSubscriptionId === input.stripeSubscriptionId)
      : null
    const existing = this.invoices.find((item) => item.stripeInvoiceId === input.stripeInvoiceId)
    if (!existing) {
      this.invoices.push({
        ...input,
        id: randomUUID(),
        lastEventCreated: eventCreated,
        subscriptionLocalId: subscription?.id ?? null,
      })
      return "ok" as const
    }
    if (!invoiceWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    existing.status = input.status
    existing.amountDueCents = input.amountDueCents
    existing.amountPaidCents = input.amountPaidCents
    existing.amountRemainingCents = input.amountRemainingCents
    existing.issuedAt = input.issuedAt
    existing.paidAt = input.paidAt
    existing.lastEventCreated = eventCreated
    return "ok" as const
  }

  async upsertPayment(input: PaymentSnapshot, eventCreated: number) {
    if (!this.users.has(input.userId)) return "missing_payment_target" as const
    const existing = this.payments.find((item) => item.stripePaymentIntentId === input.stripePaymentIntentId)
    if (!existing) {
      this.payments.push({ ...input, id: randomUUID(), lastEventCreated: eventCreated })
      return "ok" as const
    }
    if (!paymentWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    if (input.status === "succeeded") existing.amountCents = input.amountCents
    existing.status = input.status
    existing.failureCode = input.failureCode
    existing.paidAt = input.paidAt
    existing.lastEventCreated = eventCreated
    return "ok" as const
  }

  async upsertRefund(input: RefundSnapshot, eventCreated: number) {
    const payment = this.payments.find((item) => item.stripePaymentIntentId === input.stripePaymentIntentId)
    if (!payment) return "missing_payment" as const
    const existing = this.refunds.find((item) => item.stripeRefundId === input.stripeRefundId)
    if (!existing) {
      this.refunds.push({ ...input, id: randomUUID(), paymentId: payment.id, lastEventCreated: eventCreated })
      return "ok" as const
    }
    if (!refundWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    existing.status = input.status
    existing.amountCents = input.amountCents
    existing.lastEventCreated = eventCreated
    return "ok" as const
  }

  async listInvoices(userId: string): Promise<ClientInvoice[]> {
    return this.invoices
      .filter((item) => item.userId === userId)
      .map((item) => ({
        id: item.id,
        status: item.status,
        amountDueCents: item.amountDueCents,
        amountPaidCents: item.amountPaidCents,
        amountRemainingCents: item.amountRemainingCents,
        currency: item.currency,
        issuedAt: item.issuedAt,
        paidAt: item.paidAt,
      }))
  }

  async adminSnapshot(): Promise<AdminBillingSnapshot> {
    const emailOf = (userId: string) => this.users.get(userId)?.email ?? ""
    return {
      customers: [...this.users.values()]
        .filter((user) => user.stripeCustomerId)
        .map((user) => ({ email: user.email, stripeCustomerId: user.stripeCustomerId as string })),
      subscriptions: this.subscriptions.map((item) => ({
        email: emailOf(item.userId),
        planCode: item.planCode,
        status: item.status,
        amountCents: item.amountCents,
        billingInterval: item.billingInterval,
        privateOffer: item.privateOffer,
      })),
      invoices: this.invoices.map((item) => ({
        email: emailOf(item.userId),
        status: item.status,
        amountDueCents: item.amountDueCents,
        amountPaidCents: item.amountPaidCents,
        amountRemainingCents: item.amountRemainingCents,
        currency: item.currency,
      })),
      payments: this.payments.map((item) => ({
        email: emailOf(item.userId),
        status: item.status,
        amountCents: item.amountCents,
        failureCode: item.failureCode,
      })),
    }
  }

  async loadBillingInputs(): Promise<BillingInputs> {
    return {
      subscriptions: this.subscriptions.map((item) => ({
        status: item.status,
        amountCents: item.amountCents,
        billingInterval: item.billingInterval,
      })),
      invoices: this.invoices.map((item) => ({
        status: item.status,
        amountDueCents: item.amountDueCents,
        amountRemainingCents: item.amountRemainingCents,
      })),
      payments: this.payments.map((item) => ({ status: item.status, amountCents: item.amountCents })),
      refunds: this.refunds.map((item) => ({ status: item.status, amountCents: item.amountCents })),
    }
  }
}
