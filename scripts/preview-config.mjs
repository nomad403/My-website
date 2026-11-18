import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { resolve } from "node:path"

export const ACCOUNT_ID = "24b9563ae11191fe9a824f9e595783da"
export const PREVIEW_BUCKET = "nomad403-preview-opennext-cache"
export const PREVIEW_SHOP_DB_ID = "2eb5526a-1d0c-469c-ae36-debe83ec8218"
export const PRODUCTION_SHOP_DB_ID = "a5f76558-e7c4-4ca6-bd3a-c1f87243a6df"

export function previewConfigs(root, { branch, buildId, cwd = process.cwd() }) {
  assert.equal(branch, "qualification/shop-lot-7", "Only the Shop qualification Preview may be published")
  assert.match(buildId, /^[A-Za-z0-9_-]{1,100}$/)
  assert.equal(root.name, "my-website")
  assert.deepEqual(Object.keys(root.previews).sort(), [
    "d1_databases",
    "durable_objects",
    "images",
    "r2_buckets",
    "services",
    "vars",
  ])
  assert.deepEqual(root.previews.images, { binding: "IMAGES" })
  assert.deepEqual(root.assets, { directory: ".open-next/assets", binding: "ASSETS" })
  assert.deepEqual(root.previews.services, [])
  assert.equal(root.previews.vars.NOMAD403_ENV, "preview")
  assert.equal(root.previews.vars.SHOP_DB_ID, PREVIEW_SHOP_DB_ID)
  assert.equal(root.previews.vars.SHOP_ENABLED, "1")
  assert.deepEqual(root.d1_databases, [
    {
      binding: "SHOP_DB",
      database_name: "nomad403-prod",
      database_id: PRODUCTION_SHOP_DB_ID,
      migrations_dir: "drizzle-d1",
    },
  ])
  assert.equal(root.vars?.NOMAD403_ENV, "production")
  assert.equal(root.vars?.SHOP_DB_ID, PRODUCTION_SHOP_DB_ID)
  assert.equal(root.vars?.SHOP_ENABLED, "1")
  assert.equal(root.vars?.APP_URL, "https://www.nomad403.com")
  assert.deepEqual(root.previews.d1_databases, [
    {
      binding: "SHOP_DB",
      database_name: "nomad403-shop-qualification",
      database_id: PREVIEW_SHOP_DB_ID,
      migrations_dir: "drizzle-d1",
    },
  ])
  assert.deepEqual(root.previews.r2_buckets, [
    { binding: "NEXT_INC_CACHE_R2_BUCKET", bucket_name: PREVIEW_BUCKET },
  ])
  assert.notEqual(root.r2_buckets[0].bucket_name, PREVIEW_BUCKET)
  assert.deepEqual(root.previews.durable_objects, {
    bindings: [
      { name: "CONTACT_LIMITER", class_name: "ContactLimiter" },
      { name: "AUTH_LIMITER", class_name: "AuthLimiter" },
    ],
  })
  assert.deepEqual(root.durable_objects, {
    bindings: [
      { name: "CONTACT_LIMITER", class_name: "ContactLimiter" },
      { name: "AUTH_LIMITER", class_name: "AuthLimiter" },
    ],
  })
  const branchKey = createHash("sha256").update(branch).digest("hex").slice(0, 12)
  const prefix = "preview/" + branchKey + "/" + buildId
  const native = structuredClone(root)
  native.main = resolve(cwd, root.main)
  native.assets.directory = resolve(cwd, root.assets.directory)
  native.account_id = ACCOUNT_ID
  native.previews.d1_databases = root.previews.d1_databases.map((db) => ({
    ...db,
    migrations_dir: resolve(cwd, db.migrations_dir),
  }))
  assert.ok(
    root.compatibility_date >= "2025-11-17" && !root.compatibility_flags.includes("disable_ctx_exports"),
    "ctx.exports unavailable for this compatibility configuration",
  )
  native.previews.vars.NEXT_INC_CACHE_R2_PREFIX = prefix
  // Preview publish must not inherit production shop D1/vars at top-level.
  native.vars = { ...root.previews.vars, NEXT_INC_CACHE_R2_PREFIX: prefix }
  native.d1_databases = native.previews.d1_databases
  native.durable_objects = root.previews.durable_objects
  native.r2_buckets = root.previews.r2_buckets
  const runtime = {
    name: root.name,
    main: native.main,
    account_id: ACCOUNT_ID,
    compatibility_date: root.compatibility_date,
    compatibility_flags: native.compatibility_flags,
    assets: native.assets,
    exports: root.exports,
    vars: native.previews.vars,
    r2_buckets: root.previews.r2_buckets,
    images: root.previews.images,
    durable_objects: root.previews.durable_objects,
    d1_databases: native.previews.d1_databases,
    services: [],
    routes: [],
  }
  const cache = {
    name: root.name,
    account_id: ACCOUNT_ID,
    compatibility_date: root.compatibility_date,
    compatibility_flags: native.compatibility_flags,
    vars: { NOMAD403_ENV: "preview", NEXT_INC_CACHE_R2_PREFIX: prefix },
    r2_buckets: root.previews.r2_buckets,
    services: [],
    routes: [],
  }
  assert.ok(!JSON.stringify(cache).includes(root.r2_buckets[0].bucket_name))
  assert.ok(!JSON.stringify(native.d1_databases).includes(PRODUCTION_SHOP_DB_ID))
  return { native, cache, runtime, branchKey, prefix }
}

export function verifyPreviewBuildEnvironment(env, files = []) {
  const isPreview =
    env.NOMAD403_PREVIEW_BUILD === "1" ||
    (env.WORKERS_CI === "1" && env.WORKERS_CI_BRANCH && env.WORKERS_CI_BRANCH !== "main")
  if (!isPreview) return false
  const forbidden = Object.keys(env).filter(
    (key) =>
      /^(?:NEXT_PUBLIC_)?(RESEND_|UPSTASH_|KV_REST_|STRIPE_|DATABASE_URL$|DIRECT_DATABASE_URL$|AUTH_SECRET$|AUTH_MFA_KEY$|SESSION_SECRET$)/.test(
        key,
      ) && env[key],
  )
  assert.equal(forbidden.length, 0, "Preview build contains application credentials: " + forbidden.join(", "))
  assert.equal(files.length, 0, "Preview build refuses local env files: " + files.join(", "))
  return true
}
