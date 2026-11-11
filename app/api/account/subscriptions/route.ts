import { jsonError, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return withAuth(request, ({ service, cookie }) => service.listSubscriptions(cookie))
}

export async function POST() {
  return jsonError(405, "method_not_allowed", "La création d'abonnement n'est pas disponible.")
}
