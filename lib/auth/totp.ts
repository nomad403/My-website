import { createHmac } from "node:crypto"
import { codesMatch } from "./crypto"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function encodeBase32(bytes: Buffer): string {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31]
  return output
}

export function decodeBase32(input: string): Buffer | null {
  const clean = input.replace(/=+$/g, "").replace(/\s/g, "").toUpperCase()
  if (!clean || [...clean].some((char) => !BASE32.includes(char))) return null
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

export function hotp(secret: Buffer, counter: number): string {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac("sha1", secret).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return String(binary % 1_000_000).padStart(6, "0")
}

export function totpAt(secret: Buffer, timeMs: number): string {
  return hotp(secret, Math.floor(timeMs / 1000 / 30))
}

export function verifyTotp(secret: Buffer, code: string, timeMs: number): boolean {
  if (!/^\d{6}$/.test(code)) return false
  const step = Math.floor(timeMs / 1000 / 30)
  for (let offset = -1; offset <= 1; offset += 1) {
    if (codesMatch(totpAt(secret, (step + offset) * 30 * 1000), code)) return true
  }
  return false
}

export function otpauthUrl(email: string, secret: string): string {
  const label = encodeURIComponent(`Nomad403:${email}`)
  const issuer = encodeURIComponent("Nomad403")
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`
}
