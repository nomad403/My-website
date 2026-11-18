import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto"

export function randomToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

export function mac(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex")
}

export function decodeKey(value: string | undefined | null): Buffer | null {
  if (!value) return null
  const key = Buffer.from(value, "base64")
  if (key.length !== 32) return null
  return key
}

export function encryptBytes(plain: Buffer, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url")
}

export function decryptBytes(payload: string, key: Buffer): Buffer | null {
  try {
    const data = Buffer.from(payload, "base64url")
    if (data.length < 12 + 16 + 1) return null
    const iv = data.subarray(0, 12)
    const tag = data.subarray(12, 28)
    const ciphertext = data.subarray(28)
    const decipher = createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch {
    return null
  }
}

export function randomRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let raw = ""
  while (raw.length < 10) {
    const byte = randomBytes(1)[0]
    const limit = 256 - (256 % alphabet.length)
    if (byte >= limit) continue
    raw += alphabet[byte % alphabet.length]
  }
  return `${raw.slice(0, 5)}-${raw.slice(5)}`
}

export function normalizeRecoveryCode(value: string): string | null {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (compact.length !== 10) return null
  return compact
}

export function codesMatch(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
