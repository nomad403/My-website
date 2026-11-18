import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

let database: ReturnType<typeof drizzle<typeof schema>> | undefined

export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not configured")
  if (!database) {
    const client = postgres(url, {
      max: 1,
      prepare: false,
      ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
    })
    database = drizzle(client, { schema })
  }
  return database
}
