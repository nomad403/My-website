import {isIP} from "node:net"
import {getCloudflareContext} from "@opennextjs/cloudflare"

/** Trust an edge header only in its actual server runtime, never from a request alone. */
export function trustedContactClient(request:Request):{ip:string;scope:string} {
 if(process.env.VERCEL==="1"){
  const ip=request.headers.get("x-vercel-forwarded-for")?.trim()??""
  if(!isIP(ip))throw new Error("Trusted client identity unavailable")
  return {ip,scope:process.env.VERCEL_ENV||process.env.NODE_ENV||"development"}
 }
 // Sync context is set by the OpenNext Worker. Async mode could create a local
 // platform proxy on ordinary Node.js, which is not proof of a trusted edge.
 const context=getCloudflareContext()
 if(typeof context.env.WORKER_SELF_REFERENCE?.fetch!=="function")throw new Error("Trusted runtime unavailable")
 const ip=request.headers.get("cf-connecting-ip")?.trim()??""
 if(!isIP(ip))throw new Error("Trusted client identity unavailable")
 return {ip,scope:"cloudflare:my-website"}
}
