import assert from "node:assert/strict"
import {test} from "node:test"
import {randomUUID} from "node:crypto"
import {readdirSync,readFileSync} from "node:fs"
import {PGlite} from "@electric-sql/pglite"
import {drizzle} from "drizzle-orm/pglite"
import {localD1,migrations} from "./helpers/d1.mjs"
import {migrateD1} from "../lib/db/d1/migrate.ts"
import {d1Statements} from "../lib/db/d1/statements.ts"
import {D1AuthStore,createD1AuthStore} from "../lib/db/d1/auth-store.ts"
import {DrizzleAuthStore} from "../lib/db/auth-store.ts"
import {requireChanges} from "../lib/db/d1/atomic.ts"
import {date,milliseconds,nullableDate,uuid} from "../lib/db/d1/codec.ts"
import {sqlStatements} from "../lib/db/statements.ts"
import {EmailConflictError} from "../lib/auth/store.ts"
import {createAuthService} from "../lib/auth/service.ts"
import {MemoryRateLimiter} from "../lib/auth/rate-limit.ts"
import {decodeBase32,totpAt} from "../lib/auth/totp.ts"
import {PLANS} from "../lib/shop/plans.ts"
import {summarizeBilling} from "../lib/billing/metrics.ts"
import * as schema from "../lib/db/schema.ts"

async function pgDatabase(){
 const client=new PGlite()
 try{
  const root=new URL("../drizzle/",import.meta.url)
  for(const name of readdirSync(root).filter(n=>n.endsWith(".sql")).sort())
   for(const sql of sqlStatements(readFileSync(new URL(name,root),"utf8")))await client.exec(sql)
  return {client,store:new DrizzleAuthStore(drizzle(client,{schema})),close:()=>client.close()}
 }catch(error){await client.close();throw error}
}
async function fixture(t){const f=await localD1();t.after(()=>f.close());return f.db}
async function owner(db,email="owner@example.test"){
 return db.prepare("INSERT INTO users(email) VALUES(?) RETURNING *").bind(email).first()
}
async function subscription(db,userId,overrides={}){
 const id=randomUUID()
 await db.prepare("INSERT INTO subscriptions(id,user_id,plan_code,status,billing_interval,amount_cents,current_period_start,current_period_end,last_event_created) VALUES(?,?,'essential',?,?,?,100000,200000,100)").bind(id,userId,overrides.status??"active",overrides.interval??"month",overrides.amount??1900).run()
 return id
}

test("D1 migrations retain every PostgreSQL table/column and contractual catalog",async t=>{
 const db=await fixture(t),pg=await pgDatabase();t.after(()=>pg.close())
 const {rows}=await pg.client.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,column_name")
 const pgTables=new Set(rows.map(r=>r.table_name))
 for(const table of pgTables){
  const info=await db.prepare('PRAGMA table_info("'+table+'")').all()
  assert.deepEqual(info.results.map(r=>r.name).filter(n=>!["search_first_name","search_last_name"].includes(n)).sort(),rows.filter(r=>r.table_name===table).map(r=>r.column_name))
 }
 const tables=(await db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all()).results.map(r=>r.name).filter(n=>!n.startsWith("sqlite_")&&!n.startsWith("d1_"))
 assert.deepEqual(tables.sort(),[...pgTables].sort())
 const catalog=(await db.prepare('SELECT code,visibility,monthly_amount_cents AS "monthlyAmountCents",yearly_amount_cents AS "yearlyAmountCents" FROM plans ORDER BY code').all()).results
 assert.deepEqual(catalog,[...PLANS].sort((a,b)=>a.code.localeCompare(b.code)))
 assert.deepEqual((await db.prepare("PRAGMA foreign_key_check").all()).results,[])
 assert.equal((await db.prepare("PRAGMA foreign_keys").first()).foreign_keys,1)
})

test("D1 migration receipts are idempotent and reject checksum changes and unknown history",async t=>{
 const db=await fixture(t)
 assert.deepEqual(await migrateD1(db,migrations()),[])
 assert.deepEqual(await migrateD1(db,migrations().map(m=>({...m,source:m.source.replace(/\r?\n/g,"\r\n")}))),[])
 const changed=migrations();changed[0]={...changed[0],source:changed[0].source+"\n-- changed"}
 await assert.rejects(migrateD1(db,changed),/checksum/)
 await assert.rejects(migrateD1(db,migrations().slice(1)),/history/)
 await assert.rejects(migrateD1(db,[migrations()[0],migrations()[0]]),/order/)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM d1_schema_migrations").first()).n,migrations().length)
})

test("D1 failed migration rolls back DDL, data and its receipt",async t=>{
 const db=await fixture(t)
 const broken={name:"0005_failure.sql",source:"CREATE TABLE migration_failure(id INTEGER PRIMARY KEY);\n--> statement-breakpoint\nINSERT INTO migration_failure VALUES(1);\n--> statement-breakpoint\nINSERT INTO absent_table VALUES(1);"}
 await assert.rejects(migrateD1(db,[...migrations(),broken]))
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name='migration_failure'").first()).n,0)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM d1_schema_migrations").first()).n,migrations().length)
})

test("D1 strict schema rejects unsafe prices, enums, IDs, booleans, integer overflow and invalid JSON",async t=>{
 const db=await fixture(t),user=await owner(db)
 await assert.rejects(db.prepare("INSERT INTO users(email,role) VALUES('bad-role@example.test','root')").run())
 await assert.rejects(db.prepare("INSERT INTO users(id,email) VALUES('not-a-uuid','bad-id@example.test')").run())
 for(const amount of [0,-1,1.5,2147483648])await assert.rejects(subscription(db,user.id,{amount}))
 await assert.rejects(subscription(db,user.id,{status:"invented"}))
 await assert.rejects(subscription(db,user.id,{interval:"week"}))
 const id=await subscription(db,user.id)
 await assert.rejects(db.prepare("UPDATE subscriptions SET private_offer=2 WHERE id=?").bind(id).run())
 await assert.rejects(db.prepare("UPDATE subscriptions SET currency='USD' WHERE id=?").bind(id).run())
 await assert.rejects(db.prepare("INSERT INTO audit_logs(action,metadata) VALUES('test','invalid json')").run())
 await assert.rejects(db.prepare("INSERT INTO plans(code,visibility,monthly_amount_cents,currency) VALUES('bad','public',1,'USD')").run())
 await assert.rejects(db.prepare("INSERT INTO promotion_codes(code_hash,plan_code) VALUES('bad','essential')").run())
})

test("D1 promotion terms and final redemptions remain immutable with atomic audits",async t=>{
 const db=await fixture(t),user=await owner(db),other=await owner(db,"other@example.test")
 const promo=await db.prepare("INSERT INTO promotion_codes(code_hash,plan_code,max_redemptions,changed_by) VALUES('hash-private','friend_host',1,?) RETURNING id").bind(user.id).first()
 const update=sql=>db.prepare(sql+" WHERE id=?").bind(promo.id).run()
 for(const assignment of ["code_hash='changed'","plan_code='friend_care'","expires_at=1","max_redemptions=2","restricted_email='other@example.test'","usage_terms='new'","code_hint='new'","created_at=1"])
  await assert.rejects(update("UPDATE promotion_codes SET "+assignment))
 await update("UPDATE promotion_codes SET internal_notes='note',disabled_at=1000")
 await assert.rejects(update("UPDATE promotion_codes SET disabled_at=NULL"))
 await assert.rejects(update("UPDATE promotion_codes SET disabled_at=2000"))
 assert.deepEqual((await db.prepare("SELECT action FROM audit_logs WHERE json_extract(metadata,'$.promotionId')=? ORDER BY action").bind(promo.id).all()).results.map(r=>r.action),["promotion.created","promotion.disabled","promotion.notes_updated"])
 const redemption=await db.prepare("INSERT INTO promotion_redemptions(promotion_code_id,user_id,status) VALUES(?,?,'reserved') RETURNING id").bind(promo.id,user.id).first()
 await assert.rejects(db.prepare("INSERT INTO promotion_redemptions(promotion_code_id,user_id,status) VALUES(?,?,'reserved')").bind(promo.id,user.id).run())
 await assert.rejects(db.prepare("UPDATE promotion_redemptions SET user_id=? WHERE id=?").bind(other.id,redemption.id).run())
 await db.prepare("UPDATE promotion_redemptions SET status='consumed' WHERE id=?").bind(redemption.id).run()
 await assert.rejects(db.prepare("UPDATE promotion_redemptions SET status='released' WHERE id=?").bind(redemption.id).run())
 assert.deepEqual((await db.prepare("SELECT action FROM audit_logs WHERE json_extract(metadata,'$.redemptionId')=? ORDER BY action").bind(redemption.id).all()).results.map(r=>r.action),["promotion.consumed","promotion.reserved"])
 await assert.rejects(db.batch([db.prepare("UPDATE promotion_codes SET internal_notes='rollback' WHERE id=?").bind(promo.id),db.prepare("UPDATE promotion_codes SET max_redemptions=9 WHERE id=?").bind(promo.id)]))
 assert.equal((await db.prepare("SELECT internal_notes FROM promotion_codes WHERE id=?").bind(promo.id).first()).internal_notes,"note")
 assert.equal((await db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='promotion.notes_updated'").first()).n,1)
})

test("D1 subscription observation records same-status cancellation dates and is immutable",async t=>{
 const db=await fixture(t),user=await owner(db),id=await subscription(db,user.id)
 await db.prepare("UPDATE subscriptions SET cancel_requested_at=101000,cancel_effective_at=200000 WHERE id=?").bind(id).run()
 await db.prepare("UPDATE subscriptions SET cancel_requested_at=102000,cancel_effective_at=250000 WHERE id=?").bind(id).run()
 await db.prepare("UPDATE subscriptions SET updated_at=999999 WHERE id=?").bind(id).run()
 const rows=(await db.prepare("SELECT * FROM subscription_observations WHERE subscription_id=? ORDER BY id").bind(id).all()).results
 assert.equal(rows.length,3);assert.equal(rows[2].status,"active");assert.equal(rows[2].stripe_event_created,100)
 assert.equal(rows[2].cancel_effective_at,250000);assert.equal(rows[2].amount_cents,1900)
 await assert.rejects(db.prepare("UPDATE subscription_observations SET amount_cents=1").run())
 await assert.rejects(db.prepare("DELETE FROM subscription_observations").run())
})

test("D1 intervention ownership, immutable time and operation uniqueness survive the port",async t=>{
 const db=await fixture(t),a=await owner(db),b=await owner(db,"b@example.test"),store=new D1AuthStore(db)
 const project=await store.createProject(a.id,"Project",new Date(100000))
 const sub=await subscription(db,a.id),otherSub=await subscription(db,b.id)
 const create=(uid,sid)=>db.prepare("INSERT INTO intervention_requests(user_id,project_id,subscription_id,submission_key,payload_hash,subject,description,category,urgency) VALUES(?,?,?,?,'payload','Subject','Long description','minor_fix','normal') RETURNING id").bind(uid,project.id,sid,randomUUID()).first()
 await assert.rejects(create(b.id,otherSub));await assert.rejects(create(a.id,otherSub))
 const request=await create(a.id,sub)
 const period=await db.prepare("INSERT INTO intervention_periods(subscription_id,period_start,period_end) VALUES(?,100000,200000) RETURNING id").bind(sub).first()
 await assert.rejects(db.prepare("UPDATE intervention_periods SET consumed_minutes=61 WHERE id=?").bind(period.id).run())
 await assert.rejects(db.prepare("INSERT INTO intervention_periods(subscription_id,period_start,period_end) VALUES(?,300000,300000)").bind(sub).run())
 await db.prepare("INSERT INTO intervention_time_entries(request_id,subscription_id,period_id,actor_id,minutes,coverage,performed_at) VALUES(?,?,?,?,40,'included',150000)").bind(request.id,sub,period.id,a.id).run()
 await assert.rejects(db.prepare("UPDATE intervention_time_entries SET minutes=1").run());await assert.rejects(db.prepare("DELETE FROM intervention_time_entries").run())
 const key=randomUUID(),event=()=>db.prepare("INSERT INTO intervention_events(request_id,actor_id,actor_role,kind,operation_key,payload_hash) VALUES(?,?,'admin','priority',?,'hash')").bind(request.id,a.id,key).run()
 await event();await assert.rejects(event())
 const checkout=()=>db.prepare("INSERT INTO checkout_sessions(user_id,plan_code,billing_interval,amount_cents) VALUES(?,'essential','month',1900)").bind(a.id).run()
 await checkout();await assert.rejects(checkout())
})

test("D1 checked quota batch under concurrency rolls back journal and triggers on zero-row updates",async t=>{
 const db=await fixture(t),user=await owner(db),sub=await subscription(db,user.id)
 const period=await db.prepare("INSERT INTO intervention_periods(subscription_id,period_start,period_end) VALUES(?,100000,200000) RETURNING id").bind(sub).first()
 const debit=i=>db.batch([
  db.prepare("UPDATE intervention_periods SET consumed_minutes=consumed_minutes+40 WHERE id=? AND consumed_minutes+40<=60").bind(period.id),
  requireChanges(db),
  db.prepare("INSERT INTO audit_logs(action,metadata) VALUES('quota.proof',?)").bind(JSON.stringify({i})),
 ])
 const attempts=await Promise.allSettled(Array.from({length:20},(_,i)=>debit(i)))
 assert.equal(attempts.filter(r=>r.status==="fulfilled").length,1)
 assert.equal((await db.prepare("SELECT consumed_minutes FROM intervention_periods WHERE id=?").bind(period.id).first()).consumed_minutes,40)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='quota.proof'").first()).n,1)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM d1_atomic_guard").first()).n,1)
 assert.throws(()=>requireChanges(db,-1))
})

test("D1 date codecs preserve millisecond precision, UTC boundaries and null; reject invalid dates",()=>{
 for(const n of [-1,0,1,1794484800123,8640000000000000])assert.equal(milliseconds(date(n)),n)
 assert.equal(nullableDate(null),null)
 assert.equal(uuid("AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"),"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
 assert.throws(()=>uuid("invalid"))
 for(const n of [NaN,Infinity,0.5,9007199254740992])assert.throws(()=>date(n))
 assert.throws(()=>milliseconds(new Date(NaN)))
})

async function authContract(store,seed){
 const at=new Date("2026-11-12T12:00:00.123Z"),expiry=new Date(at.getTime()+1000),later=new Date(at.getTime()+1)
 const a=await store.insertUser({email:"a@example.test",role:"client"}),b=await store.insertUser({email:"b@example.test",role:"client"})
 assert.ok(a.createdAt instanceof Date);assert.match(a.id,/^[0-9a-f-]{36}$/)
 await assert.rejects(store.insertUser({email:a.email,role:"client"}),EmailConflictError)
 await store.setUserRole(a.id.toUpperCase(),"admin",at);await store.markLogin(a.id,at)
 await store.ensureProfile(a.id,a.email);await store.ensureProfile(a.id,"unchanged@example.test")
 await store.insertMagicLink({email:a.email,tokenHash:"one-use",expiresAt:expiry})
 const consumed=await Promise.all(Array.from({length:12},()=>store.consumeMagicLink("one-use",at)))
 assert.equal(consumed.filter(Boolean).length,1)
 assert.equal(consumed.find(Boolean).consumedAt.getTime(),at.getTime())
 await store.insertMagicLink({email:a.email,tokenHash:"expires",expiresAt:at})
 assert.equal(await store.consumeMagicLink("expires",at),null)
 await store.deleteOpenMagicLinks(a.email);await store.deleteMagicLinkByHash("one-use")
 assert.equal(await store.consumeMagicLink("one-use",at),null)
 for(const [user,secret] of [[a,"a-session"],[a,"a-session-2"],[b,"b-session"]])
  await store.createSession({userId:user.id,secretHash:secret,expiresAt:expiry,absoluteExpiresAt:new Date(at.getTime()+10000),lastSeenAt:at,mfaVerifiedAt:null,createdAt:at})
 await store.touchSession("a-session",new Date(at.getTime()+2000),later)
 const session=await store.findSession("a-session")
 assert.equal(session.user.role,"admin");assert.equal(session.lastSeenAt.getTime(),later.getTime());assert.equal(session.expiresAt.getTime(),at.getTime()+2000)
 await store.revokeSession("a-session",at);await store.revokeSession("a-session",later)
 assert.equal((await store.findSession("a-session")).revokedAt.getTime(),at.getTime())
 await store.revokeUserSessions(a.id,later)
 assert.equal((await store.findSession("a-session-2")).revokedAt.getTime(),later.getTime())
 assert.equal((await store.findSession("b-session")).revokedAt,null)
 await store.setDisabled(a.id,at);assert.equal((await store.findSession("a-session")).user.disabledAt.getTime(),at.getTime())
 await store.setDisabled(a.id,null)
 await store.savePendingTotp(a.id,"ciphertext-only");await store.confirmTotp(a.id,at)
 assert.equal((await store.getTotp(a.id)).confirmedAt.getTime(),at.getTime())
 await store.savePendingTotp(a.id,"ciphertext-replaced");assert.equal((await store.getTotp(a.id)).confirmedAt,null)
 await store.replaceRecoveryCodes(a.id,["old-hash"])
 await assert.rejects(store.replaceRecoveryCodes(a.id,["duplicate","duplicate"]))
 const codes=await Promise.all(Array.from({length:12},()=>store.consumeRecoveryCode(a.id,"old-hash",at)))
 assert.equal(codes.filter(Boolean).length,1)
 assert.equal(await store.consumeRecoveryCode(b.id,"old-hash",at),false)
 await store.replaceRecoveryCodes(a.id,["new-hash"]);await store.replaceRecoveryCodes(a.id,[])
 assert.equal(await store.consumeRecoveryCode(a.id,"new-hash",at),false)
 await store.createProject(a.id,"A",at);await store.createProject(b.id,"B",later)
 const projects=await store.listProjects(a.id);assert.deepEqual(projects.map(p=>p.name),["A"])
 await seed(a,b,at)
 await store.appendAudit({actorUserId:a.id,action:"contract.test",metadata:{boolean:true,count:1,nothing:null},createdAt:at})
 const subscriptions=await store.listSubscriptions(a.id)
 assert.equal(subscriptions.length,2);assert.equal(subscriptions.find(s=>s.privateOffer).planCode,"friend_host")
 assert.equal(subscriptions.find(s=>s.planCode==="essential").currentPeriodEnd.getTime(),at.getTime())
 return {role:(await store.findUserByEmail(a.email)).role,counts:await store.countAccounts(),projects:projects.map(p=>p.name),subscriptions:subscriptions.map(s=>({planCode:s.planCode,billingInterval:s.billingInterval,privateOffer:s.privateOffer,amountCents:s.amountCents,currentPeriodEnd:s.currentPeriodEnd?.toISOString()??null})).sort((a,b)=>a.planCode.localeCompare(b.planCode)),finances:summarizeBilling(await store.loadBillingInputs())}
}

test("same AuthStore contract has identical results on PostgreSQL and real local D1",async t=>{
 const db=await fixture(t),pg=await pgDatabase();t.after(()=>pg.close())
 const d1=new D1AuthStore(db)
 const statements=(a,b,at)=>[
  ["INSERT INTO subscriptions(user_id,plan_code,status,billing_interval,amount_cents,current_period_end) VALUES(?,'essential','active','month',1900,?)",[a.id,at]],
  ["INSERT INTO subscriptions(user_id,plan_code,status,billing_interval,amount_cents,private_offer) VALUES(?,'friend_host','active','month',1000,?)",[a.id,true]],
  ["INSERT INTO subscriptions(user_id,plan_code,status,billing_interval,amount_cents) VALUES(?,'premium','past_due','year',69000)",[b.id]],
  ["INSERT INTO invoices(user_id,status,amount_due_cents,amount_paid_cents,amount_remaining_cents) VALUES(?,'open',4900,0,4900)",[a.id]],
  ["INSERT INTO payments(user_id,status,amount_cents) VALUES(?,'succeeded',1900)",[a.id]],
 ]
 const pgResult=await authContract(pg.store,async(a,b,at)=>{
  for(const [query,values] of statements(a,b,at)){let i=0;await pg.client.query(query.replace(/\?/g,()=>'$'+(++i)),values)}
  await pg.client.exec("INSERT INTO refunds(payment_id,status,amount_cents) SELECT id,'succeeded',200 FROM payments")
 })
 const d1Result=await authContract(d1,async(a,b,at)=>{
  await db.batch(statements(a,b,at.getTime()).map(([query,values])=>db.prepare(query).bind(...values.map(v=>typeof v==="boolean"?Number(v):v))))
  await db.prepare("INSERT INTO refunds(payment_id,status,amount_cents) SELECT id,'succeeded',200 FROM payments").run()
 })
 assert.deepEqual(d1Result,pgResult)
 assert.deepEqual(d1Result.finances,{theoreticalMrrCents:2900,theoreticalArrCents:34800,issuedCents:4900,collectedCents:1900,refundedCents:200,unpaidCents:4900})
})

function authService(db){
 const store=createD1AuthStore(db),sent=[];let now=new Date("2026-11-12T12:00:00.123Z")
 const service=createAuthService({store,limiter:new MemoryRateLimiter(()=>now.getTime()),mailer:{configured:true,async sendMagicLink(to,url){sent.push({to,url})}},env:{authSecret:"synthetic-auth-secret-for-tests-only-0000",appUrl:"http://localhost:3000",adminEmails:new Set(["admin@example.test"]),mfaKey:Buffer.from("0123456789abcdef0123456789abcdef"),secureCookies:false},now:()=>now})
 const signIn=async email=>{await service.requestMagicLink({email,ip:"203.0.113.8"});const token=new URL(sent.at(-1).url).searchParams.get("token");return service.verifyMagicLink({token,ip:"203.0.113.8"})}
 return {store,service,sent,signIn,now:()=>now,setNow:at=>now=at}
}

test("unchanged auth service on D1: magic links expire, are single-use, sessions persist and revoke",async t=>{
 const db=await fixture(t),f=authService(db)
 await f.service.requestMagicLink({email:"client@example.test",ip:"203.0.113.8"})
 const firstToken=new URL(f.sent[0].url).searchParams.get("token")
 f.setNow(new Date(f.now().getTime()+15*60000))
 assert.equal((await f.service.verifyMagicLink({token:firstToken,ip:"203.0.113.8"})).body.code,"link_invalid")
 const session=await f.signIn("client@example.test")
 assert.equal(session.status,200)
 const token=new URL(f.sent.at(-1).url).searchParams.get("token")
 assert.equal((await f.service.verifyMagicLink({token,ip:"203.0.113.8"})).body.code,"link_invalid")
 assert.equal((await f.service.sessionState(session.cookie.value)).body.authenticated,true)
 const links=(await db.prepare("SELECT token_hash FROM magic_links").all()).results
 assert.ok(links.every(l=>l.token_hash!==token && l.token_hash!==firstToken))
 const user=await f.store.findUserByEmail("client@example.test")
 const resumed=authService(db)
 assert.equal((await resumed.service.sessionState(session.cookie.value)).body.authenticated,true)
 await resumed.store.setDisabled(user.id,resumed.now())
 assert.equal((await resumed.service.sessionState(session.cookie.value)).body.authenticated,false)
 await resumed.store.setDisabled(user.id,null)
 await resumed.service.logout(session.cookie.value)
 assert.equal((await f.service.sessionState(session.cookie.value)).body.authenticated,false)
})

test("unchanged auth service on D1: client isolation and admin role without TOTP gate",async t=>{
 const db=await fixture(t),f=authService(db),a=await f.signIn("a@example.test"),b=await f.signIn("b@example.test")
 await f.service.createProject({cookieValue:a.cookie.value,name:"Project A"})
 await f.service.createProject({cookieValue:b.cookie.value,name:"Project B"})
 assert.deepEqual((await f.service.listProjects(a.cookie.value)).body.projects.map(p=>p.name),["Project A"])
 assert.equal((await f.service.adminIdentity(a.cookie.value)).body.code,"forbidden")
 const admin=await f.signIn("admin@example.test")
 assert.equal(admin.redirectPath,"/admin")
 assert.equal((await f.service.adminSummary(admin.cookie.value)).status,200)
 assert.equal((await f.service.adminIdentity(admin.cookie.value)).status,200)
 // Legacy MFA endpoints remain available but are not required for admin access.
 const enrolled=await f.service.enrollMfa(admin.cookie.value)
 assert.equal(enrolled.status,200);assert.equal(enrolled.body.recoveryCodes.length,8)
 const verified=await f.service.verifyMfa({cookieValue:admin.cookie.value,code:totpAt(decodeBase32(enrolled.body.secret),f.now().getTime())})
 assert.equal(verified.status,200)
 assert.equal((await f.service.adminSummary(admin.cookie.value)).status,401)
 assert.equal((await f.service.adminSummary(verified.cookie.value)).status,200)
 const recovered=await f.service.verifyMfa({cookieValue:verified.cookie.value,code:enrolled.body.recoveryCodes[0]})
 assert.equal(recovered.status,200)
 assert.equal((await f.service.verifyMfa({cookieValue:recovered.cookie.value,code:enrolled.body.recoveryCodes[0]})).body.code,"mfa_invalid")
 assert.equal((await db.prepare("SELECT count(*) AS n FROM admin_totp WHERE secret_ciphertext=?").bind(enrolled.body.secret).first()).n,0)
 assert.equal((await db.prepare("PRAGMA foreign_key_check").all()).results.length,0)
})

test("D1 migration boundaries keep triggers/literals intact and reject silently ignored trailing SQL",async t=>{
 const db=await fixture(t)
 const source="CREATE TABLE undelimited(id INTEGER); INSERT INTO undelimited VALUES(1);"
 await assert.rejects(migrateD1(db,[...migrations(),{name:"0005_undelimited.sql",source}]),/statement-breakpoint/)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM sqlite_schema WHERE name='undelimited'").first()).n,0)
 assert.equal((await db.prepare("SELECT count(*) AS n FROM d1_schema_migrations").first()).n,migrations().length)
 for(const sql of ["SELECT ';'; -- harmless comment", "CREATE TRIGGER test AFTER INSERT ON users BEGIN SELECT CASE WHEN 1 THEN 'END; BEGIN' ELSE 'two' END; SELECT 2; END;", "CREATE TEMP TRIGGER test AFTER INSERT ON users BEGIN SELECT 1; END", "SELECT 'it''s;safe', [quoted;name], \"quoted;column\";"])
  assert.equal(d1Statements(sql).length,1)
 for(const sql of ["SELECT 1; -- comment\n SELECT 2;", "SELECT ';'; SELECT 2;", "CREATE TRIGGER test AFTER INSERT ON users BEGIN SELECT 1; END; DROP TABLE users;", "SELECT 'unterminated", "SELECT 1; /* incomplete", "CREATE TRIGGER broken AFTER INSERT ON users BEGIN SELECT 1;"])
  assert.throws(()=>d1Statements(sql))
})
