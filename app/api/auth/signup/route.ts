import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const value = body.value && typeof body.value === "object" ? (body.value as Record<string, unknown>) : {}
  return withAuth(request, ({ service, ip }) =>
    service.signUp({
      email: value.email,
      password: value.password,
      firstName: value.firstName,
      lastName: value.lastName,
      ip,
    }),
  )
}
