// Local-only harness. None of these clock/inspection endpoints ship in the Worker.
import { ContactLimiter } from "../../cloudflare/contact-limiter.mjs"
export class TestContactLimiter extends ContactLimiter {
  constructor(ctx, env) { super(ctx); this.clock = Number(env.TEST_NOW) }
  now() { return this.clock }
  async fetch(request) {
    const path = new URL(request.url).pathname
    if (path === "/__test/clock") { this.clock = Number(await request.text()); return new Response("ok") }
    if (path === "/__test/snapshot") return Response.json(this.sql.exec("SELECT * FROM reservations ORDER BY key").toArray())
    if (path === "/__test/seed") {
      const { window, count, expires } = await request.json()
      this.sql.exec("UPDATE reservations SET count = ?, expires = ? WHERE key LIKE ?", count, expires, "counter:%:" + window)
      return new Response("ok")
    }
    return super.fetch(request)
  }
}
export default { fetch() { return new Response("Local fixture only") } }
