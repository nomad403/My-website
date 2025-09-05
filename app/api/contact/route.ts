// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { nom?: string; prenom?: string; contact?: string; message?: string };

export async function POST(req: Request) {
  try {
    // Limite simple (64 KB)
    const reader = req.body?.getReader?.();
    if (reader) {
      let total = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value?.length ?? 0;
        if (total > 64 * 1024) {
          return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
        }
      }
      // Re-clone la requête pour lire à nouveau le body
      req = new Request(req, { body: await req.blob() });
    }

    let data: Body | null = null;
    try {
      data = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
    }

    const nom = (data?.nom || "").trim();
    const prenom = (data?.prenom || "").trim();
    const contact = (data?.contact || "").trim();
    const message = (data?.message || "").trim();

    if (!nom || !prenom || !contact || !message) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM; // ex: contact@nomad403.com (domaine vérifié)
    const to = process.env.RESEND_TO;     // ex: nomad403@protonmail.com

    if (!apiKey) return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 });
    if (!from)   return NextResponse.json({ ok: false, error: "RESEND_FROM missing" }, { status: 500 });
    if (!to)     return NextResponse.json({ ok: false, error: "RESEND_TO missing" }, { status: 500 });

    const resend = new Resend(apiKey);

    const subject = `Contact — ${prenom} ${nom}`;
    const isEmail = /\S+@\S+\.\S+/.test(contact);

    const result = await resend.emails.send({
      from,
      to,
      reply_to: isEmail ? contact : undefined,
      subject,
      text: `Nom: ${nom}\nPrénom: ${prenom}\nContact: ${contact}\n\n${message}`,
      html: `
        <h2>Nouveau message</h2>
        <p><b>Nom:</b> ${nom}</p>
        <p><b>Prénom:</b> ${prenom}</p>
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