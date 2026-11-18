import assert from "node:assert/strict"
import {test} from "node:test"
import {randomUUID} from "node:crypto"
import {d1Fixture,pgFixture,PEOPLE,NOW,promoInput,sub,invoice,payment,refund} from "./helpers/billing-databases.mjs"
import {D1BillingStore} from "../lib/db/d1/billing-store.ts"
import {applyStoredD1BillingEvents} from "../lib/db/d1/billing-event.ts"
import {BillingUnit} from "../lib/db/d1/billing-unit.ts"
import {summarizeBilling} from "../lib/billing/metrics.ts"
import {administerPromotions} from "../lib/billing/promotion-admin.ts"
import {startCheckout,previewOffer,startBillingPortal} from "../lib/billing/checkout.ts"
import {MemoryRateLimiter} from "../lib/auth/rate-limit.ts"
import {hashPromotionCode} from "../lib/billing/promotion.ts"

const reserve=(f,person=PEOPLE[1],extra={})=>f.billing.reservePromotion({codeHash:"synthetic-promotion-hash",userId:person.id,email:person.email,at:NOW,...extra})
const event=(id,subscription,created=100)=>({id,type:"subscription.upsert",created,subscription})
const scalar=async(f,sql,values=[])=>Object.values((await f.rows(sql,values))[0])[0]


import {createAuthService} from "../lib/auth/service.ts"
import {createD1AuthStore} from "../lib/db/d1/auth-store.ts"

// All providers are local doubles; no external request, email, payment or resource is created.
test("D1 promotion reservations serialize twenty callers against a one-use limit",async t=>{
 const f=await d1Fixture(t);await f.admin.create(promoInput(PEOPLE[0].id))
 const people=Array.from({length:20},(_,i)=>({id:randomUUID(),email:"client"+i+"@example.test"}))
 for(const p of people)await f.db.prepare("INSERT INTO users(id,email) VALUES(?,?)").bind(p.id,p.email).run()
 const results=await Promise.all(people.map(p=>reserve(f,p)))
 assert.equal(results.filter(r=>r.ok).length,1)
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM promotion_redemptions WHERE status='reserved'"),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM audit_logs WHERE action='promotion.reserved'"),1)
 assert.ok(results.filter(r=>!r.ok).every(r=>r.reason==="exhausted"))
})

test("D1 twenty duplicate webhook deliveries account for each subscription, invoice, payment and refund once",async t=>{
 const f=await d1Fixture(t),notices=[event("evt_duplicate",sub(PEOPLE[1].id)),{id:"evt_duplicate_invoice",created:110,type:"invoice.upsert",invoice:invoice(PEOPLE[1].id),payment:payment(PEOPLE[1].id)},{id:"evt_duplicate_refund",created:111,type:"refund.upsert",refund:refund()}]
 const results=await Promise.all(Array.from({length:20},()=>f.apply(notices)))
 assert.equal(results.filter(r=>r==="applied").length,1)
 assert.equal(results.filter(r=>r==="duplicate").length,19)
 for(const table of ["subscriptions","subscription_observations","invoices","payments","refunds"])assert.equal(await scalar(f,"SELECT count(*) FROM "+table),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM stripe_events"),3)
 assert.equal(await scalar(f,"SELECT sum(amount_cents) FROM payments"),1900)
 assert.equal(await scalar(f,"SELECT sum(amount_cents) FROM refunds"),200)
})

test("D1 staged notices can resolve a new subscription, invoice, payment and refund in one commit",async t=>{
 const f=await d1Fixture(t)
 const notices=[event("evt_sub",sub(PEOPLE[1].id)),{id:"evt_invoice",created:110,type:"invoice.upsert",invoice:invoice(""),payment:payment("")},{id:"evt_refund",created:111,type:"refund.upsert",refund:refund()}]
 assert.equal(await f.apply([...notices,notices[1]]),"applied")
 assert.equal(await scalar(f,"SELECT count(*) FROM stripe_events"),3)
 assert.equal(await scalar(f,"SELECT count(*) FROM payments"),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM refunds"),1)
 const joined=await f.rows("SELECT i.user_id,p.user_id AS payment_owner,i.subscription_id,s.id AS actual_subscription,p.invoice_id,i.id AS actual_invoice FROM invoices i JOIN payments p ON p.invoice_id=i.id JOIN subscriptions s ON s.id=i.subscription_id")
 assert.equal(joined[0].user_id,PEOPLE[1].id);assert.equal(joined[0].payment_owner,PEOPLE[1].id)
 assert.equal(joined[0].actual_subscription,joined[0].subscription_id)
 assert.equal(joined[0].actual_invoice,joined[0].invoice_id)
 assert.deepEqual(summarizeBilling(await f.billing.loadBillingInputs()),{theoreticalMrrCents:1900,theoreticalArrCents:22800,issuedCents:1900,collectedCents:1900,refundedCents:200,unpaidCents:0})
})

async function contract(f){
 const a=PEOPLE[1],b=PEOPLE[2],admin=PEOPLE[0],outcomes=[]
 const promotion=await f.admin.create(promoInput(admin.id,{maxRedemptions:2}))
 assert.ok(promotion?.id)
 assert.equal(await f.admin.create(promoInput(admin.id)),null)
 outcomes.push(await f.billing.previewPromotion({codeHash:"synthetic-promotion-hash",email:a.email,at:NOW}))
 const hold=await reserve(f);assert.equal(hold.ok,true)
 const again=await reserve(f);assert.equal(again.redemptionId,hold.redemptionId)
 const other=await reserve(f,b);assert.equal(other.ok,true)
 await f.billing.releasePromotion(other.redemptionId,NOW);await f.billing.releasePromotion(other.redemptionId,NOW)
 outcomes.push(await f.billing.saveStripeCustomerId(a.id,a.email,"cus_contract"))
 outcomes.push(await f.billing.saveStripeCustomerId(a.id,"billing@example.test","cus_ignored"))
 assert.equal(await f.billing.findUserIdByStripeCustomer("cus_contract"),a.id)
 assert.equal(await f.billing.findUserIdByStripeCustomer("cus_ignored"),null)
 assert.equal(await f.billing.saveStripeCustomerId(b.id,b.email,""),"")
 const checkout=await f.billing.beginCheckout({userId:a.id,planCode:"friend_host",interval:"month",amountCents:1000,redemptionId:hold.redemptionId,at:NOW})
 assert.equal(checkout.created,true)
 const reused=await f.billing.beginCheckout({userId:a.id,planCode:"friend_host",interval:"month",amountCents:1000,redemptionId:hold.redemptionId,at:NOW})
 assert.equal(reused.created,false);assert.equal(reused.checkout.id,checkout.id)
 await f.billing.attachCheckoutSession(checkout.id,"cs_contract","https://checkout.example.test/session")
 const subscription=sub(a.id,{planCode:"friend_host",amountCents:1000,privateOffer:true,promotionRedemptionId:hold.redemptionId,serviceAnchorAt:new Date(0)})
 const paid={id:"evt_checkout",type:"checkout.completed",created:100,checkoutId:"cs_contract",redemptionId:hold.redemptionId,paymentSettled:true,subscription}
 outcomes.push(await f.apply([paid]));outcomes.push(await f.apply([paid]))
 outcomes.push(await f.apply([event("evt_older",{...subscription,status:"past_due"},90)]))
 outcomes.push(await f.apply([event("evt_tie_missing",subscription)]))
 assert.equal(await f.billing.hasEvent("evt_tie_missing"),false)
 outcomes.push(await f.apply([event("evt_tie",subscription)],{reconcileSubscription:async()=>({...subscription,cancelRequestedAt:new Date(120000),cancelEffectiveAt:new Date(220000),currentPeriodEnd:new Date(220000),observedPlanCode:"friend_host",observedAmountCents:1000})}))
 // A changed Stripe offer flags manual review but never rewrites the contractual price/plan/interval.
 outcomes.push(await f.apply([event("evt_changed_offer",{...subscription,planCode:"premium",billingInterval:"year",amountCents:69000,observedAmountCents:69000,observedBillingInterval:"year",serviceAnchorAt:new Date(1000)},101)]))
 const inv=invoice("",{amountDueCents:1000,amountPaidCents:1000,totalCents:1000}),pay=payment("",{amountCents:1000})
 const billed={id:"evt_invoice",created:110,type:"invoice.upsert",invoice:inv,payment:pay}
 outcomes.push(await f.apply([billed]));outcomes.push(await f.apply([billed]))
 outcomes.push(await f.apply([{...billed,id:"evt_failed_same_second",type:"invoice.payment_failed",invoice:{...inv,status:"open",amountPaidCents:0,amountRemainingCents:1000},payment:{...pay,status:"failed",failureCode:"test_decline",paidAt:null}}]))
 outcomes.push(await f.apply([{id:"evt_refund",created:111,type:"refund.upsert",refund:refund()}]))
 outcomes.push(await f.apply([{id:"evt_refund_failed_same_second",created:111,type:"refund.upsert",refund:refund({status:"failed"})}]))
 await f.billing.releasePromotion(hold.redemptionId,NOW) // consumed is final: no counter decrement
 await f.admin.change(promotion.id,admin.id,{internalNotes:"updated notes",disable:true})
 const disabled=(await f.admin.list(50,0))[0].disabledAt
 await f.admin.change(promotion.id,admin.id,{disable:true})
 assert.equal((await f.admin.list(50,0))[0].disabledAt.getTime(),disabled.getTime())
 assert.equal(await f.admin.change(randomUUID(),admin.id,{disable:true}),false)
 assert.equal(await f.admin.detail(randomUUID()),null)
 const detail=await f.admin.detail(promotion.id)
 assert.ok(detail.createdAt instanceof Date);assert.equal(detail.legacy,false)
 assert.equal((await f.admin.detail(promotion.id,999)).reservations.length,0)
 await f.billing.upsertSubscription(sub(b.id,{stripeSubscriptionId:"",status:"incomplete"}),100)
 assert.equal(await f.billing.findSubscriptionByStripeId(""),null)
 const listed=await f.billing.listInvoices(a.id);assert.equal(listed.length,1)
 assert.equal((await f.billing.listInvoices(b.id)).length,0)
 const rows=await f.rows("SELECT user_id,plan_code,status,billing_interval,amount_cents,commercial_terms,entitlement_review_required,current_period_end,cancel_requested_at,cancel_effective_at,service_anchor_at,last_event_created FROM subscriptions")
 const snapshot=rows.map(r=>({...r,entitlement_review_required:Boolean(r.entitlement_review_required),last_event_created:Number(r.last_event_created),...Object.fromEntries(["current_period_end","cancel_requested_at","cancel_effective_at","service_anchor_at"].map(key=>[key,r[key] instanceof Date?r[key].getTime():r[key]]))})).sort((a,b)=>a.user_id.localeCompare(b.user_id))
 assert.equal(snapshot[0].amount_cents,1000);assert.equal(snapshot[0].plan_code,"friend_host");assert.equal(snapshot[0].billing_interval,"month");assert.equal(snapshot[0].service_anchor_at,0);assert.equal(snapshot[0].entitlement_review_required,true)
 return {outcomes,snapshot,checkout:await f.billing.checkoutByStripeId("cs_contract"),promotion:(await f.admin.list(50,0)).map(({codeHint,planCode,maxRedemptions,usageTerms,internalNotes,consumed,reserved})=>({codeHint,planCode,maxRedemptions,usageTerms,internalNotes,consumed,reserved})),redemptions:detail.reservations.map(({email,status,subscriptionStatus,amountCents,commercialTerms})=>({email,status,subscriptionStatus,amountCents,commercialTerms})).sort((x,y)=>x.email.localeCompare(y.email)),history:detail.history.map(h=>h.action).sort(),invoices:listed.map(({id,...rest})=>rest),metrics:summarizeBilling(await f.billing.loadBillingInputs()),admin:await f.billing.adminSnapshot(),events:await f.rows("SELECT event_id,event_type FROM stripe_events ORDER BY event_id"),observations:await f.rows("SELECT status,amount_cents,billing_interval,review_required FROM subscription_observations ORDER BY id")}
}

test("billing and promotion admin contracts match PostgreSQL including immutable terms, event order and finance views",async t=>{
 const pg=await pgFixture(t),d1=await d1Fixture(t)
 const a=await contract(pg),b=await contract(d1)
 // Generated identifiers are intentionally different; observable states and financial amounts must match.
 a.checkout.redemptionId="hold";b.checkout.redemptionId="hold"
 a.observations=a.observations.map(r=>({...r,review_required:Boolean(r.review_required)}));b.observations=b.observations.map(r=>({...r,review_required:Boolean(r.review_required)}))
 assert.deepEqual(b,a)
})

test("D1 same-second same-status events reconcile cancellation dates, and retries do not consume receipts",async t=>{
 const f=await d1Fixture(t),snapshot=sub(PEOPLE[1].id)
 await f.apply([event("evt_first",snapshot)])
 const incoming=event("evt_tie",{...snapshot,cancelRequestedAt:new Date(101000),cancelEffectiveAt:new Date(200000)})
 assert.equal(await f.apply([incoming]),"retry")
 assert.equal(await f.billing.hasEvent(incoming.id),false)
 await assert.rejects(f.apply([incoming],{reconcileSubscription:async()=>{throw new Error("synthetic temporary outage")}}))
 assert.equal(await f.billing.hasEvent(incoming.id),false)
 assert.equal(await f.apply([incoming],{reconcileSubscription:async()=>null}),"retry")
 assert.equal(await f.apply([incoming],{reconcileSubscription:async()=>({...snapshot,stripeSubscriptionId:"sub_wrong"})}),"retry")
 let current={...snapshot,cancelRequestedAt:new Date(102000),cancelEffectiveAt:new Date(250000),currentPeriodEnd:new Date(250000)},reads=0
 const options={reconcileSubscription:async()=>{reads++;return current}}
 assert.equal(await f.apply([incoming],options),"applied")
 assert.equal(await scalar(f,"SELECT cancel_effective_at FROM subscriptions"),250000)
 assert.equal(await f.apply([event("evt_stale_tie",snapshot)],options),"applied")
 assert.equal(await scalar(f,"SELECT cancel_effective_at FROM subscriptions"),250000)
 current={...snapshot,cancelRequestedAt:null,cancelEffectiveAt:null}
 assert.equal(await f.apply([event("evt_undo",snapshot)],options),"applied")
 assert.equal(await scalar(f,"SELECT cancel_effective_at FROM subscriptions"),null)
 assert.equal(reads,3)
 assert.equal(await f.apply([incoming],options),"duplicate");assert.equal(reads,3)
 assert.equal(await f.apply([event("evt_stale_older",{...snapshot,status:"past_due"},99)]),"applied")
 assert.equal(await scalar(f,"SELECT status FROM subscriptions"),"active")
})

test("D1 deletion before creation stays retryable; same-second deletion must also reconcile",async t=>{
 const f=await d1Fixture(t),snapshot=sub(PEOPLE[1].id)
 const deletion={id:"evt_delete_early",created:120,type:"subscription.deleted",stripeSubscriptionId:"sub_local"}
 assert.equal(await f.apply([deletion]),"retry");assert.equal(await f.billing.hasEvent(deletion.id),false)
 assert.equal(await f.apply([event("evt_created_late",snapshot,110)]),"applied")
 assert.equal(await f.apply([deletion]),"applied");assert.equal(await f.apply([deletion]),"duplicate")
 const equal={...deletion,id:"evt_delete_equal"}
 assert.equal(await f.apply([equal]),"retry")
 assert.equal(await f.apply([equal],{reconcileSubscription:async()=>({...snapshot,status:"canceled",cancelEffectiveAt:new Date(125000)})}),"applied")
 assert.equal(await scalar(f,"SELECT cancel_effective_at FROM subscriptions"),125000)
 assert.equal(await scalar(f,"SELECT last_event_created FROM subscriptions"),120)
 assert.equal(await f.apply([event("evt_old_creation",snapshot,100)]),"applied")
 assert.equal(await scalar(f,"SELECT status FROM subscriptions"),"canceled")
})

test("D1 own reservation is reused under concurrency; release is once-only and consumption is final",async t=>{
 const f=await d1Fixture(t);await f.admin.create(promoInput(PEOPLE[0].id))
 const holds=await Promise.all(Array.from({length:20},()=>reserve(f)))
 assert.ok(holds.every(h=>h.ok));assert.equal(new Set(holds.map(h=>h.redemptionId)).size,1)
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),1)
 await Promise.all(Array.from({length:20},()=>f.billing.releasePromotion(holds[0].redemptionId,NOW)))
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),0)
 assert.equal(await scalar(f,"SELECT count(*) FROM audit_logs WHERE action='promotion.released'"),1)
 const next=await reserve(f,PEOPLE[2]);assert.equal(next.ok,true)
 await Promise.all(Array.from({length:10},()=>f.billing.consumePromotion(next.redemptionId,NOW)))
 await f.billing.releasePromotion(next.redemptionId,NOW)
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM audit_logs WHERE action='promotion.consumed'"),1)
 assert.equal((await reserve(f)).reason,"exhausted")
})

test("D1 failed reservation audit/counter rolls back redemption, counter and revision together",async t=>{
 const f=await d1Fixture(t);await f.admin.create(promoInput(PEOPLE[0].id))
 for(const trigger of ["CREATE TRIGGER injected BEFORE INSERT ON audit_logs WHEN NEW.action='promotion.reserved' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END", "CREATE TRIGGER injected BEFORE UPDATE ON promotion_codes WHEN NEW.redemption_count>OLD.redemption_count BEGIN SELECT RAISE(ABORT,'synthetic counter failure'); END"]){
  await f.db.prepare(trigger).run()
  const revision=await scalar(f,"SELECT revision FROM d1_billing_revision")
  await assert.rejects(reserve(f))
  assert.equal(await scalar(f,"SELECT count(*) FROM promotion_redemptions"),0)
  assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),0)
  assert.equal(await scalar(f,"SELECT count(*) FROM audit_logs WHERE action='promotion.reserved'"),0)
  assert.equal(await scalar(f,"SELECT revision FROM d1_billing_revision"),revision)
  await f.db.prepare("DROP TRIGGER injected").run()
 }
 assert.equal((await reserve(f)).ok,true)
})

test("D1 a promotion disabled outside the staged store cannot be reserved from a stale snapshot",async t=>{
 const f=await d1Fixture(t),p=await f.admin.create(promoInput(PEOPLE[0].id));let injected=false
 const connection={prepare:q=>f.db.prepare(q),async batch(statements){if(!injected){injected=true;await f.admin.change(p.id,PEOPLE[0].id,{disable:true})}return f.db.batch(statements)}}
 const billing=new D1BillingStore(connection)
 const result=await billing.reservePromotion({codeHash:"synthetic-promotion-hash",userId:PEOPLE[1].id,email:PEOPLE[1].email,at:NOW})
 assert.deepEqual(result,{ok:false,reason:"disabled"})
 assert.equal(await scalar(f,"SELECT count(*) FROM promotion_redemptions"),0)
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),0)
})

test("D1 concurrent beginCheckout creates only one open checkout and no subscription",async t=>{
 const f=await d1Fixture(t)
 const input={userId:PEOPLE[1].id,planCode:"essential",interval:"month",amountCents:1900,redemptionId:null,at:NOW}
 const results=await Promise.all(Array.from({length:20},()=>f.billing.beginCheckout(input)))
 assert.equal(results.filter(r=>r.created).length,1)
 const id=results.find(r=>r.created).id
 assert.ok(results.filter(r=>!r.created).every(r=>r.checkout.id===id))
 assert.equal(await scalar(f,"SELECT count(*) FROM checkout_sessions"),1)
 assert.equal(await scalar(f,"SELECT count(*) FROM subscriptions"),0)
 await f.billing.failCheckout(id);await f.billing.expireCheckout(id)
 assert.equal(await scalar(f,"SELECT status FROM checkout_sessions"),"failed")
 assert.equal((await f.billing.beginCheckout(input)).created,true)
})

async function privateCheckout(f){
 const p=await f.admin.create(promoInput(PEOPLE[0].id)),hold=await reserve(f)
 const checkout=await f.billing.beginCheckout({userId:PEOPLE[1].id,planCode:"friend_host",interval:"month",amountCents:1000,redemptionId:hold.redemptionId,at:NOW})
 await f.billing.attachCheckoutSession(checkout.id,"cs_private","https://checkout.example.test/private")
 return {p,hold,checkout,subscription:sub(PEOPLE[1].id,{planCode:"friend_host",amountCents:1000,privateOffer:true,promotionRedemptionId:hold.redemptionId})}
}

test("D1 pending checkout cannot activate; later success consumes once and later expiry cannot release consumed code",async t=>{
 const f=await d1Fixture(t),flow=await privateCheckout(f)
 const pending={id:"evt_pending",type:"checkout.completed",created:100,checkoutId:"cs_private",redemptionId:flow.hold.redemptionId,paymentSettled:false,subscription:flow.subscription}
 assert.equal(await f.apply([pending]),"applied")
 assert.equal(await scalar(f,"SELECT status FROM subscriptions"),"incomplete")
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"reserved")
 assert.equal(await f.apply([{...pending,id:"evt_paid",type:"checkout.async_succeeded",created:101,paymentSettled:true}]),"applied")
 assert.equal(await scalar(f,"SELECT status FROM subscriptions"),"active")
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"consumed")
 await f.apply([{id:"evt_expired_late",created:102,type:"checkout.expired",checkoutId:"cs_private",redemptionId:flow.hold.redemptionId}])
 assert.equal(await scalar(f,"SELECT status FROM checkout_sessions"),"complete")
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"consumed")
 assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),1)
})

test("D1 retry of a later notice rolls back the entire delivery, including checkout and consumed code",async t=>{
 const f=await d1Fixture(t),flow=await privateCheckout(f)
 const notices=[{id:"evt_checkout",type:"checkout.completed",created:100,checkoutId:"cs_private",redemptionId:flow.hold.redemptionId,paymentSettled:true,subscription:flow.subscription},{id:"evt_refund_dependency",created:101,type:"refund.upsert",refund:refund()}]
 const revision=await scalar(f,"SELECT revision FROM d1_billing_revision")
 assert.equal(await f.apply(notices),"retry")
 assert.equal(await scalar(f,"SELECT status FROM checkout_sessions"),"open")
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"reserved")
 assert.equal(await scalar(f,"SELECT count(*) FROM audit_logs WHERE action='promotion.consumed'"),0)
 for(const table of ["stripe_events","subscriptions","subscription_observations"])assert.equal(await scalar(f,"SELECT count(*) FROM "+table),0)
 assert.equal(await scalar(f,"SELECT revision FROM d1_billing_revision"),revision)
 await f.billing.upsertPayment(payment(PEOPLE[1].id,{stripeInvoiceId:null}),99)
 assert.equal(await f.apply(notices),"applied")
 assert.equal(await f.apply(notices),"duplicate")
 assert.equal(await scalar(f,"SELECT status FROM checkout_sessions"),"complete")
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"consumed")
 assert.equal(await scalar(f,"SELECT count(*) FROM refunds"),1)
})

test("D1 SQL failure in payment or receipt rolls back earlier invoice/subscription/history writes",async t=>{
 const f=await d1Fixture(t)
 const notices=[event("evt_sub",sub(PEOPLE[1].id)),{id:"evt_invoice",created:110,type:"invoice.upsert",invoice:invoice(PEOPLE[1].id),payment:payment(PEOPLE[1].id)}]
 for(const table of ["payments","stripe_events"]){
  await f.db.prepare("CREATE TRIGGER injected BEFORE INSERT ON "+table+" BEGIN SELECT RAISE(ABORT,'synthetic delivery failure'); END").run()
  const revision=await scalar(f,"SELECT revision FROM d1_billing_revision")
  await assert.rejects(f.apply(notices))
  for(const name of ["subscriptions","subscription_observations","invoices","payments","stripe_events"])assert.equal(await scalar(f,"SELECT count(*) FROM "+name),0)
  assert.equal(await scalar(f,"SELECT revision FROM d1_billing_revision"),revision)
  await f.db.prepare("DROP TRIGGER injected").run()
 }
 assert.equal(await f.apply(notices),"applied")
 assert.equal(await f.apply(notices),"duplicate")
 assert.equal(await scalar(f,"SELECT count(*) FROM payments"),1)
})

test("D1 reconciliation re-fetches after a concurrent same-second update; stale observations never enter history",async t=>{
 const f=await d1Fixture(t),snapshot=sub(PEOPLE[1].id);await f.apply([event("evt_first",snapshot)])
 let reads=0
 const latest={...snapshot,cancelRequestedAt:new Date(102000),cancelEffectiveAt:new Date(250000),currentPeriodEnd:new Date(250000)}
 const options={reconcileSubscription:async()=>{
  reads++
  if(reads===1){assert.equal(await f.apply([event("evt_concurrent",snapshot)],{reconcileSubscription:async()=>latest}),"applied");return {...snapshot,cancelEffectiveAt:new Date(200000)}}
  return latest
 }}
 assert.equal(await f.apply([event("evt_staged",snapshot)],options),"applied")
 assert.equal(reads,2)
 assert.equal(await scalar(f,"SELECT cancel_effective_at FROM subscriptions"),250000)
 assert.equal(await scalar(f,"SELECT count(*) FROM subscription_observations WHERE cancel_effective_at=200000"),0)
 assert.equal(await scalar(f,"SELECT count(*) FROM subscription_observations"),2)
 assert.equal(await scalar(f,"SELECT count(*) FROM stripe_events"),3)
})

test("D1 bounded revision conflicts leave no receipt and a later clean delivery can resume",async t=>{
 const f=await d1Fixture(t);let conflicts=0
 const connection={prepare:q=>f.db.prepare(q),async batch(statements){conflicts++;await f.db.prepare("UPDATE users SET updated_at=updated_at WHERE id=?").bind(PEOPLE[1].id).run();return f.db.batch(statements)}}
 const notices=[event("evt_busy",sub(PEOPLE[1].id))]
 assert.equal(await applyStoredD1BillingEvents(connection,notices),"retry")
 assert.equal(conflicts,8)
 for(const table of ["subscriptions","subscription_observations","stripe_events"])assert.equal(await scalar(f,"SELECT count(*) FROM "+table),0)
 assert.equal(await f.apply(notices),"applied")
 assert.equal(await f.apply(notices),"duplicate")
})

test("D1 refund-before-payment retries and same-second failures cannot downgrade successful money records",async t=>{
 const f=await d1Fixture(t)
 const refunded={id:"evt_refund_early",created:111,type:"refund.upsert",refund:refund()}
 assert.equal(await f.apply([refunded]),"retry")
 assert.equal(await f.billing.hasEvent(refunded.id),false)
 const billed={id:"evt_invoice",created:110,type:"invoice.upsert",invoice:invoice(PEOPLE[1].id),payment:payment(PEOPLE[1].id)}
 assert.equal(await f.apply([billed]),"applied")
 assert.equal(await f.apply([refunded]),"applied");assert.equal(await f.apply([refunded]),"duplicate")
 await f.apply([{...billed,id:"evt_invoice_failed",type:"invoice.payment_failed",invoice:invoice(PEOPLE[1].id,{status:"open",amountPaidCents:0,amountRemainingCents:1900}),payment:payment(PEOPLE[1].id,{status:"failed",paidAt:null,failureCode:"test_decline"})}])
 await f.apply([{...refunded,id:"evt_refund_failed",refund:refund({status:"failed"})}])
 assert.equal(await scalar(f,"SELECT status FROM invoices"),"paid")
 assert.equal(await scalar(f,"SELECT status FROM payments"),"succeeded")
 assert.equal(await scalar(f,"SELECT status FROM refunds"),"succeeded")
 assert.equal(await scalar(f,"SELECT succeeded_event_at FROM refunds"),111000)
 // Later authoritative changes retain the FIRST succeeded event date used by financial reporting.
 await f.apply([{...refunded,id:"evt_refund_later_pending",created:120,refund:refund({status:"pending"})}])
 await f.apply([{...refunded,id:"evt_refund_later_success",created:121}])
 assert.equal(await scalar(f,"SELECT succeeded_event_at FROM refunds"),111000)
 assert.equal(await scalar(f,"SELECT sum(amount_cents) FROM refunds"),200)
 assert.equal((await f.billing.listInvoices(PEOPLE[2].id)).length,0)
})

function checkoutGateway(options={}){
 const calls=[]
 return {calls,async retrievePrice(id){calls.push({op:"price",id});return options.quote??(id==="price_yearly_synthetic"?{unitAmount:19000,currency:"eur",interval:"year"}:{unitAmount:1000,currency:"eur",interval:"month"})},async retrieveCheckoutStatus(){return "open"},async createCustomer(input){calls.push({op:"customer",input});return {id:"cus_synthetic_"+input.userId}},async createSubscriptionCheckout(input){calls.push({op:"checkout",input});if(options.fail)throw new Error("synthetic checkout outage");return {id:"cs_synthetic",url:"https://checkout.example.test/synthetic"}},async createPortal(input){calls.push({op:"portal",input});return {url:"https://portal.example.test/synthetic"}}}
}

test("unchanged Checkout on D1 uses server prices, authorizes private codes and never activates on success URL",async t=>{
 const f=await d1Fixture(t),gateway=checkoutGateway(),code="NOMAD-QUALIFICATION"
 await f.admin.create(promoInput(PEOPLE[0].id,{codeHash:hashPromotionCode(code)}))
 const deps={store:f.billing,gateway,prices:{friend_host:{month:"price_private_synthetic"}},now:()=>NOW,appUrl:"https://qualification.example.test"}
 const input={userId:PEOPLE[1].id,email:PEOPLE[1].email,planCode:"friend_host",interval:"month",promotionCode:null,amountCents:1,priceId:"attacker-price"}
 assert.equal((await startCheckout(deps,input)).body.code,"plan_invalid")
 assert.equal(gateway.calls.length,0)
 const result=await startCheckout(deps,{...input,promotionCode:code})
 assert.equal(result.status,200)
 const sent=gateway.calls.find(c=>c.op==="checkout").input
 assert.equal(sent.amountCents,1000);assert.equal(sent.priceId,"price_private_synthetic");assert.equal(sent.interval,"month")
 assert.ok(sent.successUrl.endsWith("checkout=success"));assert.ok(sent.redemptionId)
 assert.equal(await scalar(f,"SELECT count(*) FROM subscriptions"),0)
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"reserved")
 assert.equal((await startCheckout(deps,{...input,promotionCode:code})).body.reused,true)
 assert.equal(gateway.calls.filter(c=>c.op==="checkout").length,1)
 assert.equal((await startBillingPortal(deps,PEOPLE[2].id)).status,409)
 assert.equal((await startBillingPortal(deps,PEOPLE[1].id)).status,200)
 assert.equal(gateway.calls.find(c=>c.op==="portal").input.customerId,"cus_synthetic_"+PEOPLE[1].id)
})

test("unchanged Checkout on D1 keeps annual pricing and releases private holds on quote/provider failure",async t=>{
 const f=await d1Fixture(t),yearGateway=checkoutGateway()
 const deps={store:f.billing,gateway:yearGateway,prices:{essential:{year:"price_yearly_synthetic"}},now:()=>NOW,appUrl:"https://qualification.example.test"}
 assert.equal((await startCheckout(deps,{userId:PEOPLE[1].id,email:PEOPLE[1].email,planCode:"essential",interval:"year",promotionCode:null,amountCents:1})).status,200)
 assert.equal(yearGateway.calls.find(c=>c.op==="checkout").input.amountCents,19000)
 assert.equal(await scalar(f,"SELECT count(*) FROM subscriptions"),0)
 const code="NOMAD-FAILED-PROVIDER"
 await f.admin.create(promoInput(PEOPLE[0].id,{codeHash:hashPromotionCode(code)}))
 const input={userId:PEOPLE[2].id,email:PEOPLE[2].email,planCode:"friend_host",interval:"month",promotionCode:code}
 for(const gateway of [checkoutGateway({quote:{unitAmount:1,currency:"eur",interval:"month"}}),checkoutGateway({fail:true})]){
  const result=await startCheckout({...deps,gateway,prices:{friend_host:{month:"price_private_synthetic"}}},input)
  assert.equal(result.status,503)
  if(result.body.code==="checkout_failed")assert.equal(gateway.calls.filter(c=>c.op==="checkout").length,1)
  assert.equal(await scalar(f,"SELECT redemption_count FROM promotion_codes"),0)
  assert.equal(await scalar(f,"SELECT count(*) FROM promotion_redemptions WHERE status='reserved'"),0)
 }
 assert.equal(await scalar(f,"SELECT count(*) FROM subscriptions"),0)
})

test("D1 promotion eligibility preserves expiration boundaries, restrictions, hidden failure reasons and epoch dates",async t=>{
 const f=await d1Fixture(t)
 await f.admin.create(promoInput(PEOPLE[0].id,{expiresAt:new Date(NOW.getTime()+1),restrictedEmail:PEOPLE[1].email,maxRedemptions:2}))
 assert.equal((await reserve(f,PEOPLE[2])).reason,"restricted")
 const held=await reserve(f);assert.equal(held.ok,true)
 const expired=await reserve(f,PEOPLE[1],{at:new Date(NOW.getTime()+1)})
 assert.equal(expired.ok,true);assert.equal(expired.redemptionId,held.redemptionId);assert.equal(expired.holdReason,"expired")
 assert.equal((await reserve(f,PEOPLE[2],{at:new Date(NOW.getTime()+1)})).reason,"expired")
 const second=await f.admin.create(promoInput(PEOPLE[0].id,{codeHash:hashPromotionCode("NOMAD-EPOCH"),expiresAt:new Date(0)}))
 assert.equal((await f.billing.previewPromotion({codeHash:hashPromotionCode("NOMAD-EPOCH"),email:PEOPLE[1].email,at:NOW})).reason,"expired")
 await f.db.prepare("UPDATE promotion_codes SET disabled_at=0 WHERE id=?").bind(second.id).run()
 assert.equal((await f.billing.previewPromotion({codeHash:hashPromotionCode("NOMAD-EPOCH"),email:PEOPLE[1].email,at:NOW})).reason,"disabled")
 const publicResult=await previewOffer(f.billing,{code:"NOMAD-EPOCH",email:PEOPLE[1].email,language:"fr",at:NOW})
 assert.equal(publicResult.body.code,"invalid")
 assert.equal((await f.billing.previewPromotion({codeHash:"' OR 1=1 --",email:PEOPLE[1].email,at:NOW})).reason,"invalid")
})

test("D1 missing owners and mismatched private grants cannot create subscriptions or consume receipts",async t=>{
 const f=await d1Fixture(t);await f.admin.create(promoInput(PEOPLE[0].id))
 const held=await reserve(f)
 const denied=[sub(randomUUID()),sub(PEOPLE[2].id,{planCode:"friend_host",amountCents:1000,privateOffer:true,promotionRedemptionId:held.redemptionId}),sub(PEOPLE[1].id,{planCode:"friend_care",amountCents:2000,privateOffer:true,promotionRedemptionId:held.redemptionId})]
 for(let i=0;i<denied.length;i++)assert.equal(await f.apply([event("evt_denied_"+i,denied[i])]),"retry")
 assert.equal(await scalar(f,"SELECT count(*) FROM subscriptions"),0)
 assert.equal(await scalar(f,"SELECT count(*) FROM stripe_events"),0)
 assert.equal(await scalar(f,"SELECT status FROM promotion_redemptions"),"reserved")
})

test("D1 promotion administration remains gated by admin role and never returns stored hashes",async t=>{
 const f=await d1Fixture(t),sent=[],limiter=new MemoryRateLimiter(()=>NOW.getTime()),store=createD1AuthStore(f.db)
 const service=createAuthService({store,limiter,mailer:{configured:true,async sendMagicLink(to,url){sent.push({to,url})}},env:{authSecret:"local-qualification-auth-only-secret-0000",appUrl:"http://localhost:3000",adminEmails:new Set([PEOPLE[0].email]),mfaKey:Buffer.from("0123456789abcdef0123456789abcdef"),secureCookies:false},now:()=>NOW})
 const signIn=async email=>{await service.requestMagicLink({email,ip:"203.0.113.8"});return service.verifyMagicLink({token:new URL(sent.at(-1).url).searchParams.get("token"),ip:"203.0.113.8"})}
 const deps={store:f.admin,authorize:cookie=>service.adminIdentity(cookie),limiter,now:()=>NOW}
 const client=await signIn(PEOPLE[1].email),admin=await signIn(PEOPLE[0].email)
 const input={mode:"manual",code:"NOMAD-ADMIN-LOCAL",planCode:"friend_host"}
 assert.equal((await administerPromotions(deps,null,"create",input)).status,401)
 assert.equal((await administerPromotions(deps,client.cookie.value,"create",input)).status,403)
 const created=await administerPromotions(deps,admin.cookie.value,"create",input)
 assert.equal(created.status,201)
 const list=await administerPromotions(deps,admin.cookie.value,"list",{})
 const detail=await administerPromotions(deps,admin.cookie.value,"detail",{},created.body.id)
 const output=JSON.stringify([list,detail])
 assert.ok(!output.includes(created.body.code));assert.ok(!output.includes(hashPromotionCode(created.body.code)));assert.ok(!output.includes("codeHash"))
 assert.equal((await administerPromotions(deps,admin.cookie.value,"change",{planCode:"friend_care"},created.body.id)).body.code,"immutable")
 await service.logout(admin.cookie.value)
 assert.equal((await administerPromotions(deps,admin.cookie.value,"list",{})).status,401)
})

test("D1 dependency revisions invalidate raw SQL changes; broken metadata fails closed",async t=>{
 const f=await d1Fixture(t),unit=await BillingUnit.begin(f.db)
 await unit.one("users",{id:PEOPLE[1].id})
 const revision=await scalar(f,"SELECT revision FROM d1_billing_revision")
 await f.db.prepare("UPDATE users SET updated_at=updated_at WHERE id=?").bind(PEOPLE[1].id).run()
 assert.equal(await scalar(f,"SELECT revision FROM d1_billing_revision"),revision+1)
 await assert.rejects(unit.commit(),/billing_snapshot_current/)
 const triggers=await f.rows("SELECT name FROM sqlite_schema WHERE type='trigger' AND name LIKE 'd1_billing_revision_%'")
 assert.equal(triggers.length,54)
 const staged=await BillingUnit.begin(f.db),billing=new D1BillingStore(f.db,staged)
 await assert.rejects(billing.adminSnapshot(),/staged/)
 await assert.rejects(billing.loadBillingInputs(),/staged/)
 await f.db.prepare("DELETE FROM d1_billing_revision").run()
 await assert.rejects(f.apply([event("evt_broken_metadata",sub(PEOPLE[1].id))]),/revision missing/)
 assert.equal(await scalar(f,"SELECT count(*) FROM stripe_events"),0)
})
