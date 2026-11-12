import { createHmac, randomBytes } from "node:crypto"

// Only the internal Durable Object binding can invoke this class.
// A persistent random salt keeps client/message identifiers out of stored records.
export class ContactLimiter {
  constructor(ctx) {
    this.ctx = ctx
    this.sql = ctx.storage.sql
    this.sql.exec("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    this.sql.exec("CREATE TABLE IF NOT EXISTS reservations (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)")
    this.sql.exec("CREATE INDEX IF NOT EXISTS reservations_expiry ON reservations(expires)")
    this.sql.exec("INSERT OR IGNORE INTO metadata VALUES ('salt', ?)", randomBytes(32).toString("hex"))
    this.salt = this.sql.exec("SELECT value FROM metadata WHERE key = 'salt'").one().value
  }

  now() { return Math.floor(Date.now() / 1000) }

  async fetch(request) {
    if (request.method !== "POST" || new URL(request.url).pathname !== "/reserve")
      return new Response(null, { status: 404 })
    const text = await request.text()
    if (text.length > 8192) return new Response(null, { status: 413 })
    let input
    try { input = JSON.parse(text) } catch { return new Response(null, { status: 400 }) }
    if (!input || typeof input.ip !== "string" || input.ip.length > 45 ||
        !input.ip || typeof input.contact !== "string" || input.contact.length > 100 ||
        typeof input.message !== "string" || input.message.length > 2000)
      return new Response(null, { status: 400 })
    const hash = value => createHmac("sha256", this.salt).update(value).digest("hex")
    const client = hash(input.ip)
    const duplicate = "duplicate:" + hash(JSON.stringify([client, input.contact.toLowerCase(), input.message]))
    const now = this.now()
    const limits = [["short", 3, 600], ["hour", 20, 3600], ["day", 50, 86400]]
    // All checks and updates are synchronous inside a SQLite transaction.
    const result = this.ctx.storage.transactionSync(() => {
      // Bounded cleanup: no alarm loop and no full-table scan.
      this.sql.exec("DELETE FROM reservations WHERE key IN (SELECT key FROM reservations WHERE expires <= ? LIMIT 128)", now)
      const buckets = limits.map(([name, limit, ttl]) => {
        const key = "counter:" + client + ":" + name
        const rows = this.sql.exec("SELECT count, expires FROM reservations WHERE key = ?", key).toArray()
        const row = rows[0]?.expires > now ? rows[0] : { count: 0, expires: now + ttl }
        return { key, limit, ...row }
      })
      let wait = 0
      for (const row of buckets) if (row.count >= row.limit) wait = Math.max(wait, row.expires - now)
      const dupe = this.sql.exec("SELECT expires FROM reservations WHERE key = ?", duplicate).toArray()[0]
      if (dupe?.expires > now) wait = Math.max(wait, dupe.expires - now)
      if (wait > 0) return { allowed: false, retryAfter: wait }
      for (const row of buckets)
        this.sql.exec("INSERT INTO reservations VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count=excluded.count, expires=excluded.expires",
          row.key, row.count + 1, row.expires)
      this.sql.exec("INSERT INTO reservations VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET expires=excluded.expires", duplicate, now + 600)
      return { allowed: true, retryAfter: 1 }
    })
    return Response.json(result)
  }
}
