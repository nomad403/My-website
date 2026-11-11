import { NextResponse } from "next/server"
import { productionPlatform } from "../auth/runtime"
import { cookieFromRequest, isSameOrigin, readJson } from "../auth/route"
import { toResponse, unavailable } from "../auth/http"
import { getDb } from "../db/client"
import { DrizzleInterventionStore } from "../db/intervention-store"
import { interventionOperation, type Operation } from "./service"
export async function interventionHttp(request: Request, admin: boolean, operation: Operation | "action", id?: string) {
 if (!isSameOrigin(request)) return NextResponse.json({ok:false,code:"origin_rejected"},{status:403,headers:{"Cache-Control":"no-store"}})
 try {
  const platform = await productionPlatform()
  if (!platform) return unavailable()
  const cookie = cookieFromRequest(request)
  const authorize = (value: string | null) => admin ? platform.service.adminIdentity(value) : platform.service.accountIdentity(value)
  const identity = await authorize(cookie)
  if (identity.status !== 200) return toResponse(identity,platform.env.secureCookies,platform.env.appUrl)
  let input: unknown = {}
  if (["create","profile","action"].includes(operation)) {
   const parsed = await readJson(request)
   if (!parsed.ok) return NextResponse.json({ok:false,code:parsed.code},{status:parsed.status,headers:{"Cache-Control":"no-store"}})
   input = parsed.value
  } else input = {offset:Number(new URL(request.url).searchParams.get("offset") ?? 0)}
  if (operation === "action") {
   if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ok:false,code:"invalid"},{status:400})
   const { action, ...body } = input as Record<string,unknown>
   if (action !== "message" && action !== "transition" && action !== "complete") return NextResponse.json({ok:false,code:"invalid"},{status:400,headers:{"Cache-Control":"no-store"}})
   operation = action
   input = body
  }
  const result = await interventionOperation({authorize,store:new DrizzleInterventionStore(getDb()),limiter:platform.limiter,now:()=>new Date(),admin},cookie,operation,input,id)
  return toResponse(result,platform.env.secureCookies,platform.env.appUrl)
 } catch {
  console.error("[interventions] request failed")
  return unavailable()
 }
}
