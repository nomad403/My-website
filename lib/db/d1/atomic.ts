import type { D1Connection, D1Statement } from "./types"

/** Must immediately follow the conditional write it checks, within the SAME batch.
 * Zero matched rows is not a SQL error; the CHECK assertion makes it an atomic failure.
 * changes() excludes trigger side effects. No asynchronous read/decision can be inserted here.
 */
export function requireChanges(db: D1Connection, expected = 1): D1Statement {
 if (!Number.isSafeInteger(expected) || expected < 0) throw new Error("Invalid expected changes")
 return db.prepare("INSERT INTO d1_atomic_guard(id,ok) VALUES(1,CASE WHEN changes()=? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET ok=excluded.ok").bind(expected)
}
