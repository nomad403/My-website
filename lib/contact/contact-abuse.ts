import { createHmac } from "node:crypto"
import { trustedContactClient } from "@/lib/contact/trusted-client"

export class ContactAbuseError extends Error {
  constructor(public readonly code:
    | "redis_configuration_missing" | "redis_url_invalid"
    | "client_identity_unavailable" | "redis_network_error"
    | "redis_http_unauthorized" | "redis_http_error"
    | "redis_command_error" | "redis_response_invalid"
    | "durable_object_unavailable" | "durable_object_response_invalid"
    | "preview_mail_disabled") {
    super("Contact abuse protection unavailable")
    this.name = "ContactAbuseError"
  }
}

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
  let identity: ReturnType<typeof trustedContactClient>
  try { identity = trustedContactClient(request) } catch {
    throw new ContactAbuseError("client_identity_unavailable")
  }
  if (identity.preview) throw new ContactAbuseError("preview_mail_disabled")
  if (identity.limiter) {
    let response: Response
    try {
      const stub = identity.limiter.get(identity.limiter.idFromName("contact-mail-limiter:" + identity.scope))
      response = await stub.fetch(new Request("https://contact-limiter.internal/reserve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: identity.ip, contact: payload.contact, message: payload.message }),
        signal: AbortSignal.timeout(3000),
      }))
    } catch { throw new ContactAbuseError("durable_object_unavailable") }
    if (!response.ok) throw new ContactAbuseError("durable_object_unavailable")
    let result: { allowed?: unknown; retryAfter?: unknown } | null
    try { result = await response.json() } catch { throw new ContactAbuseError("durable_object_response_invalid") }
    if (!result || typeof result.allowed !== "boolean" || !Number.isInteger(result.retryAfter) ||
        typeof result.retryAfter !== "number" || result.retryAfter < 1 || result.retryAfter > 86400)
      throw new ContactAbuseError("durable_object_response_invalid")
    return { allowed: result.allowed, retryAfter: result.retryAfter }
  }
  // Preserve the existing Redis path exclusively for the unchanged Vercel runtime.
  const endpoint = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
  if (!endpoint || !token) throw new ContactAbuseError("redis_configuration_missing")
  try {
    if (new URL(endpoint).protocol !== "https:") throw new Error()
  } catch {
    throw new ContactAbuseError("redis_url_invalid")
  }
  const { ip: client, scope } = identity
  const hash = (value: string) => createHmac("sha256", token).update(value).digest("hex")
  // Hash tags keep all four keys in the same slot, isolated by platform.
  const prefix = `contact:{${scope}}`
  const clientPrefix = `${prefix}:client:${hash(client)}`
  let response: Response
  try {
    response = await fetch(endpoint, {
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
  } catch {
    throw new ContactAbuseError("redis_network_error")
  }
  if (!response.ok) throw new ContactAbuseError(
    response.status === 401 || response.status === 403 ? "redis_http_unauthorized" : "redis_http_error",
  )
  let data: { result?: unknown; error?: unknown } | null
  try { data = await response.json() } catch {
    throw new ContactAbuseError("redis_response_invalid")
  }
  if (!data || typeof data !== "object") throw new ContactAbuseError("redis_response_invalid")
  if (data.error) throw new ContactAbuseError("redis_command_error")
  if (!Array.isArray(data.result) || data.result.length !== 2 ||
      ![0, 1].includes(data.result[0]) || !Number.isInteger(data.result[1]) || data.result[1] < 0) {
    throw new ContactAbuseError("redis_response_invalid")
  }
  return { allowed: data.result[0] === 1, retryAfter: Math.max(1, data.result[1]) }
}
