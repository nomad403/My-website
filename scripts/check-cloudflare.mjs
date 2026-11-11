import assert from "node:assert/strict"
import {existsSync,readFileSync} from "node:fs"
const config=JSON.parse(readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8"))
assert.equal(config.name,"my-website","Unexpected Worker target")
assert.equal(config.main,"cloudflare/worker.mjs")
assert.equal(config.keep_vars,true)
assert.deepEqual(config.durable_objects,{bindings:[{name:"CONTACT_LIMITER",class_name:"ContactLimiter"}]})
assert.deepEqual(config.exports,{ContactLimiter:{type:"durable-object",storage:"sqlite"}})
assert.deepEqual(config.previews.durable_objects,config.durable_objects)
assert.equal(config.services?.length,1)
assert.equal(config.services[0].binding,"WORKER_SELF_REFERENCE")
assert.equal(config.services[0].service,config.name,"Self binding must match Worker name")
assert.ok(config.compatibility_flags.includes("nodejs_compat"))
assert.equal(config.assets.binding,"ASSETS")
assert.equal(config.assets.directory,".open-next/assets")
assert.equal(config.r2_buckets?.length,1)
assert.equal(config.r2_buckets[0].binding,"NEXT_INC_CACHE_R2_BUCKET")
assert.equal(config.r2_buckets[0].bucket_name,"my-v0-project-opennext-cache")
assert.equal(config.images.binding,"IMAGES")
assert.deepEqual(config.routes,[],"No production route or custom domain may be configured here")
// Preview services must not call the active production Worker. No self service is
// supplied until an OpenNext loopback adapter is validated; remote Preview is NO-GO.
assert.deepEqual(Object.keys(config.previews).sort(),["durable_objects","images","r2_buckets","services","vars"])
assert.deepEqual(config.previews.vars,{NOMAD403_ENV:"preview"})
assert.deepEqual(config.previews.services,[],"Preview service bindings can reach production")
assert.deepEqual(config.previews.r2_buckets,[{binding:"NEXT_INC_CACHE_R2_BUCKET",bucket_name:"nomad403-preview-opennext-cache"}])
assert.notEqual(config.previews.r2_buckets[0].bucket_name,config.r2_buckets[0].bucket_name)
assert.deepEqual(config.previews.images,{binding:"IMAGES"})
assert.ok(!config.env,"Environment overrides require a separate review")
assert.ok(!config.build,"Wrangler must not rebuild or migrate during deployment")
const pkg=JSON.parse(readFileSync(new URL("../package.json",import.meta.url),"utf8"))
assert.equal(pkg.scripts.build,"node scripts/build.mjs")
assert.equal(pkg.scripts["build:next"],"next build")
assert.equal(pkg.scripts["postbuild:next"],"next-sitemap")
assert.equal(pkg.devDependencies["@opennextjs/cloudflare"],"1.20.16")
assert.equal(pkg.devDependencies.wrangler,"4.160.1")
assert.ok(!pkg.scripts["deploy:cloudflare"].includes(" build"),"Deploy must use the existing artifact")
assert.ok(existsSync(new URL("../open-next.config.ts",import.meta.url)))
if(process.argv.includes("--built")){
 for(const path of [".open-next/worker.js",".open-next/assets",".open-next/.build/open-next.config.edge.mjs"]){
  assert.ok(existsSync(new URL("../"+path,import.meta.url)),"Build OpenNext first: "+path)
 }
}
console.log("Cloudflare config verified locally; Preview R2 target proposed, no service bindings. Remote Preview remains NO-GO pending loopback/cache bootstrap and resource verification.")
