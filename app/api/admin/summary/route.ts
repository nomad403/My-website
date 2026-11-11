import { withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return withAuth(request, ({ service, cookie }) => service.adminSummary(cookie))
}
