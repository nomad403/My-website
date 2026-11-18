/**
 * Read-only readiness probe for production shop bindings/secrets (names only).
 * Does not deploy and never prints secret values.
 */
import assert from "node:assert/strict"
import { cloudflareReadOnly } from "./preview-remote.mjs"
import { PRODUCTION_SHOP_DB_ID } from "./preview-config.mjs"

const REQUIRED_SECRETS = [
  "AUTH_SECRET",
  "AUTH_MFA_KEY",
  "ADMIN_EMAILS",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "CF_ACCESS_TEAM_DOMAIN",
  "CF_ACCESS_AUD",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_ALLOW_LIVE",
  "STRIPE_PRICE_ESSENTIAL_MONTHLY",
  "STRIPE_PRICE_ESSENTIAL_YEARLY",
  "STRIPE_PRICE_PLUS_MONTHLY",
  "STRIPE_PRICE_PLUS_YEARLY",
  "STRIPE_PRICE_PREMIUM_MONTHLY",
  "STRIPE_PRICE_PREMIUM_YEARLY",
  "STRIPE_PRICE_FRIEND_HOST_MONTHLY",
  "STRIPE_PRICE_FRIEND_CARE_MONTHLY",
]

const get = cloudflareReadOnly()
const settings = await get("/workers/scripts/my-website/settings")
const bindings = settings.bindings ?? []
const byName = Object.fromEntries(bindings.map((b) => [b.name, b]))

const shopDb = bindings.find((b) => b.name === "SHOP_DB" && b.type === "d1")
const authLimiter = bindings.find((b) => b.name === "AUTH_LIMITER" && b.type === "durable_object_namespace")
const qualLeak = bindings.some(
  (b) => b.type === "d1" && (b.id ?? b.database_id) === "2eb5526a-1d0c-469c-ae36-debe83ec8218",
)

const secretPresence = Object.fromEntries(
  REQUIRED_SECRETS.map((name) => {
    const b = byName[name]
    return [name, Boolean(b && (b.type === "secret_text" || b.type === "plain_text"))]
  }),
)

const vars = {
  NOMAD403_ENV: byName.NOMAD403_ENV?.text ?? null,
  SHOP_ENABLED: byName.SHOP_ENABLED?.text ?? null,
  SHOP_DB_ID: byName.SHOP_DB_ID?.text ?? null,
  APP_URL: byName.APP_URL?.text ?? null,
}

const report = {
  d1Bound: Boolean(shopDb && (shopDb.id ?? shopDb.database_id) === PRODUCTION_SHOP_DB_ID),
  authLimiterBound: Boolean(authLimiter),
  qualificationDbLeaked: qualLeak,
  vars,
  secretsPresent: secretPresence,
  secretsReady: REQUIRED_SECRETS.every((name) => secretPresence[name]),
  deployReady: false,
}

report.deployReady =
  report.d1Bound &&
  report.authLimiterBound &&
  !report.qualificationDbLeaked &&
  vars.NOMAD403_ENV === "production" &&
  vars.SHOP_ENABLED === "1" &&
  vars.SHOP_DB_ID === PRODUCTION_SHOP_DB_ID &&
  vars.APP_URL === "https://www.nomad403.com" &&
  report.secretsReady

assert.equal(report.qualificationDbLeaked, false, "Qualification D1 must not be on production")
console.log(JSON.stringify(report, null, 2))
if (!report.deployReady) {
  console.error(
    "Production shop not fully ready: bind D1/AUTH_LIMITER via deploy, then set missing secrets (see docs/SHOP-PRODUCTION.md).",
  )
  process.exitCode = 2
}
