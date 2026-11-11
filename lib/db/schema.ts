import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import {
  boolean,
  foreignKey,
  check,
  index,
  bigint,
  bigserial,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Schéma relationnel du Shop. La migration versionnée est drizzle/0001_foundations.sql.
 * Les deux doivent évoluer ensemble : le test de schéma exécute le SQL, puis l'ORM.
 */

export const userRole = pgEnum("user_role", ["client", "admin"])
export const planVisibility = pgEnum("plan_visibility", ["public", "private"])
export const billingInterval = pgEnum("billing_interval", ["month", "year"])
export const subscriptionStatus = pgEnum("subscription_status", [
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "canceled",
])
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "uncollectible",
  "void",
])
export const paymentStatus = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "canceled",
])
export const refundStatus = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
  "canceled",
])

function createdAt() {
  return timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}

function updatedAt() {
  return timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  role: userRole("role").notNull().default("client"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  disabledAt: timestamp("disabled_at", { withTimezone: true }),
})

export const customerProfiles = pgTable("customer_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  company: text("company"),
  billingEmail: text("billing_email").notNull(),
  locale: text("locale").notNull().default("fr"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  cgvVersion: text("cgv_version"),
  cgvAcceptedAt: timestamp("cgv_accepted_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
)

export const plans = pgTable(
  "plans",
  {
    code: text("code").primaryKey(),
    visibility: planVisibility("visibility").notNull(),
    monthlyAmountCents: integer("monthly_amount_cents").notNull(),
    yearlyAmountCents: integer("yearly_amount_cents"),
    currency: text("currency").notNull().default("EUR"),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    check("plans_monthly_positive", sql`${table.monthlyAmountCents} > 0`),
    check(
      "plans_yearly_positive",
      sql`${table.yearlyAmountCents} is null or ${table.yearlyAmountCents} > 0`,
    ),
    check("plans_currency_eur", sql`${table.currency} = 'EUR'`),
  ],
)

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    status: subscriptionStatus("status").notNull().default("incomplete"),
    billingInterval: billingInterval("billing_interval").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    privateOffer: boolean("private_offer").notNull().default(false),
    commercialTerms: text("commercial_terms").notNull().default("catalog-v1"),
    serviceAnchorAt: timestamp("service_anchor_at", { withTimezone: true }),
    entitlementReviewRequired: boolean("entitlement_review_required").notNull().default(false),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
    cancelEffectiveAt: timestamp("cancel_effective_at", { withTimezone: true }),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    promotionRedemptionId: uuid("promotion_redemption_id").references((): AnyPgColumn => promotionRedemptions.id, { onDelete: "restrict" }),
    lastEventCreated: bigint("last_event_created", { mode: "number" }).notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_promotion_redemption_idx").on(table.promotionRedemptionId),
    index("subscriptions_status_idx").on(table.status),
    check("subscriptions_amount_positive", sql`${table.amountCents} > 0`),
    check("subscriptions_currency_eur", sql`${table.currency} = 'EUR'`),
  ],
)

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    servicePeriodStart: timestamp("service_period_start", { withTimezone: true }),
    servicePeriodEnd: timestamp("service_period_end", { withTimezone: true }),
    serviceSubscriptionId: text("service_subscription_id"),
    status: invoiceStatus("status").notNull(),
    totalCents: integer("total_cents"),
    amountDueCents: integer("amount_due_cents").notNull(),
    amountPaidCents: integer("amount_paid_cents").notNull(),
    amountRemainingCents: integer("amount_remaining_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    lastEventCreated: bigint("last_event_created", { mode: "number" }).notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("invoices_user_id_idx").on(table.userId),
    check("invoices_due_nonnegative", sql`${table.amountDueCents} >= 0`),
    check("invoices_paid_nonnegative", sql`${table.amountPaidCents} >= 0`),
    check("invoices_remaining_nonnegative", sql`${table.amountRemainingCents} >= 0`),
    check("invoices_currency_eur", sql`${table.currency} = 'EUR'`),
  ],
)

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    status: paymentStatus("status").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    failureCode: text("failure_code"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    lastEventCreated: bigint("last_event_created", { mode: "number" }).notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("payments_user_id_idx").on(table.userId),
    check("payments_amount_positive", sql`${table.amountCents} > 0`),
    check("payments_currency_eur", sql`${table.currency} = 'EUR'`),
  ],
)

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "restrict" }),
    stripeRefundId: text("stripe_refund_id").unique(),
    succeededEventAt: timestamp("succeeded_event_at", { withTimezone: true }),
    status: refundStatus("status").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("EUR"),
    lastEventCreated: bigint("last_event_created", { mode: "number" }).notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    index("refunds_payment_id_idx").on(table.paymentId),
    check("refunds_amount_positive", sql`${table.amountCents} > 0`),
    check("refunds_currency_eur", sql`${table.currency} = 'EUR'`),
  ],
)

export const promotionCodes = pgTable(
  "promotion_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codeHash: text("code_hash").notNull().unique(),
    codeHint: text("code_hint"),
    usageTerms: text("usage_terms").notNull().default("catalog-v1"),
    internalNotes: text("internal_notes").notNull().default(""),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    planCode: text("plan_code")
      .notNull()
      .references(() => plans.code),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxRedemptions: integer("max_redemptions"),
    redemptionCount: integer("redemption_count").notNull().default(0),
    restrictedEmail: text("restricted_email"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    check("promotion_codes_private_plan", sql`${table.planCode} in ('friend_host', 'friend_care')`),
    check("promotion_codes_max_positive", sql`${table.maxRedemptions} is null or ${table.maxRedemptions} > 0`),
    check("promotion_codes_count_nonnegative", sql`${table.redemptionCount} >= 0`),
  ],
)

export const promotionRedemptions = pgTable(
  "promotion_redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    promotionCodeId: uuid("promotion_code_id")
      .notNull()
      .references(() => promotionCodes.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: text("status").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("promotion_redemptions_code_idx").on(table.promotionCodeId),
    uniqueIndex("promotion_redemptions_one_reserved_idx").on(table.promotionCodeId, table.userId).where(sql`${table.status} = 'reserved'`),
    check("promotion_redemptions_status", sql`${table.status} in ('reserved', 'consumed', 'released')`),
  ],
)

export const checkoutSessions = pgTable(
  "checkout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id").unique(),
    url: text("url"),
    planCode: text("plan_code").notNull(),
    billingInterval: billingInterval("billing_interval").notNull(),
    amountCents: integer("amount_cents").notNull(),
    redemptionId: uuid("redemption_id"),
    status: text("status").notNull().default("open"),
    createdAt: createdAt(),
  },
  (table) => [
    index("checkout_sessions_user_idx").on(table.userId),
    uniqueIndex("checkout_sessions_one_open_idx")
      .on(table.userId, table.planCode, table.billingInterval)
      .where(sql`${table.status} = 'open'`),
    check("checkout_sessions_status", sql`${table.status} in ('open', 'complete', 'expired', 'failed')`),
    check("checkout_sessions_amount_positive", sql`${table.amountCents} > 0`),
  ],
)

export const stripeEvents = pgTable("stripe_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  createdAt: createdAt(),
})

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secretHash: text("secret_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    mfaVerifiedAt: timestamp("mfa_verified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
)

export const magicLinks = pgTable(
  "magic_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index("magic_links_email_idx").on(table.email)],
)

export const adminTotp = pgTable("admin_totp", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secretCiphertext: text("secret_ciphertext").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: createdAt(),
})

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("recovery_codes_user_hash_unique").on(table.userId, table.codeHash)],
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
)

// Lot 5: client intervention workflow and immutable time ledger.
export const interventionRequests = pgTable("intervention_requests", {
 id: uuid("id").primaryKey().defaultRandom(),
 userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
 projectId: uuid("project_id").notNull(),
 subscriptionId: uuid("subscription_id"),
 submissionKey: uuid("submission_key").notNull(),
 payloadHash: text("payload_hash").notNull(),
 subject: text("subject").notNull(), description: text("description").notNull(),
 category: text("category").notNull(), urgency: text("urgency").notNull(),
 additionalInfo: text("additional_info").notNull().default(""),
 status: text("status").notNull().default("submitted"),
 coverage: text("coverage").notNull().default("unreviewed"),
 internalPriority: text("internal_priority").notNull().default("normal"),
 minorScopeConfirmed: boolean("minor_scope_confirmed").notNull().default(false),
 createdAt: createdAt(), updatedAt: updatedAt(),
}, table => [
 uniqueIndex("intervention_requests_submission_idx").on(table.userId, table.submissionKey),
 foreignKey({ columns: [table.projectId, table.userId], foreignColumns: [projects.id, projects.userId] }),
 foreignKey({ columns: [table.subscriptionId, table.userId], foreignColumns: [subscriptions.id, subscriptions.userId] }),
 index("intervention_requests_owner_idx").on(table.userId, table.createdAt),
])
export const interventionEvents = pgTable("intervention_events", {
 sequence: bigserial("sequence", { mode: "number" }).notNull(),
 id: uuid("id").primaryKey().defaultRandom(),
 requestId: uuid("request_id").notNull().references(() => interventionRequests.id, { onDelete: "restrict" }),
 actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
 actorRole: text("actor_role").notNull(), kind: text("kind").notNull(),
 internal: boolean("internal").notNull().default(false), body: text("body").notNull().default(""),
 fromStatus: text("from_status"), toStatus: text("to_status"),
 operationKey: uuid("operation_key").notNull(), payloadHash: text("payload_hash").notNull(),
 createdAt: createdAt(),
}, table => [
 uniqueIndex("intervention_events_operation_idx").on(table.requestId, table.actorId, table.operationKey),
 index("intervention_events_request_idx").on(table.requestId, table.createdAt),
])
export const interventionPeriods = pgTable("intervention_periods", {
 id: uuid("id").primaryKey().defaultRandom(),
 subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id, { onDelete: "restrict" }),
 periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
 periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
 includedMinutes: integer("included_minutes").notNull().default(60),
 consumedMinutes: integer("consumed_minutes").notNull().default(0),
}, table => [uniqueIndex("intervention_periods_key_idx").on(table.subscriptionId, table.periodStart)])
export const interventionTimeEntries = pgTable("intervention_time_entries", {
 id: uuid("id").primaryKey().defaultRandom(),
 requestId: uuid("request_id").notNull().unique().references(() => interventionRequests.id, { onDelete: "restrict" }),
 subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "restrict" }),
 periodId: uuid("period_id").references(() => interventionPeriods.id, { onDelete: "restrict" }),
 actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
 minutes: integer("minutes").notNull(), coverage: text("coverage").notNull(),
 performedAt: timestamp("performed_at", { withTimezone: true }).notNull(), createdAt: createdAt(),
})
export const interventionOutbox = pgTable("intervention_outbox", {
 id: uuid("id").primaryKey().defaultRandom(),
 eventId: uuid("event_id").notNull().unique().references(() => interventionEvents.id, { onDelete: "restrict" }),
 userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
 audience: text("audience").notNull(), status: text("status").notNull().default("pending"),
 createdAt: createdAt(),
})

export const subscriptionObservations = pgTable("subscription_observations", {
 id: bigserial("id",{mode:"number"}).primaryKey(),
 subscriptionId: uuid("subscription_id").notNull().references(()=>subscriptions.id,{onDelete:"restrict"}),
 status:text("status").notNull(),amountCents:integer("amount_cents").notNull(),billingInterval:text("billing_interval").notNull(),
 currentPeriodStart:timestamp("current_period_start",{withTimezone:true}),currentPeriodEnd:timestamp("current_period_end",{withTimezone:true}),cancelRequestedAt:timestamp("cancel_requested_at",{withTimezone:true}),cancelEffectiveAt:timestamp("cancel_effective_at",{withTimezone:true}),
 reviewRequired:boolean("review_required").notNull(),stripeEventCreated:bigint("stripe_event_created",{mode:"number"}).notNull(),recordedAt:timestamp("recorded_at",{withTimezone:true}).notNull().defaultNow(),
})
