import postgres from "postgres"
import { hashPromotionCode, normalizePromotionCode } from "../lib/billing/promotion.ts"

function arg(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return null
  return process.argv[index + 1] ?? null
}

const code = normalizePromotionCode(arg("code"))
const plan = arg("plan")
const expires = arg("expires")
const max = arg("max")
const email = arg("email")?.trim().toLowerCase() || null

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant")
  process.exit(1)
}
if (!code || (plan !== "friend_host" && plan !== "friend_care")) {
  console.error("Usage: --code CODE --plan friend_host|friend_care [--expires ISO] [--max N] [--email client@example.com]")
  process.exit(1)
}

const maxRedemptions = max == null ? null : Number(max)
if (max != null && (!Number.isInteger(maxRedemptions) || maxRedemptions < 1)) {
  console.error("--max doit être un entier positif")
  process.exit(1)
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
})

await sql`
  insert into promotion_codes (code_hash, plan_code, expires_at, max_redemptions, restricted_email)
  values (${hashPromotionCode(code)}, ${plan}, ${expires}, ${maxRedemptions}, ${email})
`
await sql.end()
console.log(`Code enregistré pour ${plan}.`)
