import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { Miniflare, convertV4MiniflareOptions } from "miniflare"
import { previewConfigs, verifyPreviewBuildEnvironment } from "../scripts/preview-config.mjs"
import { auditRemotePreview } from "../scripts/preview-remote.mjs"

const root = JSON.parse(readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8"))
test("Preview configuration partitions cache and leaves production configuration unchanged",()=>{
  const before=JSON.stringify(root)
  const a=previewConfigs(root,{branch:"feature/a",buildId:"build-a"})
  const b=previewConfigs(root,{branch:"feature/b",buildId:"build-a"})
  const c=previewConfigs(root,{branch:"feature/a",buildId:"build-b"})
  assert.notEqual(a.prefix,b.prefix);assert.notEqual(a.prefix,c.prefix)
  assert.equal(JSON.stringify(root),before)
  assert.ok(!root.compatibility_flags.includes("enable_ctx_exports"))
  assert.deepEqual(a.native.compatibility_flags,root.compatibility_flags)
  assert.deepEqual(a.cache.services,[])
  assert.ok(!JSON.stringify(a.cache).includes(root.r2_buckets[0].bucket_name))
  assert.equal(a.native.previews.vars.NEXT_INC_CACHE_R2_PREFIX,a.cache.vars.NEXT_INC_CACHE_R2_PREFIX)
  assert.throws(()=>previewConfigs(root,{branch:"main",buildId:"build-a"}))
  for(const change of [
    c=>c.previews.r2_buckets[0].bucket_name=c.r2_buckets[0].bucket_name,
    c=>c.previews.services.push({binding:"WORKER_SELF_REFERENCE",service:"my-website"}),
    c=>c.previews.durable_objects.bindings[0].script_name="my-website",
  ]){const copy=structuredClone(root);change(copy);assert.throws(()=>previewConfigs(copy,{branch:"feature/a",buildId:"build-a"}))}
})
test("Preview build refuses application credentials and local env files",()=>{
  const base={WORKERS_CI:"1",WORKERS_CI_BRANCH:"feature/a"}
  for(const name of ["RESEND_API_KEY","STRIPE_SECRET","DATABASE_URL","UPSTASH_REDIS_REST_TOKEN"]){
    assert.throws(()=>verifyPreviewBuildEnvironment({...base,[name]:"private-placeholder"}))
  }
  assert.throws(()=>verifyPreviewBuildEnvironment(base,[".env.local"]))
  assert.equal(verifyPreviewBuildEnvironment({...base,CLOUDFLARE_API_TOKEN:"ci-only-placeholder"}),true)
  assert.equal(verifyPreviewBuildEnvironment({WORKERS_CI:"1",WORKERS_CI_BRANCH:"main",RESEND_API_KEY:"private-placeholder"}),false)
})
test("Remote preflight blocks unsafe Base, bucket or deployment before writes",async()=>{
  const plan=previewConfigs(root,{branch:"feature/a",buildId:"build-a"})
  const values={
    "/workers/workers/my-website":{name:"my-website"},
    "/r2/buckets/nomad403-preview-opennext-cache":{name:"nomad403-preview-opennext-cache"},
    "/workers/scripts/my-website/settings":{bindings:[{name:"CONTACT_LIMITER",namespace_id:"production-namespace"}]},
  }
  const get=async path=>values[path]??null
  assert.equal((await auditRemotePreview(get,"feature/a",plan.branchKey)).existingDeployment,false)
  const worker=values["/workers/workers/my-website"]
  worker.previews_base_config={env:{RESEND_API_KEY:{type:"secret_text"}}}
  await assert.rejects(auditRemotePreview(get,"feature/a",plan.branchKey))
  delete worker.previews_base_config
  const path="/workers/workers/my-website/previews/feature%2Fa/deployments/latest"
  for(const env of [
    {WORKER_SELF_REFERENCE:{type:"service",service:"my-website"}},
    {NEXT_INC_CACHE_R2_BUCKET:{type:"r2_bucket",bucket_name:root.r2_buckets[0].bucket_name}},
    {RESEND_API_KEY:{type:"secret_text"}},
    {CONTACT_LIMITER:{type:"durable_object_namespace",class_name:"ContactLimiter",namespace_id:"production-namespace"}},
  ]){values[path]={env};await assert.rejects(auditRemotePreview(get,"feature/a",plan.branchKey))}
})

test("ctx.exports: nested calls and revalidation stay in Preview without production services or credentials",async()=>{
  let outbound=0
  const stub=`
export class DOQueueHandler {}
export class DOShardedTagCache {}
export class BucketCachePurge {}
export default { async fetch(request,env) {
  const url=new URL(request.url)
  if(url.pathname==="/nested"){url.pathname="/loop";return env.WORKER_SELF_REFERENCE.fetch(new Request(url,request))}
  if(url.pathname==="/loop"){url.pathname="/target";return env.WORKER_SELF_REFERENCE.fetch(new Request(url,request))}
  if(url.pathname==="/revalidate"){url.pathname="/target";return env.WORKER_SELF_REFERENCE.fetch(new Request(url,{method:"HEAD",headers:{"x-prerender-revalidate":"local-fixture"}}))}
  if(request.method==="HEAD")return new Response(null,{headers:{"x-nextjs-cache":"REVALIDATED"}})
  return Response.json({marker:env.NOMAD403_ENV,prefix:env.NEXT_INC_CACHE_R2_PREFIX,names:Object.keys(env).sort(),secret:env.RESEND_API_KEY})
} }`
  const modules=[
    {type:"ESModule",path:resolve("cloudflare/worker.mjs")},
    {type:"ESModule",path:resolve("cloudflare/preview-env.mjs")},
    {type:"ESModule",path:resolve("cloudflare/contact-limiter.mjs")},
    {type:"ESModule",path:resolve(".open-next/worker.js"),contents:stub},
  ]
  const worker=(name,preview)=>({
    name,modules,compatibilityDate:"2026-11-10",
    compatibilityFlags:["nodejs_compat"],
    bindings:{...(preview?{NOMAD403_ENV:"preview",NEXT_INC_CACHE_R2_PREFIX:"preview/aaaaaaaaaaaa/test-build"}:{}),
      RESEND_API_KEY:"PRODUCTION_SECRET_SENTINEL",WORKER_SELF_REFERENCE:"PRODUCTION_SERVICE_SENTINEL"},
    r2Buckets:{NEXT_INC_CACHE_R2_BUCKET:"preview-local"},
    outboundService:()=>{outbound++;throw new Error("External calls forbidden")},
  })
  const mf=new Miniflare(convertV4MiniflareOptions({workers:[worker("preview",true),worker("production",false)]}))
  try{
    for(const path of ["/target","/loop","/nested"]){
      const r=await mf.dispatchFetch("http://preview.local"+path)
      assert.equal(r.status,200)
      const d=await r.json()
      assert.equal(d.marker,"preview");assert.equal(d.prefix,"preview/aaaaaaaaaaaa/test-build")
      assert.ok(!d.names.includes("RESEND_API_KEY"));assert.equal(d.secret,undefined)
      assert.ok(d.names.includes("WORKER_SELF_REFERENCE"))
    }
    const revalidated=await mf.dispatchFetch("http://preview.local/revalidate")
    assert.equal(revalidated.headers.get("x-nextjs-cache"),"REVALIDATED")
    assert.equal(outbound,0)
    const production=await mf.getWorker("production")
    const original=await (await production.fetch("http://production.local/target")).json()
    assert.equal(original.secret,"PRODUCTION_SECRET_SENTINEL")
    assert.ok(original.names.includes("WORKER_SELF_REFERENCE"))
  }finally{await mf.dispose()}
})
