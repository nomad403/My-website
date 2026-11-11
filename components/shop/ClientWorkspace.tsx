"use client"
import {useCallback,useEffect,useState,type FormEvent} from "react"
import Link from "next/link"
import {api,translate,type Dashboard} from "@/lib/interventions/view"
import ShopAuthPanel from "./ShopAuthPanel"
import InterventionPanel from "./InterventionPanel"
const control="mt-1 w-full border border-black/25 bg-white px-3 py-2 font-home-title text-sm focus-visible:outline-cyan-500"
const button="border border-black/30 px-4 py-2 font-kode text-xs uppercase tracking-wide focus-visible:outline-cyan-500 disabled:opacity-40"
export default function ClientWorkspace({section,language,onLogout}:{section:string;language:"fr"|"en";onLogout?:()=>void}) {
 const t=(key:string)=>translate(key,language)
 const [data,setData]=useState<Dashboard|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[busy,setBusy]=useState(false)
 const load=useCallback(async()=>{setLoading(true);setError("");try{setData((await api<{dashboard:Dashboard}>("/api/account/dashboard")).dashboard)}catch(e){setError(e instanceof Error?e.message:"unavailable");setData(null)}finally{setLoading(false)}},[])
 useEffect(()=>{void load()},[load])
 const money=(v:number)=>new Intl.NumberFormat(language==="en"?"en-GB":"fr-FR",{style:"currency",currency:"EUR"}).format(v/100)
 const date=(v:string|null)=>v?new Date(v).toLocaleString(language==="en"?"en-GB":"fr-FR"):"—"
 async function portal(){setBusy(true);setMessage("");try{const result=await api<{url:string}>("/api/account/portal",{method:"POST"});window.location.assign(result.url)}catch(e){setMessage(e instanceof Error?e.message:"portal_failed")}finally{setBusy(false)}}
 async function profile(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=new FormData(event.currentTarget);try{await api("/api/account/dashboard",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({firstName:form.get("firstName"),lastName:form.get("lastName")})});setMessage("saved");await load()}catch(e){setMessage(e instanceof Error?e.message:"unavailable")}finally{setBusy(false)}}
 async function project(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);const form=event.currentTarget;try{await api("/api/account/projects",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:new FormData(form).get("name")})});form.reset();await load();setMessage("saved")}catch(e){setMessage(e instanceof Error?e.message:"unavailable")}finally{setBusy(false)}}
 if(loading)return <p role="status" className="font-home-title text-sm">{t("loading")}</p>
 if(error)return <div role="alert" className="max-w-xl font-home-title text-sm"><p>{t(error)}</p><button className={button+" my-4"} onClick={()=>void load()}>{t("retry")}</button>{error==="auth_required"&&<ShopAuthPanel language={language}/>}</div>
 if(!data)return null
 const subscriptions=<div className="grid gap-5 lg:grid-cols-2">
  {data.subscriptions.length===0?<p>{t("emptySubscriptions")}</p>:data.subscriptions.map(sub=>{
   const names:Record<string,string>={essential:"Essential",plus:"Plus",premium:"Premium",friend_host:"Friend Host",friend_care:"Friend Care"}
   const scheduled=sub.status==="active"&&(sub.cancelRequestedAt||sub.cancelEffectiveAt)
   return <article key={sub.id} className="min-w-0 border border-black/25 p-5">
    <h3 className="font-kode text-lg uppercase">{names[sub.planCode]??sub.planCode}</h3>
    <p className="mt-2">{t(scheduled?"scheduled":sub.status)}</p>
    <p className="mt-3 font-kode text-xl">{money(sub.amountCents)} / {t(sub.billingInterval)}</p>
    <p className="mt-3 text-sm">{t("periodStart")} : {date(sub.currentPeriodStart)}<br/>{t("periodEnd")} : {date(sub.currentPeriodEnd)}</p>
    {scheduled&&<p className="mt-2 text-sm">{t("cancellation")} : {date(sub.cancelEffectiveAt??sub.currentPeriodEnd)}</p>}
    <h4 className="mt-5 border-t border-black/20 pt-4 font-kode text-xs uppercase">{t("quota")}</h4>
    <p className="mt-2 text-sm">{t(sub.quota.reason)}</p>
    <dl className="mt-3 grid grid-cols-3 gap-2 text-center">{["included","consumed","remaining"].map(key=><div key={key} className="border border-black/15 p-2"><dt className="text-xs">{t(key)}</dt><dd className="font-kode text-xl">{sub.quota[key as "included"|"consumed"|"remaining"]}</dd></div>)}</dl>
    {sub.quota.start&&<p className="mt-2 text-xs">{date(sub.quota.start)} → {date(sub.quota.end)}</p>}
    {["premium","friend_care"].includes(sub.planCode)&&<p className="mt-3 text-sm text-black/70">{t("rules")}</p>}
    <details className="mt-4"><summary className="cursor-pointer font-kode text-xs uppercase">{t("timeHistory")}</summary>
     {sub.timeEntries.length===0?<p className="mt-2 text-sm">{t("noTime")}</p>:<ul className="mt-2 divide-y divide-black/15">{sub.timeEntries.map(entry=><li key={entry.id} className="py-2 text-sm">{date(entry.performedAt)} · {entry.minutes} {t("minutes")} · {t(entry.coverage)}<br/><Link className="underline" href={"/shop?section=interventions&request="+entry.requestId}>{t("detail")}</Link></li>)}</ul>}
    </details>
   </article>
  })}
 </div>
 return <section className="font-home-title text-sm" aria-label={t(section)}>
  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
   <div><h2 className="font-kode text-xl uppercase tracking-wider">{t(section)}</h2><p className="mt-2">{[data.profile.firstName,data.profile.lastName].filter(Boolean).join(" ")}</p><p className="break-all text-black/65">{data.profile.email}</p></div>
   <div className="flex flex-wrap gap-2"><Link className={button} href="/shop?section=billing">{t("billing")}</Link><Link className={button} href="/shop?section=interventions">{t("interventions")}</Link><button className={button} disabled={busy} onClick={()=>void load()}>{t("refresh")}</button></div>
  </div>
  <p role="status" aria-live="polite" className="mb-3">{message&&t(message)}</p>
  {(section==="subscriptions"||section==="account")&&subscriptions}
  {section==="account"&&<div className="mt-8 grid gap-6 md:grid-cols-2">
   <form onSubmit={profile} className="grid gap-3 border border-black/20 p-4">
    <label>{t("firstName")}<input className={control} name="firstName" maxLength={80} defaultValue={data.profile.firstName??""} autoComplete="given-name"/></label>
    <label>{t("lastName")}<input className={control} name="lastName" maxLength={80} defaultValue={data.profile.lastName??""} autoComplete="family-name"/></label>
    <button className={button} disabled={busy}>{t("save")}</button>
   </form>
   <div className="border border-black/20 p-4"><h3 className="font-kode text-sm uppercase">{t("projects")}</h3><ul className="mt-3">{data.projects.map(p=><li key={p.id} className="break-words py-1">{p.name}</li>)}</ul>
    <form className="mt-4" onSubmit={project}><label>{t("newProject")}<input className={control} name="name" required maxLength={100}/></label><button className={button+" mt-3"} disabled={busy}>{t("addProject")}</button></form>
   </div>
   {onLogout&&<button className={button+" w-fit"} onClick={onLogout}>{language==="en"?"Sign out":"Déconnexion"}</button>}
  </div>}
  {section==="billing"&&<div className="max-w-4xl">
   <button className={button+" bg-cyan-300"} disabled={busy} onClick={()=>void portal()}>{t("portal")}</button><p className="mt-3 text-xs text-black/60">{t("recent")}</p>
   <h3 className="mt-6 font-kode text-sm uppercase">{t("invoices")}</h3>
   {data.invoices.length===0?<p className="mt-3">{t("emptyInvoices")}</p>:<ul className="mt-3 divide-y divide-black/20 border-y border-black/20">{data.invoices.map(invoice=><li key={invoice.id} className="py-4"><p>{t(invoice.status)} · {date(invoice.issuedAt)}</p><p className="mt-1">{t("due")} : {money(invoice.amountDueCents)} · {t("received")} : {money(invoice.amountPaidCents)} · {t("balance")} : {money(invoice.amountRemainingCents)}</p></li>)}</ul>}
   <h3 className="mt-6 font-kode text-sm uppercase">{t("payments")}</h3>
   {data.payments.length===0?<p className="mt-3">{t("emptyPayments")}</p>:<ul className="mt-3 divide-y divide-black/20 border-y border-black/20">{data.payments.map(payment=><li key={payment.id} className="py-3">{t(payment.status)} · {money(payment.amountCents)} · {date(payment.paidAt)}</li>)}</ul>}
  </div>}
  {section==="interventions"&&<InterventionPanel language={language} dashboard={data} onChanged={()=>void load()}/>}
 </section>
}
