"use client"
import {useCallback,useEffect,useState,type FormEvent} from "react"
import {usePathname,useRouter,useSearchParams} from "next/navigation"
import {useLanguage} from "@/contexts/LanguageContext"
import AdminPromotions from "./AdminPromotions"
import InterventionPanel from "@/components/shop/InterventionPanel"
import {api,translate} from "@/lib/interventions/view"
import {adminCopy,type AdminLabel} from "@/lib/admin/view"
type Row=Record<string,string|number|boolean|null>
type Page={rows:Row[];total:number;offset:number;limit:number}
type Overview={counts:Row;finances:Array<Record<string,string|number>>;generatedAt:string;from:string;to:string}
const field="mt-1 w-full min-w-0 border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline-cyan-500"
const button="border border-black/25 px-3 py-2 font-kode text-xs uppercase focus-visible:outline-cyan-500 disabled:opacity-40"
const sections=["overview","clients","subscriptions","invoices","payments","refunds","interventions","promotions","redemptions","history","audit"]
export default function AdminConsole(){
 const {language}=useLanguage(),lang=language==="en"?"en":"fr"
 const t=(key:string)=>key in adminCopy?adminCopy[key as AdminLabel][lang==="en"?1:0]:translate(key,lang)
 const params=useSearchParams(),router=useRouter(),pathname=usePathname()
 const section=sections.includes(params.get("section")??"")?params.get("section")!:"overview"
 const client=params.get("client")??"",subscription=params.get("subscription")??""
 const today=new Date(),start=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)).toISOString().slice(0,10),end=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+1,1)).toISOString().slice(0,10)
 const [filter,setFilter]=useState({from:start,to:end,q:"",status:"",priority:""}),[offset,setOffset]=useState(0),[version,setVersion]=useState(0)
 const [data,setData]=useState<Page|null>(null),[overview,setOverview]=useState<Overview|null>(null),[profile,setProfile]=useState<Row|null>(null)
 const [loading,setLoading]=useState(true),[error,setError]=useState("")
 function navigate(changes:Record<string,string|null>){const p=new URLSearchParams(params.toString());for(const[k,v]of Object.entries(changes)){if(v)p.set(k,v);else p.delete(k)}setOffset(0);router.replace(pathname+"?"+p.toString(),{scroll:false})}
 const query=useCallback(()=>{
  const p=new URLSearchParams({from:filter.from,to:filter.to,offset:String(offset)})
  if(section!=="overview")p.set("kind",section)
  if(client)p.set("clientId",client)
  if(subscription&&section==="history")p.set("subscriptionId",subscription)
  if(filter.q)p.set("q",filter.q)
  if(filter.status)p.set("status",filter.status)
  if(filter.priority&&section==="interventions")p.set("priority",filter.priority)
  return p.toString()
 },[section,filter,offset,client,subscription])
 useEffect(()=>{
  if(section==="promotions"){setLoading(false);return}
  let active=true;setLoading(true);setError("");setData(null);setOverview(null);setProfile(null)
  const url=section==="overview"?"/api/admin/overview?":"/api/admin/records?"
  void Promise.all([api<{data:Page|Overview}>(url+query()),client?api<{data:Row}>("/api/admin/clients/"+client):Promise.resolve(null)])
   .then(([result,who])=>{if(active){if(section==="overview")setOverview(result.data as Overview);else setData(result.data as Page);setProfile(who?.data??null)}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"unavailable")}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[section,query,version,client])
 function apply(event:FormEvent<HTMLFormElement>){event.preventDefault();const f=new FormData(event.currentTarget);setFilter({from:String(f.get("from")),to:String(f.get("to")),q:String(f.get("q")??""),status:String(f.get("status")??""),priority:String(f.get("priority")??"")});setOffset(0)}
 const format=(key:string,value:Row[string],currency="EUR")=>{
  if(value===null||value==="")return "—"
  if(key.endsWith("Cents")&&typeof value==="number")return new Intl.NumberFormat(lang==="en"?"en-GB":"fr-FR",{style:"currency",currency}).format(value/100)
  if(key.endsWith("At")||key.startsWith("currentPeriod")||key==="cancelEffectiveAt")return new Date(String(value)).toLocaleString(lang==="en"?"en-GB":"fr-FR",{timeZone:"UTC"})+" UTC"
  if(key==="lastEventCreated")return Number(value)>0?new Date(Number(value)*1000).toISOString():"—"
  if(typeof value==="boolean")return lang==="fr"?(value?"Oui":"Non"):(value?"Yes":"No")
  return ["status","internalPriority","billingInterval"].includes(key)?t(String(value)):String(value)
 }
 function details(row:Row){return <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">{Object.entries(row).filter(([k])=>k!=="userId").map(([k,v])=><div key={k} className="min-w-0"><dt className="font-kode text-xs text-black/60">{t(k)}</dt><dd className="mt-1 break-words whitespace-pre-wrap">{format(k,v,String(row.currency??"EUR"))}</dd></div>)}</dl>}
 const currencies=overview?.finances??[]
 return <div className="min-w-0 font-home-title text-sm">
  <nav aria-label={lang==="fr"?"Administration":"Administration"} className="mb-6 flex flex-wrap gap-2">{sections.map(s=><button key={s} className={button+(section===s?" bg-cyan-300":"")} aria-current={section===s?"page":undefined} onClick={()=>{setFilter(f=>({...f,status:"",priority:""}));navigate({section:s,request:null,subscription:null,client:s==="overview"||s==="audit"?null:client||null})}}>{t(s)}</button>)}</nav>
  <h2 className="font-kode text-xl uppercase tracking-wide">{t(section)}</h2>
  <p className="my-3 text-black/70">{t("local")}</p>
  {client&&<div className="my-4 border-l-2 border-cyan-400 pl-3"><p className="break-all">{t("clientFilter")} : {profile?.email??client}</p><button className={button+" mt-2"} onClick={()=>navigate({client:null})}>{t("resetClient")}</button></div>}
  {section!=="promotions"&&<form key={section+filter.from+filter.to} onSubmit={apply} className="my-5 grid gap-3 border border-black/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
   <label>{t("from")}<input name="from" type="date" required defaultValue={filter.from} className={field}/></label>
   <label>{t("to")}<input name="to" type="date" required defaultValue={filter.to} className={field}/></label>
   {section!=="overview"&&<label>{t("search")}<input name="q" maxLength={120} defaultValue={filter.q} className={field}/></label>}
   {["subscriptions","invoices","payments","refunds","interventions","redemptions"].includes(section)&&<label>{t("status")}<select name="status" defaultValue={filter.status} className={field}><option value="">{t("any")}</option>{(section==="subscriptions"?["incomplete","incomplete_expired","trialing","active","past_due","unpaid","canceled"]:section==="invoices"?["draft","open","paid","uncollectible","void"]:section==="interventions"?["submitted","analyzing","accepted","in_progress","waiting_client","completed","rejected","cancelled"]:section==="redemptions"?["reserved","consumed","released"]:["pending","succeeded","failed","canceled"]).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>}
   {section==="interventions"&&<label>{t("priority")}<select name="priority" className={field} defaultValue={filter.priority}><option value="">{t("any")}</option>{["low","normal","high","urgent"].map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>}
   <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3"><button className={button+" bg-cyan-300"} disabled={loading}>{t("apply")}</button><button type="button" className={button} onClick={()=>{setOffset(0);setFilter(f=>({...f,from:start,to:end}))}}>{t("month")}</button><button type="button" className={button} onClick={()=>{setOffset(0);setFilter(f=>({...f,from:"2000-01-01",to:end}))}}>{t("all")}</button><button type="button" className={button} onClick={()=>setVersion(v=>v+1)}>{t("refresh")}</button></div>
  </form>}
  {loading&&<p role="status">{t("loading")}</p>}
  {error&&<div role="alert" className="my-4 border-l-2 border-cyan-400 pl-3"><p>{t(error)}</p><button className={button+" mt-2"} onClick={()=>setVersion(v=>v+1)}>{t("retry")}</button></div>}
  {overview&&<>
   <p className="my-2">{t("generated")} : {format("recordedAt",overview.generatedAt)}</p><p>{t("received")} : {overview.counts.lastReceivedAt?format("recordedAt",overview.counts.lastReceivedAt):t("never")}</p>
   <h3 className="mb-3 mt-6 font-kode uppercase">{t("stocks")}</h3><dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(overview.counts).filter(([k])=>!["lastReceivedAt","newClients","newInterventions"].includes(k)).map(([k,v])=><div key={k} className="border border-black/20 p-4"><dt>{t(k)}</dt><dd className="mt-2 font-kode text-2xl">{String(v)}</dd></div>)}</dl>
   <h3 className="mb-3 mt-6 font-kode uppercase">{t("flows")}</h3><p>{t("newClients")} : {overview.counts.newClients} · {t("newInterventions")} : {overview.counts.newInterventions}</p>
   <p className="my-4 border-l-2 border-cyan-400 pl-3">{t("rules")}</p>
   {currencies.length===0&&<p>{t("empty")}</p>}
   {currencies.map(f=><section key={f.currency} className="mt-5"><h4 className="font-kode">{f.currency}</h4><dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{["mrrCents","arrCents","issuedCents","collectedCents","refundedCents","unpaidCents"].map(k=><div key={k} className="border border-black/20 p-4"><dt>{t(k)}</dt><dd className="mt-2 break-words font-kode text-xl">{format(k,Number(f[k]),String(f.currency))}</dd></div>)}</dl>{["excludedSubscriptions","missingInvoiceDates","missingPaymentDates","missingRefundDates","missingInvoiceTotals","unlinkedPaidInvoices"].some(k=>Number(f[k])>0)&&<div className="mt-3 border-l-2 border-cyan-400 pl-3"><p>{t("missing")}</p>{["excludedSubscriptions","missingInvoiceDates","missingPaymentDates","missingRefundDates","missingInvoiceTotals","unlinkedPaidInvoices"].map(k=>Number(f[k])>0&&<p key={k}>{t(k)} : {f[k]}</p>)}</div>}</section>)}
  </>}
  {profile&&<details className="my-4 border border-black/20 p-4"><summary className="cursor-pointer font-kode">{t("selected")}</summary><div className="mt-4">{details(profile)}</div></details>}
  {section==="history"&&<p className="my-3">{t("historyNote")}</p>}
  {data&&<><p className="mb-3 font-kode">{data.total} {lang==="fr"?"résultat(s)":"result(s)"}</p>{data.rows.length===0?<p>{t("empty")}</p>:<ul className="grid gap-4 lg:grid-cols-2">{data.rows.map(row=><li key={String(row.id)} className="min-w-0 border border-black/20 p-4"><p className="break-words font-kode">{row.email??row.actorEmail??row.action}</p>{row.planCode&&<p className="mt-2">{row.planCode} · {format("amountCents",row.amountCents,String(row.currency??"EUR"))}</p>}{row.subject&&<p className="mt-2 break-words">{row.subject}</p>}{row.status&&<p className="mt-2">{t(String(row.status))}</p>}
   {section==="subscriptions"&&<p className="mt-2 text-black/65">{row.reviewRequired?t("review"):Number(row.lastEventCreated)>0?t("confirmed"):t("noSync")}</p>}
   <details className="mt-3"><summary className="cursor-pointer font-kode text-xs uppercase">{t("details")}</summary><div className="mt-4">{details(row)}</div></details>
   <div className="mt-3 flex flex-wrap gap-2">{section==="clients"&&<button className={button} onClick={()=>navigate({client:String(row.id),section:"subscriptions"})}>{t("open")}</button>}{section==="subscriptions"&&<button className={button} onClick={()=>navigate({section:"history",subscription:String(row.id)})}>{t("history")}</button>}{section==="interventions"&&<button className={button} onClick={()=>navigate({request:String(row.id)})}>{t("open")}</button>}</div>
  </li>)}</ul>}<div className="mt-4 flex gap-2"><button className={button} disabled={!offset||loading} onClick={()=>setOffset(Math.max(0,offset-25))}>{t("previous")}</button><button className={button} disabled={offset+25>=data.total||loading} onClick={()=>setOffset(offset+25)}>{t("next")}</button></div></>}
  {section==="promotions"&&<AdminPromotions/>}
  {section==="interventions"&&<InterventionPanel admin hideList language={lang} onChanged={()=>setVersion(v=>v+1)}/>}
 </div>
}
