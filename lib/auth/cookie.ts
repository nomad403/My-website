export const SESSION_COOKIE = "nomad_session"

export type SessionCookie = {
  sessionId: string
  absoluteExpiresAt: number
  mfa: 0 | 1
}

const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "")
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload))
  return toBase64Url(new Uint8Array(signature))
}

function sameText(left: string, right: string): boolean {
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index]
  return diff === 0
}

export async function sealSessionCookie(input: SessionCookie, secret: string): Promise<string> {
  const payload = `v1.${input.sessionId}.${input.absoluteExpiresAt}.${input.mfa}`
  const signature = await sign(payload, secret)
  return `${payload}.${signature}`
}

export async function openSessionCookie(value: string, secret: string): Promise<SessionCookie | null> {
  const parts = value.split(".")
  if (parts.length !== 5) return null
  const [version, sessionId, expiresAt, mfa, signature] = parts
  if (version !== "v1" || !/^[A-Za-z0-9_-]{43}$/.test(sessionId)) return null
  if (!/^\d{10}$/.test(expiresAt) || (mfa !== "0" && mfa !== "1")) return null
  const payload = `v1.${sessionId}.${expiresAt}.${mfa}`
  const expected = await sign(payload, secret)
  if (!sameText(expected, signature)) return null
  return {
    sessionId,
    absoluteExpiresAt: Number(expiresAt),
    mfa: mfa === "1" ? 1 : 0,
  }
}
