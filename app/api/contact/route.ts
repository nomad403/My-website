// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

type Body = { nom?: string; prenom?: string; contact?: string; message?: string };

export async function POST(req: Request) {
  try {
    // 1) parse safe
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

    // 2) clé API
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY missing" }, { status: 500 });
    }

    // 3) envoi
    const resend = new Resend(key);
    const subject = `Contact — ${prenom} ${nom}`;
    
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",       // en prod: contact@ton-domaine.com
      to: "bglennrichard.pro@yahoo.com",
      reply_to: contact.includes("@") ? contact : undefined,
      subject,
      text: `Nom: ${nom}\nPrénom: ${prenom}\nContact: ${contact}\n\n${message}`,
      html: `
        <h2>Nouveau message</h2>
        <p><b>Nom:</b> ${nom}</p>
        <p><b>Prénom:</b> ${prenom}</p>
        <p><b>Contact:</b> ${contact}</p>
        <hr/>
        <pre style="white-space:pre-wrap">${message.replace(/</g,"&lt;")}</pre>
      `,
    });
    
    // >>> PATCH debug – expose l’erreur complète
    // le SDK renvoie { data, error }
    const { data: sendData, error } = result as any;
    
    if (error) {
      console.error("[Resend] error:", error); // console serveur
      return NextResponse.json(
        {
          ok: false,
          name: error.name,
          code: error.code,
          message: error.message,
          details: error,          // pour inspecter rapidement dans Network tab
        },
        { status: 502 }
      );
    }
    
    return NextResponse.json({ ok: true, id: sendData?.id ?? null });
    
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
