import {PGlite} from "@electric-sql/pglite"
import {drizzle} from "drizzle-orm/pglite"
import {readdirSync,readFileSync} from "node:fs"
import {localD1} from "./d1.mjs"
import {sqlStatements} from "../../lib/db/statements.ts"
import * as schema from "../../lib/db/schema.ts"
import {DrizzleBillingStore} from "../../lib/db/billing-store.ts"
import {DrizzlePromotionAdminStore} from "../../lib/db/promotion-admin-store.ts"
import {applyStoredBillingEvents} from "../../lib/db/billing-event.ts"
import {createD1BillingStore} from "../../lib/db/d1/billing-store.ts"
import {createD1PromotionAdminStore} from "../../lib/db/d1/promotion-admin-store.ts"
import {applyStoredD1BillingEvents} from "../../lib/db/d1/billing-event.ts"
export const NOW=new Date("2026-11-12T12:00:00.123Z")
export const PEOPLE=[{id:"10000000-0000-4000-8000-000000000001",email:"admin@example.test",role:"admin"},{id:"10000000-0000-4000-8000-000000000002",email:"a@example.test",role:"client"},{id:"10000000-0000-4000-8000-000000000003",email:"b@example.test",role:"client"}]
export function promoInput(actorId,extra={}){return {actorId,codeHash:"synthetic-promotion-hash",codeHint:"TEST",planCode:"friend_host",expiresAt:null,maxRedemptions:1,restrictedEmail:null,usageTerms:"fixed-private-terms",internalNotes:"internal only",...extra}}
export function sub(userId,extra={}){return {stripeSubscriptionId:"sub_local",userId,planCode:"essential",status:"active",billingInterval:"month",amountCents:1900,privateOffer:false,currentPeriodStart:new Date(100000),currentPeriodEnd:new Date(200000),cancelRequestedAt:null,cancelEffectiveAt:null,...extra}}
export function invoice(userId,extra={}){return {stripeInvoiceId:"in_local",userId,stripeSubscriptionId:"sub_local",status:"paid",amountDueCents:1900,amountPaidCents:1900,amountRemainingCents:0,currency:"EUR",totalCents:1900,servicePeriodStart:new Date(100000),servicePeriodEnd:new Date(200000),issuedAt:new Date(110000),paidAt:new Date(110000),...extra}}
export function payment(userId,extra={}){return {stripePaymentIntentId:"pi_local",userId,stripeInvoiceId:"in_local",status:"succeeded",amountCents:1900,currency:"EUR",failureCode:null,paidAt:new Date(110000),...extra}}
export function refund(extra={}){return {stripeRefundId:"re_local",stripePaymentIntentId:"pi_local",status:"succeeded",amountCents:200,currency:"EUR",...extra}}
export async function d1Fixture(t){
 const fixture=await localD1();if(t)t.after(()=>fixture.close())
 const db=fixture.db
 try{for(const person of PEOPLE)await db.prepare("INSERT INTO users(id,email,role) VALUES(?,?,?)").bind(person.id,person.email,person.role).run()
  return {db,people:PEOPLE,billing:createD1BillingStore(db),admin:createD1PromotionAdminStore(db),apply:(notices,options)=>applyStoredD1BillingEvents(db,notices,options),rows:async(sql,values=[]) => (await db.prepare(sql).bind(...values).all()).results,close:fixture.close}
 }catch(error){await fixture.close();throw error}
}
export async function pgFixture(t){
 const client=new PGlite();if(t)t.after(()=>client.close())
 try{
  const root=new URL("../../drizzle/",import.meta.url)
  for(const name of readdirSync(root).filter(n=>n.endsWith(".sql")).sort())for(const statement of sqlStatements(readFileSync(new URL(name,root),"utf8")))await client.exec(statement)
  const db=drizzle(client,{schema})
  await db.insert(schema.users).values(PEOPLE)
  return {db,client,people:PEOPLE,billing:new DrizzleBillingStore(db),admin:new DrizzlePromotionAdminStore(db),apply:(notices,options)=>applyStoredBillingEvents(db,notices,options),rows:async(sql,values=[])=>{let i=0;return (await client.query(sql.replace(/\?/g,()=>"$"+(++i)),values)).rows},close:()=>client.close()}
 }catch(error){await client.close();throw error}
}
