import { createHash } from "node:crypto"
import type { D1Connection } from "./types"
import { d1Statements } from "./statements"

export type D1Migration = { name: string; source: string }
/** Separate D1 migration history. Only explicitly delimited, reviewed statements are accepted.
 * Each migration AND its receipt are in one D1 transaction. No naive semicolon split of triggers.
 * The local CLI is the only caller supplied here; there is deliberately no remote CLI option.
 */
export async function migrateD1(db: D1Connection, migrations: D1Migration[]) {
 const names = migrations.map(m=>m.name)
 if (new Set(names).size !== names.length || names.some((n,i)=>!/^\d{4}_[a-z0-9_]+\.sql$/.test(n) || (i>0 && n<=names[i-1]))) throw new Error("Invalid D1 migration order")
 await db.prepare("CREATE TABLE IF NOT EXISTS d1_schema_migrations(name TEXT NOT NULL PRIMARY KEY,sha256 TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT").run()
 const {results:applied} = await db.prepare("SELECT name,sha256 FROM d1_schema_migrations ORDER BY name").all<{name:string;sha256:string}>()
 if (applied.some((m,i)=>m.name!==names[i])) throw new Error("Unknown or non-prefix D1 migration history")
 const completed: string[] = []
 for (const migration of migrations) {
  const source=migration.source.replace(/\r\n/g,"\n")
  const checksum=createHash("sha256").update(source).digest("hex")
  const prior=applied.find(m=>m.name===migration.name)
  if (prior) { if (prior.sha256!==checksum) throw new Error("D1 migration checksum mismatch"); continue }
  const statements=d1Statements(source)
  if (!statements.length) throw new Error("Empty D1 migration")
  await db.batch([...statements.map(statement=>db.prepare(statement)),db.prepare("INSERT INTO d1_schema_migrations(name,sha256,applied_at) VALUES(?,?,?)").bind(migration.name,checksum,Date.now())])
  completed.push(migration.name)
 }
 return completed
}
