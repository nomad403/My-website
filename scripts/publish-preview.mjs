import assert from "node:assert/strict"
import { existsSync, renameSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { execFileSync, spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { previewConfigs, verifyPreviewBuildEnvironment } from "./preview-config.mjs"
import { auditRemotePreview, cloudflareReadOnly } from "./preview-remote.mjs"

function run(file, args) {
  const native=file.includes("wrangler")
  const result = spawnSync(process.execPath, [resolve(file), ...args], { stdio: native?"pipe":"inherit", encoding:"utf8",env: process.env })
  if(native){writeFileSync(".wrangler/last-preview-output.log",(result.stdout??"")+(result.stderr??""));if(result.status===0){const start=(result.stdout??"").indexOf("{");try{const data=JSON.parse(result.stdout.slice(start));console.log(JSON.stringify({published:true,id:data.id,urls:data.urls??data.url??data.preview_urls??null}))}catch{console.log("Preview published; inspect deployment metadata for URL")}}}
  assert.equal(result.status, 0, "Preview command failed; production was not targeted")
}
try {
  const root = JSON.parse(readFileSync("wrangler.jsonc", "utf8"))
  const branch = process.env.WORKERS_CI_BRANCH || execFileSync("git", ["branch","--show-current"], {encoding:"utf8"}).trim()
  const commit = execFileSync("git", ["rev-parse","HEAD"], {encoding:"utf8"}).trim()
  if (process.env.WORKERS_CI_COMMIT_SHA) assert.equal(process.env.WORKERS_CI_COMMIT_SHA, commit)
  verifyPreviewBuildEnvironment({ ...process.env, NOMAD403_PREVIEW_BUILD:"1" },
    readdirSync(".").filter(p => (/^\.env(?:\.|$)/.test(p) || /^\.dev\.vars/.test(p)) && !p.endsWith(".example")))
  const buildId = readFileSync(".open-next/assets/BUILD_ID", "utf8").trim()
  assert.equal(buildId, readFileSync(".next/BUILD_ID", "utf8").trim(), "OpenNext artifacts are stale")
  const plan = previewConfigs(root, { branch, buildId })
  const get = cloudflareReadOnly()
  // All remote checks precede any cache write or Preview publication.
  const audit = await auditRemotePreview(get, branch, plan.branchKey)
  console.log(JSON.stringify({ ...audit, branch, commit, prefix:plan.prefix }))
  const directory = ".wrangler/native-preview"
  mkdirSync(directory, {recursive:true})
  const nativePath = directory + "/wrangler.native.json"
  const cachePath = directory + "/wrangler.cache.json"
  writeFileSync(nativePath, JSON.stringify(plan.native,null,2))
  writeFileSync(cachePath, JSON.stringify(plan.cache,null,2))
  if (process.argv.includes("--check")) {
    console.log("Read-only Preview preflight passed; no remote writes performed.")
  } else {
  // Official OpenNext initialization, with top-level PREVIEW bindings only.
  // Missing buckets fail preflight; the SDK helper must only receive the
  // separately authorized and verified Preview bucket.
  run("node_modules/@opennextjs/cloudflare/dist/cli/index.js",
    ["populateCache","remote","--config",cachePath])
  // Re-check immediately before publishing; do not merge remote Base settings.
  await auditRemotePreview(get, branch, plan.branchKey)
  run("node_modules/wrangler/bin/wrangler.js",
    ["preview","--config",nativePath,"--ignore-base-config","--name",branch,"--tag",commit,"--message","Preview commit "+commit,"--json",...(existsSync(".wrangler/qualification-secrets.json")?["--secrets-file",".wrangler/qualification-secrets.json"]:[])])
  if(existsSync(".wrangler/qualification-secrets.json")) renameSync(".wrangler/qualification-secrets.json",".wrangler/qualification-secrets.applied.json")
  }
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
