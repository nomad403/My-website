import { NextResponse } from "next/server"
import { Resend } from "resend"
import { reserveContactEmail } from "@/lib/contact/contact-abuse"
import {
  escapeHtml,
  sanitizeContactPayload,
  validateContactPayload,
} from "@/lib/contact/contact-validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Body = { nom?: string; contact?: string; message?: string; website?: string }

const MAX_BODY_BYTES = 8192
const UNAVAILABLE = { ok: false, error: "Service temporarily unavailable" }

async function readBody(req: Request): Promise<Body | null> {
  if (!req.body) return null
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new RangeError("Payload too large")
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Body
}

export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return NextResponse.json({ ok: false, error: "Unsupported media type" }, { status: 415 })
    }
    const origin = req.headers.get("origin")
    if (origin && origin !== new URL(req.url).origin) {
      return NextResponse.json({ ok: false, error: "Invalid origin" }, { status: 403 })
    }
    if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 })
    }
    let data: Body | null = null
    try {
      data = await readBody(req)
    } catch (error) {
      if (error instanceof RangeError) {
        return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 })
      }
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
    }

    if (
      typeof data?.nom !== "string" ||
      typeof data?.contact !== "string" ||
      typeof data?.message !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
    }

    // A honeypot catches simple form-filling bots; Redis limits also cover direct API scripts.
    if (data.website !== undefined && (typeof data.website !== "string" || data.website !== "")) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 })
    }

    const payload = sanitizeContactPayload(data)
    const validation = validateContactPayload(payload)
    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid fields",
          field: validation.field,
          code: validation.code,
        },
        { status: 400 },
      )
    }

    const { nom, contact, message } = payload

    const apiKey = process.env.RESEND_API_KEY
    const from = process.env.RESEND_FROM
    const to = process.env.RESEND_TO

    if (!apiKey || !from || !to) {
      return NextResponse.json(UNAVAILABLE, { status: 503 })
    }

    try {
      const reservation = await reserveContactEmail(req, payload)
      if (!reservation.allowed) {
        return NextResponse.json({ ok: false, error: "Too many requests" }, {
          status: 429,
          headers: { "Retry-After": String(reservation.retryAfter) },
        })
      }
    } catch {
      console.error("[contact] abuse protection unavailable")
      return NextResponse.json(UNAVAILABLE, { status: 503, headers: { "Retry-After": "60" } })
    }

    const resend = new Resend(apiKey)
    const safeNom = escapeHtml(nom)
    const safeContact = escapeHtml(contact)
    const safeMessage = escapeHtml(message)
    const isEmail = contact.includes("@")

    const result = await resend.emails.send({
      from,
      to,
      reply_to: isEmail ? contact : undefined,
      subject: `Contact — ${nom.slice(0, 80)}`,
      text: `Nom / Structure: ${nom}\nContact: ${contact}\n\n${message}`,
      html: `
        <h2>Nouveau message</h2>
        <p><b>Nom / Structure:</b> ${safeNom}</p>
        <p><b>Contact:</b> ${safeContact}</p>
        <hr/>
        <pre style="white-space:pre-wrap">${safeMessage}</pre>
      `,
    })

    const { data: sendData, error } = result
    if (error) {
      console.error("[contact] email provider rejected request")
      return NextResponse.json(UNAVAILABLE, { status: 502 })
    }

    return NextResponse.json({ ok: true, id: sendData?.id ?? null })
  } catch {
    console.error("[contact] unexpected error")
    return NextResponse.json(UNAVAILABLE, { status: 500 })
  }
}
