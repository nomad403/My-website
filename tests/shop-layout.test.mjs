import assert from "node:assert/strict"
import {before,after,test} from "node:test"
import {chromium} from "playwright"

// Requires a built local Worker on port 8788. An explicit qualification Preview
// URL is also allowed; production targets and form submissions are excluded.
const origin = new URL(process.env.SHOP_LAYOUT_ORIGIN || "http://127.0.0.1:8788").origin
assert.ok(["http://127.0.0.1:8788","https://qualification-shop-lot-7-my-website.glennrichard-dev.workers.dev"].includes(origin))
let browser
before(async () => { browser=await chromium.launch({headless:true,args:["--use-angle=swiftshader","--enable-unsafe-swiftshader"]}) })
after(async () => { await browser?.close() })

for(const lang of ["fr","en"]) for(const width of [1440,820,390]) for(const interval of ["month","year"]) {
 test(lang+" / "+width+"px / "+interval+": services align without overlap or clipping", {timeout:30000}, async () => {
  const context=await browser.newContext({viewport:{width,height:1000}})
  try {
   await context.addInitScript(language=>localStorage.setItem("nomad403-language",language),lang)
   const page=await context.newPage(),errors=[]
   page.on("pageerror",error=>errors.push(error.message))
   await page.goto(origin+"/shop"+(interval==="year"?"?interval=year":""),{waitUntil:"networkidle"})
   await page.evaluate(()=>document.fonts.ready)
   const cards=await page.evaluate(()=>[...document.querySelectorAll("main section > ul > li")].map(card=>{
    const box=element=>{const r=element.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height}}
    const title=card.querySelector("h3"),description=title.nextElementSibling,price=description.nextElementSibling
    const features=[...card.querySelectorAll(":scope > ul > li")]
    return {box:box(card),title:box(title),description:box(description),summary:description.textContent,price:box(price),amount:Number(price.textContent.replace(/\D/g,"")),button:box(card.querySelector("button")),rows:features.map(row=>({...box(row),label:row.querySelector(":scope > div > span").textContent,overflow:row.scrollWidth>row.clientWidth+1}))}
   }))
   assert.equal(cards.length,3)
   assert.deepEqual(cards.map(card=>card.amount),interval==="year"?[190,490,690]:[19,49,69])
   for(const card of cards){
    assert.ok(card.summary.startsWith(lang==="fr"?"Votre":"Your"))
    assert.equal(card.rows.length,10)
    assert.deepEqual(card.rows.map(row=>row.label),cards[0].rows.map(row=>row.label))
    assert.ok(card.title.bottom<=card.description.top+1,"Title must not overlap description")
    assert.ok(card.description.bottom<=card.price.top+1,"Description must not overlap price")
    for(let index=0;index<10;index++){
     const row=card.rows[index]
     assert.ok(row.height>0&&!row.overflow)
     assert.ok(row.left>=card.box.left-1&&row.right<=Math.min(card.box.right,width)+1)
     if(index>0)assert.ok(card.rows[index-1].bottom<=row.top+1,"Service rows must not overlap")
    }
    assert.ok(card.rows.at(-1).bottom<=card.button.top+1,"Services must not overlap subscription button")
    assert.ok(card.button.bottom<=card.box.bottom+1)
   }
   if(width>=768){
    const aligned=values=>assert.ok(Math.max(...values)-Math.min(...values)<1,"Shared rows must align within a CSS pixel")
    aligned(cards.map(card=>card.box.top));aligned(cards.map(card=>card.price.top));aligned(cards.map(card=>card.button.bottom))
    for(let index=0;index<10;index++){aligned(cards.map(card=>card.rows[index].top));aligned(cards.map(card=>card.rows[index].height))}
   }
   assert.deepEqual(errors,[])
  } finally {await context.close()}
 })
}
