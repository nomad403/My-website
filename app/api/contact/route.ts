import { NextResponse } from "next/server"
import { Resend } from "resend"
import {
  escapeHtml,
  sanitizeContactPayload,
  validateContactPayload,
} from "@/lib/contact-validation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Body = { nom?: string; contact?: string; message?: string }

export async function POST(req: Request) {
  try {
    let data: Body | null = null
    try {
      data = (await req.json()) as Body
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
    }

    if (
      typeof data?.nom !== "string" ||
      typeof data?.contact !== "string" ||
      typeof data?.message !== "string"
    ) {
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

    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 })
    }
    if (!from) {
      return NextResponse.json({ ok: false, error: "RESEND_FROM missing" }, { status: 500 })
    }
    if (!to) {
      return NextResponse.json({ ok: false, error: "RESEND_TO missing" }, { status: 500 })
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
      console.error("[Resend] error:", error)
      return NextResponse.json(
        {
          ok: false,
          name: error.name,
          message: error.message,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ ok: true, id: sendData?.id ?? null })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error"
    console.error("[contact] fatal:", e)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
