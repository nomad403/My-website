export type LimitDecision = { allowed: boolean; retryAfter: number }

export interface RateLimiter {
  consume(key: string, limit: number, windowSeconds: number): Promise<LimitDecision>
}

type Bucket = { count: number; resetAt: number }

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<LimitDecision> {
    const now = this.now()
    const current = this.buckets.get(key)
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 })
      return { allowed: true, retryAfter: 0 }
    }
    if (current.count >= limit) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) }
    }
    current.count += 1
    return { allowed: true, retryAfter: 0 }
  }
}

const REDIS_SCRIPT = `
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
if current >= limit then
  local ttl = redis.call('TTL', KEYS[1])
  if ttl < 1 then ttl = 1 end
  return {0, ttl}
end
local next = redis.call('INCR', KEYS[1])
if next == 1 then
  redis.call('EXPIRE', KEYS[1], window)
end
return {1, 0}
`

export class RedisRateLimiter implements RateLimiter {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
    private readonly prefix: string,
  ) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<LimitDecision> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        "EVAL",
        REDIS_SCRIPT,
        "1",
        `${this.prefix}:${key}`,
        String(limit),
        String(windowSeconds),
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
      redirect: "error",
    })
    if (!response.ok) throw new Error("Rate limiter unavailable")
    const data = (await response.json()) as { result?: unknown; error?: string }
    if (data.error || !Array.isArray(data.result) || data.result.length !== 2) {
      throw new Error("Rate limiter unavailable")
    }
    const [allowed, retryAfter] = data.result
    if (allowed !== 0 && allowed !== 1) throw new Error("Rate limiter unavailable")
    return { allowed: allowed === 1, retryAfter: Number(retryAfter) || 0 }
  }
}

export function createProductionLimiter(source: NodeJS.ProcessEnv = process.env): RateLimiter | null {
  const endpoint = source.UPSTASH_REDIS_REST_URL || source.KV_REST_API_URL
  const token = source.UPSTASH_REDIS_REST_TOKEN || source.KV_REST_API_TOKEN
  if (endpoint && token) {
    const url = new URL(endpoint)
    if (url.protocol !== "https:") return null
    const scope = source.VERCEL_ENV || source.NODE_ENV || "development"
    return new RedisRateLimiter(endpoint, token, `auth:{${scope}}`)
  }
  if (source.NODE_ENV === "production") return null
  return new MemoryRateLimiter()
}
