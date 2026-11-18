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

export type LimiterNamespace={idFromName(name:string):unknown;get(id:unknown):{fetch(request:Request):Promise<Response>}}
export class CloudflareRateLimiter implements RateLimiter {
 constructor(private readonly namespace:LimiterNamespace){}
 async consume(key:string,limit:number,windowSeconds:number):Promise<LimitDecision>{
  const stub=this.namespace.get(this.namespace.idFromName("shop-auth-limits"))
  const response=await stub.fetch(new Request("https://auth-limiter.internal/consume",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,limit,windowSeconds}),signal:AbortSignal.timeout(3000)}))
  if(!response.ok)throw new Error("Rate limiter unavailable")
  const data=await response.json() as {allowed?:unknown;retryAfter?:unknown}
  if(typeof data.allowed!=="boolean"||!Number.isInteger(data.retryAfter)||typeof data.retryAfter!=="number"||data.retryAfter<0||data.retryAfter>86400||(!data.allowed&&data.retryAfter<1))throw new Error("Rate limiter unavailable")
  return {allowed:data.allowed,retryAfter:data.retryAfter}
 }
}
const developmentLimiter=new MemoryRateLimiter()
export function createProductionLimiter(source:NodeJS.ProcessEnv=process.env,namespace?:LimiterNamespace):RateLimiter|null{
 if(namespace&&typeof namespace.idFromName==="function"&&typeof namespace.get==="function")return new CloudflareRateLimiter(namespace)
 return source.NODE_ENV==="production"?null:developmentLimiter
}
