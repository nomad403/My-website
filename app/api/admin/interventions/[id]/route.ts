import { interventionHttp } from "@/lib/interventions/http"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = {params:Promise<{id:string}>}
export async function GET(request:Request,context:Context) { return interventionHttp(request,true,"detail",(await context.params).id) }
export async function PATCH(request:Request,context:Context) { return interventionHttp(request,true,"action",(await context.params).id) }
