import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {previewConfigs} from './preview-config.mjs'
const root=JSON.parse(readFileSync('wrangler.jsonc','utf8'))
previewConfigs(root,{branch:'qualification/shop-lot-7',buildId:'config-check'})
assert.deepEqual(root.services,[{binding:'WORKER_SELF_REFERENCE',service:'my-website'}]);assert.deepEqual(root.routes,[])
assert.deepEqual(root.r2_buckets,[{binding:'NEXT_INC_CACHE_R2_BUCKET',bucket_name:'my-v0-project-opennext-cache'}])
assert.deepEqual(root.durable_objects,{bindings:[{name:'CONTACT_LIMITER',class_name:'ContactLimiter'}]})
assert.ok(!root.build&&!root.env)
if(process.argv.includes('--built'))assert.ok(existsSync('.open-next/worker.js'))
console.log('Shop Preview configuration verified; production targets unchanged.')
