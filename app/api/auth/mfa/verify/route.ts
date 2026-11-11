import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const code = body.value && typeof body.value === "object" && "code" in body.value ? body.value.code : null
  return withAuth(request, ({ service, cookie }) => service.verifyMfa({ cookieValue: cookie, code }))
}
