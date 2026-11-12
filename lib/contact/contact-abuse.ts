import {trustedContactClient} from "./trusted-client"
export class ContactAbuseError extends Error{constructor(public readonly code:string){super("Contact abuse protection unavailable")}}
export async function reserveContactEmail(request:Request,payload:{contact:string;message:string}):Promise<{allowed:boolean;retryAfter:number}>{
 let identity:ReturnType<typeof trustedContactClient>;try{identity=trustedContactClient(request)}catch{throw new ContactAbuseError("client_identity_unavailable")}
 if(identity.env.NOMAD403_ENV==="preview"&&!(String(identity.env.QUALIFICATION_EMAILS??"").toLowerCase().split(",").map(x=>x.trim()).includes(String(identity.env.RESEND_TO??"").toLowerCase())))throw new ContactAbuseError("preview_recipient_unavailable")
 let response:Response
 try{const stub=identity.limiter.get(identity.limiter.idFromName("contact-mail-limiter"));response=await stub.fetch(new Request("https://contact-limiter.internal/reserve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ip:identity.ip,contact:payload.contact,message:payload.message}),signal:AbortSignal.timeout(3000)}))}catch{throw new ContactAbuseError("durable_object_unavailable")}
 if(!response.ok)throw new ContactAbuseError("durable_object_unavailable")
 let data:{allowed?:unknown;retryAfter?:unknown};try{data=await response.json()}catch{throw new ContactAbuseError("durable_object_response_invalid")}
 if(typeof data?.allowed!=="boolean"||!Number.isInteger(data.retryAfter)||typeof data.retryAfter!=="number"||data.retryAfter<1||data.retryAfter>86400)throw new ContactAbuseError("durable_object_response_invalid")
 return {allowed:data.allowed,retryAfter:data.retryAfter}
}
