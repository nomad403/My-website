import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const email =
    body.value && typeof body.value === "object" && "email" in body.value ? body.value.email : null
  return withAuth(request, ({ service, ip }) => service.requestPasswordReset({ email, ip }))
}
