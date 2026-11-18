import { and, desc, eq, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { PromotionAdminStore, PromotionInput } from "../billing/promotion-admin"
import * as schema from "./schema"
const { promotionCodes: codes, promotionRedemptions: redemptions, subscriptions, users, auditLogs } = schema

export class DrizzlePromotionAdminStore implements PromotionAdminStore {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}
  async create(input: PromotionInput) {
    try {
      const [row] = await this.db.insert(codes).values({
        codeHash: input.codeHash, codeHint: input.codeHint, planCode: input.planCode,
        expiresAt: input.expiresAt, maxRedemptions: input.maxRedemptions,
        restrictedEmail: input.restrictedEmail, usageTerms: input.usageTerms,
        internalNotes: input.internalNotes, createdBy: input.actorId, changedBy: input.actorId,
      }).returning({ id: codes.id })
      return row
    } catch (error) {
      let current: unknown = error
      const seen = new Set<unknown>()
      while (current && typeof current === "object" && !seen.has(current)) {
        seen.add(current)
        if ("code" in current && current.code === "23505") return null
        current = "cause" in current ? current.cause : null
      }
      throw error
    }
  }
  async list(limit: number, offset: number) {
    return this.db.select({
      id: codes.id, codeHint: codes.codeHint, planCode: codes.planCode, createdAt: codes.createdAt,
      expiresAt: codes.expiresAt, disabledAt: codes.disabledAt, maxRedemptions: codes.maxRedemptions,
      restrictedEmail: codes.restrictedEmail, usageTerms: codes.usageTerms, internalNotes: codes.internalNotes,
      consumed: sql<number>`(select count(*)::int from promotion_redemptions r where r.promotion_code_id = promotion_codes.id and r.status = 'consumed')`,
      reserved: sql<number>`(select count(*)::int from promotion_redemptions r where r.promotion_code_id = promotion_codes.id and r.status = 'reserved')`,
    }).from(codes).orderBy(desc(codes.createdAt), desc(codes.id)).limit(limit).offset(offset)
  }
  async detail(id: string, offset = 0) {
    const [row] = await this.db.select({
      id: codes.id, codeHint: codes.codeHint, planCode: codes.planCode, createdAt: codes.createdAt,
      usageTerms: codes.usageTerms, internalNotes: codes.internalNotes,
    }).from(codes).where(eq(codes.id, id)).limit(1)
    if (!row) return null
    const [reservations, history] = await Promise.all([
      this.db.select({ id: redemptions.id, status: redemptions.status, createdAt: redemptions.createdAt,
        updatedAt: redemptions.updatedAt, email: users.email, subscriptionId: subscriptions.id,
        subscriptionStatus: subscriptions.status, amountCents: subscriptions.amountCents,
        commercialTerms: subscriptions.commercialTerms,
      }).from(redemptions).innerJoin(users, eq(users.id, redemptions.userId))
        .leftJoin(subscriptions, eq(subscriptions.promotionRedemptionId, redemptions.id))
        .where(eq(redemptions.promotionCodeId, id)).orderBy(desc(redemptions.createdAt), desc(redemptions.id)).limit(200).offset(offset),
      this.db.select({ id: auditLogs.id, action: auditLogs.action, createdAt: auditLogs.createdAt,
        actorId: auditLogs.actorUserId, redemptionId: sql<string | null>`${auditLogs.metadata}->>'redemptionId'`,
      }).from(auditLogs).where(sql`${auditLogs.metadata}->>'promotionId' = ${id}`)
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(200).offset(offset),
    ])
    return { ...row, reservations, history, offset, hasMore: reservations.length === 200 || history.length === 200, legacy: row.codeHint === null }
  }
  async change(id: string, actorId: string, input: { disable?: true; internalNotes?: string }) {
    return this.db.transaction(async tx => {
      const [row] = await tx.select().from(codes).where(eq(codes.id, id)).for("update").limit(1)
      if (!row) return false
      await tx.update(codes).set({
        changedBy: actorId,
        ...(input.disable && !row.disabledAt ? { disabledAt: new Date() } : {}),
        ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      }).where(and(eq(codes.id, id)))
      return true
    })
  }
}
