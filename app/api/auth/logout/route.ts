import { withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return withAuth(request, ({ service, cookie }) => service.logout(cookie))
}
