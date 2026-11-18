import {SQLiteAsyncDialect} from "drizzle-orm/sqlite-core"
import type {SQL} from "drizzle-orm"
import {billingCommand,type BillingUnit} from "./billing-unit"
import type {D1Connection,D1Value} from "./types"
export function snapshotReader(unit:BillingUnit){return {execute:async(statement:SQL)=>{
 const q=new SQLiteAsyncDialect().sqlToQuery(statement)
 return unit.read(q.sql,q.params.map(value=>value instanceof Date?value.getTime():typeof value==="boolean"?Number(value):value) as D1Value[])
}}}
export function readSnapshot<T>(db:D1Connection,operation:(reader:ReturnType<typeof snapshotReader>)=>Promise<T>){return billingCommand(db,unit=>operation(snapshotReader(unit)))}
