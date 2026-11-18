import { randomUUID } from "node:crypto"
import { EmailConflictError, type AuthStore, type UserRecord, type SessionRecord, type MagicLinkRecord, type AuditEntry, type SubscriptionRecord } from "../../auth/store"
import type { BillingInputs } from "../../billing/metrics"
import type { D1Connection, D1Binding } from "./types"
import { date, nullableDate, milliseconds, uuid } from "./codec"

type UserRow = { id: string; email: string; role: UserRecord["role"]; password_hash: string | null; email_verified_at: number | null; created_at: number; updated_at: number; last_login_at: number | null; disabled_at: number | null }
const mapUser = (row: UserRow): UserRecord => ({ id: row.id, email: row.email, role: row.role, passwordHash: row.password_hash ?? null, emailVerifiedAt: nullableDate(row.email_verified_at), createdAt: date(row.created_at), updatedAt: date(row.updated_at), lastLoginAt: nullableDate(row.last_login_at), disabledAt: nullableDate(row.disabled_at) })

/** Parallel implementation of AuthStore. Not selected by the application runtime yet.
 * Construct per request with a primary-first D1 session, never a global singleton.
 */
export class D1AuthStore implements AuthStore {
 constructor(private readonly db: D1Connection) {}
 async findUserByEmail(email: string) {
  const row = await this.db.prepare("SELECT * FROM users WHERE email=?").bind(email).first<UserRow>()
  return row ? mapUser(row) : null
 }
 async insertUser(input: {email: string; role: UserRecord["role"]; passwordHash?: string | null}) {
  const row = await this.db.prepare("INSERT INTO users(id,email,role,password_hash) VALUES(?,?,?,?) ON CONFLICT(email) DO NOTHING RETURNING *").bind(randomUUID(),input.email,input.role,input.passwordHash ?? null).first<UserRow>()
  if (!row) throw new EmailConflictError()
  return mapUser(row)
 }
 async setUserRole(userId: string, role: UserRecord["role"], at: Date) {
  await this.db.prepare("UPDATE users SET role=?,updated_at=? WHERE id=?").bind(role,milliseconds(at),uuid(userId)).run()
 }
 async setPasswordHash(userId: string, passwordHash: string, at: Date) {
  await this.db.prepare("UPDATE users SET password_hash=?,updated_at=? WHERE id=?").bind(passwordHash,milliseconds(at),uuid(userId)).run()
 }
 async markEmailVerified(userId: string, at: Date) {
  await this.db.prepare("UPDATE users SET email_verified_at=?,updated_at=? WHERE id=? AND email_verified_at IS NULL").bind(milliseconds(at),milliseconds(at),uuid(userId)).run()
 }
 async setDisabled(userId: string, at: Date | null) {
  await this.db.prepare("UPDATE users SET disabled_at=?,updated_at=? WHERE id=?").bind(at ? milliseconds(at) : null,milliseconds(at ?? new Date()),uuid(userId)).run()
 }
 async markLogin(userId: string, at: Date) {
  await this.db.prepare("UPDATE users SET last_login_at=?,updated_at=? WHERE id=?").bind(milliseconds(at),milliseconds(at),uuid(userId)).run()
 }
 async ensureProfile(userId: string, email: string, names?: { firstName?: string; lastName?: string }) {
  const firstName = names?.firstName ?? ""
  const lastName = names?.lastName ?? ""
  await this.db.prepare(
   "INSERT INTO customer_profiles(user_id,billing_email,first_name,last_name) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET first_name=CASE WHEN excluded.first_name='' THEN customer_profiles.first_name ELSE excluded.first_name END, last_name=CASE WHEN excluded.last_name='' THEN customer_profiles.last_name ELSE excluded.last_name END",
  ).bind(uuid(userId),email,firstName,lastName).run()
 }
 async deleteOpenMagicLinks(email: string) {
  await this.db.prepare("DELETE FROM magic_links WHERE email=? AND consumed_at IS NULL").bind(email).run()
 }
 async insertMagicLink(input: {email: string; tokenHash: string; expiresAt: Date}) {
  await this.db.prepare("INSERT INTO magic_links(id,email,token_hash,expires_at) VALUES(?,?,?,?)").bind(randomUUID(),input.email,input.tokenHash,milliseconds(input.expiresAt)).run()
 }
 async deleteMagicLinkByHash(tokenHash: string) {
  await this.db.prepare("DELETE FROM magic_links WHERE token_hash=?").bind(tokenHash).run()
 }
 async consumeMagicLink(tokenHash: string, at: Date): Promise<MagicLinkRecord | null> {
  const row = await this.db.prepare("UPDATE magic_links SET consumed_at=? WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING email,token_hash,expires_at,consumed_at").bind(milliseconds(at),tokenHash,milliseconds(at)).first<{email:string;token_hash:string;expires_at:number;consumed_at:number}>()
  return row ? {email:row.email,tokenHash:row.token_hash,expiresAt:date(row.expires_at),consumedAt:date(row.consumed_at)} : null
 }
 async createSession(input: Parameters<AuthStore["createSession"]>[0]) {
  await this.db.prepare("INSERT INTO sessions(id,user_id,secret_hash,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at,created_at) VALUES(?,?,?,?,?,?,?,?)").bind(randomUUID(),uuid(input.userId),input.secretHash,milliseconds(input.expiresAt),milliseconds(input.absoluteExpiresAt),milliseconds(input.lastSeenAt),input.mfaVerifiedAt ? milliseconds(input.mfaVerifiedAt) : null,milliseconds(input.createdAt)).run()
 }
 async findSession(secretHash: string): Promise<SessionRecord | null> {
  type Row = UserRow & { secret_hash:string; expires_at:number; absolute_expires_at:number; last_seen_at:number; revoked_at:number|null; mfa_verified_at:number|null }
  const row = await this.db.prepare("SELECT u.*,s.secret_hash,s.expires_at,s.absolute_expires_at,s.last_seen_at,s.revoked_at,s.mfa_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.secret_hash=?").bind(secretHash).first<Row>()
  return row ? {secretHash:row.secret_hash,user:mapUser(row),expiresAt:date(row.expires_at),absoluteExpiresAt:date(row.absolute_expires_at),lastSeenAt:date(row.last_seen_at),revokedAt:nullableDate(row.revoked_at),mfaVerifiedAt:nullableDate(row.mfa_verified_at)} : null
 }
 async revokeSession(secretHash: string, at: Date) {
  await this.db.prepare("UPDATE sessions SET revoked_at=? WHERE secret_hash=? AND revoked_at IS NULL").bind(milliseconds(at),secretHash).run()
 }
 async revokeUserSessions(userId: string, at: Date) {
  await this.db.prepare("UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL").bind(milliseconds(at),uuid(userId)).run()
 }
 async touchSession(secretHash: string, expiresAt: Date, lastSeenAt: Date) {
  await this.db.prepare("UPDATE sessions SET expires_at=?,last_seen_at=? WHERE secret_hash=?").bind(milliseconds(expiresAt),milliseconds(lastSeenAt),secretHash).run()
 }
 async savePendingTotp(userId: string, secretCiphertext: string) {
  await this.db.prepare("INSERT INTO admin_totp(user_id,secret_ciphertext,confirmed_at) VALUES(?,?,NULL) ON CONFLICT(user_id) DO UPDATE SET secret_ciphertext=excluded.secret_ciphertext,confirmed_at=NULL").bind(uuid(userId),secretCiphertext).run()
 }
 async getTotp(userId: string) {
  const row = await this.db.prepare("SELECT secret_ciphertext,confirmed_at FROM admin_totp WHERE user_id=?").bind(uuid(userId)).first<{secret_ciphertext:string;confirmed_at:number|null}>()
  return row ? {secretCiphertext:row.secret_ciphertext,confirmedAt:nullableDate(row.confirmed_at)} : null
 }
 async confirmTotp(userId: string, at: Date) {
  await this.db.prepare("UPDATE admin_totp SET confirmed_at=? WHERE user_id=?").bind(milliseconds(at),uuid(userId)).run()
 }
 async replaceRecoveryCodes(userId: string, codeHashes: string[]) {
  const statements = [this.db.prepare("DELETE FROM recovery_codes WHERE user_id=?").bind(uuid(userId)),...codeHashes.map(codeHash => this.db.prepare("INSERT INTO recovery_codes(id,user_id,code_hash) VALUES(?,?,?)").bind(randomUUID(),uuid(userId),codeHash))]
  // A duplicate hash or FK failure rolls back the DELETE as well as all INSERTs.
  await this.db.batch(statements)
 }
 async consumeRecoveryCode(userId: string, codeHash: string, at: Date) {
  const row = await this.db.prepare("UPDATE recovery_codes SET used_at=? WHERE user_id=? AND code_hash=? AND used_at IS NULL RETURNING id").bind(milliseconds(at),uuid(userId),codeHash).first<{id:string}>()
  return row !== null
 }
 async createProject(userId: string, name: string, at: Date) {
  const row = await this.db.prepare("INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?) RETURNING id,user_id,name,created_at").bind(randomUUID(),uuid(userId),name,milliseconds(at),milliseconds(at)).first<{id:string;user_id:string;name:string;created_at:number}>()
  if (!row) throw new Error("Project insert failed")
  return {id:row.id,userId:row.user_id,name:row.name,createdAt:date(row.created_at)}
 }
 async listProjects(userId: string) {
  const {results} = await this.db.prepare("SELECT id,user_id,name,created_at FROM projects WHERE user_id=? ORDER BY created_at DESC").bind(uuid(userId)).all<{id:string;user_id:string;name:string;created_at:number}>()
  return results.map(row=>({id:row.id,userId:row.user_id,name:row.name,createdAt:date(row.created_at)}))
 }
 async listSubscriptions(userId: string): Promise<SubscriptionRecord[]> {
  type Row = {id:string;user_id:string;project_id:string|null;plan_code:string;status:string;billing_interval:SubscriptionRecord["billingInterval"];amount_cents:number;currency:string;private_offer:0|1;current_period_end:number|null}
  const {results} = await this.db.prepare("SELECT id,user_id,project_id,plan_code,status,billing_interval,amount_cents,currency,private_offer,current_period_end FROM subscriptions WHERE user_id=? ORDER BY created_at DESC").bind(uuid(userId)).all<Row>()
  return results.map(row=>({id:row.id,userId:row.user_id,projectId:row.project_id,planCode:row.plan_code,status:row.status,billingInterval:row.billing_interval,amountCents:row.amount_cents,currency:row.currency,privateOffer:row.private_offer===1,currentPeriodEnd:nullableDate(row.current_period_end)}))
 }
 async loadBillingInputs(): Promise<BillingInputs> {
  const [subscriptions,invoices,payments,refunds] = await this.db.batch([
   this.db.prepare('SELECT status,amount_cents AS "amountCents",billing_interval AS "billingInterval" FROM subscriptions'),
   this.db.prepare('SELECT status,amount_due_cents AS "amountDueCents",amount_remaining_cents AS "amountRemainingCents" FROM invoices'),
   this.db.prepare('SELECT status,amount_cents AS "amountCents" FROM payments'),
   this.db.prepare('SELECT status,amount_cents AS "amountCents" FROM refunds'),
  ])
  return {subscriptions:subscriptions.results as unknown as BillingInputs["subscriptions"],invoices:invoices.results as unknown as BillingInputs["invoices"],payments:payments.results as unknown as BillingInputs["payments"],refunds:refunds.results as unknown as BillingInputs["refunds"]}
 }
 async countAccounts() {
  const row = await this.db.prepare("SELECT count(*) AS accounts,count(*) FILTER(WHERE role='admin') AS admins,count(*) FILTER(WHERE disabled_at IS NOT NULL) AS disabled FROM users").first<{accounts:number;admins:number;disabled:number}>()
  if (!row) throw new Error("Account aggregate missing")
  return row
 }
 async appendAudit(entry: AuditEntry) {
  await this.db.prepare("INSERT INTO audit_logs(id,actor_user_id,action,metadata,created_at) VALUES(?,?,?,?,?)").bind(randomUUID(),entry.actorUserId === null ? null : uuid(entry.actorUserId),entry.action,JSON.stringify(entry.metadata),milliseconds(entry.createdAt)).run()
 }
}
export function createD1AuthStore(binding: D1Binding) {
 return new D1AuthStore(binding.withSession("first-primary"))
}
