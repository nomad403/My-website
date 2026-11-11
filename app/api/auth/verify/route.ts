import { jsonError, readJson, withAuth } from "@/lib/auth/route"
import type { ServiceResult } from "@/lib/auth/service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function htmlFailure(result: ServiceResult): ServiceResult {
  const error = result.status === 429 ? "limited" : result.status === 503 ? "unavailable" : "invalid"
  return { status: result.status, body: result.body, redirectPath: `/auth/verify?error=${error}` }
}

export async function POST(request: Request) {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? ""
  let token: unknown = null
  let html = false
  if (type === "application/json") {
    const body = await readJson(request)
    if (!body.ok) return jsonError(body.status, body.code, "Requête invalide.")
    token = body.value && typeof body.value === "object" && "token" in body.value ? body.value.token : null
  } else if (type === "application/x-www-form-urlencoded" || type === "multipart/form-data") {
    html = true
    const form = await request.formData()
    token = form.get("token")
  } else {
    return jsonError(415, "unsupported_media", "Format non pris en charge.")
  }

  return withAuth(request, async ({ service, ip }) => {
    const result = await service.verifyMagicLink({ token, ip })
    if (html && result.status >= 400) return htmlFailure(result)
    return result
  })
}
