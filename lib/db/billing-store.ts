import { and, desc, eq, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { invoiceWrite, paymentWrite, refundWrite, subscriptionWrite } from "../billing/event-order"
import type { BillingInputs } from "../billing/metrics"
import { lockedPrivateMonthly } from "../billing/promotion"
import type { BillingInterval, PlanCode } from "../shop/plans"
import type {
  BillingStore,
  InvoiceSnapshot,
  OpenCheckout,
  PaymentSnapshot,
  PromotionPreview,
  RefundSnapshot,
  SubscriptionObservation,
  SubscriptionSnapshot,
} from "../billing/store"
import * as schema from "./schema"
import {
  checkoutSessions,
  customerProfiles,
  invoices,
  payments,
  promotionCodes,
  promotionRedemptions,
  refunds,
  stripeEvents,
  subscriptions,
  users,
} from "./schema"

type AppDatabase = PostgresJsDatabase<typeof schema>

function asDate(value: Date | string | null): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current)
    if ("code" in current && (current as { code?: string }).code === "23505") return true
    current = "cause" in current ? (current as { cause?: unknown }).cause : null
  }
  return false
}

function mapCheckout(row: typeof checkoutSessions.$inferSelect): OpenCheckout {
  return {
    id: row.id,
    url: row.url,
    stripeSessionId: row.stripeSessionId,
    redemptionId: row.redemptionId,
    planCode: row.planCode,
    billingInterval: row.billingInterval,
    createdAt: asDate(row.createdAt) ?? new Date(0),
  }
}

export class DrizzleBillingStore implements BillingStore {
  constructor(private readonly db: AppDatabase) {}

  private async promoPreview(codeHash: string, email: string, at: Date): Promise<PromotionPreview & { id?: string }> {
    const [row] = await this.db.select().from(promotionCodes).where(eq(promotionCodes.codeHash, codeHash)).limit(1)
    if (!row) return { ok: false, reason: "invalid" }
    const locked = lockedPrivateMonthly(row.planCode as PlanCode)
    if (!locked) return { ok: false, reason: "invalid" }
    if (row.disabledAt) return { ok: false, reason: "disabled" }
    const expires = asDate(row.expiresAt)
    if (expires && expires.getTime() <= at.getTime()) return { ok: false, reason: "expired" }
    if (row.restrictedEmail && row.restrictedEmail !== email) return { ok: false, reason: "restricted" }
    if (row.maxRedemptions != null && row.redemptionCount >= row.maxRedemptions) return { ok: false, reason: "exhausted" }
    return { ok: true, planCode: locked.planCode, amountCents: locked.amountCents, id: row.id, usageTerms: row.usageTerms === "catalog-v1" ? undefined : row.usageTerms }
  }

  async previewPromotion(input: { codeHash: string; email: string; at: Date }) {
    const preview = await this.promoPreview(input.codeHash, input.email, input.at)
    if (!preview.ok) return preview
    return { ok: true as const, planCode: preview.planCode, amountCents: preview.amountCents, usageTerms: preview.usageTerms }
  }

  async reservePromotion(input: { codeHash: string; userId: string; email: string; at: Date }) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(promotionCodes)
        .where(eq(promotionCodes.codeHash, input.codeHash))
        .limit(1)
        .for("update")
      if (!row) return { ok: false as const, reason: "invalid" as const }
      const locked = lockedPrivateMonthly(row.planCode as PlanCode)
      if (!locked) return { ok: false as const, reason: "invalid" as const }
      const [own] = await tx
        .select()
        .from(promotionRedemptions)
        .where(
          and(
            eq(promotionRedemptions.promotionCodeId, row.id),
            eq(promotionRedemptions.userId, input.userId),
            eq(promotionRedemptions.status, "reserved"),
          ),
        )
        .limit(1)
      let holdReason: "expired" | "disabled" | "exhausted" | "restricted" | null = null
      if (row.disabledAt) holdReason = "disabled"
      const expires = asDate(row.expiresAt)
      if (!holdReason && expires && expires.getTime() <= input.at.getTime()) holdReason = "expired"
      if (!holdReason && row.restrictedEmail && row.restrictedEmail !== input.email) holdReason = "restricted"
      if (!holdReason && row.maxRedemptions != null && row.redemptionCount >= row.maxRedemptions) holdReason = "exhausted"
      if (own) {
        return {
          ok: true as const,
          redemptionId: own.id,
          planCode: locked.planCode,
          amountCents: locked.amountCents,
          holdReason,
        }
      }
      if (holdReason) return { ok: false as const, reason: holdReason }
      const [created] = await tx
        .insert(promotionRedemptions)
        .values({ promotionCodeId: row.id, userId: input.userId, status: "reserved" })
        .returning({ id: promotionRedemptions.id })
      await tx
        .update(promotionCodes)
        .set({ redemptionCount: sql`${promotionCodes.redemptionCount} + 1` })
        .where(eq(promotionCodes.id, row.id))
      return {
        ok: true as const,
        redemptionId: created.id,
        planCode: locked.planCode,
        amountCents: locked.amountCents,
        holdReason: null,
      }
    })
  }

  async consumePromotion(redemptionId: string, at: Date) {
    await this.db
      .update(promotionRedemptions)
      .set({ status: "consumed", updatedAt: at })
      .where(and(eq(promotionRedemptions.id, redemptionId), eq(promotionRedemptions.status, "reserved")))
  }

  async releasePromotion(redemptionId: string, at: Date) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(promotionRedemptions)
        .set({ status: "released", updatedAt: at })
        .where(and(eq(promotionRedemptions.id, redemptionId), eq(promotionRedemptions.status, "reserved")))
        .returning({ promotionCodeId: promotionRedemptions.promotionCodeId })
      if (!row) return
      await tx
        .update(promotionCodes)
        .set({ redemptionCount: sql`greatest(${promotionCodes.redemptionCount} - 1, 0)` })
        .where(eq(promotionCodes.id, row.promotionCodeId))
    })
  }

  async getStripeCustomerId(userId: string) {
    const [row] = await this.db
      .select({ stripeCustomerId: customerProfiles.stripeCustomerId })
      .from(customerProfiles)
      .where(eq(customerProfiles.userId, userId))
      .limit(1)
    return row?.stripeCustomerId ?? null
  }

  async saveStripeCustomerId(userId: string, email: string, customerId: string) {
    await this.db
      .insert(customerProfiles)
      .values({ userId, billingEmail: email, stripeCustomerId: customerId })
      .onConflictDoUpdate({
        target: customerProfiles.userId,
        set: {
          stripeCustomerId: sql`coalesce(${customerProfiles.stripeCustomerId}, ${customerId})`,
          billingEmail: email,
          updatedAt: new Date(),
        },
      })
    return (await this.getStripeCustomerId(userId)) ?? customerId
  }

  async findOpenCheckout(userId: string, planCode: string, interval: BillingInterval) {
    const [row] = await this.db
      .select()
      .from(checkoutSessions)
      .where(
        and(
          eq(checkoutSessions.userId, userId),
          eq(checkoutSessions.planCode, planCode),
          eq(checkoutSessions.billingInterval, interval),
          eq(checkoutSessions.status, "open"),
        ),
      )
      .limit(1)
    return row ? mapCheckout(row) : null
  }

  async beginCheckout(input: {
    userId: string
    planCode: string
    interval: BillingInterval
    amountCents: number
    redemptionId: string | null
    at: Date
  }) {
    try {
      const [created] = await this.db
        .insert(checkoutSessions)
        .values({
          userId: input.userId,
          planCode: input.planCode,
          billingInterval: input.interval,
          amountCents: input.amountCents,
          redemptionId: input.redemptionId,
          status: "open",
          createdAt: input.at,
        })
        .returning({ id: checkoutSessions.id })
      return { created: true as const, id: created.id }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const existing = await this.findOpenCheckout(input.userId, input.planCode, input.interval)
      if (!existing) throw error
      return { created: false as const, checkout: existing }
    }
  }

  async attachCheckoutSession(id: string, stripeSessionId: string, url: string) {
    await this.db.update(checkoutSessions).set({ stripeSessionId, url }).where(eq(checkoutSessions.id, id))
  }

  async failCheckout(id: string) {
    await this.db
      .update(checkoutSessions)
      .set({ status: "failed" })
      .where(and(eq(checkoutSessions.id, id), eq(checkoutSessions.status, "open")))
  }

  async checkoutByStripeId(stripeSessionId: string) {
    const [row] = await this.db
      .select({ redemptionId: checkoutSessions.redemptionId, status: checkoutSessions.status })
      .from(checkoutSessions)
      .where(eq(checkoutSessions.stripeSessionId, stripeSessionId))
      .limit(1)
    return row ?? null
  }

  async completeCheckout(stripeSessionId: string) {
    await this.db
      .update(checkoutSessions)
      .set({ status: "complete" })
      .where(and(eq(checkoutSessions.stripeSessionId, stripeSessionId), eq(checkoutSessions.status, "open")))
  }

  async expireCheckout(id: string) {
    await this.db
      .update(checkoutSessions)
      .set({ status: "expired" })
      .where(and(eq(checkoutSessions.id, id), eq(checkoutSessions.status, "open")))
  }

  async expireCheckoutByStripeId(stripeSessionId: string) {
    await this.db
      .update(checkoutSessions)
      .set({ status: "expired" })
      .where(and(eq(checkoutSessions.stripeSessionId, stripeSessionId), eq(checkoutSessions.status, "open")))
  }

  async hasEvent(eventId: string) {
    const [row] = await this.db
      .select({ eventId: stripeEvents.eventId })
      .from(stripeEvents)
      .where(eq(stripeEvents.eventId, eventId))
      .limit(1)
    return Boolean(row)
  }

  async recordEvent(eventId: string, eventType: string) {
    await this.db.insert(stripeEvents).values({ eventId, eventType }).onConflictDoNothing()
  }

  async upsertSubscription(input: SubscriptionSnapshot, eventCreated: number) {
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1)
    if (!user) return "missing_user" as const
    const [existing] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, input.stripeSubscriptionId))
      .limit(1)
    if (!existing) {
      const grant = input.promotionRedemptionId ? await this.db.select({
        id: promotionRedemptions.id, usageTerms: promotionCodes.usageTerms, planCode: promotionCodes.planCode,
      }).from(promotionRedemptions).innerJoin(promotionCodes, eq(promotionCodes.id, promotionRedemptions.promotionCodeId))
        .where(and(eq(promotionRedemptions.id, input.promotionRedemptionId), eq(promotionRedemptions.userId, input.userId))).limit(1) : []
      if (input.promotionRedemptionId && (!grant[0] || grant[0].planCode !== input.planCode)) return "missing_user" as const
      await this.db.insert(subscriptions).values({
        serviceAnchorAt: input.serviceAnchorAt ?? null,
        entitlementReviewRequired: Boolean((input.observedAmountCents != null && input.observedAmountCents !== input.amountCents) || (input.observedBillingInterval && input.observedBillingInterval !== input.billingInterval)),
        promotionRedemptionId: grant[0]?.id ?? null,
        commercialTerms: grant[0]?.usageTerms ?? "catalog-v1",
        userId: input.userId,
        planCode: input.planCode,
        status: input.status as typeof subscriptions.$inferInsert.status,
        billingInterval: input.billingInterval,
        amountCents: input.amountCents,
        privateOffer: input.privateOffer,
        stripeSubscriptionId: input.stripeSubscriptionId,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelRequestedAt: input.cancelRequestedAt,
        cancelEffectiveAt: input.cancelEffectiveAt,
        lastEventCreated: eventCreated,
      })
      return "ok" as const
    }
    const order = subscriptionWrite(eventCreated, existing.lastEventCreated)
    if (order === "tie") return "tie" as const
    if (order === "ignore") return "ok" as const
    const review = existing.entitlementReviewRequired || input.planCode !== existing.planCode || input.billingInterval !== existing.billingInterval
      || (input.observedAmountCents != null && input.observedAmountCents !== existing.amountCents)
      || Boolean(input.observedBillingInterval && input.observedBillingInterval !== existing.billingInterval)
      || Boolean(existing.serviceAnchorAt && input.serviceAnchorAt && existing.serviceAnchorAt.getTime() !== input.serviceAnchorAt.getTime())
    await this.db
      .update(subscriptions)
      .set({
        serviceAnchorAt: existing.serviceAnchorAt ?? input.serviceAnchorAt ?? null,
        entitlementReviewRequired: review,
        status: input.status as typeof subscriptions.$inferInsert.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelRequestedAt: input.cancelRequestedAt,
        cancelEffectiveAt: input.cancelEffectiveAt,
        lastEventCreated: eventCreated,
        updatedAt: new Date(eventCreated * 1000),
      })
      .where(eq(subscriptions.id, existing.id))
    return "ok" as const
  }

  async cancelSubscription(stripeSubscriptionId: string, eventCreated: number, at: Date) {
    const [existing] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)
    if (!existing) return "missing" as const
    if (eventCreated < existing.lastEventCreated) {
      return "ok" as const
    }
    if (eventCreated === existing.lastEventCreated) return "tie" as const
    await this.db
      .update(subscriptions)
      .set({ status: "canceled", cancelEffectiveAt: at, lastEventCreated: eventCreated, updatedAt: at })
      .where(eq(subscriptions.id, existing.id))
    return "ok" as const
  }

  async overlaySubscriptionStatus(input: SubscriptionObservation) {
    const [current] = await this.db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId,input.stripeSubscriptionId)).limit(1)
    if (!current) return
    const review = current.entitlementReviewRequired || Boolean(input.observedPlanCode && input.observedPlanCode !== current.planCode)
      || (input.observedAmountCents != null && input.observedAmountCents !== current.amountCents)
      || Boolean(input.observedBillingInterval && input.observedBillingInterval !== current.billingInterval)
      || Boolean(current.serviceAnchorAt && input.serviceAnchorAt && current.serviceAnchorAt.getTime() !== input.serviceAnchorAt.getTime())
    await this.db
      .update(subscriptions)
      .set({
        serviceAnchorAt: current.serviceAnchorAt ?? input.serviceAnchorAt ?? null,
        entitlementReviewRequired: review,
        status: input.status as typeof subscriptions.$inferInsert.status,
        currentPeriodStart: input.currentPeriodStart,
        currentPeriodEnd: input.currentPeriodEnd,
        cancelRequestedAt: input.cancelRequestedAt,
        cancelEffectiveAt: input.cancelEffectiveAt,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeSubscriptionId, input.stripeSubscriptionId))
  }

  async findSubscriptionByStripeId(stripeSubscriptionId: string) {
    const [row] = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1)
    if (!row || !row.stripeSubscriptionId) return null
    return {
      id: row.id,
      userId: row.userId,
      planCode: row.planCode,
      status: row.status,
      billingInterval: row.billingInterval,
      amountCents: row.amountCents,
      privateOffer: row.privateOffer,
      stripeSubscriptionId: row.stripeSubscriptionId,
      lastEventCreated: row.lastEventCreated,
    }
  }

  async findUserIdByStripeCustomer(customerId: string) {
    const [row] = await this.db
      .select({ userId: customerProfiles.userId })
      .from(customerProfiles)
      .where(eq(customerProfiles.stripeCustomerId, customerId))
      .limit(1)
    return row?.userId ?? null
  }

  async upsertInvoice(input: InvoiceSnapshot, eventCreated: number) {
    const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1)
    if (!user) return "missing_user" as const
    const subscription = input.stripeSubscriptionId
      ? await this.findSubscriptionByStripeId(input.stripeSubscriptionId)
      : null
    const [existing] = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.stripeInvoiceId, input.stripeInvoiceId))
      .limit(1)
    if (!existing) {
      await this.db.insert(invoices).values({
        userId: input.userId,
        subscriptionId: subscription?.id ?? null,
        stripeInvoiceId: input.stripeInvoiceId,
        totalCents: input.totalCents ?? null,
        serviceSubscriptionId: input.stripeSubscriptionId,
        servicePeriodStart: input.servicePeriodStart ?? null,
        servicePeriodEnd: input.servicePeriodEnd ?? null,
        status: input.status as typeof invoices.$inferInsert.status,
        amountDueCents: input.amountDueCents,
        amountPaidCents: input.amountPaidCents,
        amountRemainingCents: input.amountRemainingCents,
        currency: "EUR",
        issuedAt: input.issuedAt,
        paidAt: input.paidAt,
        lastEventCreated: eventCreated,
      })
      return "ok" as const
    }
    if (!invoiceWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    await this.db
      .update(invoices)
      .set({
        status: input.status as typeof invoices.$inferInsert.status,
        totalCents: input.totalCents ?? existing.totalCents,
        amountDueCents: input.amountDueCents,
        amountPaidCents: input.amountPaidCents,
        amountRemainingCents: input.amountRemainingCents,
        issuedAt: input.issuedAt,
        paidAt: input.paidAt,
        subscriptionId: subscription?.id ?? existing.subscriptionId,
        serviceSubscriptionId: input.stripeSubscriptionId ?? existing.serviceSubscriptionId,
        servicePeriodStart: input.servicePeriodStart ?? existing.servicePeriodStart,
        servicePeriodEnd: input.servicePeriodEnd ?? existing.servicePeriodEnd,
        lastEventCreated: eventCreated,
      })
      .where(eq(invoices.id, existing.id))
    return "ok" as const
  }

  async upsertPayment(input: PaymentSnapshot, eventCreated: number) {
    const invoice = input.stripeInvoiceId
      ? (
          await this.db
            .select({ id: invoices.id })
            .from(invoices)
            .where(eq(invoices.stripeInvoiceId, input.stripeInvoiceId))
            .limit(1)
        )[0]
      : null
    const [existing] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, input.stripePaymentIntentId))
      .limit(1)
    if (!existing) {
      const [user] = await this.db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).limit(1)
      if (!user) return "missing_payment_target" as const
      await this.db.insert(payments).values({
        userId: input.userId,
        invoiceId: invoice?.id ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId,
        status: input.status as typeof payments.$inferInsert.status,
        amountCents: input.amountCents,
        currency: "EUR",
        failureCode: input.failureCode,
        paidAt: input.paidAt,
        lastEventCreated: eventCreated,
      })
      return "ok" as const
    }
    if (!paymentWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    await this.db
      .update(payments)
      .set({
        status: input.status as typeof payments.$inferInsert.status,
        amountCents: input.status === "succeeded" ? input.amountCents : existing.amountCents,
        failureCode: input.failureCode,
        paidAt: input.paidAt,
        invoiceId: invoice?.id ?? existing.invoiceId,
        lastEventCreated: eventCreated,
      })
      .where(eq(payments.id, existing.id))
    return "ok" as const
  }

  async upsertRefund(input: RefundSnapshot, eventCreated: number) {
    const [payment] = await this.db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, input.stripePaymentIntentId))
      .limit(1)
    if (!payment) return "missing_payment" as const
    const [existing] = await this.db
      .select()
      .from(refunds)
      .where(eq(refunds.stripeRefundId, input.stripeRefundId))
      .limit(1)
    if (!existing) {
      await this.db.insert(refunds).values({
        paymentId: payment.id,
        stripeRefundId: input.stripeRefundId,
        succeededEventAt: input.status === "succeeded" ? new Date(eventCreated * 1000) : null,
        status: input.status as typeof refunds.$inferInsert.status,
        amountCents: input.amountCents,
        currency: "EUR",
        lastEventCreated: eventCreated,
      })
      return "ok" as const
    }
    if (!refundWrite(eventCreated, existing.lastEventCreated, existing.status, input.status)) return "ok" as const
    await this.db
      .update(refunds)
      .set({
        status: input.status as typeof refunds.$inferInsert.status,
        amountCents: input.amountCents,
        succeededEventAt: existing.succeededEventAt ?? (input.status === "succeeded" ? new Date(eventCreated * 1000) : null),
        lastEventCreated: eventCreated,
      })
      .where(eq(refunds.id, existing.id))
    return "ok" as const
  }

  async listInvoices(userId: string) {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt))
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      amountDueCents: row.amountDueCents,
      amountPaidCents: row.amountPaidCents,
      amountRemainingCents: row.amountRemainingCents,
      currency: row.currency,
      issuedAt: asDate(row.issuedAt),
      paidAt: asDate(row.paidAt),
    }))
  }

  async adminSnapshot() {
    const [customerRows, subscriptionRows, invoiceRows, paymentRows] = await Promise.all([
      this.db
        .select({ email: users.email, stripeCustomerId: customerProfiles.stripeCustomerId })
        .from(customerProfiles)
        .innerJoin(users, eq(users.id, customerProfiles.userId)),
      this.db
        .select({
          email: users.email,
          planCode: subscriptions.planCode,
          status: subscriptions.status,
          amountCents: subscriptions.amountCents,
          billingInterval: subscriptions.billingInterval,
          privateOffer: subscriptions.privateOffer,
        })
        .from(subscriptions)
        .innerJoin(users, eq(users.id, subscriptions.userId))
        .orderBy(desc(subscriptions.createdAt)),
      this.db
        .select({
          email: users.email,
          status: invoices.status,
          amountDueCents: invoices.amountDueCents,
          amountPaidCents: invoices.amountPaidCents,
          amountRemainingCents: invoices.amountRemainingCents,
          currency: invoices.currency,
        })
        .from(invoices)
        .innerJoin(users, eq(users.id, invoices.userId))
        .orderBy(desc(invoices.createdAt)),
      this.db
        .select({
          email: users.email,
          status: payments.status,
          amountCents: payments.amountCents,
          failureCode: payments.failureCode,
        })
        .from(payments)
        .innerJoin(users, eq(users.id, payments.userId))
        .orderBy(desc(payments.createdAt)),
    ])
    return {
      customers: customerRows.flatMap((row) =>
        row.stripeCustomerId ? [{ email: row.email, stripeCustomerId: row.stripeCustomerId }] : [],
      ),
      subscriptions: subscriptionRows,
      invoices: invoiceRows,
      payments: paymentRows,
    }
  }

  async loadBillingInputs(): Promise<BillingInputs> {
    const [subscriptionRows, invoiceRows, paymentRows, refundRows] = await Promise.all([
      this.db
        .select({
          status: subscriptions.status,
          amountCents: subscriptions.amountCents,
          billingInterval: subscriptions.billingInterval,
        })
        .from(subscriptions),
      this.db
        .select({
          status: invoices.status,
          amountDueCents: invoices.amountDueCents,
          amountRemainingCents: invoices.amountRemainingCents,
        })
        .from(invoices),
      this.db.select({ status: payments.status, amountCents: payments.amountCents }).from(payments),
      this.db.select({ status: refunds.status, amountCents: refunds.amountCents }).from(refunds),
    ])
    return { subscriptions: subscriptionRows, invoices: invoiceRows, payments: paymentRows, refunds: refundRows }
  }
}
