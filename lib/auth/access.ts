/** Cloudflare Access JWT verification for admin-only gates. */

type AccessCerts = {
  keys?: Array<JsonWebKey & { kid?: string; alg?: string }>
}

type AccessClaims = {
  email?: unknown
  aud?: unknown
  iss?: unknown
  exp?: unknown
}

const certCache = new Map<string, { expiresAt: number; keys: AccessCerts["keys"] }>()

function decodeBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (input.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeJson<T>(part: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T
  } catch {
    return null
  }
}

function normalizeTeamDomain(value: string): string {
  const trimmed = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
  if (!trimmed) return ""
  return trimmed.includes(".") ? trimmed : `${trimmed}.cloudflareaccess.com`
}

export function readAccessEnv(source: NodeJS.ProcessEnv = process.env): { teamDomain: string; aud: string } | null {
  const teamDomain = normalizeTeamDomain(source.CF_ACCESS_TEAM_DOMAIN ?? "")
  const aud = (source.CF_ACCESS_AUD ?? "").trim()
  if (!teamDomain || !aud) return null
  return { teamDomain, aud }
}

export function adminEmailAllowlist(source: NodeJS.ProcessEnv = process.env): Set<string> {
  return new Set(
    (source.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

function audienceMatches(audClaim: unknown, expected: string): boolean {
  if (typeof audClaim === "string") return audClaim === expected
  if (Array.isArray(audClaim)) return audClaim.some((value) => value === expected)
  return false
}

async function loadKeys(teamDomain: string): Promise<AccessCerts["keys"]> {
  const cached = certCache.get(teamDomain)
  if (cached && cached.expiresAt > Date.now()) return cached.keys
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`, {
    headers: { Accept: "application/json" },
  })
  if (!response.ok) return undefined
  const body = (await response.json()) as AccessCerts
  certCache.set(teamDomain, { keys: body.keys, expiresAt: Date.now() + 60 * 60 * 1000 })
  return body.keys
}

export async function verifyAccessJwt(
  token: string,
  env: { teamDomain: string; aud: string },
  nowMs = Date.now(),
): Promise<string | null> {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [headerPart, payloadPart, signaturePart] = parts
  const header = decodeJson<{ kid?: string; alg?: string }>(headerPart)
  const claims = decodeJson<AccessClaims>(payloadPart)
  if (!header || !claims || header.alg !== "RS256" || !header.kid) return null
  if (claims.iss !== `https://${env.teamDomain}`) return null
  if (!audienceMatches(claims.aud, env.aud)) return null
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= nowMs) return null
  const email = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : ""
  if (!email || !email.includes("@")) return null

  const keys = await loadKeys(env.teamDomain)
  const jwk = keys?.find((key) => key.kid === header.kid)
  if (!jwk) return null

  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const data = new TextEncoder().encode(`${headerPart}.${payloadPart}`)
    const signature = decodeBase64Url(signaturePart)
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      signature.buffer.slice(signature.byteOffset, signature.byteOffset + signature.byteLength) as ArrayBuffer,
      data,
    )
    return ok ? email : null
  } catch {
    return null
  }
}

export async function accessEmailFromRequest(
  request: { headers: Headers },
  source: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const env = readAccessEnv(source)
  if (!env) return null
  const token = request.headers.get("cf-access-jwt-assertion")
  if (!token) return null
  return verifyAccessJwt(token, env)
}

export function isAllowedAdminEmail(email: string | null | undefined, source: NodeJS.ProcessEnv = process.env): boolean {
  if (!email) return false
  return adminEmailAllowlist(source).has(email.trim().toLowerCase())
}
