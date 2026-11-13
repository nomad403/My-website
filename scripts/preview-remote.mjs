import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { homedir } from "node:os"
import { join } from "node:path"
import { ACCOUNT_ID, PREVIEW_BUCKET } from "./preview-config.mjs"

export function cloudflareReadOnly() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID)
    assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, ACCOUNT_ID, "Unexpected Cloudflare account")
  let token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) {
    // Let Wrangler refresh its own OAuth session; never implement token rotation here.
    try {
      execFileSync(process.execPath, [fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url)), "whoami", "--json"], {stdio:"pipe"})
    } catch { throw new Error("Cloudflare login unavailable; run wrangler login") }
    const configHome = process.platform === "win32" ? join(process.env.APPDATA, "xdg.config") :
      (process.env.XDG_CONFIG_HOME || join(homedir(), ".config"))
    const text = readFileSync(join(configHome, ".wrangler", "config", "default.toml"), "utf8")
    token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1]
  }
  assert.ok(token, "Cloudflare authentication unavailable")
  // Expose GET only. Credential values and API bodies are never logged.
  return async (path, allowedCodes = []) => {
    assert.ok(path.startsWith("/workers/") || path.startsWith("/r2/") || path.startsWith("/d1/"), "Unexpected API path")
    const response = await fetch("https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT_ID + path, {
      headers: { Authorization: "Bearer " + token }, signal: AbortSignal.timeout(20000),
    })
    const body = await response.json()
    if (!body.success) {
      const codes = (body.errors ?? []).map(error => error.code)
      if (codes.some(code => allowedCodes.includes(code))) return null
      throw new Error("Cloudflare read failed (" + response.status + "; codes " + codes.join(",") + ")")
    }
    return body.result
  }
}

export async function auditRemotePreview(get, branch, branchKey) {
  const worker = await get("/workers/workers/my-website")
  assert.equal(worker.name, "my-website")
  assert.equal(Object.keys(worker.previews_base_config ?? {}).length, 0,
    "Previews Base must be empty; review its bindings/secrets before publication")
  const bucket = await get("/r2/buckets/" + PREVIEW_BUCKET)
  assert.equal(bucket.name, PREVIEW_BUCKET, "Preview bucket not verified")
  const database=await get("/d1/database/2eb5526a-1d0c-469c-ae36-debe83ec8218")
  assert.equal(database.name,"nomad403-shop-qualification","Wrong D1 target")
  const production = await get("/workers/scripts/my-website/settings")
  assert.ok(!production.bindings?.some(b=>b.type==="d1"&&(b.id??b.database_id)==="2eb5526a-1d0c-469c-ae36-debe83ec8218"),"Qualification DB is bound to production")
  const productionDo = production.bindings?.find(b => b.name === "CONTACT_LIMITER")?.namespace_id
  assert.ok(productionDo, "Production namespace metadata unavailable for isolation check")
  assert.ok(!production.bindings?.some(b => b.type === "r2_bucket" && b.bucket_name === PREVIEW_BUCKET),
    "Preview bucket is bound to production")
  const deployment = await get("/workers/workers/my-website/previews/" +
    encodeURIComponent(branch) + "/deployments/latest", [10025, 10222])
  if (deployment) {
    assert.ok(deployment.env && typeof deployment.env === "object", "Preview deployment bindings unavailable")
    for (const [name, b] of Object.entries(deployment.env)) {
      const safe =
        (name === "NOMAD403_ENV" && b.type === "plain_text" && b.text === "preview") ||
        (name === "NEXT_INC_CACHE_R2_PREFIX" && b.type === "plain_text" &&
          new RegExp("^preview/" + branchKey + "/[A-Za-z0-9_-]{1,100}$").test(b.text ?? "")) ||
        (name === "NEXT_INC_CACHE_R2_BUCKET" && b.type === "r2_bucket" && b.bucket_name === PREVIEW_BUCKET) ||
        (name === "SHOP_DB" && b.type === "d1" && (b.id??b.database_id)==="2eb5526a-1d0c-469c-ae36-debe83ec8218") ||
        (["SHOP_ENABLED","SHOP_DB_ID","APP_URL","ADMIN_EMAILS","QUALIFICATION_EMAILS","RESEND_TO","RESEND_FROM","CF_ACCESS_TEAM_DOMAIN","CF_ACCESS_AUD",...["STRIPE_PUBLISHABLE_KEY","STRIPE_PRICE_ESSENTIAL_MONTHLY","STRIPE_PRICE_ESSENTIAL_YEARLY","STRIPE_PRICE_PLUS_MONTHLY","STRIPE_PRICE_PLUS_YEARLY","STRIPE_PRICE_PREMIUM_MONTHLY","STRIPE_PRICE_PREMIUM_YEARLY","STRIPE_PRICE_FRIEND_HOST_MONTHLY","STRIPE_PRICE_FRIEND_CARE_MONTHLY"]].includes(name)&&b.type==="plain_text") ||
        (["AUTH_SECRET","AUTH_MFA_KEY","ADMIN_EMAILS","QUALIFICATION_EMAILS","RESEND_TO","RESEND_FROM","RESEND_API_KEY","CF_ACCESS_TEAM_DOMAIN","CF_ACCESS_AUD","STRIPE_PRICE_ESSENTIAL_MONTHLY","STRIPE_PRICE_ESSENTIAL_YEARLY","STRIPE_PRICE_PLUS_MONTHLY","STRIPE_PRICE_PLUS_YEARLY","STRIPE_PRICE_PREMIUM_MONTHLY","STRIPE_PRICE_PREMIUM_YEARLY","STRIPE_PRICE_FRIEND_HOST_MONTHLY","STRIPE_PRICE_FRIEND_CARE_MONTHLY","STRIPE_SECRET_KEY","STRIPE_PUBLISHABLE_KEY","STRIPE_WEBHOOK_SECRET"].includes(name)&&b.type==="secret_text") ||
        (name === "ASSETS" && b.type === "assets") ||
        (name === "IMAGES" && b.type === "images") ||
        (["CONTACT_LIMITER","AUTH_LIMITER"].includes(name) && b.type === "durable_object_namespace" &&
          b.class_name === (name==="CONTACT_LIMITER"?"ContactLimiter":"AuthLimiter") && !b.script_name && b.namespace_id && b.namespace_id !== productionDo)
      if(b.type==="plain_text" && ["APP_URL","SHOP_DB_ID","SHOP_ENABLED"].includes(name))assert.equal(b.text,({APP_URL:"https://qualification-shop-lot-7-my-website.glennrichard-dev.workers.dev",SHOP_DB_ID:"2eb5526a-1d0c-469c-ae36-debe83ec8218",SHOP_ENABLED:"1"})[name],"Wrong qualification variable: "+name)
      assert.ok(safe, "Unexpected or unsafe Preview binding: " + name)
    }
  }
  return { worker: worker.name, bucket: bucket.name, baseEmpty: true, existingDeployment: !!deployment }
}
