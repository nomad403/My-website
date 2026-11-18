import {adminHttp} from "@/lib/admin/http"
export const runtime="nodejs"
export const dynamic="force-dynamic"
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return adminHttp(request,"client",(await params).id)}
