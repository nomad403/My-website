import { and, desc, eq, gt, gte, isNull, lte, lt, or, sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { hashToken } from "../auth/crypto"
import { monthlyWindow, contractWindow, InterventionError, mayTransition, type Actor, type RequestStatus } from "../interventions/contract"
import type { InterventionStore } from "../interventions/service"
import * as schema from "./schema"
const { users, projects, customerProfiles, subscriptions, invoices, payments,
 interventionRequests: requests, interventionEvents: events, interventionPeriods: periods,
 interventionTimeEntries: entries, interventionOutbox: outbox, auditLogs } = schema
type Db = PostgresJsDatabase<typeof schema>
type Query = Pick<Db, "select" | "insert" | "update">
type RequestRow = typeof requests.$inferSelect
const requestFields = {
 id: requests.id, userId: requests.userId, projectId: requests.projectId, subscriptionId: requests.subscriptionId,
 subject: requests.subject, description: requests.description, category: requests.category, urgency: requests.urgency,
 additionalInfo: requests.additionalInfo, status: requests.status, coverage: requests.coverage,
 createdAt: requests.createdAt, updatedAt: requests.updatedAt,
}
function fail(code: string, status = 409): never { throw new InterventionError(code, status) }
function unique(error: unknown): boolean {
 const seen = new Set<unknown>()
 while (error && typeof error === "object" && !seen.has(error)) {
  seen.add(error)
  if ("code" in error && error.code === "23505") return true
  error = "cause" in error ? error.cause : null
 }
 return false
}
async function quota(db: Query, subscription: typeof subscriptions.$inferSelect, now: Date) {
 const window = contractWindow(subscription, now)
 const anchored = subscription.serviceAnchorAt ? monthlyWindow(subscription.serviceAnchorAt, now) : null
 const [bucket] = anchored ? await db.select().from(periods).where(and(eq(periods.subscriptionId,subscription.id),eq(periods.periodStart,anchored.start))).limit(1) : []
 const base = { included: 0, consumed: bucket?.consumedMinutes ?? 0, remaining: 0, start: bucket?.periodStart ?? null as Date | null, end: bucket?.periodEnd ?? null as Date | null }
 if (window.reason !== "eligible") return { ...base, reason: window.reason }
 const matches = or(eq(invoices.subscriptionId, subscription.id),
  subscription.stripeSubscriptionId ? eq(invoices.serviceSubscriptionId, subscription.stripeSubscriptionId) : undefined)
 const proof = await db.select({ id: invoices.id }).from(invoices).where(and(
  eq(invoices.userId, subscription.userId), matches, eq(invoices.status, "paid"),
  eq(invoices.amountRemainingCents, 0), lte(invoices.servicePeriodStart, now), gt(invoices.servicePeriodEnd, now),
 )).limit(1)
 if (!proof.length) return { ...base, reason: "unverified_payment" }
 const overdue = await db.select({ id: invoices.id }).from(invoices).where(and(
  eq(invoices.userId, subscription.userId), matches, gt(invoices.amountRemainingCents, 0),
  or(eq(invoices.status, "open"), eq(invoices.status, "uncollectible")),
  or(and(lte(invoices.servicePeriodStart, now), gt(invoices.servicePeriodEnd, now)),
   and(isNull(invoices.servicePeriodStart), gte(invoices.issuedAt,subscription.currentPeriodStart ?? now), lte(invoices.issuedAt,now))),
 )).limit(1)
 if (overdue.length) return { ...base, reason: "unpaid" }
 return { included: 60, consumed: bucket?.consumedMinutes ?? 0, remaining: 60 - (bucket?.consumedMinutes ?? 0),
  start: window.start, end: window.end, reason: "eligible" }
}
async function event(db: Query, actor: Actor, row: RequestRow, input: {
 kind: string; body?: string; internal?: boolean; from?: string; to?: string; operationKey: string; payloadHash: string
}, at: Date) {
 const [saved] = await db.insert(events).values({
  requestId: row.id, actorId: actor.id, actorRole: actor.admin ? "admin" : "client", kind: input.kind,
  internal: input.internal ?? false, body: input.body ?? "", fromStatus: input.from, toStatus: input.to,
  operationKey: input.operationKey, payloadHash: input.payloadHash, createdAt: at,
 }).returning({ id: events.id })
 await db.insert(auditLogs).values({ actorUserId: actor.id, action: "intervention." + input.kind,
  metadata: { requestId: row.id, eventId: saved.id, internal: input.internal ?? false }, createdAt: at })
 if (!input.internal) await db.insert(outbox).values({ eventId: saved.id, userId: row.userId,
  audience: actor.admin ? "client" : "admin", createdAt: at })
}
export class DrizzleInterventionStore implements InterventionStore {
 constructor(private readonly db: Db) {}
 async dashboard(actor: Actor, now: Date) {
  const [profile] = await this.db.select({
   firstName: customerProfiles.firstName, lastName: customerProfiles.lastName, email: users.email,
  }).from(users).leftJoin(customerProfiles, eq(customerProfiles.userId, users.id)).where(eq(users.id, actor.id)).limit(1)
  if (!profile) fail("not_found", 404)
  const [owned, sites, bills, receipts] = await Promise.all([
   this.db.select().from(subscriptions).where(eq(subscriptions.userId, actor.id)).orderBy(desc(subscriptions.createdAt)).limit(100),
   this.db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.userId, actor.id)).orderBy(desc(projects.createdAt)).limit(200),
   this.db.select({ id: invoices.id, status: invoices.status, amountDueCents: invoices.amountDueCents,
    amountPaidCents: invoices.amountPaidCents, amountRemainingCents: invoices.amountRemainingCents, issuedAt: invoices.issuedAt,
   }).from(invoices).where(eq(invoices.userId, actor.id)).orderBy(desc(invoices.createdAt)).limit(100),
   this.db.select({ id: payments.id, status: payments.status, amountCents: payments.amountCents, paidAt: payments.paidAt,
   }).from(payments).where(eq(payments.userId, actor.id)).orderBy(desc(payments.createdAt)).limit(100),
  ])
  const contracts = await Promise.all(owned.map(async row => ({
   id: row.id, projectId: row.projectId, planCode: row.planCode, status: row.status,
   amountCents: row.amountCents, currency: row.currency, billingInterval: row.billingInterval,
   currentPeriodStart: row.currentPeriodStart, currentPeriodEnd: row.currentPeriodEnd,
   cancelRequestedAt: row.cancelRequestedAt, cancelEffectiveAt: row.cancelEffectiveAt,
   commercialTerms: row.commercialTerms, quota: await quota(this.db, row, now),
   timeEntries: await this.db.select({ id: entries.id, requestId: entries.requestId, minutes: entries.minutes,
    coverage: entries.coverage, performedAt: entries.performedAt, periodStart: periods.periodStart, periodEnd: periods.periodEnd,
   }).from(entries).leftJoin(periods, eq(periods.id, entries.periodId)).where(eq(entries.subscriptionId, row.id))
    .orderBy(desc(entries.performedAt)).limit(100),
  })))
  return { profile, projects: sites, subscriptions: contracts, invoices: bills, payments: receipts }
 }
 async profile(actor: Actor, input: { firstName: string; lastName: string }) {
  await this.db.transaction(async tx => {
   const [user] = await tx.select({email:users.email}).from(users).where(eq(users.id,actor.id)).limit(1)
   if (!user) fail("not_found",404)
   await tx.insert(customerProfiles).values({userId:actor.id,billingEmail:user.email,...input}).onConflictDoUpdate({target:customerProfiles.userId,set:{...input,updatedAt:new Date()}})
   await tx.insert(auditLogs).values({ actorUserId: actor.id, action: "profile.updated", metadata: {} })
  })
 }
 async list(actor: Actor, offset: number) {
  return this.db.select({ ...requestFields, projectName: projects.name, clientEmail: users.email })
   .from(requests).innerJoin(projects, eq(projects.id, requests.projectId)).innerJoin(users, eq(users.id, requests.userId))
   .where(actor.admin ? undefined : eq(requests.userId, actor.id))
   .orderBy(desc(requests.createdAt), desc(requests.id)).limit(50).offset(offset)
 }
 async create(actor: Actor, input: Record<string, unknown>, now: Date) {
  const payload = {
   projectId: input.projectId as string, subscriptionId: input.subscriptionId as string | null ?? null,
   subject: (input.subject as string).trim(), description: (input.description as string).trim(),
   category: input.category as string, urgency: input.urgency as string, additionalInfo: (input.additionalInfo as string | undefined)?.trim() ?? "",
  }
  const payloadHash = hashToken(JSON.stringify(payload))
  const operationKey = input.operationKey as string
  const repeated = async (db: Query) => {
   const [old] = await db.select().from(requests).where(and(eq(requests.userId, actor.id), eq(requests.submissionKey, operationKey))).limit(1)
   if (old && old.payloadHash !== payloadHash) fail("idempotency_conflict")
   return old
  }
  try {
   return await this.db.transaction(async tx => {
    const existing = await repeated(tx)
    if (existing) return { id: existing.id }
    const [project] = await tx.select().from(projects).where(and(eq(projects.id, payload.projectId), eq(projects.userId, actor.id))).limit(1)
    if (!project) fail("not_found",404)
    if (payload.subscriptionId) {
     const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.id,payload.subscriptionId),eq(subscriptions.userId,actor.id))).limit(1)
     if (!sub || (sub.projectId && sub.projectId !== project.id)) fail("not_found",404)
    }
    const [row] = await tx.insert(requests).values({ ...payload, userId: actor.id, submissionKey: operationKey,
     payloadHash, createdAt: now, updatedAt: now }).returning()
    await event(tx, actor, row, { kind: "created", to: "submitted", operationKey, payloadHash }, now)
    return { id: row.id }
   })
  } catch (error) {
   if (unique(error)) { const existing = await repeated(this.db); if (existing) return { id: existing.id } }
   throw error
  }
 }
 async detail(actor: Actor, id: string, offset: number, now = new Date()) {
  const [row] = await this.db.select({ ...requestFields, projectName: projects.name }).from(requests)
   .innerJoin(projects,eq(projects.id,requests.projectId))
   .where(and(eq(requests.id,id),actor.admin ? undefined : eq(requests.userId,actor.id))).limit(1)
  if (!row) fail("not_found",404)
  const messages = await this.db.select({ id: events.id, actorId: events.actorId, actorRole: events.actorRole, kind: events.kind,
   body: events.body, internal: events.internal, fromStatus: events.fromStatus, toStatus: events.toStatus, createdAt: events.createdAt,
  }).from(events).where(and(eq(events.requestId,id), actor.admin ? undefined : eq(events.internal,false)))
   .orderBy(desc(events.sequence)).limit(100).offset(offset)
  const time = await this.db.select({ minutes: entries.minutes, coverage: entries.coverage, performedAt: entries.performedAt })
   .from(entries).where(eq(entries.requestId,id)).limit(1)
  const [sub] = row.subscriptionId ? await this.db.select().from(subscriptions).where(and(eq(subscriptions.id,row.subscriptionId),eq(subscriptions.userId,row.userId))).limit(1) : []
  const contract = sub ? {planCode:sub.planCode,amountCents:sub.amountCents,billingInterval:sub.billingInterval,quota:await quota(this.db,sub,now)} : null
  return { ...row, contract, events: messages, time: time[0] ?? null, offset, hasMore: messages.length === 100 }
 }
 async mutate(actor: Actor, id: string, operation: "message" | "transition" | "complete", input: Record<string, unknown>, now: Date) {
  const payloadHash = hashToken(JSON.stringify([operation,input.body??"",input.status??null,input.coverage??null,input.minorScopeConfirmed??false,input.minutes??null,input.performedAt??null,input.internal??false]))
  await this.db.transaction(async tx => {
   const [row] = await tx.select().from(requests).where(and(eq(requests.id,id),actor.admin ? undefined : eq(requests.userId,actor.id))).limit(1).for("update")
   if (!row) fail("not_found",404)
   const [prior] = await tx.select().from(events).where(and(eq(events.requestId,id),eq(events.actorId,actor.id),eq(events.operationKey,input.operationKey as string))).limit(1)
   if (prior) { if (prior.payloadHash !== payloadHash) fail("idempotency_conflict"); return }
   const common = { operationKey: input.operationKey as string, payloadHash, body: (input.body as string | undefined)?.trim() ?? "" }
   if (operation === "message") {
    if (["completed","cancelled","rejected"].includes(row.status)) fail("request_closed")
    if (input.internal && !actor.admin) fail("forbidden",403)
    await event(tx,actor,row,{...common,kind:"message",internal:input.internal as boolean | undefined},now)
    await tx.update(requests).set({updatedAt:now}).where(eq(requests.id,id))
   } else if (operation === "transition") {
    const next = input.status as RequestStatus
    if (!mayTransition(row.status as RequestStatus,next,actor.admin)) fail("invalid_transition")
    if (next !== "accepted" && input.coverage !== undefined) fail("immutable")
    let coverage = row.coverage
    if (next === "accepted") {
     if (!actor.admin || !["included","outside"].includes(input.coverage as string)) fail("invalid",400)
     coverage = input.coverage as string
     if (coverage === "included") {
      if (input.minorScopeConfirmed !== true || !row.subscriptionId) fail("scope_required")
      const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.id,row.subscriptionId),eq(subscriptions.userId,row.userId))).limit(1).for("update")
      if (!sub || (sub.projectId && sub.projectId !== row.projectId) || (await quota(tx,sub,now)).reason !== "eligible") fail("quota_unavailable")
      if (!sub.projectId) await tx.update(subscriptions).set({projectId:row.projectId}).where(eq(subscriptions.id,sub.id))
     } else if (!common.body) fail("explanation_required")
    }
    await tx.update(requests).set({ status:next,coverage,minorScopeConfirmed:next==="accepted" ? input.minorScopeConfirmed===true : row.minorScopeConfirmed,updatedAt:now }).where(eq(requests.id,id))
    await event(tx,actor,row,{...common,kind:"status",from:row.status,to:next},now)
   } else {
    if (!actor.admin) fail("forbidden",403)
    if (!mayTransition(row.status as RequestStatus,"completed",true)) fail("invalid_transition")
    const performed = input.performedAt ? new Date(input.performedAt as string) : now
    if (performed > now || performed < row.createdAt) fail("invalid_performed_at",400)
    let periodId: string | null = null
    if (row.coverage === "included") {
     if (!row.subscriptionId || !row.minorScopeConfirmed) fail("quota_unavailable")
     const [sub] = await tx.select().from(subscriptions).where(and(eq(subscriptions.id,row.subscriptionId),eq(subscriptions.userId,row.userId))).limit(1).for("update")
     if (!sub || (sub.projectId && sub.projectId !== row.projectId)) fail("quota_unavailable")
     const q = await quota(tx,sub,now)
     if (q.reason !== "eligible" || !q.start || !q.end) fail("quota_unavailable")
     if (performed < q.start || performed >= q.end || (sub.currentPeriodStart && performed < sub.currentPeriodStart)) fail("outside_period")
     await tx.insert(periods).values({subscriptionId:sub.id,periodStart:q.start,periodEnd:q.end}).onConflictDoNothing()
     const [bucket] = await tx.update(periods).set({consumedMinutes:sql`${periods.consumedMinutes} + ${input.minutes as number}`})
      .where(and(eq(periods.subscriptionId,sub.id),eq(periods.periodStart,q.start),lte(sql`${periods.consumedMinutes} + ${input.minutes as number}`,60))).returning({id:periods.id})
     if (!bucket) fail("quota_exceeded")
     periodId = bucket.id
    } else if (row.coverage !== "outside") fail("scope_required")
    await tx.insert(entries).values({requestId:id,subscriptionId:row.subscriptionId,periodId,actorId:actor.id,
     minutes:input.minutes as number,coverage:row.coverage,performedAt:performed,createdAt:now})
    await tx.update(requests).set({status:"completed",updatedAt:now}).where(eq(requests.id,id))
    await event(tx,actor,row,{...common,kind:"time",from:row.status,to:"completed"},now)
   }
  })
 }
}
