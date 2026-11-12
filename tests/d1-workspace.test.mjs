import assert from 'node:assert/strict'
import {test} from 'node:test'
import {randomUUID} from 'node:crypto'
import {d1Fixture,pgFixture,PEOPLE,NOW,sub,invoice,payment} from './helpers/billing-databases.mjs'
import {D1InterventionStore} from '../lib/db/d1/intervention-store.ts'
import {D1AdminStore} from '../lib/db/d1/admin-store.ts'
import {DrizzleInterventionStore} from '../lib/db/intervention-store.ts'
import {DrizzleAdminStore} from '../lib/db/admin-store.ts'
import {createD1AuthStore} from '../lib/db/d1/auth-store.ts'
import {DrizzleAuthStore} from '../lib/db/auth-store.ts'
const client={id:PEOPLE[1].id,admin:false},admin={id:PEOPLE[0].id,admin:true},other={id:PEOPLE[2].id,admin:false}
const query={kind:'clients',offset:0,q:'',from:new Date('2026-11-01'),to:new Date('2026-12-01')}
async function setup(f,d1){
 const auth=d1?createD1AuthStore(f.db):new DrizzleAuthStore(f.db),store=d1?new D1InterventionStore(f.db):new DrizzleInterventionStore(f.db),pilot=d1?new D1AdminStore(f.db):new DrizzleAdminStore(f.db)
 const project=await auth.createProject(client.id,'Qualification project',NOW)
 await store.profile(client,{firstName:'Émilie',lastName:'Client'})
 await f.billing.upsertSubscription(sub(client.id,{planCode:'premium',amountCents:69000,billingInterval:'year',serviceAnchorAt:new Date('2026-11-01'),currentPeriodStart:new Date('2026-11-01'),currentPeriodEnd:new Date('2027-11-01')}),100)
 const subscription=await f.billing.findSubscriptionByStripeId('sub_local')
 await f.billing.upsertInvoice(invoice(client.id,{amountDueCents:69000,amountPaidCents:69000,totalCents:69000,issuedAt:new Date('2026-11-01'),paidAt:new Date('2026-11-01'),servicePeriodStart:new Date('2026-11-01'),servicePeriodEnd:new Date('2027-11-01')}),101)
 await f.billing.upsertPayment(payment(client.id,{amountCents:69000,paidAt:new Date('2026-11-01')}),101)
 const input={projectId:project.id,subscriptionId:subscription.id,subject:'Minor update',description:'A minor update requested by the client',category:'minor_fix',urgency:'normal',operationKey:randomUUID()}
 return {store,pilot,input,subscription,project}
}
async function ready(store,input){const created=await store.create(client,input,NOW);for(const [status,extra]of [['analyzing',{}],['accepted',{coverage:'included',minorScopeConfirmed:true}],['in_progress',{}]])await store.mutate(admin,created.id,'transition',{status,...extra,operationKey:randomUUID()},NOW);return created}
async function contract(f,d1){const {store,pilot,input}=await setup(f,d1),request=await ready(store,input)
 await store.mutate(admin,request.id,'message',{body:'Internal only',internal:true,operationKey:randomUUID()},NOW)
 assert.ok(!JSON.stringify(await store.detail(client,request.id,0,NOW)).includes('Internal only'))
 await assert.rejects(store.detail(other,request.id,0,NOW),e=>e.code==='not_found')
 const operation={minutes:20,body:'Completed actual work',operationKey:randomUUID()}
 await store.mutate(admin,request.id,'complete',operation,NOW);await store.mutate(admin,request.id,'complete',operation,NOW)
 const dashboard=await store.dashboard(client,NOW),detail=await store.detail(client,request.id,0,NOW)
 assert.equal(dashboard.subscriptions[0].quota.remaining,40)
 const overview=await pilot.overview(query,NOW),records=await pilot.records({...query,q:'éMILIE'})
 assert.equal(records.total,1)
 for(const kind of ['clients','subscriptions','invoices','payments','refunds','interventions','redemptions','history','audit'])assert.ok(Array.isArray((await pilot.records({...query,kind})).rows))
 return {quota:dashboard.subscriptions[0].quota,events:detail.events.map(e=>({kind:e.kind,body:e.body,from:e.fromStatus,to:e.toStatus})),time:detail.time,finances:overview.finances,counts:{clients:overview.counts.clients,openInterventions:overview.counts.openInterventions},profile:dashboard.profile}
}
test('workspace and financial contracts agree between PostgreSQL and D1',async t=>{const pg=await pgFixture(t),d1=await d1Fixture(t);assert.deepEqual(await contract(d1,true),await contract(pg,false))})
test('D1 concurrent completions never overspend and cannot charge twice',async t=>{const f=await d1Fixture(t),{store,input}=await setup(f,true),a=await ready(store,input),b=await ready(store,{...input,operationKey:randomUUID()});const results=await Promise.allSettled([a,b].map(r=>store.mutate(admin,r.id,'complete',{minutes:40,operationKey:randomUUID()},NOW)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.rows('SELECT consumed_minutes FROM intervention_periods'))[0].consumed_minutes,40);assert.equal((await f.rows('SELECT count(*) AS n FROM intervention_time_entries'))[0].n,1)})
test('D1 outbox failure rolls back quota, completion, time and history',async t=>{const f=await d1Fixture(t),{store,input}=await setup(f,true),r=await ready(store,input);await f.db.prepare("CREATE TRIGGER injected BEFORE INSERT ON intervention_outbox BEGIN SELECT RAISE(ABORT,'test failure'); END").run();await assert.rejects(store.mutate(admin,r.id,'complete',{minutes:20,operationKey:randomUUID()},NOW));assert.equal((await store.detail(client,r.id,0,NOW)).status,'in_progress');assert.equal((await f.rows('SELECT count(*) AS n FROM intervention_time_entries'))[0].n,0);assert.equal((await store.dashboard(client,NOW)).subscriptions[0].quota.remaining,60)})
test('D1 impaid periods and monthly renewal preserve eligibility and no carry',async t=>{const f=await d1Fixture(t),{store,subscription}=await setup(f,true);assert.equal((await store.dashboard(client,new Date('2026-12-02'))).subscriptions[0].quota.remaining,60);await f.billing.upsertInvoice(invoice(client.id,{stripeInvoiceId:'in_unpaid',status:'open',amountPaidCents:0,amountRemainingCents:69000,servicePeriodStart:new Date('2026-11-01'),servicePeriodEnd:new Date('2027-11-01')}),200);assert.equal((await store.dashboard(client,NOW)).subscriptions[0].quota.reason,'unpaid')})
