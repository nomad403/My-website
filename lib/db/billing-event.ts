import {sql} from "drizzle-orm"
import type {PostgresJsDatabase} from "drizzle-orm/postgres-js"
import type * as schema from "./schema"
import {DrizzleBillingStore} from "./billing-store"
import {applyBillingEvent,type ApplyOptions} from "../billing/apply-event"
import type {BillingNotice} from "../billing/notices"
/** Serialize webhook writes and commit their state/history/receipt together.
 * A retry or remote lookup failure rolls back the whole delivery. */
export async function applyStoredBillingEvents(db:PostgresJsDatabase<typeof schema>,notices:BillingNotice[],options:ApplyOptions={}) {
 try{
  return await db.transaction(async tx=>{
   await tx.execute(sql`set local lock_timeout='5s'`)
   const lock = await tx.execute(sql`select id from billing_sync_lock where id=1 for update`)
   if (!(Array.isArray(lock) ? lock.length : (lock as unknown as {rows:unknown[]}).rows.length)) throw new Error("Billing lock missing")
   const store=new DrizzleBillingStore(tx as unknown as PostgresJsDatabase<typeof schema>)
   let result:"duplicate"|"applied"="duplicate"
   for(const notice of notices){
    const outcome=await applyBillingEvent(store,notice,options)
    if(outcome==="retry")throw new RetryDelivery()
    if(outcome==="applied")result="applied"
   }
   return result
  })
 }catch(error){if(error instanceof RetryDelivery)return "retry" as const;throw error}
}
class RetryDelivery extends Error{}
