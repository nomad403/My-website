import type {D1Connection,D1Statement,D1Value} from "./types"
import {requireChanges} from "./atomic"

const keys={users:"id",customer_profiles:"user_id",plans:"code",promotion_codes:"id",promotion_redemptions:"id",checkout_sessions:"id",subscriptions:"id",invoices:"id",payments:"id",refunds:"id",stripe_events:"event_id",projects:"id",intervention_requests:"id",intervention_events:"id",intervention_periods:"id",intervention_time_entries:"id",intervention_outbox:"id",audit_logs:"id"} as const
export type BillingTable=keyof typeof keys
export type BillingRow=Record<string,D1Value>
const identifier=(value:string)=>{if(!/^[a-z_]+$/.test(value))throw new Error("Invalid billing SQL identifier");return '"'+value+'"'}

export async function billingRow(db:D1Connection,table:BillingTable,where:BillingRow):Promise<BillingRow|null>{
 const fields=Object.keys(where)
 if(!fields.length)throw new Error("Unbounded billing lookup")
 return db.prepare("SELECT * FROM "+identifier(table)+" WHERE "+fields.map(field=>identifier(field)+(where[field]===null?" IS NULL":"=?")).join(" AND ")+" LIMIT 1").bind(...fields.filter(field=>where[field]!==null).map(field=>where[field])).first<BillingRow>()
}
export class BillingBusy extends Error {constructor(){super("Billing state changed; retry delivery")}}
function isConflict(error:unknown):boolean{
 const seen=new Set<unknown>();let current=error
 while(current && typeof current==="object" && !seen.has(current)){
  seen.add(current)
  if("message" in current && typeof current.message==="string" && current.message.includes("CHECK constraint failed: billing_snapshot_current"))return true
  current="cause" in current?current.cause:null
 }
 return false
}
/** Staged commands only: reads + JS decisions, then ONE atomic D1 batch.
 * No writes execute while planning. Revision triggers cover reads made by billing stores,
 * including changes performed outside these stores. A changed snapshot discards the entire plan.
 * The in-memory overlay lets successive notices see the earlier staged changes of the same delivery.
 */
export class BillingUnit {
 private readonly rows=new Map<BillingTable,Map<D1Value,BillingRow>>()
 private readonly statements:D1Statement[]=[]
 private constructor(readonly db:D1Connection,private readonly revision:number){}
 static async begin(db:D1Connection){
  const row=await db.prepare("SELECT revision FROM d1_billing_revision WHERE id=1").first<{revision:number}>()
  if(!row || !Number.isSafeInteger(row.revision) || row.revision<0)throw new Error("Billing revision missing or invalid")
  return new BillingUnit(db,row.revision)
 }
 private cache(table:BillingTable){let rows=this.rows.get(table);if(!rows){rows=new Map();this.rows.set(table,rows)}return rows}
 async read(statement:string,values:D1Value[]=[]):Promise<BillingRow[]>{
  if(this.statements.length || !/^\s*select\b/i.test(statement))throw new Error("Snapshot SQL must be read-only and precede staged writes")
  return (await this.db.prepare(statement).bind(...values).all<BillingRow>()).results
 }
 async one(table:BillingTable,where:BillingRow):Promise<BillingRow|null>{
  if(!Object.keys(where).length)throw new Error("Unbounded snapshot lookup")
  const matches=(row:BillingRow)=>Object.entries(where).every(([key,value])=>row[key]===value)
  const cache=this.cache(table)
  for(const row of cache.values())if(matches(row))return row
  const fetched=await billingRow(this.db,table,where)
  if(!fetched)return null
  const row=cache.get(fetched[keys[table]])??fetched
  cache.set(row[keys[table]],row)
  return matches(row)?row:null
 }
 insert(table:BillingTable,values:BillingRow):BillingRow{
  const columns=Object.keys(values),row={...values}
  if(row[keys[table]]==null)throw new Error("Missing staged row identifier")
  this.statements.push(this.db.prepare("INSERT INTO "+identifier(table)+"("+columns.map(identifier).join(",")+") VALUES("+columns.map(()=>"?").join(",")+")").bind(...columns.map(column=>values[column])),requireChanges(this.db))
  this.cache(table).set(row[keys[table]],row)
  return row
 }
 update(table:BillingTable,row:BillingRow,patch:BillingRow){
  const columns=Object.keys(patch)
  if(!columns.length)return
  if(columns.includes(keys[table]))throw new Error("Cannot change staged row identifier")
  this.statements.push(this.db.prepare("UPDATE "+identifier(table)+" SET "+columns.map(column=>identifier(column)+"=?").join(",")+" WHERE "+identifier(keys[table])+"=?").bind(...columns.map(column=>patch[column]),row[keys[table]]),requireChanges(this.db))
  Object.assign(row,patch)
  this.cache(table).set(row[keys[table]],row)
 }
 async commit(){
  const guard=this.db.prepare("INSERT INTO d1_billing_guard(id,ok) VALUES(1,CASE WHEN (SELECT revision FROM d1_billing_revision WHERE id=1)=? THEN 1 ELSE 0 END) ON CONFLICT(id) DO UPDATE SET ok=excluded.ok").bind(this.revision)
  await this.db.batch([guard,...this.statements])
 }
}
/** Callback must have no external mutations: it can be repeated after a conflict.
 * Stripe reconciliation is GET-only and must be repeated after any snapshot change.
 * Bounded conflicts fail closed, leaving the webhook receipt absent for provider redelivery.
 */
export async function billingCommand<T>(db:D1Connection,operation:(unit:BillingUnit)=>Promise<T>,attempts=8):Promise<T>{
 if(!Number.isInteger(attempts)||attempts<1||attempts>32)throw new Error("Invalid billing retry limit")
 for(let attempt=0;attempt<attempts;attempt++){
  const unit=await BillingUnit.begin(db)
  const result=await operation(unit)
  try{await unit.commit();return result}catch(error){if(!isConflict(error))throw error}
 }
 throw new BillingBusy()
}
