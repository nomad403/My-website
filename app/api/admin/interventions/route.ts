import { interventionHttp } from "@/lib/interventions/http"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: Request) { return interventionHttp(request,true,"list") }
