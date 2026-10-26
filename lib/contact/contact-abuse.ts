import { createHmac } from "node:crypto"
import { isIP } from "node:net"

// Redis evaluates all limits and reserves an email slot atomically, across instances.
export const CONTACT_RESERVATION_SCRIPT = `
local limits = {3, 20, 50}
local windows = {600, 3600, 86400}
local wait = 0
for i = 1, 3 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= limits[i] then
    wait = math.max(wait, redis.call('TTL', KEYS[i]), 1)
  end
end
if redis.call('EXISTS', KEYS[4]) == 1 then
  wait = math.max(wait, redis.call('TTL', KEYS[4]), 1)
end
if wait > 0 then return {0, wait} end
for i = 1, 3 do
  if redis.call('INCR', KEYS[i]) == 1 then
    redis.call('EXPIRE', KEYS[i], windows[i])
  end
end
redis.call('SET', KEYS[4], '1', 'EX', 600)
return {1, 0}
`

export async function reserveContactEmail(
  request: Request,
  payload: { contact: string; message: string },
): Promise<{ allowed: boolean; retryAfter: number }> {
  const endpoint = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!endpoint || !token || new URL(endpoint).protocol !== "https:") {
    throw new Error("Contact abuse protection is not configured")
  }

  // This deployment uses Vercel, which overwrites this header at its edge.
  // Outside that platform no arbitrary client-supplied header is accepted.
  if (process.env.VERCEL !== "1") throw new Error("Trusted platform identity unavailable")
  const client = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (!client || !isIP(client)) throw new Error("Trusted client identity unavailable")
  const hash = (value: string) => createHmac("sha256", token).update(value).digest("hex")
  // Hash tags keep the four keys in the same slot on a Redis cluster.
  const prefix = `contact:{${process.env.VERCEL_ENV || process.env.NODE_ENV || "development"}}`
  const clientPrefix = `${prefix}:client:${hash(client)}`
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      "EVAL", CONTACT_RESERVATION_SCRIPT, "4",
      `${clientPrefix}:short`, `${clientPrefix}:hour`, `${clientPrefix}:day`,
      `${clientPrefix}:duplicate:${hash(JSON.stringify([payload.contact.toLowerCase(), payload.message]))}`,
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
    redirect: "error",
  })
  if (!response.ok) throw new Error("Contact abuse protection unavailable")
  const data = await response.json() as { result?: unknown; error?: string }
  if (data.error || !Array.isArray(data.result) || data.result.length !== 2 ||
      ![0, 1].includes(data.result[0]) || !Number.isInteger(data.result[1]) || data.result[1] < 0) {
    throw new Error("Invalid contact abuse protection response")
  }
  return { allowed: data.result[0] === 1, retryAfter: Math.max(1, data.result[1]) }
}
