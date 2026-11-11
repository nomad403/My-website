import type { BillingInputs } from "../billing/metrics"
import type { BillingInterval } from "../shop/plans"

export class EmailConflictError extends Error {
  readonly code = "email_conflict"
}

export type UserRole = "client" | "admin"

export type UserRecord = {
  id: string
  email: string
  role: UserRole
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  disabledAt: Date | null
}

export type SessionRecord = {
  secretHash: string
  user: UserRecord
  expiresAt: Date
  absoluteExpiresAt: Date
  lastSeenAt: Date
  revokedAt: Date | null
  mfaVerifiedAt: Date | null
}

export type MagicLinkRecord = {
  email: string
  tokenHash: string
  expiresAt: Date
  consumedAt: Date | null
}

export type ProjectRecord = {
  id: string
  userId: string
  name: string
  createdAt: Date
}

export type SubscriptionRecord = {
  id: string
  userId: string
  projectId: string | null
  planCode: string
  status: string
  billingInterval: BillingInterval
  amountCents: number
  currency: string
  privateOffer: boolean
  currentPeriodEnd: Date | null
}

export type TotpRecord = {
  secretCiphertext: string
  confirmedAt: Date | null
}

export type AccountCounts = {
  accounts: number
  admins: number
  disabled: number
}

export type AuditEntry = {
  actorUserId: string | null
  action: string
  metadata: Record<string, string | number | boolean | null>
  createdAt: Date
}

export interface AuthStore {
  findUserByEmail(email: string): Promise<UserRecord | null>
  insertUser(input: { email: string; role: UserRole }): Promise<UserRecord>
  setUserRole(userId: string, role: UserRole, at: Date): Promise<void>
  setDisabled(userId: string, at: Date | null): Promise<void>
  markLogin(userId: string, at: Date): Promise<void>
  ensureProfile(userId: string, email: string): Promise<void>
  deleteOpenMagicLinks(email: string): Promise<void>
  insertMagicLink(input: { email: string; tokenHash: string; expiresAt: Date }): Promise<void>
  deleteMagicLinkByHash(tokenHash: string): Promise<void>
  consumeMagicLink(tokenHash: string, at: Date): Promise<MagicLinkRecord | null>
  createSession(input: {
    userId: string
    secretHash: string
    expiresAt: Date
    absoluteExpiresAt: Date
    lastSeenAt: Date
    mfaVerifiedAt: Date | null
    createdAt: Date
  }): Promise<void>
  findSession(secretHash: string): Promise<SessionRecord | null>
  revokeSession(secretHash: string, at: Date): Promise<void>
  revokeUserSessions(userId: string, at: Date): Promise<void>
  touchSession(secretHash: string, expiresAt: Date, lastSeenAt: Date): Promise<void>
  savePendingTotp(userId: string, secretCiphertext: string): Promise<void>
  getTotp(userId: string): Promise<TotpRecord | null>
  confirmTotp(userId: string, at: Date): Promise<void>
  replaceRecoveryCodes(userId: string, codeHashes: string[]): Promise<void>
  consumeRecoveryCode(userId: string, codeHash: string, at: Date): Promise<boolean>
  createProject(userId: string, name: string, at: Date): Promise<ProjectRecord>
  listProjects(userId: string): Promise<ProjectRecord[]>
  listSubscriptions(userId: string): Promise<SubscriptionRecord[]>
  loadBillingInputs(): Promise<BillingInputs>
  countAccounts(): Promise<AccountCounts>
  appendAudit(entry: AuditEntry): Promise<void>
}
