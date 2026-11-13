import { cloudflareReadOnly } from "./preview-remote.mjs"
const get = cloudflareReadOnly()
const deployment = await get(
  "/workers/workers/my-website/previews/" + encodeURIComponent("qualification/shop-lot-7") + "/deployments/latest",
  [10025, 10222],
)
if (!deployment?.env) {
  console.log(JSON.stringify({ ok: false, reason: "no_deployment" }))
  process.exit(0)
}
const need = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ESSENTIAL_MONTHLY",
  "STRIPE_PRICE_ESSENTIAL_YEARLY",
  "STRIPE_PRICE_PLUS_MONTHLY",
  "STRIPE_PRICE_PLUS_YEARLY",
  "STRIPE_PRICE_PREMIUM_MONTHLY",
  "STRIPE_PRICE_PREMIUM_YEARLY",
  "STRIPE_PRICE_FRIEND_HOST_MONTHLY",
  "STRIPE_PRICE_FRIEND_CARE_MONTHLY",
  "RESEND_API_KEY",
  "RESEND_FROM",
]
const present = Object.fromEntries(
  need.map((name) => [name, Boolean(deployment.env[name]) && deployment.env[name].type !== undefined]),
)
console.log(
  JSON.stringify(
    {
      ok: true,
      present,
      allPresent: need.every((name) => present[name]),
      shopEnabled: deployment.env.SHOP_ENABLED?.text ?? null,
      nomadEnv: deployment.env.NOMAD403_ENV?.text ?? null,
    },
    null,
    2,
  ),
)
