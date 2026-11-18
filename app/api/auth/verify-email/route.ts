import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const token =
    body.value && typeof body.value === "object" && "token" in body.value ? body.value.token : null
  return withAuth(request, ({ service, ip }) => service.verifyEmail({ token, ip }))
}
