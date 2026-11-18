import { interventionHttp } from "@/lib/interventions/http"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: Request) { return interventionHttp(request,false,"dashboard") }
export async function PATCH(request: Request) { return interventionHttp(request,false,"profile") }
