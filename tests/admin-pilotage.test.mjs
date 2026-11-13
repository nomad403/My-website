import test from "node:test"
import assert from "node:assert/strict"
import {randomUUID} from "node:crypto"
import {readFileSync,readdirSync} from "node:fs"
import {PGlite} from "@electric-sql/pglite"
import {drizzle} from "drizzle-orm/pglite"
import {eq,sql} from "drizzle-orm"
import * as s from "../lib/db/schema.ts"
import {sqlStatements} from "../lib/db/statements.ts"
import {DrizzleAdminStore} from "../lib/db/admin-store.ts"
import {DrizzleBillingStore} from "../lib/db/billing-store.ts"
import {DrizzleInterventionStore} from "../lib/db/intervention-store.ts"
import {administer,parseAdminQuery} from "../lib/admin/service.ts"
import {financialMetrics} from "../lib/admin/metrics.ts"
import {interventionOperation} from "../lib/interventions/service.ts"
import {MemoryRateLimiter} from "../lib/auth/rate-limit.ts"
const NOW=new Date("2026-11-15T12:00:00Z"),FROM="2026-11-01",TO="2026-12-01"
const query=(v={})=>parseAdminQuery({from:FROM,to:TO,...v},NOW)
async function world(run){
 const pg=new PGlite()
 try{
  for(const file of readdirSync(new URL("../drizzle/",import.meta.url)).filter(f=>f.endsWith(".sql")).sort())
   for(const statement of sqlStatements(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8")))await pg.exec(statement)
  const db=drizzle(pg,{schema:s}),store=new DrizzleAdminStore(db),billing=new DrizzleBillingStore(db),interventions=new DrizzleInterventionStore(db)
  const people=await db.insert(s.users).values([{email:"admin@example.com",role:"admin",createdAt:NOW},{email:"alice@example.com",createdAt:NOW},{email:"never-paid@example.com",createdAt:NOW}]).returning()
  await db.insert(s.customerProfiles).values({userId:people[1].id,firstName:"Alice",lastName:"Zero",billingEmail:people[1].email})
  const [project]=await db.insert(s.projects).values({userId:people[1].id,name:"Site A",createdAt:NOW}).returning()
  const [sub]=await db.insert(s.subscriptions).values({userId:people[1].id,projectId:project.id,planCode:"premium",status:"active",amountCents:69000,billingInterval:"year",stripeSubscriptionId:"sub_finance",lastEventCreated:100,serviceAnchorAt:new Date("2026-01-15"),currentPeriodStart:new Date("2026-01-15"),currentPeriodEnd:new Date("2027-01-15"),createdAt:NOW}).returning()
  const [invoice]=await db.insert(s.invoices).values({userId:people[1].id,subscriptionId:sub.id,serviceSubscriptionId:sub.stripeSubscriptionId,stripeInvoiceId:"in_finance",status:"paid",totalCents:69000,amountDueCents:69000,amountPaidCents:69000,amountRemainingCents:0,issuedAt:NOW,paidAt:NOW,servicePeriodStart:sub.currentPeriodStart,servicePeriodEnd:sub.currentPeriodEnd}).returning()
  const [payment]=await db.insert(s.payments).values({userId:people[1].id,invoiceId:invoice.id,stripePaymentIntentId:"pi_finance",status:"succeeded",amountCents:69000,paidAt:NOW}).returning()
  const limiter=new MemoryRateLimiter(),deps={authorize:async()=>({status:200,body:{userId:people[0].id}}),store,limiter,now:()=>NOW}
  const request=async()=>{const result=await interventionOperation({authorize:async()=>({status:200,body:{userId:people[1].id}}),admin:false,store:interventions,limiter,now:()=>NOW},null,"create",{operationKey:randomUUID(),projectId:project.id,subscriptionId:sub.id,subject:"Minor correction",description:"Please correct existing content.",category:"minor_fix",urgency:"high"});assert.equal(result.status,201);return result.body.id}
  const mutation=(id,operation,input,admin=true)=>interventionOperation({authorize:async()=>({status:200,body:{userId:people[admin?0:1].id}}),admin,store:interventions,limiter,now:()=>NOW},null,operation,{operationKey:randomUUID(),...input},id)
  await run({db,pg,store,billing,interventions,people,project,sub,invoice,payment,deps,request,mutation})
 }finally{await pg.close()}
}
test("financial normalization rounds only aggregate MRR and derives ARR from that MRR",()=>{
 const base={currency:"EUR",monthly:"1900",yearly:"10000",issued:"100",collected:"80",refunded:"20",unpaid:"30",excludedSubscriptions:"0",missingInvoiceDates:"0",missingPaymentDates:"0",missingRefundDates:"0"}
 const r=financialMetrics(base);assert.equal(r.mrrCents,2733);assert.equal(r.arrCents,r.mrrCents*12);assert.equal(r.issuedCents,100);assert.equal(r.collectedCents,80);assert.equal(r.refundedCents,20)
 assert.throws(()=>financialMetrics({...base,monthly:"9007199254740992"}));assert.equal(financialMetrics({...base,issued:"-1"}).issuedCents,-1)
})
test("strict filters reject invalid dates, wild ranges, injected IDs, priorities and fields",()=>{
 for(const extra of[{from:"2026-02-30"},{from:TO,to:FROM},{offset:-1},{offset:1.1},{offset:100001},{clientId:"bad"},{subscriptionId:"bad"},{status:"admin"},{priority:"critical"},{q:"a".repeat(121)},{q:"bad\u0000"},{role:"admin"},{kind:"sessions"}])assert.equal(query(extra),null,JSON.stringify(extra))
 assert.ok(query({from:"2000-01-01",to:TO}));assert.equal(query({q:"  Alice  "}).q,"Alice")
})
test("all admin operations authorize before accessing data; limiter fails closed",async()=>{
 let accesses=0
 const store=new Proxy({},{get:()=>async()=>{accesses++;return []}})
 for(const status of[401,403])for(const operation of["overview","records","client"]){const r=await administer({authorize:async()=>({status,body:{}}),store,limiter:new MemoryRateLimiter(),now:()=>NOW},null,operation,{},randomUUID());assert.equal(r.status,status)}
 const deps={authorize:async()=>({status:200,body:{userId:randomUUID()}}),store,limiter:{consume:async()=>{throw Error("offline")}},now:()=>NOW}
 assert.equal((await administer(deps,null,"overview")).status,503);assert.equal(accesses,0)
})
test("clients include never-paid users and billing admins, exclude pure admins",()=>world(async f=>{
 const r=await f.store.records(query({kind:"clients"}));assert.equal(r.total,2);assert.ok(r.rows.some(r=>r.email==="never-paid@example.com"&&r.subscriptions===0&&r.payments===0));assert.equal(r.rows.some(r=>r.email==="admin@example.com"),false)
 assert.equal((await f.store.client(f.people[0].id)),null)
 const [adminProject]=await f.db.insert(s.projects).values({userId:f.people[0].id,name:"Admin lab",createdAt:NOW}).returning()
 await f.db.insert(s.subscriptions).values({userId:f.people[0].id,projectId:adminProject.id,planCode:"premium",status:"active",amountCents:1900,billingInterval:"month",stripeSubscriptionId:"sub_admin",lastEventCreated:100,serviceAnchorAt:NOW,currentPeriodStart:NOW,currentPeriodEnd:new Date("2026-12-15"),createdAt:NOW})
 const billed=await f.store.records(query({kind:"clients"}));assert.equal(billed.total,3);assert.ok(billed.rows.some(r=>r.email==="admin@example.com"&&r.subscriptions===1))
 assert.equal((await f.store.client(f.people[0].id))?.email,"admin@example.com")
 assert.equal((await f.store.overview(query(),NOW)).counts.clients,3)
}))
test("search names and literal wildcard characters are parameterized, never SQL",()=>world(async f=>{
 assert.equal((await f.store.records(query({q:"Alice"}))).total,1)
 for(const q of["%","_","' OR true --"]){assert.equal((await f.store.records(query({q}))).total,0)}
 const profile=await f.store.client(f.people[1].id);assert.equal(profile.firstName,"Alice");assert.equal("role" in profile,false)
}))
test("pagination has stable ordering and totals even beyond last page",()=>world(async f=>{
 await f.db.insert(s.users).values(Array.from({length:30},(_,i)=>({email:"page"+i+"@example.com",createdAt:NOW})))
 const a=await f.store.records(query()),b=await f.store.records(query({offset:25})),c=await f.store.records(query({offset:100}))
 assert.equal(a.rows.length,25);assert.equal(b.rows.length,7);assert.equal(c.total,32);assert.equal(c.rows.length,0)
 assert.equal(new Set([...a.rows,...b.rows].map(x=>x.id)).size,32)
}))
test("scoped client views do not leak another customer's billing, requests or promotions",()=>world(async f=>{
 await f.request()
 for(const kind of["subscriptions","invoices","payments","refunds","interventions","redemptions","history"]){
  const r=await f.store.records(query({kind,clientId:f.people[2].id}));assert.equal(r.total,0,kind);assert.equal(JSON.stringify(r).includes("alice@example.com"),false)
 }
 assert.equal((await f.store.records(query({kind:"subscriptions",clientId:f.people[1].id}))).rows[0].amountCents,69000)
}))
test("overview separates annual MRR from invoices and gross collections",()=>world(async f=>{
 const r=await f.store.overview(query(),NOW),m=r.finances[0]
 assert.equal(m.mrrCents,5750);assert.equal(m.arrCents,69000);assert.equal(m.issuedCents,69000);assert.equal(m.collectedCents,69000);assert.equal(m.refundedCents,0)
 assert.equal(r.counts.clients,2);assert.equal(r.counts.withoutSubscription,1);assert.equal(r.counts.activeSubscriptions,1)
}))
test("monthly historic price is independent of catalogue price and counts with annual contracts",()=>world(async f=>{
 await f.db.update(s.subscriptions).set({billingInterval:"month",amountCents:1234}).where(eq(s.subscriptions.id,f.sub.id))
 const r=await f.store.overview(query(),NOW);assert.equal(r.finances[0].mrrCents,1234);assert.equal(r.finances[0].arrCents,14808)
}))
test("refunds use first success event time, remain idempotent and do not reduce collections",()=>world(async f=>{
 const snapshot={stripeRefundId:"re_fixture",stripePaymentIntentId:"pi_finance",status:"pending",amountCents:10000,currency:"EUR"},at=Math.floor(NOW.getTime()/1000)
 await f.billing.upsertRefund(snapshot,at-2);await f.billing.upsertRefund({...snapshot,status:"succeeded"},at)
 await f.billing.upsertRefund({...snapshot,status:"succeeded"},at);await f.billing.upsertRefund({...snapshot,status:"failed"},at-1)
 const r=(await f.store.overview(query(),NOW)).finances[0];assert.equal(r.refundedCents,10000);assert.equal(r.collectedCents,69000)
 const [refund]=await f.db.select().from(s.refunds);assert.equal(refund.status,"succeeded");assert.equal(refund.succeededEventAt.toISOString(),NOW.toISOString())
}))
test("flows use half-open source dates, not webhook reception time",()=>world(async f=>{
 await f.db.insert(s.payments).values([{userId:f.people[1].id,status:"succeeded",amountCents:123,paidAt:new Date(FROM)},{userId:f.people[1].id,status:"succeeded",amountCents:999,paidAt:new Date(TO)}])
 const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.collectedCents,69123)
 const older=await f.store.overview(query({from:"2026-01-01",to:"2026-02-01"}),NOW);assert.equal(older.finances[0].collectedCents,0);assert.equal(older.finances[0].mrrCents,5750)
}))
test("outstanding is a current unpaid stock including earlier invoices, not a period flow",()=>world(async f=>{
 await f.db.insert(s.invoices).values({userId:f.people[1].id,status:"uncollectible",amountDueCents:900,amountPaidCents:100,amountRemainingCents:800,issuedAt:new Date("2026-10-01")})
 const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.unpaidCents,800);assert.equal(m.issuedCents,69000)
}))
test("missing source dates are excluded with visible diagnostics, never guessed",()=>world(async f=>{
 await f.db.insert(s.invoices).values({userId:f.people[1].id,status:"open",amountDueCents:100,amountPaidCents:0,amountRemainingCents:100})
 await f.db.insert(s.payments).values({userId:f.people[1].id,status:"succeeded",amountCents:100})
 await f.db.insert(s.refunds).values({paymentId:f.payment.id,status:"succeeded",amountCents:100})
 const m=(await f.store.overview(query(),NOW)).finances[0]
 assert.equal(m.missingInvoiceDates,1);assert.equal(m.missingPaymentDates,1);assert.equal(m.missingRefundDates,1);assert.equal(m.collectedCents,69000);assert.equal(m.refundedCents,0)
}))
test("stale periods, unpaid states, cancellations and review flags exclude recurring estimates",()=>world(async f=>{
 for(const change of[{status:"past_due"},{status:"unpaid"},{status:"canceled"},{status:"active",entitlementReviewRequired:true},{entitlementReviewRequired:false,currentPeriodEnd:new Date("2026-11-01")},{currentPeriodEnd:new Date("2027-01-15"),cancelEffectiveAt:new Date("2026-11-01")}]){
  await f.db.update(s.subscriptions).set(change).where(eq(s.subscriptions.id,f.sub.id))
  const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.mrrCents,0);assert.equal(m.arrCents,0)
 }
 await f.db.update(s.subscriptions).set({status:"active",cancelEffectiveAt:new Date("2026-12-01")}).where(eq(s.subscriptions.id,f.sub.id))
 assert.equal((await f.store.overview(query(),NOW)).finances[0].mrrCents,5750)
}))
test("a due service invoice blocks MRR before a delayed status webhook",()=>world(async f=>{
 await f.db.insert(s.invoices).values({userId:f.people[1].id,subscriptionId:f.sub.id,status:"open",amountDueCents:100,amountPaidCents:0,amountRemainingCents:100,issuedAt:NOW,servicePeriodStart:new Date(FROM),servicePeriodEnd:new Date(TO)})
 const r=await f.store.overview(query(),NOW);assert.equal(r.finances[0].mrrCents,0);assert.equal(r.finances[0].excludedSubscriptions,1)
}))
test("currency groups remain distinct if database support is extended",()=>world(async f=>{
 await f.pg.exec("ALTER TABLE payments DROP CONSTRAINT payments_currency_eur")
 await f.db.insert(s.payments).values({userId:f.people[1].id,status:"succeeded",amountCents:300,currency:"USD",paidAt:NOW})
 const r=await f.store.overview(query(),NOW);assert.equal(r.finances.length,2);assert.equal(r.finances.find(x=>x.currency==="USD").collectedCents,300);assert.equal(r.finances.find(x=>x.currency==="EUR").collectedCents,69000)
}))
test("internal priority is admin-only, confidential, audited and idempotent",()=>world(async f=>{
 const id=await f.request(),key=randomUUID(),input={operationKey:key,internalPriority:"urgent"}
 assert.equal((await f.mutation(id,"priority",input,false)).status,403)
 assert.equal((await f.mutation(id,"priority",{internalPriority:"bad"})).status,400)
 assert.equal((await f.mutation(id,"priority",input)).status,200);assert.equal((await f.mutation(id,"priority",input)).status,200)
 assert.equal((await f.mutation(id,"priority",{...input,internalPriority:"low"})).status,409)
 const admin=await f.interventions.detail({id:f.people[0].id,admin:true},id,0,NOW),client=await f.interventions.detail({id:f.people[1].id,admin:false},id,0,NOW)
 assert.equal(admin.internalPriority,"urgent");assert.equal("internalPriority" in client,false);assert.equal(JSON.stringify(client).includes("Priority:"),false)
 assert.equal(admin.events.filter(e=>e.kind==="priority").length,1)
 const queue=await f.db.select().from(s.interventionOutbox);assert.equal(queue.length,1)
 const audit=await f.store.records(query({kind:"audit"}));assert.ok(audit.rows.some(r=>r.action==="intervention.priority"));assert.equal("metadata" in audit.rows[0],false)
}))
test("intervention filters compose client, status, priority and time on the server",()=>world(async f=>{
 const id=await f.request();await f.mutation(id,"priority",{internalPriority:"high"})
 assert.equal((await f.store.records(query({kind:"interventions",priority:"high",status:"submitted",clientId:f.people[1].id}))).total,1)
 for(const extra of[{priority:"low"},{status:"completed"},{clientId:f.people[2].id},{from:"2026-10-01",to:FROM}])assert.equal((await f.store.records(query({kind:"interventions",...extra}))).total,0)
}))
test("subscription observations append atomically and cannot be edited; old webhook does not rewrite history",()=>world(async f=>{
 const snapshot={userId:f.people[1].id,stripeSubscriptionId:"sub_finance",planCode:"premium",billingInterval:"year",amountCents:69000,privateOffer:false,status:"past_due",currentPeriodStart:f.sub.currentPeriodStart,currentPeriodEnd:f.sub.currentPeriodEnd,cancelRequestedAt:null,cancelEffectiveAt:null}
 const before=await f.db.select().from(s.subscriptionObservations);await f.billing.upsertSubscription(snapshot,101)
 await f.billing.upsertSubscription({...snapshot,status:"active"},99)
 const after=await f.db.select().from(s.subscriptionObservations);assert.equal(after.length,before.length+1);assert.equal(after.at(-1).status,"past_due");assert.equal(after.at(-1).amountCents,69000)
 await assert.rejects(()=>f.db.update(s.subscriptionObservations).set({status:"active"}))
 await assert.rejects(()=>f.db.delete(s.subscriptionObservations))
 const page=await f.store.records(query({kind:"history",subscriptionId:f.sub.id,from:"2000-01-01",to:"2100-01-01"}));assert.equal(page.total,2)
}))
test("priority changes do not affect quota or concurrent completion invariants",()=>world(async f=>{
 const id=await f.request()
 for(const [status,extra]of[["analyzing",{}],["accepted",{coverage:"included",minorScopeConfirmed:true}],["in_progress",{}]])assert.equal((await f.mutation(id,"transition",{status,...extra})).status,200)
 await f.mutation(id,"priority",{internalPriority:"urgent"})
 const key=randomUUID(),out=await Promise.all([f.mutation(id,"complete",{minutes:40,operationKey:key}),f.mutation(id,"complete",{minutes:40,operationKey:key})])
 assert.deepEqual(out.map(x=>x.status),[200,200]);const [bucket]=await f.db.select().from(s.interventionPeriods);assert.equal(bucket.consumedMinutes,40)
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,1)
}))
test("no financial or client response exposes authentication hashes, MFA, promotion hashes or raw event bodies",()=>world(async f=>{
 await f.db.insert(s.promotionCodes).values({codeHash:"must-remain-hidden",planCode:"friend_care"})
 for(const kind of["clients","subscriptions","invoices","payments","refunds","history","audit","redemptions","interventions"]){
  const r=await f.store.records(query({kind}));const body=JSON.stringify(r);assert.equal(/secretHash|tokenHash|codeHash|must-remain-hidden|secretCiphertext|rawEvent/.test(body),false)
 }
}))

test("concurrent webhook deliveries serialize state/history/receipts and duplicate deliveries once",()=>world(async f=>{
 const {applyStoredBillingEvents}=await import("../lib/db/billing-event.ts")
 const subscription={userId:f.people[1].id,stripeSubscriptionId:f.sub.stripeSubscriptionId,planCode:"premium",billingInterval:"year",amountCents:69000,privateOffer:false,status:"past_due",currentPeriodStart:f.sub.currentPeriodStart,currentPeriodEnd:f.sub.currentPeriodEnd,cancelRequestedAt:null,cancelEffectiveAt:null}
 const old={id:"evt_older",type:"subscription.upsert",created:101,subscription}
 const newer={id:"evt_newer",type:"subscription.upsert",created:102,subscription:{...subscription,status:"canceled"}}
 const out=await Promise.all([applyStoredBillingEvents(f.db,[newer]),applyStoredBillingEvents(f.db,[old]),applyStoredBillingEvents(f.db,[newer])])
 assert.equal(out.filter(x=>x==="duplicate").length,1)
 const [sub]=await f.db.select().from(s.subscriptions);assert.equal(sub.status,"canceled");assert.equal(sub.lastEventCreated,102)
 const receipts=await f.db.select().from(s.stripeEvents);assert.equal(receipts.length,2)
}))
test("a failed webhook reconciliation rolls back state/history/receipt and can be retried",()=>world(async f=>{
 const {applyStoredBillingEvents}=await import("../lib/db/billing-event.ts")
 const notice={id:"evt_tie",type:"subscription.upsert",created:100,subscription:{userId:f.people[1].id,stripeSubscriptionId:f.sub.stripeSubscriptionId,planCode:"premium",billingInterval:"year",amountCents:69000,privateOffer:false,status:"active",currentPeriodStart:f.sub.currentPeriodStart,currentPeriodEnd:f.sub.currentPeriodEnd,cancelRequestedAt:null,cancelEffectiveAt:new Date("2026-12-01")}}
 assert.equal(await applyStoredBillingEvents(f.db,[notice]),"retry");assert.equal((await f.db.select().from(s.stripeEvents)).length,0)
 const before=(await f.db.select().from(s.subscriptionObservations)).length
 assert.equal(await applyStoredBillingEvents(f.db,[notice],{reconcileSubscription:async()=>({...notice.subscription})}),"applied")
 assert.equal((await f.db.select().from(s.subscriptions))[0].cancelEffectiveAt.toISOString(),"2026-12-01T00:00:00.000Z")
 assert.equal((await f.db.select().from(s.subscriptionObservations)).length,before+1)
 assert.equal(await applyStoredBillingEvents(f.db,[notice]),"duplicate")
}))
test("all refunds in a charge are mapped and applied without double accounting across event types",()=>world(async f=>{
 const {toBillingNotices}=await import("../lib/billing/stripe-map.ts"),{applyStoredBillingEvents}=await import("../lib/db/billing-event.ts")
 const at=Math.floor(NOW.getTime()/1000),refunds=[{id:"re_one",amount:1000,status:"succeeded",currency:"eur"},{id:"re_two",amount:2000,status:"succeeded",currency:"eur"}]
 const notices=toBillingNotices({id:"evt_charge",type:"charge.refunded",created:at,data:{object:{payment_intent:"pi_finance",refunds:{data:refunds}}}})
 assert.equal(notices.length,2);assert.notEqual(notices[0].id,notices[1].id)
 assert.equal(await applyStoredBillingEvents(f.db,notices),"applied")
 const direct=toBillingNotices({id:"evt_direct",type:"refund.updated",created:at,data:{object:{...refunds[0],payment_intent:"pi_finance"}}})
 await applyStoredBillingEvents(f.db,direct)
 assert.equal((await f.store.overview(query(),NOW)).finances[0].refundedCents,3000);assert.equal((await f.db.select().from(s.refunds)).length,2)
}))
test("a multi-notice delivery with an unresolved payment rolls back all earlier writes",()=>world(async f=>{
 const {applyStoredBillingEvents}=await import("../lib/db/billing-event.ts"),at=Math.floor(NOW.getTime()/1000)
 const refund={stripeRefundId:"re_a",stripePaymentIntentId:"pi_finance",status:"succeeded",amountCents:100,currency:"EUR"}
 const notices=[{id:"evt_batch_a",type:"refund.upsert",created:at,refund},{id:"evt_batch_b",type:"refund.upsert",created:at,refund:{...refund,stripeRefundId:"re_b",stripePaymentIntentId:"missing"}}]
 assert.equal(await applyStoredBillingEvents(f.db,notices),"retry")
 assert.equal((await f.db.select().from(s.refunds)).length,0);assert.equal((await f.db.select().from(s.stripeEvents)).length,0)
}))

test("first invoice insertion preserves verified service dates and issued total distinct from amount due",()=>world(async f=>{
 const {toBillingNotices}=await import("../lib/billing/stripe-map.ts")
 const raw={id:"in_new",currency:"eur",status:"paid",subscription:"sub_finance",metadata:{userId:f.people[1].id},total:15000,amount_due:12000,amount_paid:12000,amount_remaining:0,status_transitions:{finalized_at:Math.floor(NOW.getTime()/1000),paid_at:Math.floor(NOW.getTime()/1000)},lines:{data:[{subscription:"sub_finance",proration:false,period:{start:1793491200,end:1796083200}}],has_more:false}}
 const [notice]=toBillingNotices({id:"evt_first_invoice",type:"invoice.paid",created:200,data:{object:raw}})
 await f.billing.upsertInvoice(notice.invoice,200)
 const [saved]=await f.db.select().from(s.invoices).where(eq(s.invoices.stripeInvoiceId,"in_new"))
 assert.equal(saved.totalCents,15000);assert.equal(saved.amountDueCents,12000);assert.ok(saved.servicePeriodStart);assert.ok(saved.servicePeriodEnd);assert.equal(saved.serviceSubscriptionId,"sub_finance")
 const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.issuedCents,84000);assert.equal(m.collectedCents,69000);assert.equal(m.unlinkedPaidInvoices,1)
}))
test("unknown invoice totals are diagnosed, visible in lists and excluded from billed totals",()=>world(async f=>{
 await f.db.insert(s.invoices).values({userId:f.people[1].id,status:"open",amountDueCents:900,amountPaidCents:0,amountRemainingCents:900,issuedAt:NOW})
 const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.missingInvoiceTotals,1);assert.equal(m.issuedCents,69000);assert.equal(m.unpaidCents,900)
 assert.equal((await f.store.records(query({kind:"invoices"}))).total,2)
}))
test("migration upgrades Lot 5 data without fabricated history, refund dates or invoice totals",async()=>{
 const pg=new PGlite()
 try{
  const files=readdirSync(new URL("../drizzle/",import.meta.url)).filter(f=>f.endsWith(".sql")).sort()
  for(const file of files.filter(f=>f<"0005"))for(const stmt of sqlStatements(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8")))await pg.exec(stmt)
  const db=drizzle(pg,{schema:s}),[user]=await db.insert(s.users).values({email:"legacy@example.com"}).returning()
  await pg.exec("INSERT INTO subscriptions(user_id,plan_code,billing_interval,amount_cents,status) VALUES('"+user.id+"','premium','month',6900,'active')")
  await pg.exec("INSERT INTO payments(user_id,status,amount_cents) VALUES('"+user.id+"','succeeded',6900)")
  await pg.exec("INSERT INTO refunds(payment_id,status,amount_cents) SELECT id,'succeeded',500 FROM payments")
  await pg.exec("INSERT INTO invoices(user_id,status,amount_due_cents,amount_paid_cents,amount_remaining_cents) VALUES('"+user.id+"','paid',6900,6900,0)")
  for(const stmt of sqlStatements(readFileSync(new URL("../drizzle/0005_admin_pilotage.sql",import.meta.url),"utf8")))await pg.exec(stmt)
  assert.equal((await db.select().from(s.subscriptions))[0].amountCents,6900)
  assert.equal((await db.select().from(s.refunds))[0].succeededEventAt,null)
  assert.equal((await db.select().from(s.invoices))[0].totalCents,null)
  assert.equal((await db.select().from(s.subscriptionObservations)).length,0)
 }finally{await pg.close()}
})
test("reserved promotion capacity is excluded from available promotion counts",()=>world(async f=>{
 const [promo]=await f.db.insert(s.promotionCodes).values({codeHash:"reserved-capacity",planCode:"friend_care",maxRedemptions:1}).returning()
 await f.db.insert(s.promotionRedemptions).values({promotionCodeId:promo.id,userId:f.people[1].id,status:"reserved"})
 assert.equal((await f.store.overview(query(),NOW)).counts.activePromotions,0)
}))

test("an active contract missing known period bounds is explicitly counted as excluded",()=>world(async f=>{
 await f.db.update(s.subscriptions).set({currentPeriodStart:null,currentPeriodEnd:null}).where(eq(s.subscriptions.id,f.sub.id))
 const m=(await f.store.overview(query(),NOW)).finances[0];assert.equal(m.mrrCents,0);assert.equal(m.excludedSubscriptions,1)
}))
