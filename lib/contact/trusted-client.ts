import {isIP} from "node:net"
import {cloudBindings} from "../cloudflare/runtime"
export function trustedContactClient(request:Request){
 const env=cloudBindings(),limiter=env?.CONTACT_LIMITER,ip=request.headers.get("cf-connecting-ip")?.trim()??""
 if(!env||!limiter||typeof limiter.get!=="function"||typeof limiter.idFromName!=="function"||!isIP(ip))throw new Error("Trusted Cloudflare client unavailable")
 return {ip,limiter,env}
}
