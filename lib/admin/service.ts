import type {RateLimiter} from "../auth/rate-limit"
import type {ServiceResult} from "../auth/service"
import {objectId} from "../interventions/service"
export const recordKinds=["clients","subscriptions","invoices","payments","refunds","interventions","redemptions","history","audit"] as const
export type RecordKind=typeof recordKinds[number]
export type AdminQuery={kind:RecordKind;offset:number;q:string;clientId?:string;subscriptionId?:string;status?:string;priority?:string;from:Date;to:Date}
export interface AdminStore {
 overview(query:AdminQuery,now:Date):Promise<unknown>
 records(query:AdminQuery):Promise<unknown>
 client(id:string):Promise<unknown|null>
}
export type AdminDeps={authorize:(cookie:string|null)=>Promise<ServiceResult>;store:AdminStore;limiter:RateLimiter;now:()=>Date}
export function parseAdminQuery(value:unknown,now:Date):AdminQuery|null {
 if(!value||typeof value!=="object"||Array.isArray(value))return null
 const v=value as Record<string,unknown>
 if(Object.keys(v).some(k=>!["kind","offset","q","clientId","subscriptionId","status","priority","from","to"].includes(k)))return null
 if(v.offset!==undefined&&typeof v.offset!=="number"&&(typeof v.offset!=="string"||!/^\d+$/.test(v.offset)))return null
 const kind=v.kind??"clients",offset=v.offset===undefined?0:Number(v.offset),q=v.q??""
 if(!recordKinds.includes(kind as RecordKind)||!Number.isSafeInteger(offset)||offset<0||offset>100000||typeof q!=="string"||q.length>120||/[\u0000-\u001f]/.test(q))return null
 if(v.clientId!==undefined&&!objectId(v.clientId)||v.subscriptionId!==undefined&&!objectId(v.subscriptionId))return null
 if(v.status!==undefined&&(typeof v.status!=="string"||!["active","past_due","unpaid","canceled","incomplete","incomplete_expired","trialing","draft","open","paid","uncollectible","void","pending","succeeded","failed","submitted","analyzing","accepted","in_progress","waiting_client","completed","rejected","cancelled","reserved","consumed","released"].includes(v.status)))return null
 if(v.priority!==undefined&&!["low","normal","high","urgent"].includes(v.priority as string))return null
 const validDate=(x:unknown)=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x
 const from=v.from===undefined?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)):validDate(v.from)?new Date(v.from as string):null
 const to=v.to===undefined?new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)):validDate(v.to)?new Date(v.to as string):null
 if(!from||!to||from>=to||to.getTime()-from.getTime()>366*100*86400000)return null
 return {kind:kind as RecordKind,offset,q:q.trim(),from,to,...(v.clientId?{clientId:v.clientId as string}:{}),...(v.subscriptionId?{subscriptionId:v.subscriptionId as string}:{}),...(v.status?{status:v.status as string}:{}),...(v.priority?{priority:v.priority as string}:{})}
}
export async function administer(deps:AdminDeps,cookie:string|null,operation:"overview"|"records"|"client",value:unknown={},id?:string):Promise<ServiceResult>{
 const identity=await deps.authorize(cookie)
 if(identity.status!==200)return identity
 if(typeof identity.body.userId!=="string")return {status:503,body:{ok:false,code:"unavailable"}}
 try {
  if(!(await deps.limiter.consume("admin-pilotage:"+identity.body.userId,180,3600)).allowed)return {status:429,body:{ok:false,code:"rate_limited"}}
  const now=deps.now(),query=parseAdminQuery(value,now)
  if(!query||operation==="overview"&&(query.clientId||query.subscriptionId||query.q||query.status||query.priority)||operation==="client"&&!objectId(id))return {status:400,body:{ok:false,code:"invalid"}}
  const data=operation==="overview"?await deps.store.overview(query,now):operation==="records"?await deps.store.records(query):await deps.store.client(id!)
  if(data===null)return {status:404,body:{ok:false,code:"not_found"}}
  return {status:200,body:{ok:true,data}}
 }catch{return {status:503,body:{ok:false,code:"unavailable"}}}
}
