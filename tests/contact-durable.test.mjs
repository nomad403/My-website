import assert from "node:assert/strict"
import { test } from "node:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { Miniflare, convertV4MiniflareOptions } from "miniflare"

test("Cloudflare Durable Object: real SQLite, atomic quotas and persistent reservations", async t => {
  const directory = await mkdtemp(resolve(tmpdir(), "nomad403-contact-do-"))
  const now = Math.floor(Date.now() / 1000)
  const worker = name => ({
    name, modules: [
      { type: "ESModule", path: fileURLToPath(new URL("./fixtures/contact-durable-worker.mjs", import.meta.url)) },
      { type: "ESModule", path: fileURLToPath(new URL("../cloudflare/contact-limiter.mjs", import.meta.url)) },
    ],
    compatibilityDate: "2026-11-10", compatibilityFlags: ["nodejs_compat"],
    bindings: { TEST_NOW: String(now) },
    durableObjects: { LIMITER: { className: "TestContactLimiter", useSQLite: true } },
  })
  const options = convertV4MiniflareOptions({ workers: [worker("production-test"), worker("preview-test")] })
  options.resourcePersistencePath = directory
  options.isolatedResourcePersistencePath = directory
  let mf = new Miniflare(options)
  const namespace = name => mf.getDurableObjectNamespace("LIMITER", name)
  const stubFor = async (name, workerName = "production-test") => {
    const ns = await namespace(workerName); return ns.get(ns.idFromName(name))
  }
  const payload = { ip: "192.0.2.1", contact: "test@example.invalid", message: "Local contact test message" }
  const post = (stub, body = payload) => stub.fetch("https://limiter.internal/reserve", {
    method: "POST", body: JSON.stringify(body),
  }).then(r => r.json())
  const inspect = stub => stub.fetch("https://limiter.internal/__test/snapshot").then(r => r.json())
  const clock = (stub, time) => stub.fetch("https://limiter.internal/__test/clock", { method: "POST", body: String(time) })
  try {
    await t.test("30 concurrent distinct messages allow exactly three, isolated per client", async () => {
      const stub = await stubFor("concurrency")
      const results = await Promise.all(Array.from({ length: 30 }, (_, i) => post(stub, { ...payload, message: "Unique local message " + i })))
      assert.equal(results.filter(r => r.allowed).length, 3)
      assert.equal(results.filter(r => !r.allowed).length, 27)
      assert.ok(results.filter(r => !r.allowed).every(r => r.retryAfter === 600))
      assert.equal((await post(stub, { ...payload, ip: "198.51.100.2" })).allowed, true)
    })
    await t.test("concurrent duplicates consume one slot and survive recreation", async () => {
      const stub = await stubFor("duplicates")
      const results = await Promise.all(Array.from({ length: 30 }, () => post(stub)))
      assert.equal(results.filter(r => r.allowed).length, 1)
      const rows = await inspect(stub)
      assert.ok(rows.filter(r => r.key.startsWith("counter:")).every(r => r.count === 1))
      const stored = JSON.stringify(rows)
      for (const value of [payload.ip, payload.contact, payload.message]) assert.ok(!stored.includes(value))
    })
    await t.test("blocked reservations are atomic and do not burn unrelated quota", async () => {
      const stub = await stubFor("atomic")
      await post(stub)
      await stub.fetch("https://limiter.internal/__test/seed", { method: "POST", body: JSON.stringify({ window: "hour", count: 20, expires: now + 3600 }) })
      const before = await inspect(stub)
      assert.deepEqual(await post(stub, { ...payload, message: "Denied local message" }), { allowed: false, retryAfter: 3600 })
      assert.deepEqual(await inspect(stub), before)
      assert.equal((await post(stub, { ...payload, ip: "198.51.100.2" })).allowed, true)
    })
    await t.test("daily quota is enforced independently", async () => {
      const stub = await stubFor("day")
      await post(stub)
      await stub.fetch("https://limiter.internal/__test/seed", { method: "POST", body: JSON.stringify({ window: "day", count: 50, expires: now + 86400 }) })
      assert.deepEqual(await post(stub, { ...payload, message: "Another local message" }), { allowed: false, retryAfter: 86400 })
    })
    await t.test("duplicate/short-window expiry restores access and retains longer counters", async () => {
      const stub = await stubFor("expiry")
      await post(stub)
      assert.equal((await post(stub)).allowed, false)
      await clock(stub, now + 600)
      assert.equal((await post(stub)).allowed, true)
      const rows = await inspect(stub)
      assert.equal(rows.find(r => r.key.endsWith(":short")).count, 1)
      assert.equal(rows.find(r => r.key.endsWith(":hour")).count, 2)
      assert.equal(rows.find(r => r.key.endsWith(":day")).count, 2)
      await clock(stub, now + 86400)
      assert.equal((await post(stub)).allowed, true)
      assert.ok((await inspect(stub)).every(r => r.count === 1))
    })
    await t.test("production and Preview namespaces never share reservations", async () => {
      const production = await stubFor("same-object")
      const preview = await stubFor("same-object", "preview-test")
      await post(production)
      assert.equal((await post(production)).allowed, false)
      assert.equal((await post(preview)).allowed, true)
      assert.notDeepEqual((await inspect(production)).map(r => r.key), (await inspect(preview)).map(r => r.key))
    })
    await t.test("invalid internal requests are rejected without reservations", async () => {
      const stub = await stubFor("invalid")
      assert.equal((await stub.fetch("https://limiter.internal/reserve")).status, 404)
      assert.equal((await stub.fetch("https://limiter.internal/reserve", { method: "POST", body: "{" })).status, 400)
      assert.equal((await stub.fetch("https://limiter.internal/reserve", { method: "POST", body: "x".repeat(9000) })).status, 413)
      assert.deepEqual(await inspect(stub), [])
    })
    await t.test("durable counters and private salt survive a worker restart", async () => {
      const stub = await stubFor("restart")
      for (let i = 0; i < 3; i++) assert.equal((await post(stub, { ...payload, message: "Persistent local message " + i })).allowed, true)
      const before = await inspect(stub)
      await mf.dispose()
      mf = new Miniflare(options)
      const restarted = await stubFor("restart")
      assert.deepEqual(await inspect(restarted), before)
      assert.equal((await post(restarted, { ...payload, message: "After restart message" })).allowed, false)
    })
  } finally {
    await mf.dispose()
    const target = resolve(directory)
    assert.ok(target.startsWith(resolve(tmpdir()) + sep) && target.includes("nomad403-contact-do-"))
    await rm(target, { recursive: true, force: true })
  }
})

test('Auth Cloudflare limiter: atomic concurrency, expiry and private keys',async()=>{
 const modulePath=resolve('tests/fixtures/auth-limiter-local.mjs')
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'auth-test',compatibilityDate:'2026-11-10',compatibilityFlags:['nodejs_compat'],modules:[{type:'ESModule',path:modulePath,contents:"import {AuthLimiter} from '../../cloudflare/auth-limiter.mjs'; export class TestAuth extends AuthLimiter { now(){return this.clock??1000} async fetch(r){if(new URL(r.url).pathname==='/clock'){this.clock=Number(await r.text());return new Response('ok')}if(new URL(r.url).pathname==='/keys')return Response.json(this.sql.exec('SELECT k FROM counters').toArray());return super.fetch(r)}} export default {fetch(){return new Response('local')}}"},{type:'ESModule',path:resolve('cloudflare/auth-limiter.mjs')}],durableObjects:{LIMITER:{className:'TestAuth',useSQLite:true}},outboundService:()=>{throw Error('No external calls')}}]}))
 try{const ns=await mf.getDurableObjectNamespace('LIMITER'),stub=ns.get(ns.idFromName('scope'))
 const consume=key=>stub.fetch('https://local/consume',{method:'POST',body:JSON.stringify({key,limit:5,windowSeconds:60})}).then(r=>r.json())
 const results=await Promise.all(Array.from({length:30},()=>consume('magic:client@example.test')))
 assert.equal(results.filter(r=>r.allowed).length,5);assert.equal(results.filter(r=>!r.allowed).length,25)
 assert.equal((await consume('magic:other@example.test')).allowed,true)
 const rows=await (await stub.fetch('https://local/keys')).json();assert.ok(rows.every(r=>/^[0-9a-f]{64}$/.test(r.k)));assert.ok(!JSON.stringify(rows).includes('example.test'))
 await stub.fetch('https://local/clock',{method:'POST',body:'1060'});assert.equal((await consume('magic:client@example.test')).allowed,true)
 assert.equal((await stub.fetch('https://local/consume',{method:'POST',body:JSON.stringify({key:'x',limit:0,windowSeconds:60})})).status,400)
 }finally{await mf.dispose()}
})
