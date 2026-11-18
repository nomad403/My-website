import {readdirSync,readFileSync} from "node:fs"
import {resolve} from "node:path"
import {Miniflare,convertV4MiniflareOptions} from "miniflare"
import {migrateD1} from "../../lib/db/d1/migrate.ts"

export function migrations() {
 const directory=new URL("../../drizzle-d1/",import.meta.url)
 return readdirSync(directory).filter(name=>name.endsWith(".sql")).sort().map(name=>({name,source:readFileSync(new URL(name,directory),"utf8")}))
}
export async function localD1({migrate=true,persistPath}={}) {
 const options=convertV4MiniflareOptions({workers:[{
  name:"nomad403-d1-local",compatibilityDate:"2026-11-10",compatibilityFlags:["nodejs_compat"],
  modules:[{type:"ESModule",path:resolve("nomad403-d1-local-worker.mjs"),contents:"export default {fetch(){return new Response('Local D1 test only')}}"}],
  d1Databases:{DB:"nomad403-local-qualification"},
  outboundService:()=>{throw new Error("Remote access forbidden in D1 local tests")},
 }]})
 if(persistPath){options.resourcePersistencePath=persistPath;options.isolatedResourcePersistencePath=persistPath}
 const mf=new Miniflare(options)
 try {
  const db=await mf.getD1Database("DB")
  if(migrate)await migrateD1(db,migrations())
  return {db,close:()=>mf.dispose()}
 } catch(error) {await mf.dispose();throw error}
}
