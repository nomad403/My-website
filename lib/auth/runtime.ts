import { cookies } from "next/headers"
import { DrizzleAuthStore } from "../db/auth-store"
import { DrizzleBillingStore } from "../db/billing-store"
import { getDb } from "../db/client"
import { readStripeEnv } from "../billing/stripe-env"
import { createStripeGateway } from "../billing/stripe-gateway"
import { SESSION_COOKIE } from "./cookie"
import { createProductionLimiter } from "./rate-limit"
import { createAuthService, readAuthEnv, type Mailer } from "./service"

function createResendMailer(): Mailer {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  return {
    configured: Boolean(apiKey && from),
    async sendMagicLink(to, url) {
      if (!apiKey || !from) throw new Error("Mail is not configured")
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      const result = await resend.emails.send({
        from,
        to,
        subject: "Votre lien de connexion Nomad403",
        text: [
          "Bonjour,",
          "",
          "Utilisez ce lien pour ouvrir votre session Nomad403. Il expire dans 15 minutes et ne fonctionne qu'une fois.",
          url,
          "",
          "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
          "",
          "Use this link to open your Nomad403 session. It expires in 15 minutes and works once.",
        ].join("\n"),
      })
      if (result.error) throw new Error("Mail was rejected")
    },
  }
}

export async function productionPlatform() {
  const env = readAuthEnv()
  const limiter = createProductionLimiter()
  if (!env || !limiter || !process.env.DATABASE_URL) return null
  const db = getDb()
  const stripe = readStripeEnv()
  return {
    env,
    limiter,
    service: createAuthService({
      store: new DrizzleAuthStore(db),
      limiter,
      mailer: createResendMailer(),
      env,
      now: () => new Date(),
    }),
    billing: new DrizzleBillingStore(db),
    stripe,
    gateway: stripe ? createStripeGateway(stripe) : null,
  }
}

export async function productionAuth() {
  const platform = await productionPlatform()
  if (!platform) return null
  return { env: platform.env, service: platform.service }
}

export async function readRequestCookie() {
  const jar = await cookies()
  return jar.get(SESSION_COOKIE)?.value ?? null
}
