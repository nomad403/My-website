import {sql} from "drizzle-orm"
import type {D1Connection} from "./types"
import {readSnapshot} from "./read"
import {date} from "./codec"

import type {AdminQuery,AdminStore} from "../../admin/service"
import {financialMetrics,type FinancialAggregate} from "../../admin/metrics"
type Db=D1Connection
function rows(result:unknown):Record<string,unknown>[] {
 return (Array.isArray(result)?result:(result as {rows:Record<string,unknown>[]}).rows) as Record<string,unknown>[]
}
const within=(column:ReturnType<typeof sql>,q:AdminQuery)=>sql`${column} >= ${q.from} and ${column} < ${q.to}`
/** Shop customers: role client, or any user with local billing presence (incl. admins who subscribe). */
const shopCustomer=sql`(u.role='client' or exists(select 1 from subscriptions billed where billed.user_id=u.id) or exists(select 1 from customer_profiles stripe where stripe.user_id=u.id and stripe.stripe_customer_id is not null))`
const eligibility=(now:Date)=>sql`s.status='active' and s.stripe_subscription_id is not null and s.last_event_created>0
 and not s.entitlement_review_required and s.current_period_start <= ${now} and s.current_period_end > ${now}
 and (s.cancel_effective_at is null or s.cancel_effective_at > ${now})
 and exists(select 1 from invoices proof where proof.user_id=s.user_id and
 (proof.subscription_id=s.id or proof.service_subscription_id=s.stripe_subscription_id)
 and proof.status='paid' and proof.amount_remaining_cents=0 and proof.service_period_start<=${now} and proof.service_period_end>${now})
 and not exists(select 1 from invoices due where due.user_id=s.user_id and
 (due.subscription_id=s.id or due.service_subscription_id=s.stripe_subscription_id)
 and due.status in ('open','uncollectible') and due.amount_remaining_cents>0 and
 ((due.service_period_start<=${now} and due.service_period_end>${now}) or (due.service_period_start is null and due.issued_at>=s.current_period_start and due.issued_at<=${now})))`
export class D1AdminStore implements AdminStore {
 constructor(private readonly db:Db){}
 async overview(q:AdminQuery,now:Date){
  return readSnapshot(this.db,async tx=>{
   const [counts]=rows(await tx.execute(sql`select
    (select count(*) from users u where ${shopCustomer}) as clients,
    (select count(*) from users u where ${shopCustomer} and not exists(select 1 from subscriptions s where s.user_id=u.id)) as "withoutSubscription",
    (select count(*) from users u where ${shopCustomer} and ${within(sql`u.created_at`,q)}) as "newClients",
    (select count(*) from subscriptions where status='active') as "activeSubscriptions",
    (select count(*) from subscriptions where status in ('past_due','unpaid')) as "lateSubscriptions",
    (select count(*) from subscriptions where status='canceled') as "canceledSubscriptions",
    (select count(*) from intervention_requests where status in ('submitted','analyzing','accepted','in_progress','waiting_client')) as "openInterventions",
    (select count(*) from intervention_requests where status='waiting_client') as "waitingInterventions",
    (select count(*) from intervention_requests where ${within(sql`created_at`,q)}) as "newInterventions",
    (select count(*) from promotion_codes where disabled_at is null and (expires_at is null or expires_at>${now}) and (max_redemptions is null or redemption_count+(select count(*) from promotion_redemptions r where r.promotion_code_id=promotion_codes.id and r.status='reserved')<max_redemptions)) as "activePromotions",
    (select max(created_at) from stripe_events) as "lastReceivedAt"`))
   const currencies=rows(await tx.execute(sql`select currency from subscriptions union select currency from invoices union select currency from payments union select currency from refunds`))
   const finances=[]
   for(const row of currencies){
    const currency=String(row.currency),eligible=eligibility(now)
    const [s]=rows(await tx.execute(sql`select
     coalesce(sum(amount_cents) filter(where billing_interval='month' and (${eligible})),0) as monthly,
     coalesce(sum(amount_cents) filter(where billing_interval='year' and (${eligible})),0) as yearly,
     count(*) filter(where status='active' and not coalesce((${eligible}),false)) as "excludedSubscriptions"
     from subscriptions s where currency=${currency}`))
    const [i]=rows(await tx.execute(sql`select
     coalesce(sum(total_cents) filter(where status in ('open','paid','uncollectible') and ${within(sql`issued_at`,q)}),0) as issued,
     coalesce(sum(amount_remaining_cents) filter(where status in ('open','uncollectible') and issued_at<${q.to}),0) as unpaid,
     count(*) filter(where status in ('open','paid','uncollectible') and issued_at is null) as "missingInvoiceDates",
     count(*) filter(where status in ('open','paid','uncollectible') and total_cents is null) as "missingInvoiceTotals",
     count(*) filter(where status='paid' and amount_paid_cents>0 and not exists(select 1 from payments receipt where receipt.invoice_id=invoices.id and receipt.user_id=invoices.user_id and receipt.status='succeeded')) as "unlinkedPaidInvoices"
     from invoices where currency=${currency}`))
    const [p]=rows(await tx.execute(sql`select coalesce(sum(amount_cents) filter(where status='succeeded' and ${within(sql`paid_at`,q)}),0) as collected,
     count(*) filter(where status='succeeded' and paid_at is null) as "missingPaymentDates" from payments where currency=${currency}`))
    const [r]=rows(await tx.execute(sql`select coalesce(sum(amount_cents) filter(where status='succeeded' and ${within(sql`succeeded_event_at`,q)}),0) as refunded,
     count(*) filter(where status='succeeded' and succeeded_event_at is null) as "missingRefundDates" from refunds where currency=${currency}`))
    finances.push(financialMetrics({currency,...s,...i,...p,...r} as FinancialAggregate))
   }
   return {counts:mapRow(counts),finances,generatedAt:now,from:q.from,to:q.to,basis:"current-local-snapshot",refundDateBasis:"first-stripe-success-event"}
  })
 }
 async client(id:string){
  const result=rows(await readSnapshot(this.db,tx=>tx.execute(sql`select u.id,u.email,u.created_at as "createdAt",u.disabled_at as "disabledAt",
   p.first_name as "firstName",p.last_name as "lastName",p.company,p.stripe_customer_id as "stripeCustomerId"
   from users u left join customer_profiles p on p.user_id=u.id where u.id=${id} and ${shopCustomer}`)))
  return result[0]?mapRow(result[0]):null
 }
 async records(q:AdminQuery){
  const owner=q.clientId?sql`u.id=${q.clientId}`:sql`true`
  const status=(column:ReturnType<typeof sql>)=>q.status?sql`${column}=${q.status}`:sql`true`
  // Literal search: %, _ and backslash never expand a wildcard supplied by the user.
  const search=q.q?sql`(instr(lower(u.email),${q.q.toLowerCase()})>0 or instr(coalesce(p.search_first_name,''),${q.q.toLowerCase()})>0 or instr(coalesce(p.search_last_name,''),${q.q.toLowerCase()})>0)`:sql`true`
  const userJoin=sql`join users u on u.id=t.user_id left join customer_profiles p on p.user_id=u.id`
  let from=sql``,where=sql`true`,select=sql``,order=sql`t.created_at desc,t.id desc`
  const base=sql`${owner} and ${search}`
  switch(q.kind){
   case "clients":
    from=sql`users u left join customer_profiles p on p.user_id=u.id`;where=sql`${shopCustomer} and ${base} and ${within(sql`u.created_at`,q)}`
    select=sql`u.id,u.email,p.first_name as "firstName",p.last_name as "lastName",u.created_at as "createdAt",
     (select count(*) from subscriptions where user_id=u.id) as subscriptions,
     (select count(*) from payments where user_id=u.id and status='succeeded') as payments`;order=sql`u.created_at desc,u.id desc`;break
   case "subscriptions":
    from=sql`subscriptions t ${userJoin}`;where=sql`${base} and ${status(sql`t.status`)} and ${within(sql`t.created_at`,q)}`
    select=sql`t.id,u.email,t.user_id as "userId",t.plan_code as "planCode",t.amount_cents as "amountCents",t.currency,t.billing_interval as "billingInterval",t.status,
     t.current_period_start as "currentPeriodStart",t.current_period_end as "currentPeriodEnd",t.cancel_requested_at as "cancelRequestedAt",t.cancel_effective_at as "cancelEffectiveAt",
     t.stripe_subscription_id as "stripeSubscriptionId",p.stripe_customer_id as "stripeCustomerId",t.entitlement_review_required as "reviewRequired",t.last_event_created as "lastEventCreated",t.updated_at as "updatedAt"`;break
   case "invoices":
    from=sql`invoices t ${userJoin}`;where=sql`${base} and ${status(sql`t.status`)} and ${within(sql`coalesce(t.issued_at,t.created_at)`,q)}`
    select=sql`t.id,u.email,t.status,t.total_cents as "totalCents",t.created_at as "recordedAt",t.amount_due_cents as "amountDueCents",t.amount_paid_cents as "amountPaidCents",t.amount_remaining_cents as "amountRemainingCents",t.currency,t.issued_at as "issuedAt",t.paid_at as "paidAt",t.stripe_invoice_id as "stripeInvoiceId",t.last_event_created as "lastEventCreated"`;break
   case "payments":
    from=sql`payments t ${userJoin}`;where=sql`${base} and ${status(sql`t.status`)} and ${within(sql`coalesce(t.paid_at,t.created_at)`,q)}`
    select=sql`t.id,u.email,t.status,t.amount_cents as "amountCents",t.currency,t.paid_at as "paidAt",t.created_at as "recordedAt",t.stripe_payment_intent_id as "stripePaymentIntentId",t.last_event_created as "lastEventCreated"`;break
   case "refunds":
    from=sql`refunds t join payments payment on payment.id=t.payment_id join users u on u.id=payment.user_id left join customer_profiles p on p.user_id=u.id`
    where=sql`${base} and ${status(sql`t.status`)} and ${within(sql`coalesce(t.succeeded_event_at,t.created_at)`,q)}`
    select=sql`t.id,u.email,t.status,t.amount_cents as "amountCents",t.currency,t.succeeded_event_at as "succeededEventAt",t.created_at as "recordedAt",t.stripe_refund_id as "stripeRefundId",t.last_event_created as "lastEventCreated"`;break
   case "interventions":
    from=sql`intervention_requests t ${userJoin} join projects project on project.id=t.project_id`
    where=sql`${base} and ${status(sql`t.status`)} and ${q.priority?sql`t.internal_priority=${q.priority}`:sql`true`} and ${within(sql`t.created_at`,q)}`
    select=sql`t.id,u.email,t.subject,t.status,t.internal_priority as "internalPriority",project.name as "projectName",t.created_at as "createdAt",t.updated_at as "updatedAt"`;break
   case "redemptions":
    from=sql`promotion_redemptions t ${userJoin} join promotion_codes promo on promo.id=t.promotion_code_id`
    where=sql`${base} and ${status(sql`t.status`)} and ${within(sql`t.created_at`,q)}`
    select=sql`t.id,u.email,t.status,promo.plan_code as "planCode",promo.code_hint as "codeHint",t.created_at as "createdAt",t.updated_at as "updatedAt"`;break
   case "history":
    from=sql`subscription_observations t join subscriptions sub on sub.id=t.subscription_id join users u on u.id=sub.user_id left join customer_profiles p on p.user_id=u.id`
    where=sql`${base} and ${q.subscriptionId?sql`t.subscription_id=${q.subscriptionId}`:sql`true`} and ${within(sql`t.recorded_at`,q)}`
    select=sql`t.id,t.subscription_id as "subscriptionId",u.email,t.status,t.amount_cents as "amountCents",sub.currency,t.billing_interval as "billingInterval",t.current_period_start as "currentPeriodStart",t.current_period_end as "currentPeriodEnd",t.cancel_requested_at as "cancelRequestedAt",t.cancel_effective_at as "cancelEffectiveAt",t.review_required as "reviewRequired",t.stripe_event_created as "lastEventCreated",t.recorded_at as "recordedAt"`;order=sql`t.id desc`;break
   case "audit":
    from=sql`audit_logs t left join users u on u.id=t.actor_user_id left join customer_profiles p on p.user_id=u.id`
    where=sql`${base} and ${within(sql`t.created_at`,q)}`;select=sql`t.id,u.email as "actorEmail",t.action,t.created_at as "createdAt"`;break
   default: throw new Error("Invalid record kind")
  }
  return readSnapshot(this.db,async tx=>{
   const [count]=rows(await tx.execute(sql`select count(*) as total from ${from} where ${where}`))
   const data=rows(await tx.execute(sql`select ${select} from ${from} where ${where} order by ${order} limit 25 offset ${q.offset}`))
   return {rows:data.map(mapRow),total:Number(count.total),offset:q.offset,limit:25,kind:q.kind,from:q.from,to:q.to}
  })
 }
}

function mapRow(row:Record<string,unknown>){return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,value===null?null:/(?:At|Start|End)$/.test(key)&&typeof value==="number"?date(value):key==="reviewRequired"?Boolean(value):value]))}
