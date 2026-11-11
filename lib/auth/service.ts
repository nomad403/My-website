import { randomBytes } from "node:crypto"
import { summarizeBilling } from "../billing/metrics"
import {
  decryptBytes,
  encryptBytes,
  hashToken,
  mac,
  normalizeRecoveryCode,
  randomRecoveryCode,
  randomToken,
} from "./crypto"
import { openSessionCookie, sealSessionCookie } from "./cookie"
import { normalizeEmail } from "./email"
import type { RateLimiter } from "./rate-limit"
import { EmailConflictError, type AuthStore, type UserRecord } from "./store"
import { encodeBase32, otpauthUrl, verifyTotp } from "./totp"

export type AuthEnv = {
  authSecret: string
  appUrl: string
  adminEmails: Set<string>
  mfaKey: Buffer | null
  secureCookies: boolean
}

export type Mailer = {
  configured: boolean
  sendMagicLink(to: string, url: string): Promise<void>
}

export type AuthDeps = {
  store: AuthStore
  limiter: RateLimiter
  mailer: Mailer
  env: AuthEnv
  now: () => Date
}

export type AuthCookie = { value: string; maxAge: number }

export type ServiceResult = {
  status: number
  body: Record<string, unknown>
  cookie?: AuthCookie | { clear: true }
  redirectPath?: string
  retryAfter?: number
}

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000
const SESSION_SLIDING_MS = 14 * 24 * 60 * 60 * 1000
const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000
const SLIDE_AFTER_MS = 12 * 60 * 60 * 1000
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/

export function readAuthEnv(source: NodeJS.ProcessEnv = process.env): AuthEnv | null {
  const authSecret = source.AUTH_SECRET ?? ""
  if (authSecret.length < 32 || !source.APP_URL) return null
  let appUrl: URL
  try {
    appUrl = new URL(source.APP_URL)
  } catch {
    return null
  }
  if (source.NODE_ENV === "production" && appUrl.protocol !== "https:") return null
  const adminEmails = new Set(
    (source.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
  const mfaKey = source.AUTH_MFA_KEY ? Buffer.from(source.AUTH_MFA_KEY, "base64") : null
  return {
    authSecret,
    appUrl: appUrl.origin,
    adminEmails,
    mfaKey: mfaKey?.length === 32 ? mfaKey : null,
    secureCookies: source.NODE_ENV === "production",
  }
}

function normalizeProjectName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim()
  if (name.length < 2 || name.length > 80 || /[<>]/.test(name)) return null
  return name
}

function fail(status: number, code: string, error: string, retryAfter?: number): ServiceResult {
  return {
    status,
    body: { ok: false, error, code },
    ...(retryAfter ? { retryAfter } : {}),
  }
}

export function assessAccess(input: {
  role: UserRecord["role"]
  area: "account" | "admin"
  totpConfirmed: boolean
  mfaVerified: boolean
}): { ok: true } | { ok: false; status: number; code: string; message: string } {
  if (input.area === "account") return { ok: true }
  if (input.role !== "admin") {
    return { ok: false, status: 403, code: "forbidden", message: "Accès administrateur requis." }
  }
  if (!input.totpConfirmed) {
    return {
      ok: false,
      status: 403,
      code: "mfa_enrollment_required",
      message: "Activez le second facteur.",
    }
  }
  if (!input.mfaVerified) {
    return { ok: false, status: 403, code: "mfa_required", message: "Second facteur requis." }
  }
  return { ok: true }
}

type ActiveSession = {
  sessionId: string
  secretHash: string
  user: UserRecord
  mfaVerifiedAt: Date | null
  totpConfirmed: boolean
}

export function createAuthService(deps: AuthDeps) {
  async function audit(
    action: string,
    actorUserId: string | null,
    metadata: Record<string, string | number | boolean | null> = {},
  ) {
    try {
      await deps.store.appendAudit({ action, actorUserId, metadata, createdAt: deps.now() })
    } catch {
      console.error("[auth] audit failed")
    }
  }

  async function consumeLimit(key: string, limit: number, windowSeconds: number) {
    try {
      const decision = await deps.limiter.consume(key, limit, windowSeconds)
      if (decision.allowed) return null
      const retryAfter = Math.max(1, decision.retryAfter)
      return fail(429, "rate_limited", "Trop de demandes. Réessayez plus tard.", retryAfter)
    } catch {
      return fail(503, "unavailable", "Service temporairement indisponible.")
    }
  }

  async function issueSession(userId: string, mfa: boolean): Promise<AuthCookie> {
    const now = deps.now()
    const sessionId = randomToken()
    const absolute = new Date(now.getTime() + SESSION_ABSOLUTE_MS)
    await deps.store.createSession({
      userId,
      secretHash: hashToken(sessionId),
      expiresAt: new Date(Math.min(now.getTime() + SESSION_SLIDING_MS, absolute.getTime())),
      absoluteExpiresAt: absolute,
      lastSeenAt: now,
      mfaVerifiedAt: mfa ? now : null,
      createdAt: now,
    })
    return {
      value: await sealSessionCookie(
        {
          sessionId,
          absoluteExpiresAt: Math.floor(absolute.getTime() / 1000),
          mfa: mfa ? 1 : 0,
        },
        deps.env.authSecret,
      ),
      maxAge: Math.floor(SESSION_ABSOLUTE_MS / 1000),
    }
  }

  async function withdrawAdmin(user: UserRecord): Promise<boolean> {
    if (user.role !== "admin" || deps.env.adminEmails.has(user.email)) return false
    const now = deps.now()
    await deps.store.revokeUserSessions(user.id, now)
    await deps.store.setUserRole(user.id, "client", now)
    await audit("role.revoked", user.id)
    return true
  }

  async function authenticate(cookieValue: string | null): Promise<ActiveSession | null> {
    if (!cookieValue) return null
    const opened = await openSessionCookie(cookieValue, deps.env.authSecret)
    if (!opened) return null
    const now = deps.now()
    if (opened.absoluteExpiresAt * 1000 <= now.getTime()) return null
    const row = await deps.store.findSession(hashToken(opened.sessionId))
    if (!row || row.revokedAt || row.user.disabledAt) return null
    if (row.expiresAt.getTime() <= now.getTime() || row.absoluteExpiresAt.getTime() <= now.getTime()) {
      return null
    }
    if (await withdrawAdmin(row.user)) return null
    if (now.getTime() - row.lastSeenAt.getTime() >= SLIDE_AFTER_MS) {
      const nextExpires = new Date(
        Math.min(now.getTime() + SESSION_SLIDING_MS, row.absoluteExpiresAt.getTime()),
      )
      await deps.store.touchSession(row.secretHash, nextExpires, now)
    }
    const totp = row.user.role === "admin" ? await deps.store.getTotp(row.user.id) : null
    return {
      sessionId: opened.sessionId,
      secretHash: row.secretHash,
      user: row.user,
      mfaVerifiedAt: row.mfaVerifiedAt,
      totpConfirmed: Boolean(totp?.confirmedAt),
    }
  }

  async function requireSession(
    cookieValue: string | null,
    area: "account" | "admin",
  ): Promise<{ ok: true; session: ActiveSession } | { ok: false; error: ServiceResult }> {
    const session = await authenticate(cookieValue)
    if (!session) return { ok: false, error: fail(401, "auth_required", "Authentification requise.") }
    const decision = assessAccess({
      role: session.user.role,
      area,
      totpConfirmed: session.totpConfirmed,
      mfaVerified: Boolean(session.mfaVerifiedAt),
    })
    if (!decision.ok) return { ok: false, error: fail(decision.status, decision.code, decision.message) }
    return { ok: true, session }
  }

  return {
    async requestMagicLink(input: { email: unknown; ip: string | null }): Promise<ServiceResult> {
      const email = normalizeEmail(input.email)
      if (!email) return fail(400, "email_invalid", "Indiquez une adresse e-mail valide.")
      if (!deps.mailer.configured || !input.ip) {
        return fail(503, "unavailable", "Service temporairement indisponible.")
      }
      const limited = await consumeLimit(`magic:email:${mac(email, deps.env.authSecret)}`, 5, 3600)
      if (limited) return limited
      const ipLimited = await consumeLimit(`magic:ip:${mac(input.ip, deps.env.authSecret)}`, 20, 3600)
      if (ipLimited) return ipLimited

      const existing = await deps.store.findUserByEmail(email)
      if (existing?.disabledAt) {
        await audit("magic_link.blocked", existing.id)
        return { status: 200, body: { ok: true } }
      }

      const token = randomToken()
      const tokenHash = hashToken(token)
      const expiresAt = new Date(deps.now().getTime() + MAGIC_LINK_TTL_MS)
      await deps.store.deleteOpenMagicLinks(email)
      await deps.store.insertMagicLink({ email, tokenHash, expiresAt })
      try {
        await deps.mailer.sendMagicLink(email, `${deps.env.appUrl}/auth/verify?token=${encodeURIComponent(token)}`)
      } catch {
        await deps.store.deleteMagicLinkByHash(tokenHash)
        return fail(503, "unavailable", "Service temporairement indisponible.")
      }
      await audit("magic_link.issued", existing?.id ?? null)
      return { status: 200, body: { ok: true } }
    },

    async verifyMagicLink(input: { token: unknown; ip: string | null }): Promise<ServiceResult> {
      if (!input.ip) return fail(503, "unavailable", "Service temporairement indisponible.")
      const limited = await consumeLimit(`verify:ip:${mac(input.ip, deps.env.authSecret)}`, 30, 900)
      if (limited) return limited
      const token = typeof input.token === "string" && TOKEN_RE.test(input.token) ? input.token : ""
      const link = token ? await deps.store.consumeMagicLink(hashToken(token), deps.now()) : null
      if (!link) return fail(400, "link_invalid", "Lien invalide ou expiré.")

      let user = await deps.store.findUserByEmail(link.email)
      if (!user) {
        try {
          user = await deps.store.insertUser({ email: link.email, role: "client" })
        } catch (error) {
          if (!(error instanceof EmailConflictError)) throw error
          user = await deps.store.findUserByEmail(link.email)
        }
      }
      if (!user || user.disabledAt) return fail(400, "link_invalid", "Lien invalide ou expiré.")

      if (await withdrawAdmin(user)) user = { ...user, role: "client" }

      if (user.role === "client" && deps.env.adminEmails.has(user.email)) {
        await deps.store.setUserRole(user.id, "admin", deps.now())
        user = { ...user, role: "admin" }
        await audit("role.promoted", user.id)
      }

      await deps.store.ensureProfile(user.id, user.email)
      await deps.store.markLogin(user.id, deps.now())
      const cookie = await issueSession(user.id, false)
      await audit("session.created", user.id, { mfa: false })
      return {
        status: 200,
        body: { ok: true, role: user.role },
        cookie,
        redirectPath: user.role === "admin" ? "/auth/mfa" : "/shop?section=account&auth=signed-in",
      }
    },

    async logout(cookieValue: string | null): Promise<ServiceResult> {
      const session = await authenticate(cookieValue)
      if (session) {
        await deps.store.revokeSession(session.secretHash, deps.now())
        await audit("session.revoked", session.user.id)
      }
      return { status: 200, body: { ok: true }, cookie: { clear: true } }
    },

    async sessionState(cookieValue: string | null): Promise<ServiceResult> {
      const session = await authenticate(cookieValue)
      if (!session) return { status: 200, body: { ok: true, authenticated: false } }
      return {
        status: 200,
        body: {
          ok: true,
          authenticated: true,
          email: session.user.email,
          role: session.user.role,
          mfa: Boolean(session.mfaVerifiedAt),
          totpEnabled: session.totpConfirmed,
        },
      }
    },

    async enrollMfa(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "account")
      if (!gate.ok) return gate.error
      if (gate.session.user.role !== "admin") {
        return fail(403, "forbidden", "Accès administrateur requis.")
      }
      if (!deps.env.mfaKey) return fail(503, "mfa_unconfigured", "Second facteur non configuré.")
      const limited = await consumeLimit(`enroll:${gate.session.user.id}`, 5, 3600)
      if (limited) return limited
      if (gate.session.totpConfirmed) {
        return fail(409, "mfa_already_enabled", "Le second facteur est déjà actif.")
      }

      const secret = randomBytes(20)
      const recoveryCodes = Array.from({ length: 8 }, () => randomRecoveryCode())
      await deps.store.savePendingTotp(
        gate.session.user.id,
        encryptBytes(secret, deps.env.mfaKey),
      )
      await deps.store.replaceRecoveryCodes(
        gate.session.user.id,
        recoveryCodes.map((code) => hashToken(normalizeRecoveryCode(code) ?? code)),
      )
      await audit("mfa.enrolled", gate.session.user.id)
      const encoded = encodeBase32(secret)
      return {
        status: 200,
        body: {
          ok: true,
          secret: encoded,
          otpauthUrl: otpauthUrl(gate.session.user.email, encoded),
          recoveryCodes,
        },
      }
    },

    async verifyMfa(input: { cookieValue: string | null; code: unknown }): Promise<ServiceResult> {
      const gate = await requireSession(input.cookieValue, "account")
      if (!gate.ok) return gate.error
      if (gate.session.user.role !== "admin") {
        return fail(403, "forbidden", "Accès administrateur requis.")
      }
      const limited = await consumeLimit(`mfa:${gate.session.secretHash}`, 8, 900)
      if (limited) return limited
      const totp = await deps.store.getTotp(gate.session.user.id)
      if (!totp || !deps.env.mfaKey) {
        return fail(403, "mfa_enrollment_required", "Activez le second facteur.")
      }
      const secret = decryptBytes(totp.secretCiphertext, deps.env.mfaKey)
      const code = typeof input.code === "string" ? input.code.trim() : ""
      const totpValid = Boolean(secret && verifyTotp(secret, code, deps.now().getTime()))
      const normalized = normalizeRecoveryCode(code)
      const recoveryValid =
        !totpValid && normalized
          ? await deps.store.consumeRecoveryCode(
              gate.session.user.id,
              hashToken(normalized),
              deps.now(),
            )
          : false
      if (!totpValid && !recoveryValid) {
        await audit("mfa.failed", gate.session.user.id)
        return fail(401, "mfa_invalid", "Code incorrect.")
      }
      if (!totp.confirmedAt) await deps.store.confirmTotp(gate.session.user.id, deps.now())
      await deps.store.revokeSession(gate.session.secretHash, deps.now())
      const cookie = await issueSession(gate.session.user.id, true)
      await audit("mfa.verified", gate.session.user.id, { recovery: recoveryValid })
      return { status: 200, body: { ok: true }, cookie, redirectPath: "/admin" }
    },

    async createProject(input: { cookieValue: string | null; name: unknown }): Promise<ServiceResult> {
      const gate = await requireSession(input.cookieValue, "account")
      if (!gate.ok) return gate.error
      const name = normalizeProjectName(input.name)
      if (!name) return fail(400, "project_invalid", "Indiquez un nom de projet de 2 à 80 caractères.")
      const project = await deps.store.createProject(gate.session.user.id, name, deps.now())
      await audit("project.created", gate.session.user.id, { projectId: project.id })
      return { status: 201, body: { ok: true, project } }
    },

    async listProjects(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "account")
      if (!gate.ok) return gate.error
      const projects = await deps.store.listProjects(gate.session.user.id)
      return { status: 200, body: { ok: true, projects } }
    },

    async listSubscriptions(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "account")
      if (!gate.ok) return gate.error
      const subscriptions = await deps.store.listSubscriptions(gate.session.user.id)
      return { status: 200, body: { ok: true, subscriptions } }
    },

    async accountIdentity(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "account")
      if (!gate.ok) return gate.error
      return {
        status: 200,
        body: { ok: true, userId: gate.session.user.id, email: gate.session.user.email },
      }
    },

    async adminIdentity(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "admin")
      if (!gate.ok) return gate.error
      return { status: 200, body: { ok: true, userId: gate.session.user.id } }
    },

    async adminSummary(cookieValue: string | null): Promise<ServiceResult> {
      const gate = await requireSession(cookieValue, "admin")
      if (!gate.ok) return gate.error
      const [counts, billing] = await Promise.all([
        deps.store.countAccounts(),
        deps.store.loadBillingInputs().then(summarizeBilling),
      ])
      return { status: 200, body: { ok: true, ...counts, ...billing } }
    },
  }
}
