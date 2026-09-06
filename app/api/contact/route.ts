// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { nom?: string; contact?: string; message?: string };

export async function POST(req: Request) {
  try {
    // Lire le body UNE SEULE FOIS
    let data: Body | null = null;
    try {
      data = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const nom = (data?.nom || "").trim();
    const contact = (data?.contact || "").trim();
    const message = (data?.message || "").trim();

    if (!nom || !contact || !message) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM; // ex: contact@nomad403.com (domaine vérifié)
    const to = process.env.RESEND_TO;     // ex: nomad403@protonmail.com

    if (!apiKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 });
    if (!from)   return NextResponse.json({ ok: false, error: "RESEND_FROM missing" }, { status: 500 });
    if (!to)     return NextResponse.json({ ok: false, error: "RESEND_TO missing" }, { status: 500 });

    const resend = new Resend(apiKey);

    const subject = `Contact — ${nom}`;
    const isEmail = /\S+@\S+\.\S+/.test(contact);

    const result = await resend.emails.send({
      from,
      to,
      reply_to: isEmail ? contact : undefined,
      subject,
      text: `Nom / Structure: ${nom}\nContact: ${contact}\n\n${message}`,
      html: `
        <h2>Nouveau message</h2>
        <p><b>Nom / Structure:</b> ${nom}</p>
        <p><b>Contact:</b> ${contact}</p>
        <hr/>
        <pre style="white-space:pre-wrap">${message.replace(/</g, "&lt;")}</pre>
      `,
    });

    const { data: sendData, error } = result as any;
    if (error) {
      console.error("[Resend] error:", error);
      return NextResponse.json(
        { ok: false, name: error.name, code: error.code, message: error.message, details: error },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, id: sendData?.id ?? null });
  } catch (e: any) {
    console.error("[contact] fatal:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
