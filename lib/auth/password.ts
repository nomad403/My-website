import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto"

const N = 16384
const r = 8
const p = 1
const keyLen = 32

function scryptAsync(
  password: string,
  salt: Buffer,
  length: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, length, options, (error, derived) => {
      if (error) reject(error)
      else resolve(derived)
    })
  })
}

export function normalizePassword(value: unknown): string | null {
  if (typeof value !== "string") return null
  if (value.length < 8 || value.length > 128) return null
  if (/[\u0000-\u001F\u007F]/.test(value)) return null
  return value
}

export function normalizePersonName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const name = value.replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim()
  if (name.length < 1 || name.length > 80 || /[<>]/.test(name)) return null
  return name
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, keyLen, { N, r, p })
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${derived.toString("base64url")}`
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split("$")
  if (parts.length !== 6 || parts[0] !== "scrypt") return false
  const costN = Number(parts[1])
  const costR = Number(parts[2])
  const costP = Number(parts[3])
  if (![costN, costR, costP].every((value) => Number.isInteger(value) && value > 0)) return false
  try {
    const salt = Buffer.from(parts[4], "base64url")
    const expected = Buffer.from(parts[5], "base64url")
    if (!salt.length || expected.length < 16) return false
    const derived = await scryptAsync(password, salt, expected.length, {
      N: costN,
      r: costR,
      p: costP,
    })
    return expected.length === derived.length && timingSafeEqual(expected, derived)
  } catch {
    return false
  }
}
