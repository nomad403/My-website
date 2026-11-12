import {NextResponse} from "next/server"
import {productionPlatform} from "../auth/runtime"
import {cookieFromRequest,isSameOrigin} from "../auth/route"
import {toResponse,unavailable} from "../auth/http"
import {administer} from "./service"
export async function adminHttp(request:Request,operation:"overview"|"records"|"client",id?:string) {
 if(!isSameOrigin(request))return NextResponse.json({ok:false,code:"origin_rejected"},{status:403,headers:{"Cache-Control":"no-store"}})
 try{
  const platform=await productionPlatform()
  if(!platform)return unavailable()
  const cookie=cookieFromRequest(request),identity=await platform.service.adminIdentity(cookie)
  if(identity.status!==200)return toResponse(identity,platform.env.secureCookies,platform.env.appUrl)
  const params=new URL(request.url).searchParams
  if(new Set(params.keys()).size!==Array.from(params.keys()).length)return NextResponse.json({ok:false,code:"invalid"},{status:400,headers:{"Cache-Control":"no-store"}})
  const result=await administer({authorize:c=>platform.service.adminIdentity(c),store:platform.admin,limiter:platform.limiter,now:()=>new Date()},cookie,operation,Object.fromEntries(params),id)
  return toResponse(result,platform.env.secureCookies,platform.env.appUrl)
 }catch{console.error("[admin] request failed");return unavailable()}
}
