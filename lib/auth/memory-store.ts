import { randomUUID } from "node:crypto"
import type { BillingInputs } from "../billing/metrics"
import type { BillingInterval } from "../shop/plans"
import {
  EmailConflictError,
  type AccountCounts,
  type AuditEntry,
  type AuthStore,
  type MagicLinkRecord,
  type ProjectRecord,
  type SessionRecord,
  type SubscriptionRecord,
  type TotpRecord,
  type UserRecord,
  type UserRole,
} from "./store"

type SessionRow = Omit<SessionRecord, "user"> & { userId: string }

export class MemoryAuthStore implements AuthStore {
  private readonly users = new Map<string, UserRecord>()
  private readonly links: MagicLinkRecord[] = []
  private readonly sessions: SessionRow[] = []
  private readonly projects: ProjectRecord[] = []
  private readonly subscriptions: SubscriptionRecord[] = []
  private readonly totp = new Map<string, TotpRecord>()
  private readonly recovery = new Map<string, Array<{ codeHash: string; usedAt: Date | null }>>()
  private readonly audits: AuditEntry[] = []
  private billing: BillingInputs = {
    subscriptions: [],
    invoices: [],
    payments: [],
    refunds: [],
  }

  seedBilling(input: BillingInputs) {
    this.billing = input
  }

  hasMagicLinkHash(tokenHash: string) {
    return this.links.some((link) => link.tokenHash === tokenHash)
  }

  magicLinkCount() {
    return this.links.length
  }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((user) => user.email === email) ?? null
  }

  async insertUser(input: { email: string; role: UserRole }) {
    if (await this.findUserByEmail(input.email)) throw new EmailConflictError()
    const now = new Date()
    const user: UserRecord = {
      id: randomUUID(),
      email: input.email,
      role: input.role,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      disabledAt: null,
    }
    this.users.set(user.id, user)
    return user
  }

  async setUserRole(userId: string, role: UserRole, at: Date) {
    const user = this.users.get(userId)
    if (!user) return
    user.role = role
    user.updatedAt = at
  }

  async setDisabled(userId: string, at: Date | null) {
    const user = this.users.get(userId)
    if (!user) return
    user.disabledAt = at
    user.updatedAt = at ?? user.updatedAt
  }

  async markLogin(userId: string, at: Date) {
    const user = this.users.get(userId)
    if (!user) return
    user.lastLoginAt = at
    user.updatedAt = at
  }

  async ensureProfile() {}

  async deleteOpenMagicLinks(email: string) {
    for (let index = this.links.length - 1; index >= 0; index -= 1) {
      if (this.links[index].email === email && !this.links[index].consumedAt) this.links.splice(index, 1)
    }
  }

  async insertMagicLink(input: { email: string; tokenHash: string; expiresAt: Date }) {
    this.links.push({ ...input, consumedAt: null })
  }

  async deleteMagicLinkByHash(tokenHash: string) {
    const index = this.links.findIndex((link) => link.tokenHash === tokenHash)
    if (index >= 0) this.links.splice(index, 1)
  }

  async consumeMagicLink(tokenHash: string, at: Date) {
    const link = this.links.find(
      (item) => item.tokenHash === tokenHash && !item.consumedAt && item.expiresAt.getTime() > at.getTime(),
    )
    if (!link) return null
    link.consumedAt = at
    return { ...link }
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
    this.sessions.push({ ...input, revokedAt: null })
  }

  async findSession(secretHash: string) {
    const session = this.sessions.find((item) => item.secretHash === secretHash)
    if (!session) return null
    const user = this.users.get(session.userId)
    if (!user) return null
    return { ...session, user: { ...user } }
  }

  async revokeSession(secretHash: string, at: Date) {
    const session = this.sessions.find((item) => item.secretHash === secretHash)
    if (session && !session.revokedAt) session.revokedAt = at
  }

  async revokeUserSessions(userId: string, at: Date) {
    for (const session of this.sessions) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = at
    }
  }

  async touchSession(secretHash: string, expiresAt: Date, lastSeenAt: Date) {
    const session = this.sessions.find((item) => item.secretHash === secretHash)
    if (!session) return
    session.expiresAt = expiresAt
    session.lastSeenAt = lastSeenAt
  }

  async savePendingTotp(userId: string, secretCiphertext: string) {
    this.totp.set(userId, { secretCiphertext, confirmedAt: null })
  }

  async getTotp(userId: string) {
    const record = this.totp.get(userId)
    return record ? { ...record } : null
  }

  async confirmTotp(userId: string, at: Date) {
    const record = this.totp.get(userId)
    if (record) record.confirmedAt = at
  }

  async replaceRecoveryCodes(userId: string, codeHashes: string[]) {
    this.recovery.set(
      userId,
      codeHashes.map((codeHash) => ({ codeHash, usedAt: null })),
    )
  }

  async consumeRecoveryCode(userId: string, codeHash: string, at: Date) {
    const codes = this.recovery.get(userId) ?? []
    const code = codes.find((item) => item.codeHash === codeHash && !item.usedAt)
    if (!code) return false
    code.usedAt = at
    return true
  }

  async createProject(userId: string, name: string, at: Date) {
    const project: ProjectRecord = { id: randomUUID(), userId, name, createdAt: at }
    this.projects.push(project)
    return project
  }

  async listProjects(userId: string) {
    return this.projects.filter((project) => project.userId === userId).map((project) => ({ ...project }))
  }

  async listSubscriptions(userId: string) {
    return this.subscriptions.filter((subscription) => subscription.userId === userId).map((subscription) => ({ ...subscription }))
  }

  seedSubscription(input: SubscriptionRecord) {
    this.subscriptions.push(input)
  }

  async loadBillingInputs() {
    return this.billing
  }

  async countAccounts(): Promise<AccountCounts> {
    const users = [...this.users.values()]
    return {
      accounts: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      disabled: users.filter((user) => user.disabledAt).length,
    }
  }

  async appendAudit(entry: AuditEntry) {
    this.audits.push(entry)
  }
}
