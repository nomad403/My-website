import {adminHttp} from "@/lib/admin/http"
export const runtime="nodejs"
export const dynamic="force-dynamic"
export async function GET(request:Request){return adminHttp(request,"records")}
