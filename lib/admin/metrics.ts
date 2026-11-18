/** Local management estimates in persisted minor units, not certified accounting. */
export type FinancialAggregate = {
 currency:string; monthly:string|number; yearly:string|number; issued:string|number; collected:string|number;
 refunded:string|number; unpaid:string|number; excludedSubscriptions:string|number; missingInvoiceDates:string|number;
 missingPaymentDates:string|number; missingRefundDates:string|number; missingInvoiceTotals?:string|number; unlinkedPaidInvoices?:string|number;
}
function integer(value:string|number) {
 const amount=Number(value)
 if(!Number.isSafeInteger(amount)||amount<0)throw new Error("Unsafe financial aggregate")
 return amount
}
export function financialMetrics(input:FinancialAggregate) {
 const monthly=integer(input.monthly),yearly=integer(input.yearly)
 const numerator=monthly*12+yearly
 if(!Number.isSafeInteger(numerator))throw new Error("Unsafe recurring aggregate")
 const mrrCents=Math.round(numerator/12),arrCents=mrrCents*12
 if(!Number.isSafeInteger(arrCents))throw new Error("Unsafe ARR aggregate")
 return {currency:input.currency,mrrCents,arrCents,issuedCents:(()=>{const n=Number(input.issued);if(!Number.isSafeInteger(n))throw new Error("Unsafe invoice aggregate");return n})(),collectedCents:integer(input.collected),
 refundedCents:integer(input.refunded),unpaidCents:integer(input.unpaid),excludedSubscriptions:integer(input.excludedSubscriptions),
 missingInvoiceDates:integer(input.missingInvoiceDates),missingPaymentDates:integer(input.missingPaymentDates),missingRefundDates:integer(input.missingRefundDates),missingInvoiceTotals:integer(input.missingInvoiceTotals??0),unlinkedPaidInvoices:integer(input.unlinkedPaidInvoices??0)}
}
