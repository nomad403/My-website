import { isIP } from "node:net"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export type ContactLimiterNamespace = {
  idFromName(name: string): unknown
  get(id: unknown): { fetch(request: Request): Promise<Response> }
}

/** Trust edge headers only inside the matching server runtime. */
export function trustedContactClient(request: Request): {
  ip: string; scope: string; limiter?: ContactLimiterNamespace; preview?: boolean
} {
  let context: ReturnType<typeof getCloudflareContext> | undefined
  try { context = getCloudflareContext() } catch { /* Ordinary Node/Vercel. */ }
  if (context) {
    const env = context.env as unknown as { CONTACT_LIMITER?: ContactLimiterNamespace; NOMAD403_ENV?: string }
    const limiter = env.CONTACT_LIMITER
    if (typeof limiter?.idFromName !== "function" || typeof limiter?.get !== "function")
      throw new Error("Trusted runtime unavailable")
    const ip = request.headers.get("cf-connecting-ip")?.trim() ?? ""
    if (!isIP(ip)) throw new Error("Trusted client identity unavailable")
    const preview = env.NOMAD403_ENV === "preview"
    return { ip, limiter, preview, scope: preview ? "cloudflare:preview" : "cloudflare:production" }
  }
  if (process.env.VERCEL === "1") {
    const ip = request.headers.get("x-vercel-forwarded-for")?.trim() ?? ""
    if (!isIP(ip)) throw new Error("Trusted client identity unavailable")
    return { ip, scope: process.env.VERCEL_ENV || process.env.NODE_ENV || "development" }
  }
  throw new Error("Trusted runtime unavailable")
}
