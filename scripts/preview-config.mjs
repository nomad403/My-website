import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { resolve } from "node:path"

export const ACCOUNT_ID = "24b9563ae11191fe9a824f9e595783da"
export const PREVIEW_BUCKET = "nomad403-preview-opennext-cache"
export function previewConfigs(root, { branch, buildId, cwd = process.cwd() }) {
  assert.ok(branch && branch !== "main", "Preview publication must not target main")
  assert.match(buildId, /^[A-Za-z0-9_-]{1,100}$/)
  assert.equal(root.name, "my-website")
  assert.deepEqual(Object.keys(root.previews).sort(), ["durable_objects","images","r2_buckets","services","vars"])
  assert.deepEqual(root.previews.images, {binding:"IMAGES"})
  assert.deepEqual(root.assets, {directory:".open-next/assets",binding:"ASSETS"})
  assert.deepEqual(root.previews.services, [])
  assert.deepEqual(root.previews.vars, { NOMAD403_ENV: "preview" })
  assert.deepEqual(root.previews.r2_buckets, [{binding:"NEXT_INC_CACHE_R2_BUCKET",bucket_name:PREVIEW_BUCKET}])
  assert.notEqual(root.r2_buckets[0].bucket_name, PREVIEW_BUCKET)
  assert.deepEqual(root.previews.durable_objects, {bindings:[{name:"CONTACT_LIMITER",class_name:"ContactLimiter"}]})
  const branchKey = createHash("sha256").update(branch).digest("hex").slice(0,12)
  const prefix = "preview/" + branchKey + "/" + buildId
  const native = structuredClone(root)
  native.main = resolve(cwd, root.main)
  native.assets.directory = resolve(cwd, root.assets.directory)
  native.account_id = ACCOUNT_ID
  // ctx.exports is enabled by default from 2025-11-17; retain existing flags.
  assert.ok(root.compatibility_date >= "2025-11-17" && !root.compatibility_flags.includes("disable_ctx_exports"), "ctx.exports unavailable for this compatibility configuration")
  native.previews.vars.NEXT_INC_CACHE_R2_PREFIX = prefix
  // The cache CLI reads top-level bindings, NOT the native previews block.
  const runtime = {
    name: root.name, main: native.main, account_id: ACCOUNT_ID,
    compatibility_date: root.compatibility_date,
    compatibility_flags: native.compatibility_flags,
    assets: native.assets, exports: root.exports,
    vars: native.previews.vars,
    r2_buckets: root.previews.r2_buckets,
    images: root.previews.images,
    durable_objects: root.previews.durable_objects,
    services: [], routes: [],
  }
  const cache = {
    name:root.name, account_id:ACCOUNT_ID,
    compatibility_date:root.compatibility_date, compatibility_flags:native.compatibility_flags,
    vars:native.previews.vars, r2_buckets:root.previews.r2_buckets, services:[], routes:[],
  }
  assert.ok(!JSON.stringify(cache).includes(root.r2_buckets[0].bucket_name))
  return { native, cache, runtime, branchKey, prefix }
}

export function verifyPreviewBuildEnvironment(env, files = []) {
  const isPreview = env.NOMAD403_PREVIEW_BUILD === "1" ||
    (env.WORKERS_CI === "1" && env.WORKERS_CI_BRANCH && env.WORKERS_CI_BRANCH !== "main")
  if (!isPreview) return false
  const forbidden = Object.keys(env).filter(key =>
    /^(?:NEXT_PUBLIC_)?(RESEND_|UPSTASH_|KV_REST_|STRIPE_|DATABASE_URL$|DIRECT_DATABASE_URL$|AUTH_SECRET$|SESSION_SECRET$)/.test(key) && env[key])
  assert.equal(forbidden.length, 0, "Preview build contains application credentials: " + forbidden.join(", "))
  assert.equal(files.length, 0, "Preview build refuses local env files: " + files.join(", "))
  return true
}
