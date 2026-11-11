import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return withAuth(request, ({ service, cookie }) => service.listProjects(cookie))
}

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
  const name = body.value && typeof body.value === "object" && "name" in body.value ? body.value.name : null
  return withAuth(request, ({ service, cookie }) => service.createProject({ cookieValue: cookie, name }))
}
