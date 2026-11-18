import { readdirSync, readFileSync } from "node:fs"
import postgres from "postgres"
import { sqlStatements } from "../lib/db/statements.ts"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL manquant")
  process.exit(1)
}

const sql = postgres(url, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
})

await sql`
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )
`

const files = readdirSync(new URL("../drizzle/", import.meta.url))
  .filter((file) => file.endsWith(".sql"))
  .sort()

for (const file of files) {
  const applied = await sql`select filename from schema_migrations where filename = ${file}`
  if (applied.length > 0) continue
  const statements = sqlStatements(readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8"))
  await sql.begin(async (tx) => {
    for (const statement of statements) await tx.unsafe(statement)
    await tx`insert into schema_migrations (filename) values (${file})`
  })
  console.log(`applied ${file}`)
}

await sql.end()
