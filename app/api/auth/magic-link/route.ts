import { jsonError, readJson, withAuth } from "@/lib/auth/route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await readJson(request)
  if (!body.ok) {
    const error =
      body.code === "payload_too_large"
        ? "La requête est trop volumineuse."
        : body.code === "unsupported_media"
          ? "Format non pris en charge."
          : "Requête invalide."
    return jsonError(body.status, body.code, error)
  }
  const email =
    body.value && typeof body.value === "object" && "email" in body.value
      ? body.value.email
      : null
  return withAuth(request, ({ service, ip }) => service.requestMagicLink({ email, ip }))
}
