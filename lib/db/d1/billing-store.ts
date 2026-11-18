import {randomUUID} from "node:crypto"
import type {BillingStore,PromotionPreview,PromotionHold,PromoReason,OpenCheckout,SubscriptionSnapshot,SubscriptionObservation,InvoiceSnapshot,PaymentSnapshot,RefundSnapshot,StoredSubscription,ClientInvoice,AdminBillingSnapshot} from "../../billing/store"
import {lockedPrivateMonthly} from "../../billing/promotion"
import {subscriptionWrite,invoiceWrite,paymentWrite,refundWrite} from "../../billing/event-order"
import type {BillingInterval,PlanCode} from "../../shop/plans"
import type {BillingInputs} from "../../billing/metrics"
import type {D1Connection,D1Binding} from "./types"
import {BillingUnit,billingCommand,billingRow,type BillingRow,type BillingTable} from "./billing-unit"
import {date,nullableDate,milliseconds,uuid} from "./codec"
import {D1AuthStore} from "./auth-store"

const text=(row:BillingRow,key:string)=>row[key] as string
const number=(row:BillingRow,key:string)=>row[key] as number
const nullableTime=(row:BillingRow,key:string)=>nullableDate(row[key] as number|null)
const time=(value:Date|null|undefined)=>value==null?null:milliseconds(value)
const checkout=(row:BillingRow):OpenCheckout=>({id:text(row,"id"),url:row.url as string|null,stripeSessionId:row.stripe_session_id as string|null,redemptionId:row.redemption_id as string|null,planCode:text(row,"plan_code"),billingInterval:text(row,"billing_interval") as BillingInterval,createdAt:date(number(row,"created_at"))})
function promotionReason(row:BillingRow,email:string,at:Date):PromoReason|null{
 if(row.disabled_at!==null)return "disabled"
 if(row.expires_at!==null && number(row,"expires_at")<=milliseconds(at))return "expired"
 if(row.restricted_email && row.restricted_email!==email)return "restricted"
 if(row.max_redemptions!==null && number(row,"redemption_count")>=number(row,"max_redemptions"))return "exhausted"
 return null
}
/** Parallel D1 backend, not wired to application routes yet.
 * Mutations are staged and atomically checked against the revision covering all dependencies.
 * Webhooks MUST use applyStoredD1BillingEvents so state/history/receipts share the same unit.
 */
export class D1BillingStore implements BillingStore {
 constructor(private readonly db:D1Connection,private readonly unit?:BillingUnit){}
 private command<T>(operation:(unit:BillingUnit)=>Promise<T>):Promise<T>{return this.unit?operation(this.unit):billingCommand(this.db,operation)}
 private one(table:BillingTable,where:BillingRow){return this.unit?this.unit.one(table,where):billingRow(this.db,table,where)}
 async previewPromotion(input:{codeHash:string;email:string;at:Date}):Promise<PromotionPreview>{
  const row=await this.one("promotion_codes",{code_hash:input.codeHash})
  if(!row)return {ok:false,reason:"invalid"}
  const locked=lockedPrivateMonthly(text(row,"plan_code") as PlanCode)
  if(!locked)return {ok:false,reason:"invalid"}
  const reason=promotionReason(row,input.email,input.at)
  if(reason)return {ok:false,reason}
  return {ok:true,planCode:locked.planCode,amountCents:locked.amountCents,usageTerms:row.usage_terms==="catalog-v1"?undefined:text(row,"usage_terms")}
 }
 async reservePromotion(input:{codeHash:string;userId:string;email:string;at:Date}):Promise<PromotionHold>{
  return this.command(async unit=>{
   const row=await unit.one("promotion_codes",{code_hash:input.codeHash})
   if(!row)return {ok:false,reason:"invalid"}
   const locked=lockedPrivateMonthly(text(row,"plan_code") as PlanCode)
   if(!locked)return {ok:false,reason:"invalid"}
   const own=await unit.one("promotion_redemptions",{promotion_code_id:row.id,user_id:uuid(input.userId),status:"reserved"})
   const holdReason=promotionReason(row,input.email,input.at)
   if(own)return {ok:true,redemptionId:text(own,"id"),planCode:locked.planCode,amountCents:locked.amountCents,holdReason}
   if(holdReason)return {ok:false,reason:holdReason}
   const id=randomUUID(),now=Date.now()
   unit.insert("promotion_redemptions",{id,promotion_code_id:row.id,user_id:uuid(input.userId),status:"reserved",created_at:now,updated_at:now})
   unit.update("promotion_codes",row,{redemption_count:number(row,"redemption_count")+1})
   return {ok:true,redemptionId:id,planCode:locked.planCode,amountCents:locked.amountCents,holdReason:null}
  })
 }
 async consumePromotion(redemptionId:string,at:Date){
  await this.command(async unit=>{const row=await unit.one("promotion_redemptions",{id:uuid(redemptionId)});if(row?.status==="reserved")unit.update("promotion_redemptions",row,{status:"consumed",updated_at:milliseconds(at)})})
 }
 async releasePromotion(redemptionId:string,at:Date){
  await this.command(async unit=>{
   const row=await unit.one("promotion_redemptions",{id:uuid(redemptionId)})
   if(!row || row.status!=="reserved")return
   const code=await unit.one("promotion_codes",{id:row.promotion_code_id})
   if(!code)throw new Error("Promotion missing")
   unit.update("promotion_redemptions",row,{status:"released",updated_at:milliseconds(at)})
   unit.update("promotion_codes",code,{redemption_count:Math.max(number(code,"redemption_count")-1,0)})
  })
 }
 async getStripeCustomerId(userId:string){const row=await this.one("customer_profiles",{user_id:uuid(userId)});return row?.stripe_customer_id as string|null??null}
 async saveStripeCustomerId(userId:string,email:string,customerId:string){
  return this.command(async unit=>{
   const row=await unit.one("customer_profiles",{user_id:uuid(userId)})
   if(row){const id=row.stripe_customer_id as string|null??customerId;unit.update("customer_profiles",row,{stripe_customer_id:id,billing_email:email,updated_at:Date.now()});return id}
   const now=Date.now();unit.insert("customer_profiles",{user_id:uuid(userId),first_name:"",last_name:"",company:null,billing_email:email,locale:"fr",stripe_customer_id:customerId,cgv_version:null,cgv_accepted_at:null,created_at:now,updated_at:now})
   return customerId
  })
 }
 async findOpenCheckout(userId:string,planCode:string,interval:BillingInterval){
  const row=await this.one("checkout_sessions",{user_id:uuid(userId),plan_code:planCode,billing_interval:interval,status:"open"});return row?checkout(row):null
 }
 async beginCheckout(input:{userId:string;planCode:string;interval:BillingInterval;amountCents:number;redemptionId:string|null;at:Date}){
  return this.command(async unit=>{
   const existing=await unit.one("checkout_sessions",{user_id:uuid(input.userId),plan_code:input.planCode,billing_interval:input.interval,status:"open"})
   if(existing)return {created:false as const,checkout:checkout(existing)}
   const id=randomUUID()
   unit.insert("checkout_sessions",{id,user_id:uuid(input.userId),stripe_session_id:null,url:null,plan_code:input.planCode,billing_interval:input.interval,amount_cents:input.amountCents,redemption_id:input.redemptionId?uuid(input.redemptionId):null,status:"open",created_at:milliseconds(input.at)})
   return {created:true as const,id}
  })
 }
 async attachCheckoutSession(id:string,stripeSessionId:string,url:string){
  await this.command(async unit=>{const row=await unit.one("checkout_sessions",{id:uuid(id)});if(row)unit.update("checkout_sessions",row,{stripe_session_id:stripeSessionId,url})})
 }
 private async checkoutStatus(where:BillingRow,status:string){await this.command(async unit=>{const row=await unit.one("checkout_sessions",{...where,status:"open"});if(row)unit.update("checkout_sessions",row,{status})})}
 async failCheckout(id:string){await this.checkoutStatus({id:uuid(id)},"failed")}
 async expireCheckout(id:string){await this.checkoutStatus({id:uuid(id)},"expired")}
 async completeCheckout(stripeSessionId:string){await this.checkoutStatus({stripe_session_id:stripeSessionId},"complete")}
 async expireCheckoutByStripeId(stripeSessionId:string){await this.checkoutStatus({stripe_session_id:stripeSessionId},"expired")}
 async checkoutByStripeId(stripeSessionId:string){const row=await this.one("checkout_sessions",{stripe_session_id:stripeSessionId});return row?{redemptionId:row.redemption_id as string|null,status:text(row,"status")}:null}
 async hasEvent(eventId:string){return Boolean(await this.one("stripe_events",{event_id:eventId}))}
 async recordEvent(eventId:string,eventType:string){await this.command(async unit=>{if(!await unit.one("stripe_events",{event_id:eventId}))unit.insert("stripe_events",{event_id:eventId,event_type:eventType,created_at:Date.now()})})}
 async findSubscriptionByStripeId(stripeSubscriptionId:string):Promise<StoredSubscription|null>{
  const row=await this.one("subscriptions",{stripe_subscription_id:stripeSubscriptionId})
  return row && row.stripe_subscription_id?{id:text(row,"id"),userId:text(row,"user_id"),planCode:text(row,"plan_code"),status:text(row,"status"),billingInterval:text(row,"billing_interval") as BillingInterval,amountCents:number(row,"amount_cents"),privateOffer:row.private_offer===1,stripeSubscriptionId:text(row,"stripe_subscription_id"),lastEventCreated:number(row,"last_event_created")}:null
 }
 async findUserIdByStripeCustomer(customerId:string){const row=await this.one("customer_profiles",{stripe_customer_id:customerId});return row?text(row,"user_id"):null}
 async upsertSubscription(input:SubscriptionSnapshot,eventCreated:number){
  return this.command(async unit=>{
   if(!await unit.one("users",{id:uuid(input.userId)}))return "missing_user" as const
   const existing=await unit.one("subscriptions",{stripe_subscription_id:input.stripeSubscriptionId})
   if(!existing){
    const redemption=input.promotionRedemptionId?await unit.one("promotion_redemptions",{id:uuid(input.promotionRedemptionId),user_id:uuid(input.userId)}):null
    const grant=redemption?await unit.one("promotion_codes",{id:redemption.promotion_code_id}):null
    if(input.promotionRedemptionId && (!grant || grant.plan_code!==input.planCode))return "missing_user" as const
    const now=Date.now()
    unit.insert("subscriptions",{id:randomUUID(),user_id:uuid(input.userId),project_id:null,plan_code:input.planCode,status:input.status,billing_interval:input.billingInterval,amount_cents:input.amountCents,currency:"EUR",private_offer:input.privateOffer?1:0,commercial_terms:grant?text(grant,"usage_terms"):"catalog-v1",promotion_redemption_id:redemption?.id??null,service_anchor_at:time(input.serviceAnchorAt),entitlement_review_required:(input.observedAmountCents!=null && input.observedAmountCents!==input.amountCents)||(input.observedBillingInterval && input.observedBillingInterval!==input.billingInterval)?1:0,current_period_start:time(input.currentPeriodStart),current_period_end:time(input.currentPeriodEnd),cancel_requested_at:time(input.cancelRequestedAt),cancel_effective_at:time(input.cancelEffectiveAt),stripe_subscription_id:input.stripeSubscriptionId,last_event_created:eventCreated,created_at:now,updated_at:now})
    return "ok" as const
   }
   const order=subscriptionWrite(eventCreated,number(existing,"last_event_created"))
   if(order==="tie")return "tie" as const
   if(order==="ignore")return "ok" as const
   const review=existing.entitlement_review_required===1 || input.planCode!==existing.plan_code || input.billingInterval!==existing.billing_interval
    || (input.observedAmountCents!=null && input.observedAmountCents!==existing.amount_cents)
    || Boolean(input.observedBillingInterval && input.observedBillingInterval!==existing.billing_interval)
    || Boolean(existing.service_anchor_at!==null && input.serviceAnchorAt && existing.service_anchor_at!==milliseconds(input.serviceAnchorAt))
   unit.update("subscriptions",existing,{service_anchor_at:existing.service_anchor_at??time(input.serviceAnchorAt),entitlement_review_required:review?1:0,status:input.status,current_period_start:time(input.currentPeriodStart),current_period_end:time(input.currentPeriodEnd),cancel_requested_at:time(input.cancelRequestedAt),cancel_effective_at:time(input.cancelEffectiveAt),last_event_created:eventCreated,updated_at:eventCreated*1000})
   return "ok" as const
  })
 }
 async cancelSubscription(stripeSubscriptionId:string,eventCreated:number,at:Date){
  return this.command(async unit=>{
   const row=await unit.one("subscriptions",{stripe_subscription_id:stripeSubscriptionId})
   if(!row)return "missing" as const
   if(eventCreated<number(row,"last_event_created"))return "ok" as const
   if(eventCreated===row.last_event_created)return "tie" as const
   unit.update("subscriptions",row,{status:"canceled",cancel_effective_at:milliseconds(at),last_event_created:eventCreated,updated_at:milliseconds(at)})
   return "ok" as const
  })
 }
 async overlaySubscriptionStatus(input:SubscriptionObservation){
  await this.command(async unit=>{
   const current=await unit.one("subscriptions",{stripe_subscription_id:input.stripeSubscriptionId})
   if(!current)return
   const review=current.entitlement_review_required===1 || Boolean(input.observedPlanCode && input.observedPlanCode!==current.plan_code)
    || (input.observedAmountCents!=null && input.observedAmountCents!==current.amount_cents)
    || Boolean(input.observedBillingInterval && input.observedBillingInterval!==current.billing_interval)
    || Boolean(current.service_anchor_at!==null && input.serviceAnchorAt && current.service_anchor_at!==milliseconds(input.serviceAnchorAt))
   unit.update("subscriptions",current,{service_anchor_at:current.service_anchor_at??time(input.serviceAnchorAt),entitlement_review_required:review?1:0,status:input.status,current_period_start:time(input.currentPeriodStart),current_period_end:time(input.currentPeriodEnd),cancel_requested_at:time(input.cancelRequestedAt),cancel_effective_at:time(input.cancelEffectiveAt),updated_at:Date.now()})
  })
 }
 async upsertInvoice(input:InvoiceSnapshot,eventCreated:number){
  return this.command(async unit=>{
   if(!await unit.one("users",{id:uuid(input.userId)}))return "missing_user" as const
   const subscription=input.stripeSubscriptionId?await unit.one("subscriptions",{stripe_subscription_id:input.stripeSubscriptionId}):null
   const existing=await unit.one("invoices",{stripe_invoice_id:input.stripeInvoiceId})
   if(!existing){
    unit.insert("invoices",{id:randomUUID(),user_id:uuid(input.userId),subscription_id:subscription?.id??null,stripe_invoice_id:input.stripeInvoiceId,total_cents:input.totalCents??null,service_subscription_id:input.stripeSubscriptionId,service_period_start:time(input.servicePeriodStart),service_period_end:time(input.servicePeriodEnd),status:input.status,amount_due_cents:input.amountDueCents,amount_paid_cents:input.amountPaidCents,amount_remaining_cents:input.amountRemainingCents,currency:"EUR",issued_at:time(input.issuedAt),paid_at:time(input.paidAt),last_event_created:eventCreated,created_at:Date.now()})
    return "ok" as const
   }
   if(!invoiceWrite(eventCreated,number(existing,"last_event_created"),text(existing,"status"),input.status))return "ok" as const
   unit.update("invoices",existing,{status:input.status,total_cents:input.totalCents??existing.total_cents,amount_due_cents:input.amountDueCents,amount_paid_cents:input.amountPaidCents,amount_remaining_cents:input.amountRemainingCents,issued_at:time(input.issuedAt),paid_at:time(input.paidAt),subscription_id:subscription?.id??existing.subscription_id,service_subscription_id:input.stripeSubscriptionId??existing.service_subscription_id,service_period_start:time(input.servicePeriodStart)??existing.service_period_start,service_period_end:time(input.servicePeriodEnd)??existing.service_period_end,last_event_created:eventCreated})
   return "ok" as const
  })
 }
 async upsertPayment(input:PaymentSnapshot,eventCreated:number){
  return this.command(async unit=>{
   const invoice=input.stripeInvoiceId?await unit.one("invoices",{stripe_invoice_id:input.stripeInvoiceId}):null
   const existing=await unit.one("payments",{stripe_payment_intent_id:input.stripePaymentIntentId})
   if(!existing){
    if(!await unit.one("users",{id:uuid(input.userId)}))return "missing_payment_target" as const
    unit.insert("payments",{id:randomUUID(),user_id:uuid(input.userId),invoice_id:invoice?.id??null,stripe_payment_intent_id:input.stripePaymentIntentId,status:input.status,amount_cents:input.amountCents,currency:"EUR",failure_code:input.failureCode,paid_at:time(input.paidAt),last_event_created:eventCreated,created_at:Date.now()})
    return "ok" as const
   }
   if(!paymentWrite(eventCreated,number(existing,"last_event_created"),text(existing,"status"),input.status))return "ok" as const
   unit.update("payments",existing,{status:input.status,amount_cents:input.status==="succeeded"?input.amountCents:existing.amount_cents,failure_code:input.failureCode,paid_at:time(input.paidAt),invoice_id:invoice?.id??existing.invoice_id,last_event_created:eventCreated})
   return "ok" as const
  })
 }
 async upsertRefund(input:RefundSnapshot,eventCreated:number){
  return this.command(async unit=>{
   const payment=await unit.one("payments",{stripe_payment_intent_id:input.stripePaymentIntentId})
   if(!payment)return "missing_payment" as const
   const existing=await unit.one("refunds",{stripe_refund_id:input.stripeRefundId})
   if(!existing){
    unit.insert("refunds",{id:randomUUID(),payment_id:payment.id,stripe_refund_id:input.stripeRefundId,status:input.status,amount_cents:input.amountCents,currency:"EUR",succeeded_event_at:input.status==="succeeded"?eventCreated*1000:null,last_event_created:eventCreated,created_at:Date.now()})
    return "ok" as const
   }
   if(!refundWrite(eventCreated,number(existing,"last_event_created"),text(existing,"status"),input.status))return "ok" as const
   unit.update("refunds",existing,{status:input.status,amount_cents:input.amountCents,succeeded_event_at:existing.succeeded_event_at??(input.status==="succeeded"?eventCreated*1000:null),last_event_created:eventCreated})
   return "ok" as const
  })
 }
 async listInvoices(userId:string):Promise<ClientInvoice[]>{
  if(this.unit)throw new Error("Aggregate reads cannot observe a staged delivery")
  const {results}=await this.db.prepare("SELECT * FROM invoices WHERE user_id=? ORDER BY created_at DESC").bind(uuid(userId)).all<BillingRow>()
  return results.map(row=>({id:text(row,"id"),status:text(row,"status"),amountDueCents:number(row,"amount_due_cents"),amountPaidCents:number(row,"amount_paid_cents"),amountRemainingCents:number(row,"amount_remaining_cents"),currency:text(row,"currency"),issuedAt:nullableTime(row,"issued_at"),paidAt:nullableTime(row,"paid_at")}))
 }
 async adminSnapshot():Promise<AdminBillingSnapshot>{
  if(this.unit)throw new Error("Aggregate reads cannot observe a staged delivery")
  const [customers,subscriptions,invoices,payments]=await this.db.batch([
   this.db.prepare("SELECT u.email,p.stripe_customer_id AS \"stripeCustomerId\" FROM customer_profiles p JOIN users u ON u.id=p.user_id WHERE p.stripe_customer_id IS NOT NULL AND p.stripe_customer_id <> ''"),
   this.db.prepare('SELECT u.email,s.plan_code AS "planCode",s.status,s.amount_cents AS "amountCents",s.billing_interval AS "billingInterval",s.private_offer AS "privateOffer" FROM subscriptions s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC'),
   this.db.prepare('SELECT u.email,i.status,i.amount_due_cents AS "amountDueCents",i.amount_paid_cents AS "amountPaidCents",i.amount_remaining_cents AS "amountRemainingCents",i.currency FROM invoices i JOIN users u ON u.id=i.user_id ORDER BY i.created_at DESC'),
   this.db.prepare('SELECT u.email,p.status,p.amount_cents AS "amountCents",p.failure_code AS "failureCode" FROM payments p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC'),
  ])
  return {customers:customers.results as unknown as AdminBillingSnapshot["customers"],subscriptions:subscriptions.results.map(row=>({...row,privateOffer:row.privateOffer===1})) as unknown as AdminBillingSnapshot["subscriptions"],invoices:invoices.results as unknown as AdminBillingSnapshot["invoices"],payments:payments.results as unknown as AdminBillingSnapshot["payments"]}
 }
 async loadBillingInputs():Promise<BillingInputs>{if(this.unit)throw new Error("Aggregate reads cannot observe a staged delivery");return new D1AuthStore(this.db).loadBillingInputs()}
}
export function createD1BillingStore(binding:D1Binding){return new D1BillingStore(binding.withSession("first-primary"))}
