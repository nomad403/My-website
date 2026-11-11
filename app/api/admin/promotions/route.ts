import { promotionAdminRequest } from "@/lib/billing/promotion-admin-http"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: Request) { return promotionAdminRequest(request, "list") }
export async function POST(request: Request) { return promotionAdminRequest(request, "create") }
