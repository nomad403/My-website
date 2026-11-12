import {applyBillingEvent,type ApplyOptions} from "../../billing/apply-event"
import type {BillingNotice} from "../../billing/notices"
import type {D1Connection} from "./types"
import {billingCommand,BillingBusy} from "./billing-unit"
import {D1BillingStore} from "./billing-store"
class RetryDelivery extends Error{}
/** One delivery = one atomic plan, including all its notices, observations, audit and receipts.
 * No external writes in reconcileSubscription: the GET can repeat after a revision conflict.
 */
export async function applyStoredD1BillingEvents(db:D1Connection,notices:BillingNotice[],options:ApplyOptions={}){
 try{
  return await billingCommand(db,async unit=>{
   const store=new D1BillingStore(db,unit)
   let result:"duplicate"|"applied"="duplicate"
   for(const notice of notices){
    const outcome=await applyBillingEvent(store,notice,options)
    if(outcome==="retry")throw new RetryDelivery()
    if(outcome==="applied")result="applied"
   }
   return result
  })
 }catch(error){if(error instanceof RetryDelivery || error instanceof BillingBusy)return "retry" as const;throw error}
}
