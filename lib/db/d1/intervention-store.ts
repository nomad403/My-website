import {randomUUID} from "node:crypto"
import {hashToken} from "../../auth/crypto"
import {monthlyWindow,contractWindow,InterventionError,mayTransition,type Actor,type RequestStatus} from "../../interventions/contract"
import type {InterventionStore} from "../../interventions/service"
import {billingCommand,type BillingUnit,type BillingRow} from "./billing-unit"
import type {D1Connection} from "./types"
import {date,nullableDate,uuid} from "./codec"
function fail(code:string,status=409):never{throw new InterventionError(code,status)}
const camel=(key:string)=>key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())
function mapped(row:BillingRow):Record<string,any>{return Object.fromEntries(Object.entries(row).map(([key,value])=>[camel(key),value===null?null:/(?:_at|_start|_end)$/.test(key)?date(value as number):["internal","minor_scope_confirmed","entitlement_review_required","private_offer"].includes(key)?Boolean(value):value]))}
const fields=["id","userId","projectId","subscriptionId","subject","description","category","urgency","additionalInfo","status","coverage","createdAt","updatedAt"]
function view(row:BillingRow,admin=false){const value=mapped(row);return Object.fromEntries([...fields,...(admin?["internalPriority"]:[])].map(k=>[k,value[k]]))}
async function quota(unit:BillingUnit,subscription:BillingRow,now:Date){
 const sub=mapped(subscription),window=contractWindow(sub as any,now),anchor=sub.serviceAnchorAt?monthlyWindow(sub.serviceAnchorAt,now):null
 const bucket=anchor?await unit.one("intervention_periods",{subscription_id:subscription.id,period_start:anchor.start.getTime()}):null
 const base={included:0,consumed:bucket?.consumed_minutes??0,remaining:0,start:bucket?date(bucket.period_start as number):null,end:bucket?date(bucket.period_end as number):null}
 if(window.reason!=="eligible")return {...base,reason:window.reason}
 const values=[subscription.user_id,subscription.id,subscription.stripe_subscription_id,now.getTime(),now.getTime()]
 const proof=await unit.read("SELECT id FROM invoices WHERE user_id=? AND (subscription_id=? OR service_subscription_id=?) AND status='paid' AND amount_remaining_cents=0 AND service_period_start<=? AND service_period_end>? LIMIT 1",values)
 if(!proof.length)return {...base,reason:"unverified_payment"}
 const overdue=await unit.read("SELECT id FROM invoices WHERE user_id=? AND (subscription_id=? OR service_subscription_id=?) AND status IN ('open','uncollectible') AND amount_remaining_cents>0 AND ((service_period_start<=? AND service_period_end>?) OR (service_period_start IS NULL AND issued_at>=? AND issued_at<=?)) LIMIT 1",[...values,(subscription.current_period_start??now.getTime()),now.getTime()])
 if(overdue.length)return {...base,reason:"unpaid"}
 return {included:60,consumed:bucket?.consumed_minutes??0,remaining:60-Number(bucket?.consumed_minutes??0),start:window.start,end:window.end,reason:"eligible"}
}
function event(unit:BillingUnit,actor:Actor,row:BillingRow,input:{kind:string;body?:string;internal?:boolean;from?:string;to?:string;operationKey:string;payloadHash:string},now:Date){
 const id=randomUUID();unit.insert("intervention_events",{id,request_id:row.id,actor_id:uuid(actor.id),actor_role:actor.admin?"admin":"client",kind:input.kind,internal:input.internal?1:0,body:input.body??"",from_status:input.from??null,to_status:input.to??null,operation_key:uuid(input.operationKey),payload_hash:input.payloadHash,created_at:now.getTime()})
 unit.insert("audit_logs",{id:randomUUID(),actor_user_id:uuid(actor.id),action:"intervention."+input.kind,metadata:JSON.stringify({requestId:row.id,eventId:id,internal:input.internal??false}),created_at:now.getTime()})
 if(!input.internal)unit.insert("intervention_outbox",{id:randomUUID(),event_id:id,user_id:row.user_id,audience:actor.admin?"client":"admin",status:"pending",created_at:now.getTime()})
}
export class D1InterventionStore implements InterventionStore {
 constructor(private readonly db:D1Connection){}
 async dashboard(actor:Actor,now:Date){return billingCommand(this.db,async unit=>{
  const user=await unit.one("users",{id:uuid(actor.id)});if(!user)fail("not_found",404)
  const profile=await unit.one("customer_profiles",{user_id:uuid(actor.id)})
  const owned=await unit.read("SELECT * FROM subscriptions WHERE user_id=? ORDER BY created_at DESC LIMIT 100",[uuid(actor.id)])
  const projects=await unit.read("SELECT id,name FROM projects WHERE user_id=? ORDER BY created_at DESC LIMIT 200",[uuid(actor.id)])
  const invoices=await unit.read("SELECT id,status,amount_due_cents,amount_paid_cents,amount_remaining_cents,issued_at FROM invoices WHERE user_id=? ORDER BY created_at DESC LIMIT 100",[uuid(actor.id)])
  const payments=await unit.read("SELECT id,status,amount_cents,paid_at FROM payments WHERE user_id=? ORDER BY created_at DESC LIMIT 100",[uuid(actor.id)])
  const subscriptions=[]
  for(const row of owned){const s=mapped(row),q=await quota(unit,row,now);const times=await unit.read("SELECT e.id,e.request_id,e.minutes,e.coverage,e.performed_at,p.period_start,p.period_end FROM intervention_time_entries e LEFT JOIN intervention_periods p ON p.id=e.period_id WHERE e.subscription_id=? ORDER BY e.performed_at DESC LIMIT 100",[row.id]);subscriptions.push({...Object.fromEntries(["id","projectId","planCode","status","amountCents","currency","billingInterval","currentPeriodStart","currentPeriodEnd","cancelRequestedAt","cancelEffectiveAt","commercialTerms"].map(k=>[k,s[k]])),quota:q,timeEntries:times.map(mapped)})}
  return {profile:{firstName:profile?.first_name??null,lastName:profile?.last_name??null,email:user.email},projects,subscriptions,invoices:invoices.map(mapped),payments:payments.map(mapped)}
 })}
 async profile(actor:Actor,input:{firstName:string;lastName:string}){await billingCommand(this.db,async unit=>{
  const user=await unit.one("users",{id:uuid(actor.id)});if(!user)fail("not_found",404)
  const row=await unit.one("customer_profiles",{user_id:uuid(actor.id)}),patch={first_name:input.firstName,last_name:input.lastName,search_first_name:input.firstName.toLowerCase(),search_last_name:input.lastName.toLowerCase(),updated_at:Date.now()}
  if(row)unit.update("customer_profiles",row,patch);else unit.insert("customer_profiles",{user_id:uuid(actor.id),billing_email:user.email,...patch,created_at:Date.now()})
  unit.insert("audit_logs",{id:randomUUID(),actor_user_id:uuid(actor.id),action:"profile.updated",metadata:"{}",created_at:Date.now()})
 })}
 async list(actor:Actor,offset:number){return billingCommand(this.db,async unit=>{
  const rows=await unit.read("SELECT r.*,p.name AS project_name,u.email AS client_email FROM intervention_requests r JOIN projects p ON p.id=r.project_id JOIN users u ON u.id=r.user_id "+(actor.admin?"":"WHERE r.user_id=? ")+"ORDER BY r.created_at DESC,r.id DESC LIMIT 50 OFFSET ?",[...(actor.admin?[]:[uuid(actor.id)]),offset])
  return rows.map(row=>({...view(row),projectName:row.project_name,clientEmail:row.client_email}))
 })}
 async create(actor:Actor,input:Record<string,unknown>,now:Date){return billingCommand(this.db,async unit=>{
  const payload={projectId:input.projectId as string,subscriptionId:input.subscriptionId as string|null??null,subject:(input.subject as string).trim(),description:(input.description as string).trim(),category:input.category as string,urgency:input.urgency as string,additionalInfo:(input.additionalInfo as string|undefined)?.trim()??""},payloadHash=hashToken(JSON.stringify(payload))
  const old=await unit.one("intervention_requests",{user_id:uuid(actor.id),submission_key:uuid(input.operationKey as string)})
  if(old){if(old.payload_hash!==payloadHash)fail("idempotency_conflict");return {id:old.id as string}}
  const project=await unit.one("projects",{id:uuid(payload.projectId),user_id:uuid(actor.id)});if(!project)fail("not_found",404)
  if(payload.subscriptionId){const sub=await unit.one("subscriptions",{id:uuid(payload.subscriptionId),user_id:uuid(actor.id)});if(!sub||(sub.project_id&&sub.project_id!==project.id))fail("not_found",404)}
  const row=unit.insert("intervention_requests",{id:randomUUID(),user_id:uuid(actor.id),project_id:uuid(payload.projectId),subscription_id:payload.subscriptionId?uuid(payload.subscriptionId):null,submission_key:uuid(input.operationKey as string),payload_hash:payloadHash,subject:payload.subject,description:payload.description,category:payload.category,urgency:payload.urgency,additional_info:payload.additionalInfo,status:"submitted",coverage:"unreviewed",minor_scope_confirmed:0,internal_priority:"normal",created_at:now.getTime(),updated_at:now.getTime()})
  event(unit,actor,row,{kind:"created",to:"submitted",operationKey:input.operationKey as string,payloadHash},now);return {id:row.id as string}
 })}
 async detail(actor:Actor,id:string,offset:number,now=new Date()){return billingCommand(this.db,async unit=>{
  const row=await unit.one("intervention_requests",{id:uuid(id),...(actor.admin?{}:{user_id:uuid(actor.id)})});if(!row)fail("not_found",404)
  const project=await unit.one("projects",{id:row.project_id})
  const messages=await unit.read("SELECT id,actor_id,actor_role,kind,body,internal,from_status,to_status,created_at FROM intervention_events WHERE request_id=? "+(actor.admin?"":"AND internal=0 ")+"ORDER BY sequence DESC LIMIT 100 OFFSET ?",[uuid(id),offset])
  const times=await unit.read("SELECT minutes,coverage,performed_at FROM intervention_time_entries WHERE request_id=? LIMIT 1",[uuid(id)])
  const sub=row.subscription_id?await unit.one("subscriptions",{id:row.subscription_id,user_id:row.user_id}):null
  const contract=sub?{planCode:sub.plan_code,amountCents:sub.amount_cents,billingInterval:sub.billing_interval,quota:await quota(unit,sub,now)}:null
  return {...view(row,actor.admin),projectName:project?.name,contract,events:messages.map(mapped),time:times[0]?mapped(times[0]):null,offset,hasMore:messages.length===100}
 })}
 async mutate(actor:Actor,id:string,operation:"message"|"transition"|"complete"|"priority",input:Record<string,unknown>,now:Date){
  const payloadHash=hashToken(JSON.stringify([operation,input.body??"",input.status??null,input.coverage??null,input.minorScopeConfirmed??false,input.minutes??null,input.performedAt??null,input.internal??false,input.internalPriority??null]))
  await billingCommand(this.db,async unit=>{
   const row=await unit.one("intervention_requests",{id:uuid(id),...(actor.admin?{}:{user_id:uuid(actor.id)})});if(!row)fail("not_found",404)
   const prior=await unit.one("intervention_events",{request_id:uuid(id),actor_id:uuid(actor.id),operation_key:uuid(input.operationKey as string)})
   if(prior){if(prior.payload_hash!==payloadHash)fail("idempotency_conflict");return}
   const common={operationKey:input.operationKey as string,payloadHash,body:(input.body as string|undefined)?.trim()??""}
   if(operation==="priority"){
    if(!actor.admin)fail("forbidden",403)
    unit.update("intervention_requests",row,{internal_priority:input.internalPriority as string,updated_at:now.getTime()})
    event(unit,actor,row,{...common,kind:"priority",internal:true,body:"Priority: "+String(input.internalPriority)},now)
   }else if(operation==="message"){
    if(["completed","cancelled","rejected"].includes(row.status as string))fail("request_closed")
    if(input.internal&&!actor.admin)fail("forbidden",403)
    event(unit,actor,row,{...common,kind:"message",internal:input.internal as boolean|undefined},now)
    unit.update("intervention_requests",row,{updated_at:now.getTime()})
   }else if(operation==="transition"){
    const next=input.status as RequestStatus
    if(!mayTransition(row.status as RequestStatus,next,actor.admin))fail("invalid_transition")
    if(next!=="accepted"&&input.coverage!==undefined)fail("immutable")
    let coverage=row.coverage
    if(next==="accepted"){
     if(!actor.admin||!["included","outside"].includes(input.coverage as string))fail("invalid",400)
     coverage=input.coverage as string
     if(coverage==="included"){
      if(input.minorScopeConfirmed!==true||!row.subscription_id)fail("scope_required")
      const sub=await unit.one("subscriptions",{id:row.subscription_id,user_id:row.user_id})
      if(!sub||(sub.project_id&&sub.project_id!==row.project_id)||(await quota(unit,sub,now)).reason!=="eligible")fail("quota_unavailable")
      if(!sub.project_id)unit.update("subscriptions",sub,{project_id:row.project_id})
     }else if(!common.body)fail("explanation_required")
    }
    const previous=row.status as string
    unit.update("intervention_requests",row,{status:next,coverage,minor_scope_confirmed:next==="accepted"?(input.minorScopeConfirmed===true?1:0):row.minor_scope_confirmed,updated_at:now.getTime()})
    event(unit,actor,row,{...common,kind:"status",from:previous,to:next},now)
   }else{
    if(!actor.admin)fail("forbidden",403)
    if(!mayTransition(row.status as RequestStatus,"completed",true))fail("invalid_transition")
    const performed=input.performedAt?new Date(input.performedAt as string):now
    if(performed>now||performed.getTime()<Number(row.created_at))fail("invalid_performed_at",400)
    let periodId:string|null=null
    if(row.coverage==="included"){
     if(!row.subscription_id||!row.minor_scope_confirmed)fail("quota_unavailable")
     const sub=await unit.one("subscriptions",{id:row.subscription_id,user_id:row.user_id})
     if(!sub||(sub.project_id&&sub.project_id!==row.project_id))fail("quota_unavailable")
     const q=await quota(unit,sub,now)
     if(q.reason!=="eligible"||!q.start||!q.end)fail("quota_unavailable")
     if(performed<q.start||performed>=q.end||(sub.current_period_start!==null&&performed.getTime()<Number(sub.current_period_start)))fail("outside_period")
     let bucket=await unit.one("intervention_periods",{subscription_id:sub.id,period_start:q.start.getTime()})
     if(!bucket)bucket=unit.insert("intervention_periods",{id:randomUUID(),subscription_id:sub.id,period_start:q.start.getTime(),period_end:q.end.getTime(),included_minutes:60,consumed_minutes:0})
     const consumed=Number(bucket.consumed_minutes)+Number(input.minutes)
     if(consumed>60)fail("quota_exceeded")
     unit.update("intervention_periods",bucket,{consumed_minutes:consumed});periodId=bucket.id as string
    }else if(row.coverage!=="outside")fail("scope_required")
    const previous=row.status as string
    unit.insert("intervention_time_entries",{id:randomUUID(),request_id:uuid(id),subscription_id:row.subscription_id,period_id:periodId,actor_id:uuid(actor.id),minutes:input.minutes as number,coverage:row.coverage,performed_at:performed.getTime(),created_at:now.getTime()})
    unit.update("intervention_requests",row,{status:"completed",updated_at:now.getTime()})
    event(unit,actor,row,{...common,kind:"time",from:previous,to:"completed"},now)
   }
  })
 }
}
