import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { runInNewContext } from "node:vm"
import { test } from "node:test"
import { createConnection } from "node:net"
import ts from "typescript"

const require = createRequire(import.meta.url)
const payload = { nom: "Test Person", contact: "test@example.com", message: "A legitimate project enquiry." }

// Run the real TypeScript handler and limiter with isolated environment and mocked outbound mail/HTTP.
function fixture(options = {}) {
  const calls = { emails: 0, sent: [], redis: [] }
  const env = {
    RESEND_API_KEY: "test-mail-key", RESEND_FROM: "from@example.com", RESEND_TO: "owner@example.com",
    UPSTASH_REDIS_REST_URL: "https://redis.example.com", UPSTASH_REDIS_REST_TOKEN: "test-redis-key",
    VERCEL: "1", VERCEL_ENV: "test", ...options.env,
  }
  const modules = new Map()
  function load(path) {
    if (modules.has(path)) return modules.get(path)
    const source = readFileSync(new URL(`../${path}.ts`, import.meta.url), "utf8")
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
    const module = { exports: {} }
    runInNewContext(code, {
      exports: module.exports, module, Buffer, Request, Response, AbortSignal,
      URL, console: { error() {} }, process: { env },
      fetch: async (url, init) => {
        calls.redis.push({ url, init, command: JSON.parse(init.body) })
        if (options.redisThrows) throw new Error("private redis failure")
        if (options.redisExecute) return Response.json({ result: await redisCommand(JSON.parse(init.body)) })
        return Response.json(options.redisBody ?? { result: [1, 0] }, { status: options.redisStatus ?? 200 })
      },
      require: (name) => {
        if (name.startsWith("@/")) return load(name.slice(2))
        if (name === "next/server") return { NextResponse: { json: (body, init) => Response.json(body, init) } }
        if (name === "resend") return { Resend: class {
          emails = { send: async (message) => {
            calls.emails++
            calls.sent.push(message)
            if (options.mailThrows) throw new Error("private provider exception")
            return options.mailResult ?? { data: { id: "test-id" }, error: null }
          } }
        } }
        return require(name)
      },
    }, { filename: `${path}.ts` })
    modules.set(path, module.exports)
    return module.exports
  }
  const { POST } = load("app/api/contact/route")
  return { calls, load, post: (body = payload, headers = {}) => POST(new Request("https://www.nomad403.com/api/contact", {
    method: "POST", headers: { "Content-Type": "application/json", "x-vercel-forwarded-for": "192.0.2.1", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  })) }
}

test("a valid request reserves a slot before sending one email", async () => {
  const f = fixture()
  assert.equal((await f.post()).status, 200)
  assert.equal(f.calls.emails, 1)
  assert.equal(f.calls.redis.length, 1)
  assert.equal(f.calls.redis[0].command[0], "EVAL")
  assert.equal(f.calls.redis[0].init.headers.Authorization, "Bearer test-redis-key")
  assert.equal(f.calls.sent[0].replyTo, payload.contact)
  assert.ok(!("reply_to" in f.calls.sent[0]))
})

test("200 throttled submissions never reach the email provider", async () => {
  const f = fixture({ redisBody: { result: [0, 600] } })
  for (let i = 0; i < 200; i++) {
    const response = await f.post()
    assert.equal(response.status, 429)
    assert.equal(response.headers.get("Retry-After"), "600")
  }
  assert.equal(f.calls.emails, 0)
})

for (const [name, options] of Object.entries({
  unconfigured: { env: { UPSTASH_REDIS_REST_TOKEN: "" } },
  unreachable: { redisThrows: true },
  rejected: { redisStatus: 401 },
  malformed: { redisBody: { result: "OK" } },
  "script error": { redisBody: { error: "private script error" } },
})) {
  test(`Redis ${name}: fail closed without sending email`, async () => {
    const f = fixture(options)
    const response = await f.post()
    assert.equal(response.status, 503)
    assert.equal(f.calls.emails, 0)
    assert.equal((await response.json()).error, "Service temporarily unavailable")
  })
}

test("spoofed proxy headers cannot change the client bucket", async () => {
  const f = fixture()
  await f.post(payload, { "x-forwarded-for": "198.51.100.1", "x-real-ip": "198.51.100.2" })
  await f.post(payload, { "x-forwarded-for": "203.0.113.1" })
  assert.equal(f.calls.redis[0].command[3], f.calls.redis[1].command[3])
  const keys = f.calls.redis[0].command.slice(3).join(" ")
  assert.ok(!keys.includes("192.0.2.1") && !keys.includes(payload.contact) && !keys.includes(payload.message))
})

test("unidentified visitors fail closed without sharing a quota", async () => {
  const f = fixture({ env: { VERCEL: "" } })
  assert.equal((await f.post(payload, { "x-vercel-forwarded-for": "192.0.2.1" })).status, 503)
  assert.equal((await f.post(payload, { "x-vercel-forwarded-for": "192.0.2.2" })).status, 503)
  assert.equal(f.calls.redis.length, 0)
  assert.equal(f.calls.emails, 0)
})

test("self-hosted deployments use only the explicitly trusted proxy header", async () => {
  const f = fixture({ env: { VERCEL: "", CONTACT_TRUSTED_IP_HEADER: "x-real-ip" } })
  assert.equal((await f.post(payload, { "x-real-ip": "192.0.2.1" })).status, 200)
  assert.equal((await f.post(payload, { "x-real-ip": "192.0.2.2" })).status, 200)
  for (let key = 3; key <= 6; key++) assert.notEqual(f.calls.redis[0].command[key], f.calls.redis[1].command[key])
})

test("invalid trusted client addresses cannot select a shared fallback bucket", async () => {
  const f = fixture()
  for (const address of ["", "unknown", "192.0.2.1, 192.0.2.2"]) {
    assert.equal((await f.post(payload, { "x-vercel-forwarded-for": address })).status, 503)
  }
  assert.equal(f.calls.emails, 0)
  assert.equal(f.calls.redis.length, 0)
})

test("honeypots, invalid inputs and foreign origins never reserve a slot", async () => {
  const f = fixture()
  assert.equal((await f.post({ ...payload, website: "https://spam.example" })).status, 400)
  assert.equal((await f.post({ ...payload, contact: "invalid" })).status, 400)
  assert.equal((await f.post("{" )).status, 400)
  assert.equal((await f.post(payload, { Origin: "https://attacker.example" })).status, 403)
  assert.equal((await f.post(payload, { "Content-Type": "text/plain" })).status, 415)
  assert.equal(f.calls.emails, 0)
  assert.equal(f.calls.redis.length, 0)
})

test("oversized streamed bodies are rejected without Content-Length", async () => {
  const f = fixture()
  assert.equal((await f.post({ ...payload, message: "x".repeat(10000) })).status, 413)
  assert.equal((await f.post(payload, { "Content-Length": "10000" })).status, 413)
  assert.equal(f.calls.emails, 0)
  assert.equal(f.calls.redis.length, 0)
})

for (const options of [
  { mailResult: { error: { name: "private error", message: "secret-provider-detail" } } },
  { mailThrows: true },
  { env: { RESEND_API_KEY: "" } },
]) {
  test("provider errors and missing configuration disclose no internal details", async () => {
    const response = await fixture(options).post()
    assert.ok(response.status >= 500)
    assert.deepEqual(await response.json(), { ok: false, error: "Service temporarily unavailable" })
  })
}

// Exercise the actual Lua against Redis in CI. No external service or credentials are used.
function redisCommand(args) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: Number(process.env.REDIS_TEST_PORT) })
    socket.setTimeout(5000, () => socket.destroy(new Error("Redis test timed out")))
    let data = ""
    const parse = (offset) => {
      const end = data.indexOf("\r\n", offset)
      if (end < 0) return null
      const type = data[offset], text = data.slice(offset + 1, end)
      let next = end + 2
      if (type === "-") throw new Error(text)
      if (type === "+" || type === ":") return { value: type === ":" ? Number(text) : text, next }
      if (type === "$") {
        const length = Number(text)
        if (length === -1) return { value: null, next }
        if (data.length < next + length + 2) return null
        return { value: data.slice(next, next + length), next: next + length + 2 }
      }
      if (type === "*") {
        const value = []
        for (let i = 0; i < Number(text); i++) {
          const item = parse(next)
          if (!item) return null
          value.push(item.value); next = item.next
        }
        return { value, next }
      }
      throw new Error("Unexpected Redis response")
    }
    socket.on("connect", () => socket.write(`*${args.length}\r\n` + args.map(a => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("")))
    socket.on("error", reject)
    socket.on("data", chunk => {
      data += chunk.toString()
      try {
        const result = parse(0)
        if (result) { socket.end(); resolve(result.value) }
      } catch (error) { socket.destroy(); reject(error) }
    })
  })
}

test("real Redis: concurrency, per-client isolation, hourly/daily quotas and expiry", {
  skip: !process.env.REDIS_TEST_PORT && "Set REDIS_TEST_PORT to run the Redis integration test",
}, async () => {
  const f = fixture({ redisExecute: true, env: { VERCEL_ENV: `test-${Date.now()}-${process.pid}` } })
  const headers = ip => ({ "x-vercel-forwarded-for": ip })
  const post = (ip, message) => f.post({ ...payload, message }, headers(ip))
  const concurrent = await Promise.all(Array.from({ length: 30 }, (_, i) => post("192.0.2.1", `Unique valid message ${i}`)))
  assert.equal(concurrent.filter(r => r.status === 200).length, 3)
  assert.equal(concurrent.filter(r => r.status === 429).length, 27)
  // The exhausted visitor cannot block an unrelated client, including the same message.
  assert.equal((await post("192.0.2.2", "Unique valid message 0")).status, 200)
  assert.equal((await post("192.0.2.2", "Unique valid message 0")).status, 429)
  // 25 distinct clients all succeed: there is no shared hourly bucket.
  const independent = await Promise.all(Array.from({ length: 25 }, (_, i) => post(`198.51.100.${i + 1}`, `Independent enquiry ${i}`)))
  assert.ok(independent.every(r => r.status === 200))
  const command = f.calls.redis[0].command
  for (const [keyIndex, limit, expiry] of [[4, 20, 3600], [5, 50, 86400]]) {
    const ip = keyIndex === 4 ? "203.0.113.1" : "203.0.113.2"
    await post(ip, "Initial valid test message")
    const keys = f.calls.redis.at(-1).command
    await redisCommand(["SET", keys[keyIndex], limit, "EX", expiry])
    assert.equal((await post(ip, "Another valid test message")).status, 429)
    assert.equal((await post("203.0.113.3", `Another visitor message ${keyIndex}`)).status, 200)
  }
  // Expiring a single client's counters permits that client to submit again.
  for (const key of command.slice(3)) await redisCommand(["SET", key, 100, "PX", 50])
  assert.equal((await post("192.0.2.1", "Unique valid message 0")).status, 429)
  await new Promise(resolve => setTimeout(resolve, 100))
  assert.equal((await post("192.0.2.1", "Unique valid message 0")).status, 200)
})
