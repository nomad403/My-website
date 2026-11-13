import {D1AuthStore} from "../db/d1/auth-store"
import {D1BillingStore} from "../db/d1/billing-store"
import {D1PromotionAdminStore} from "../db/d1/promotion-admin-store"
import {D1InterventionStore} from "../db/d1/intervention-store"
import {D1AdminStore} from "../db/d1/admin-store"
import {applyStoredD1BillingEvents} from "../db/d1/billing-event"
import type {BillingNotice} from "../billing/notices"
import type {ApplyOptions} from "../billing/apply-event"
import {cloudBindings,runtimeVariables} from "../cloudflare/runtime"
import { cookies } from "next/headers"
import { readStripeEnv } from "../billing/stripe-env"
import { createStripeGateway } from "../billing/stripe-gateway"
import { SESSION_COOKIE } from "./cookie"
import { createProductionLimiter } from "./rate-limit"
import { createAuthService, readAuthEnv, type Mailer } from "./service"

function createResendMailer(source:NodeJS.ProcessEnv): Mailer {
  const apiKey = source.RESEND_API_KEY
  const from = source.RESEND_FROM
  return {
    configured: Boolean(apiKey && from),
    async sendMagicLink(to, url) {
      if (!apiKey || !from) throw new Error("Mail is not configured")
      // Preview qualification: deliver to any address so a personal inbox can be used.
      // Optional allowlist still supported — set QUALIFICATION_EMAILS to a comma list
      // to restrict, or leave empty / set "*" to accept every recipient.
      if (source.NOMAD403_ENV === "preview") {
        const allow = String(source.QUALIFICATION_EMAILS ?? "")
          .toLowerCase()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        const open = allow.length === 0 || allow.includes("*")
        if (!open && !allow.includes(to.toLowerCase())) {
          throw new Error("preview_recipient_blocked")
        }
      }
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
    async sendPasswordReset(to, url) {
      if (!apiKey || !from) throw new Error("Mail is not configured")
      if (source.NOMAD403_ENV === "preview") {
        const allow = String(source.QUALIFICATION_EMAILS ?? "")
          .toLowerCase()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        const open = allow.length === 0 || allow.includes("*")
        if (!open && !allow.includes(to.toLowerCase())) {
          throw new Error("preview_recipient_blocked")
        }
      }
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      const result = await resend.emails.send({
        from,
        to,
        subject: "Réinitialisation du mot de passe Nomad403",
        text: [
          "Bonjour,",
          "",
          "Utilisez ce lien pour choisir un nouveau mot de passe. Il expire dans 15 minutes et ne fonctionne qu'une fois.",
          url,
          "",
          "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
        ].join("\n"),
      })
      if (result.error) throw new Error("Mail was rejected")
    },
    async sendEmailVerification(to, url) {
      if (!apiKey || !from) throw new Error("Mail is not configured")
      if (source.NOMAD403_ENV === "preview") {
        const allow = String(source.QUALIFICATION_EMAILS ?? "")
          .toLowerCase()
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
        const open = allow.length === 0 || allow.includes("*")
        if (!open && !allow.includes(to.toLowerCase())) {
          throw new Error("preview_recipient_blocked")
        }
      }
      const { Resend } = await import("resend")
      const resend = new Resend(apiKey)
      const result = await resend.emails.send({
        from,
        to,
        subject: "Confirmez votre adresse Nomad403",
        text: [
          "Bonjour,",
          "",
          "Confirmez votre adresse e-mail pour activer votre compte Nomad403. Ce lien expire dans 15 minutes et ne fonctionne qu'une fois.",
          url,
          "",
          "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.",
        ].join("\n"),
      })
      if (result.error) throw new Error("Mail was rejected")
    },
  }
}

export async function productionPlatform(){
 const bindings=cloudBindings(),source=runtimeVariables(bindings)
 const env=readAuthEnv(source),limiter=createProductionLimiter(source,bindings?.AUTH_LIMITER)
 if(!env||!limiter)return null
 const qualification=bindings?.NOMAD403_ENV==="preview"&&bindings?.SHOP_ENABLED==="1"
 if(bindings&&!qualification)return null
 if(qualification&&(!bindings.SHOP_DB||source.SHOP_DB_ID!=="2eb5526a-1d0c-469c-ae36-debe83ec8218"))return null
 if(!qualification)return null
 const d1=bindings!.SHOP_DB!.withSession("first-primary")
 const store=new D1AuthStore(d1)
 const stripe=qualification&&(!source.STRIPE_SECRET_KEY?.startsWith("sk_test_")||!source.STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_"))?null:readStripeEnv(source)
 return {env,limiter,service:createAuthService({store,limiter,mailer:createResendMailer(source),env,now:()=>new Date()}),billing:new D1BillingStore(d1),promotions:new D1PromotionAdminStore(d1),interventions:new D1InterventionStore(d1),admin:new D1AdminStore(d1),stripe,gateway:stripe?createStripeGateway(stripe):null,applyBilling:(notices:BillingNotice[],options:ApplyOptions)=>applyStoredD1BillingEvents(d1,notices,options)}
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
