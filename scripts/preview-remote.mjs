import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { ACCOUNT_ID, PREVIEW_BUCKET } from "./preview-config.mjs"

export function cloudflareReadOnly() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID)
    assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, ACCOUNT_ID, "Unexpected Cloudflare account")
  let token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) {
    const configHome = process.platform === "win32" ? join(process.env.APPDATA, "xdg.config") :
      (process.env.XDG_CONFIG_HOME || join(homedir(), ".config"))
    const text = readFileSync(join(configHome, ".wrangler", "config", "default.toml"), "utf8")
    token = text.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1]
  }
  assert.ok(token, "Cloudflare authentication unavailable")
  // Expose GET only. Credential values and API bodies are never logged.
  return async (path, allowedCodes = []) => {
    assert.ok(path.startsWith("/workers/") || path.startsWith("/r2/"), "Unexpected API path")
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
  const production = await get("/workers/scripts/my-website/settings")
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
        (name === "ASSETS" && b.type === "assets") ||
        (name === "IMAGES" && b.type === "images") ||
        (name === "CONTACT_LIMITER" && b.type === "durable_object_namespace" &&
          b.class_name === "ContactLimiter" && !b.script_name && b.namespace_id && b.namespace_id !== productionDo)
      assert.ok(safe, "Unexpected or unsafe Preview binding: " + name)
    }
  }
  return { worker: worker.name, bucket: bucket.name, baseEmpty: true, existingDeployment: !!deployment }
}
