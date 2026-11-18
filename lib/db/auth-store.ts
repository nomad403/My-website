import { and, desc, eq, gt, isNull, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { BillingInputs } from "../billing/metrics"
import * as schema from "./schema"
import {
  adminTotp,
  auditLogs,
  customerProfiles,
  invoices,
  magicLinks,
  payments,
  projects,
  recoveryCodes,
  refunds,
  sessions,
  subscriptions,
  users,
} from "./schema"
import {
  EmailConflictError,
  type AuthStore,
  type MagicLinkRecord,
  type SessionRecord,
  type UserRecord,
} from "../auth/store"

type AppDatabase = PostgresJsDatabase<typeof schema>

function asDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date from database")
  return date
}

function asOptionalDate(value: Date | string | null): Date | null {
  if (value == null) return null
  return asDate(value)
}

function mapUser(row: typeof users.$inferSelect): UserRecord {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash ?? null,
    emailVerifiedAt: asOptionalDate(row.emailVerifiedAt),
    createdAt: asDate(row.createdAt),
    updatedAt: asDate(row.updatedAt),
    lastLoginAt: asOptionalDate(row.lastLoginAt),
    disabledAt: asOptionalDate(row.disabledAt),
  }
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

export class DrizzleAuthStore implements AuthStore {
  constructor(private readonly db: AppDatabase) {}

  async findUserByEmail(email: string) {
    const [row] = await this.db.select().from(users).where(eq(users.email, email)).limit(1)
    return row ? mapUser(row) : null
  }

  async insertUser(input: { email: string; role: UserRecord["role"]; passwordHash?: string | null }) {
    try {
      const [row] = await this.db
        .insert(users)
        .values({ email: input.email, role: input.role, passwordHash: input.passwordHash ?? null })
        .returning()
      return mapUser(row)
    } catch (error) {
      if (isUniqueViolation(error)) throw new EmailConflictError()
      throw error
    }
  }

  async setUserRole(userId: string, role: UserRecord["role"], at: Date) {
    await this.db.update(users).set({ role, updatedAt: at }).where(eq(users.id, userId))
  }

  async setPasswordHash(userId: string, passwordHash: string, at: Date) {
    await this.db.update(users).set({ passwordHash, updatedAt: at }).where(eq(users.id, userId))
  }

  async markEmailVerified(userId: string, at: Date) {
    await this.db
      .update(users)
      .set({ emailVerifiedAt: at, updatedAt: at })
      .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
  }

  async setDisabled(userId: string, at: Date | null) {
    await this.db
      .update(users)
      .set({ disabledAt: at, updatedAt: at ?? new Date() })
      .where(eq(users.id, userId))
  }

  async markLogin(userId: string, at: Date) {
    await this.db.update(users).set({ lastLoginAt: at, updatedAt: at }).where(eq(users.id, userId))
  }

  async ensureProfile(
    userId: string,
    email: string,
    names?: { firstName?: string; lastName?: string },
  ) {
    const firstName = names?.firstName ?? ""
    const lastName = names?.lastName ?? ""
    await this.db
      .insert(customerProfiles)
      .values({ userId, billingEmail: email, firstName, lastName })
      .onConflictDoNothing({ target: customerProfiles.userId })
    if (firstName || lastName) {
      await this.db
        .update(customerProfiles)
        .set({
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(customerProfiles.userId, userId))
    }
  }

  async deleteOpenMagicLinks(email: string) {
    await this.db
      .delete(magicLinks)
      .where(and(eq(magicLinks.email, email), isNull(magicLinks.consumedAt)))
  }

  async insertMagicLink(input: { email: string; tokenHash: string; expiresAt: Date }) {
    await this.db.insert(magicLinks).values(input)
  }

  async deleteMagicLinkByHash(tokenHash: string) {
    await this.db.delete(magicLinks).where(eq(magicLinks.tokenHash, tokenHash))
  }

  async consumeMagicLink(tokenHash: string, at: Date): Promise<MagicLinkRecord | null> {
    const [row] = await this.db
      .update(magicLinks)
      .set({ consumedAt: at })
      .where(
        and(
          eq(magicLinks.tokenHash, tokenHash),
          isNull(magicLinks.consumedAt),
          gt(magicLinks.expiresAt, at),
        ),
      )
      .returning()
    if (!row) return null
    return {
      email: row.email,
      tokenHash: row.tokenHash,
      expiresAt: asDate(row.expiresAt),
      consumedAt: asOptionalDate(row.consumedAt),
    }
  }

  async createSession(input: {
    userId: string
    secretHash: string
    expiresAt: Date
    absoluteExpiresAt: Date
    lastSeenAt: Date
    mfaVerifiedAt: Date | null
    createdAt: Date
  }) {
    await this.db.insert(sessions).values(input)
  }

  async findSession(secretHash: string): Promise<SessionRecord | null> {
    const [row] = await this.db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.secretHash, secretHash))
      .limit(1)
    if (!row) return null
    return {
      secretHash: row.session.secretHash,
      user: mapUser(row.user),
      expiresAt: asDate(row.session.expiresAt),
      absoluteExpiresAt: asDate(row.session.absoluteExpiresAt),
      lastSeenAt: asDate(row.session.lastSeenAt),
      revokedAt: asOptionalDate(row.session.revokedAt),
      mfaVerifiedAt: asOptionalDate(row.session.mfaVerifiedAt),
    }
  }

  async revokeSession(secretHash: string, at: Date) {
    await this.db
      .update(sessions)
      .set({ revokedAt: at })
      .where(and(eq(sessions.secretHash, secretHash), isNull(sessions.revokedAt)))
  }

  async revokeUserSessions(userId: string, at: Date) {
    await this.db
      .update(sessions)
      .set({ revokedAt: at })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
  }

  async touchSession(secretHash: string, expiresAt: Date, lastSeenAt: Date) {
    await this.db.update(sessions).set({ expiresAt, lastSeenAt }).where(eq(sessions.secretHash, secretHash))
  }

  async savePendingTotp(userId: string, secretCiphertext: string) {
    await this.db
      .insert(adminTotp)
      .values({ userId, secretCiphertext, confirmedAt: null })
      .onConflictDoUpdate({
        target: adminTotp.userId,
        set: { secretCiphertext, confirmedAt: null },
      })
  }

  async getTotp(userId: string) {
    const [row] = await this.db.select().from(adminTotp).where(eq(adminTotp.userId, userId)).limit(1)
    if (!row) return null
    return {
      secretCiphertext: row.secretCiphertext,
      confirmedAt: asOptionalDate(row.confirmedAt),
    }
  }

  async confirmTotp(userId: string, at: Date) {
    await this.db.update(adminTotp).set({ confirmedAt: at }).where(eq(adminTotp.userId, userId))
  }

  async replaceRecoveryCodes(userId: string, codeHashes: string[]) {
    await this.db.transaction(async (tx) => {
      await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))
      if (codeHashes.length === 0) return
      await tx.insert(recoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })))
    })
  }

  async consumeRecoveryCode(userId: string, codeHash: string, at: Date) {
    const rows = await this.db
      .update(recoveryCodes)
      .set({ usedAt: at })
      .where(
        and(
          eq(recoveryCodes.userId, userId),
          eq(recoveryCodes.codeHash, codeHash),
          isNull(recoveryCodes.usedAt),
        ),
      )
      .returning({ id: recoveryCodes.id })
    return rows.length === 1
  }

  async createProject(userId: string, name: string, at: Date) {
    const [row] = await this.db
      .insert(projects)
      .values({ userId, name, createdAt: at, updatedAt: at })
      .returning()
    return { id: row.id, userId: row.userId, name: row.name, createdAt: asDate(row.createdAt) }
  }

  async listProjects(userId: string) {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      createdAt: asDate(row.createdAt),
    }))
  }

  async listSubscriptions(userId: string) {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      projectId: row.projectId,
      planCode: row.planCode,
      status: row.status,
      billingInterval: row.billingInterval,
      amountCents: row.amountCents,
      currency: row.currency,
      privateOffer: row.privateOffer,
      currentPeriodEnd: asOptionalDate(row.currentPeriodEnd),
    }))
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
      this.db
        .select({ status: payments.status, amountCents: payments.amountCents })
        .from(payments),
      this.db.select({ status: refunds.status, amountCents: refunds.amountCents }).from(refunds),
    ])
    return {
      subscriptions: subscriptionRows,
      invoices: invoiceRows,
      payments: paymentRows,
      refunds: refundRows,
    }
  }

  async countAccounts() {
    const [row] = await this.db
      .select({
        accounts: sql<number>`count(*)::int`,
        admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
        disabled: sql<number>`count(*) filter (where ${users.disabledAt} is not null)::int`,
      })
      .from(users)
    return {
      accounts: Number(row?.accounts ?? 0),
      admins: Number(row?.admins ?? 0),
      disabled: Number(row?.disabled ?? 0),
    }
  }

  async appendAudit(entry: {
    actorUserId: string | null
    action: string
    metadata: Record<string, string | number | boolean | null>
    createdAt: Date
  }) {
    await this.db.insert(auditLogs).values({
      actorUserId: entry.actorUserId,
      action: entry.action,
      metadata: entry.metadata,
      createdAt: entry.createdAt,
    })
  }
}
