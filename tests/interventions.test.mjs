import assert from "node:assert/strict"
import {readdirSync,readFileSync} from "node:fs"
import {randomUUID} from "node:crypto"
import {test} from "node:test"
import {PGlite} from "@electric-sql/pglite"
import {drizzle} from "drizzle-orm/pglite"
import {eq} from "drizzle-orm"
import * as s from "../lib/db/schema.ts"
import {sqlStatements} from "../lib/db/statements.ts"
import {DrizzleInterventionStore} from "../lib/db/intervention-store.ts"
import {DrizzleBillingStore} from "../lib/db/billing-store.ts"
import {interventionOperation} from "../lib/interventions/service.ts"
import {monthlyWindow,contractWindow,mayTransition} from "../lib/interventions/contract.ts"
import {MemoryRateLimiter} from "../lib/auth/rate-limit.ts"
import {toBillingNotice,readStripeSubscriptionState} from "../lib/billing/stripe-map.ts"
const NOW=new Date("2026-11-15T12:00:00Z")
async function fixture(){
 const client=new PGlite()
 for(const file of readdirSync(new URL("../drizzle/",import.meta.url)).filter(f=>f.endsWith(".sql")).sort())
  for(const statement of sqlStatements(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8")))await client.exec(statement)
 const db=drizzle(client,{schema:s})
 const people=await db.insert(s.users).values([{email:"admin@example.com",role:"admin"},{email:"a@example.com"},{email:"b@example.com"}]).returning()
 await db.insert(s.customerProfiles).values(people.map(p=>({userId:p.id,billingEmail:p.email})))
 const sites=await db.insert(s.projects).values([{userId:people[1].id,name:"Site Alpha"},{userId:people[2].id,name:"Site Beta"}]).returning()
 const [sub]=await db.insert(s.subscriptions).values({
  userId:people[1].id,projectId:sites[0].id,planCode:"premium",status:"active",billingInterval:"year",
  amountCents:69000,stripeSubscriptionId:"sub_a",serviceAnchorAt:new Date("2026-01-31T12:00:00Z"),
  currentPeriodStart:new Date("2026-01-31T12:00:00Z"),currentPeriodEnd:new Date("2027-01-31T12:00:00Z"),lastEventCreated:10,
 }).returning()
 await db.insert(s.invoices).values({userId:people[1].id,subscriptionId:sub.id,stripeInvoiceId:"in_paid",
  serviceSubscriptionId:"sub_a",status:"paid",amountDueCents:69000,amountPaidCents:69000,amountRemainingCents:0,
  servicePeriodStart:sub.currentPeriodStart,servicePeriodEnd:sub.currentPeriodEnd,issuedAt:sub.currentPeriodStart})
 await db.insert(s.payments).values({userId:people[1].id,status:"succeeded",amountCents:69000,paidAt:sub.currentPeriodStart})
 const store=new DrizzleInterventionStore(db),limiter=new MemoryRateLimiter()
 let now=NOW
 const actors={admin:{id:people[0].id,admin:true},a:{id:people[1].id,admin:false},b:{id:people[2].id,admin:false}}
 const call=(actor,operation,value={},id)=>interventionOperation({
  authorize:async()=>({status:200,body:{userId:actor.id}}),admin:actor.admin,store,limiter,now:()=>now,
 },null,operation,value,id)
 const create=async(extra={},actor=actors.a)=>call(actor,"create",{
  projectId:sites[actor===actors.b?1:0].id,subscriptionId:actor===actors.b?null:sub.id,
  subject:"Corriger le titre",description:"Merci de corriger le titre de la page existante.",
  category:"minor_fix",urgency:"normal",operationKey:randomUUID(),...extra,
 })
 const change=async(id,status,extra={})=>call(actors.admin,"transition",{operationKey:randomUUID(),status,...extra},id)
 const prepare=async(coverage="included",actor=actors.a)=>{
  const result=await create({},actor);assert.equal(result.status,201,JSON.stringify(result))
  const id=result.body.id
  for(const [status,extra] of [["analyzing",{}],["accepted",{coverage,minorScopeConfirmed:coverage==="included",body:coverage==="outside"?"Hors forfait, devis éventuel ; aucun débit automatique.":""}],["in_progress",{}]]){
   const r=await change(id,status,extra);assert.equal(r.status,200,JSON.stringify(r))
  }
  return id
 }
 return{client,db,store,actors,sub,sites,people,call,create,change,prepare,setNow:value=>{now=value}}
}
async function world(run){const f=await fixture();try{await run(f)}finally{await f.client.close()}}
test("anchored months handle February, leap years, December and retain the original day",()=>{
 for(const[a,now,start,end]of[
  ["2026-01-31T12:00:00Z","2026-02-28T12:00:00Z","2026-02-28T12:00:00Z","2026-03-31T12:00:00Z"],
  ["2024-01-31T12:00:00Z","2024-02-29T15:00:00Z","2024-02-29T12:00:00Z","2024-03-31T12:00:00Z"],
  ["2025-12-31T12:00:00Z","2026-01-02T00:00:00Z","2025-12-31T12:00:00Z","2026-01-31T12:00:00Z"],
 ]){
  const result=monthlyWindow(new Date(a),new Date(now));assert.equal(result.start.toISOString(),new Date(start).toISOString());assert.equal(result.end.toISOString(),new Date(end).toISOString())
 }
 assert.equal(monthlyWindow(new Date("2026-02-01"),new Date("2026-01-01")),null)
})
test("only Premium and Friend Care can have monthly allowance",()=>{
 for(const planCode of["essential","plus","friend_host"]){
  assert.equal(contractWindow({planCode,status:"active",serviceAnchorAt:NOW,currentPeriodStart:NOW,currentPeriodEnd:new Date("2027-01-01"),cancelEffectiveAt:null,entitlementReviewRequired:false,id:"sub"},NOW).reason,"outside_plan")
 }
 assert.equal(mayTransition("submitted","completed",true),false)
 assert.equal(mayTransition("analyzing","accepted",false),false)
})
test("dashboard reads own name, stored subscription price, invoices and payments; another client has none",()=>world(async f=>{
 await f.call(f.actors.a,"profile",{firstName:"Alice",lastName:"Nomad"})
 const own=await f.call(f.actors.a,"dashboard"),other=await f.call(f.actors.b,"dashboard")
 assert.equal(own.status,200);assert.equal(own.body.dashboard.profile.firstName,"Alice")
 assert.equal(own.body.dashboard.profile.email,"a@example.com")
 assert.equal(own.body.dashboard.subscriptions[0].amountCents,69000)
 assert.equal(own.body.dashboard.payments.length,1)
 assert.equal(own.body.dashboard.invoices.length,1)
 assert.deepEqual(other.body.dashboard.subscriptions,[]);assert.deepEqual(other.body.dashboard.payments,[])
 assert.equal(JSON.stringify(other).includes("Site Alpha"),false)
}))
test("annual billing grants only one anchored monthly allowance, never twelve months at once",()=>world(async f=>{
 const result=await f.call(f.actors.a,"dashboard"),q=result.body.dashboard.subscriptions[0].quota
 assert.equal(q.included,60);assert.equal(q.remaining,60)
 assert.equal(q.start.toISOString(),"2026-10-31T12:00:00.000Z");assert.equal(q.end.toISOString(),"2026-11-30T12:00:00.000Z")
}))
test("create, idempotent submission and server validation do not consume minutes",()=>world(async f=>{
 const key=randomUUID(),result=await f.create({operationKey:key})
 assert.equal(result.status,201);assert.equal((await f.create({operationKey:key})).body.id,result.body.id)
 assert.equal((await f.create({operationKey:key,subject:"A different request"})).status,409)
 assert.equal((await f.db.select().from(s.interventionPeriods)).length,0)
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,0)
 for(const extra of[{subject:"x"},{description:"tiny"},{category:"sql"},{urgency:"immediate"},{minutes:60},{userId:f.actors.b.id},{status:"accepted"},{projectId:"';DROP TABLE users;--"}])
  assert.equal((await f.create(extra)).status,400)
}))
test("project and subscription IDs cannot cross customer boundaries",()=>world(async f=>{
 assert.equal((await f.create({projectId:f.sites[1].id})).status,404)
 assert.equal((await f.create({subscriptionId:f.sub.id},f.actors.b)).status,404)
 const id=(await f.create()).body.id
 assert.equal((await f.call(f.actors.b,"detail",{},id)).status,404)
 assert.equal((await f.call(f.actors.b,"message",{operationKey:randomUUID(),body:"Attempt at another customer's request"},id)).status,404)
 assert.equal((await f.call(f.actors.b,"list")).body.requests.length,0)
}))
test("client cannot impersonate admin, accept a request, post internal notes or debit time",()=>world(async f=>{
 const id=(await f.create()).body.id
 for(const[operation,payload]of[
  ["message",{body:"Forged response",internal:true}],
  ["message",{body:"Forged response",actorRole:"admin"}],
  ["transition",{status:"accepted",coverage:"included"}],
  ["complete",{minutes:1}],
 ])assert.ok([400,403].includes((await f.call(f.actors.a,operation,{operationKey:randomUUID(),...payload},id)).status))
}))
test("messages preserve authors, internal notes never enter client detail or notification queue",()=>world(async f=>{
 const id=(await f.create()).body.id
 assert.equal((await f.call(f.actors.a,"message",{operationKey:randomUUID(),body:"Client precision"},id)).status,200)
 assert.equal((await f.call(f.actors.admin,"message",{operationKey:randomUUID(),body:"Admin reply"},id)).status,200)
 const queued=(await f.db.select().from(s.interventionOutbox)).length
 await f.call(f.actors.admin,"message",{operationKey:randomUUID(),body:"PRIVATE OPERATOR NOTE",internal:true},id)
 assert.equal((await f.db.select().from(s.interventionOutbox)).length,queued)
 const client=await f.call(f.actors.a,"detail",{},id),admin=await f.call(f.actors.admin,"detail",{},id)
 assert.equal(JSON.stringify(client).includes("PRIVATE OPERATOR NOTE"),false)
 assert.ok(JSON.stringify(admin).includes("PRIVATE OPERATOR NOTE"))
 assert.ok(client.body.request.events.some(e=>e.actorRole==="admin"&&e.body==="Admin reply"))
 assert.ok(client.body.request.events.some(e=>e.actorRole==="client"&&e.body==="Client precision"))
 assert.ok((await f.db.select().from(s.interventionOutbox)).every(row=>row.status==="pending"))
}))
test("status machine rejects forbidden jumps and preserves the complete history",()=>world(async f=>{
 const id=(await f.create()).body.id
 assert.equal((await f.change(id,"in_progress")).status,409)
 assert.equal((await f.change(id,"analyzing")).status,200)
 assert.equal((await f.change(id,"accepted",{coverage:"included"})).status,409)
 assert.equal((await f.change(id,"accepted",{coverage:"included",minorScopeConfirmed:true})).status,200)
 assert.equal((await f.change(id,"in_progress")).status,200)
 assert.equal((await f.change(id,"waiting_client")).status,200)
 assert.equal((await f.change(id,"in_progress")).status,200)
 const detail=(await f.call(f.actors.a,"detail",{},id)).body.request
 assert.deepEqual(detail.events.filter(e=>e.toStatus).map(e=>e.toStatus).reverse(),["submitted","analyzing","accepted","in_progress","waiting_client","in_progress"])
}))
test("actual time completion is atomic, idempotent, immutable and bounded by 60 minutes",()=>world(async f=>{
 const id=await f.prepare(),key=randomUUID(),payload={operationKey:key,minutes:40}
 assert.equal((await f.call(f.actors.admin,"complete",payload,id)).status,200)
 assert.equal((await f.call(f.actors.admin,"complete",payload,id)).status,200)
 assert.equal((await f.call(f.actors.admin,"complete",{...payload,minutes:41},id)).status,409)
 const entries=await f.db.select().from(s.interventionTimeEntries)
 assert.equal(entries.length,1)
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.remaining,20)
 await assert.rejects(()=>f.db.update(s.interventionTimeEntries).set({minutes:1}).where(eq(s.interventionTimeEntries.id,entries[0].id)))
 await assert.rejects(()=>f.db.update(s.interventionPeriods).set({consumedMinutes:61}))
}))
test("concurrent completions cannot overspend or double charge a request",()=>world(async f=>{
 const first=await f.prepare(),second=await f.prepare()
 const results=await Promise.all([first,second].map(id=>f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:40},id)))
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409])
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,1)
 assert.equal((await f.db.select().from(s.interventionPeriods))[0].consumedMinutes,40)
}))
test("unused time never rolls over and historical charges stay in their own period",()=>world(async f=>{
 const id=await f.prepare()
 await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:20},id)
 f.setNow(new Date("2026-12-01T12:00:00Z"))
 const q=(await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota
 assert.equal(q.included,60);assert.equal(q.consumed,0);assert.equal(q.remaining,60)
 assert.equal(q.start.toISOString(),"2026-11-30T12:00:00.000Z")
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,1)
}))
test("work cannot be backdated into another allowance period or a future date",()=>world(async f=>{
 const id=await f.prepare()
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:10,performedAt:"2026-12-01T12:00:00Z"},id)).status,400)
 f.setNow(new Date("2026-12-01T12:00:00Z"))
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:10,performedAt:NOW.toISOString()},id)).status,409)
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,0)
}))
test("outside-plan requests allow analysis and actual time records but no included bucket or automatic charge",()=>world(async f=>{
 const result=await f.create({},f.actors.b)
 assert.equal(result.status,201)
 await f.change(result.body.id,"analyzing")
 assert.equal((await f.change(result.body.id,"accepted",{coverage:"included",minorScopeConfirmed:true})).status,409)
 assert.equal((await f.change(result.body.id,"accepted",{coverage:"outside",body:"Quote to be agreed separately."})).status,200)
 await f.change(result.body.id,"in_progress")
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:90},result.body.id)).status,200)
 assert.equal((await f.db.select().from(s.interventionPeriods)).length,0)
 assert.equal((await f.db.select().from(s.payments)).length,1)
 assert.equal((await f.db.select().from(s.invoices)).length,1)
}))
test("unpaid, canceled and expired known service periods do not grant included time",()=>world(async f=>{
 for(const status of["past_due","unpaid","canceled","incomplete"]){
  await f.db.update(s.subscriptions).set({status}).where(eq(s.subscriptions.id,f.sub.id))
  assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.included,0)
 }
 await f.db.update(s.subscriptions).set({status:"active",currentPeriodEnd:new Date("2026-11-01T00:00:00Z")}).where(eq(s.subscriptions.id,f.sub.id))
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.reason,"outside_period")
}))
test("known overdue invoices block debit even before the subscription failure webhook arrives",()=>world(async f=>{
 const id=await f.prepare()
 await f.db.insert(s.invoices).values({userId:f.actors.a.id,subscriptionId:f.sub.id,serviceSubscriptionId:"sub_a",stripeInvoiceId:"in_overdue",status:"open",amountDueCents:100,amountPaidCents:0,amountRemainingCents:100,issuedAt:NOW})
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.reason,"unpaid")
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:10},id)).status,409)
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,0)
}))
test("missing anchor and missing paid service proof remain explicitly unverified",()=>world(async f=>{
 await f.db.update(s.subscriptions).set({serviceAnchorAt:null}).where(eq(s.subscriptions.id,f.sub.id))
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.reason,"unverified_period")
 await f.db.update(s.subscriptions).set({serviceAnchorAt:f.sub.serviceAnchorAt}).where(eq(s.subscriptions.id,f.sub.id))
 await f.db.update(s.invoices).set({servicePeriodStart:null,servicePeriodEnd:null})
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.reason,"unverified_payment")
}))
test("scheduled cancellation truncates the current monthly window and stops later debits",()=>world(async f=>{
 const end=new Date("2026-11-16T00:00:00Z")
 await f.db.update(s.subscriptions).set({cancelRequestedAt:NOW,cancelEffectiveAt:end}).where(eq(s.subscriptions.id,f.sub.id))
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.end.toISOString(),end.toISOString())
 const id=await f.prepare()
 f.setNow(new Date("2026-11-17T00:00:00Z"))
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:1},id)).status,409)
}))
test("plan changes freeze entitlement, preserve historic price and cannot be undone by an older webhook",()=>world(async f=>{
 const billing=new DrizzleBillingStore(f.db)
 const snapshot={stripeSubscriptionId:"sub_a",userId:f.actors.a.id,planCode:"plus",status:"active",billingInterval:"month",amountCents:4900,privateOffer:false,currentPeriodStart:f.sub.currentPeriodStart,currentPeriodEnd:f.sub.currentPeriodEnd,cancelRequestedAt:null,cancelEffectiveAt:null,serviceAnchorAt:f.sub.serviceAnchorAt}
 await billing.upsertSubscription(snapshot,20)
 await billing.upsertSubscription({...snapshot,planCode:"premium",billingInterval:"year",amountCents:69000},9)
 const [row]=await f.db.select().from(s.subscriptions)
 assert.equal(row.amountCents,69000);assert.equal(row.planCode,"premium");assert.equal(row.billingInterval,"year")
 assert.equal(row.entitlementReviewRequired,true)
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.reason,"contract_review")
}))
test("Stripe mapping requires a matching non-prorated subscription line and keeps the anchor",()=>{
 const line={parent:{subscription_item_details:{subscription:"sub_a",proration:false}},period:{start:100,end:200}}
 const invoice={id:"in_a",currency:"eur",status:"paid",subscription:"sub_a",lines:{data:[line],has_more:false}}
 const event=object=>({id:"evt_a",type:"invoice.paid",created:100,data:{object}})
 const notice=toBillingNotice(event(invoice))
 assert.equal(notice.invoice.servicePeriodStart.getTime(),100000)
 assert.equal(toBillingNotice(event({...invoice,lines:{data:[{...line,proration:true}]}})).invoice.servicePeriodStart,null)
 assert.equal(toBillingNotice(event({...invoice,lines:{data:[line],has_more:true}})).invoice.servicePeriodStart,null)
 assert.equal(readStripeSubscriptionState({id:"sub_a",status:"active",billing_cycle_anchor:123}).serviceAnchorAt.getTime(),123000)
})
test("abuse limits fail closed and unauthenticated callers cannot reach any store operation",async()=>{
 let calls=0
 const store=new Proxy({},{get:()=>async()=>{calls++}})
 const operations=["dashboard","profile","list","create","detail","message","transition","complete"]
 for(const op of operations){
  const result=await interventionOperation({authorize:async()=>({status:401,body:{code:"auth_required"}}),admin:false,store,limiter:new MemoryRateLimiter(),now:()=>NOW},null,op,{})
  assert.equal(result.status,401)
 }
 const deps={authorize:async()=>({status:200,body:{userId:"actor"}}),admin:false,store,limiter:{consume:async()=>({allowed:false,retryAfter:1})},now:()=>NOW}
 assert.equal((await interventionOperation(deps,null,"dashboard")).status,429)
 deps.limiter.consume=async()=>{throw new Error("Limiter unavailable")}
 assert.equal((await interventionOperation(deps,null,"dashboard")).status,503)
 assert.equal(calls,0)
})
test("audit/outbox failure rolls back completion and restores the quota",()=>world(async f=>{
 const id=await f.prepare()
 await f.client.exec("CREATE FUNCTION fail_intervention_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'outbox offline'; END; $$; CREATE TRIGGER fail_intervention_outbox BEFORE INSERT ON intervention_outbox FOR EACH ROW EXECUTE FUNCTION fail_intervention_outbox();")
 assert.equal((await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:10},id)).status,503)
 assert.equal((await f.db.select().from(s.interventionTimeEntries)).length,0)
 assert.equal((await f.call(f.actors.a,"detail",{},id)).body.request.status,"in_progress")
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.remaining,60)
}))

test("Friend Care has a monthly 60-minute window, never an extra quota for hosting-only plans",()=>world(async f=>{
 const start=new Date("2026-11-11T12:00:00Z"),end=new Date("2026-12-11T12:00:00Z")
 await f.db.update(s.subscriptions).set({planCode:"friend_care",amountCents:2000,billingInterval:"month",serviceAnchorAt:start,currentPeriodStart:start,currentPeriodEnd:end}).where(eq(s.subscriptions.id,f.sub.id))
 await f.db.update(s.invoices).set({servicePeriodStart:start,servicePeriodEnd:end,amountDueCents:2000,amountPaidCents:2000})
 const q=(await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota
 assert.equal(q.included,60);assert.equal(q.start.toISOString(),start.toISOString())
 await f.db.update(s.subscriptions).set({planCode:"friend_host",amountCents:1000}).where(eq(s.subscriptions.id,f.sub.id))
 assert.equal((await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota.included,0)
}))
test("the first included acceptance binds an unassigned contract to one site only",()=>world(async f=>{
 await f.db.update(s.subscriptions).set({projectId:null}).where(eq(s.subscriptions.id,f.sub.id))
 const [other]=await f.db.insert(s.projects).values({userId:f.actors.a.id,name:"Another owned site"}).returning()
 const first=(await f.create()).body.id,second=(await f.create({projectId:other.id})).body.id
 await f.change(first,"analyzing");await f.change(second,"analyzing")
 assert.equal((await f.change(first,"accepted",{coverage:"included",minorScopeConfirmed:true})).status,200)
 assert.equal((await f.change(second,"accepted",{coverage:"included",minorScopeConfirmed:true})).status,409)
 assert.equal((await f.db.select().from(s.subscriptions))[0].projectId,f.sites[0].id)
}))
test("actual Stripe price mismatch freezes time without rewriting contract values",()=>world(async f=>{
 const billing=new DrizzleBillingStore(f.db)
 await billing.overlaySubscriptionStatus({stripeSubscriptionId:"sub_a",status:"active",currentPeriodStart:f.sub.currentPeriodStart,currentPeriodEnd:f.sub.currentPeriodEnd,cancelRequestedAt:null,cancelEffectiveAt:null,serviceAnchorAt:f.sub.serviceAnchorAt,observedAmountCents:1,observedBillingInterval:"year",observedPlanCode:"premium"})
 const [row]=await f.db.select().from(s.subscriptions)
 assert.equal(row.amountCents,69000);assert.equal(row.entitlementReviewRequired,true)
}))

test("a suspended period preserves consumed time for display while blocking all remaining time",()=>world(async f=>{
 const id=await f.prepare()
 await f.call(f.actors.admin,"complete",{operationKey:randomUUID(),minutes:25},id)
 await f.db.update(s.subscriptions).set({status:"past_due"}).where(eq(s.subscriptions.id,f.sub.id))
 const q=(await f.call(f.actors.a,"dashboard")).body.dashboard.subscriptions[0].quota
 assert.equal(q.consumed,25);assert.equal(q.remaining,0);assert.equal(q.reason,"inactive")
}))

test("shared JSON reader bounds chunked bodies before allocating an unbounded request",async()=>{
 const {readJson}=await import("../lib/auth/read-json.ts")
 let cancelled=false
 const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(8193))},cancel(){cancelled=true}})
 const request=new Request("http://localhost/api",{method:"POST",headers:{"Content-Type":"application/json","Content-Length":"1"},body:stream,duplex:"half"})
 assert.equal((await readJson(request)).status,413);assert.equal(cancelled,true)
})
test("shared JSON reader accepts valid Unicode and rejects malformed JSON, UTF-8 and media types",async()=>{
 const {readJson}=await import("../lib/auth/read-json.ts")
 const request=body=>new Request("http://localhost/api",{method:"POST",headers:{"Content-Type":"application/json"},body})
 assert.deepEqual(await readJson(request('{"name":"Élodie"}')),{ok:true,value:{name:"Élodie"}})
 assert.equal((await readJson(request("{"))).status,400)
 assert.equal((await readJson(request(new Uint8Array([255])))).status,400)
 assert.equal((await readJson(new Request("http://localhost/api",{method:"POST",body:"text"}))).status,415)
})
