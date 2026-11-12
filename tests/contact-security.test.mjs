import assert from "node:assert/strict"
import {readFileSync} from "node:fs"
import {createRequire} from "node:module"
import {runInNewContext} from "node:vm"
import {test} from "node:test"
import ts from "typescript"
const require=createRequire(import.meta.url),payload={nom:"Test Person",contact:"test@example.com",message:"A legitimate project enquiry."}
function fixture(options={}){
 const calls={emails:0,reservations:[],sent:[]},env={RESEND_API_KEY:"synthetic-mail-key",RESEND_FROM:"sender@example.test",RESEND_TO:"owner@example.test",NOMAD403_ENV:"preview",QUALIFICATION_EMAILS:"owner@example.test",...options.env}
 const namespace={idFromName:name=>name,get:()=>({fetch:async request=>{calls.reservations.push(await request.json());if(options.fail)throw Error("private internal error");return Response.json(options.result??{allowed:true,retryAfter:1},{status:options.status??200})}})}
 const bindings=options.noContext?null:{...env,...(!options.noBinding?{CONTACT_LIMITER:namespace}:{})},modules=new Map()
 function load(path){
  if(modules.has(path))return modules.get(path)
  const source=readFileSync(new URL('../'+path+'.ts',import.meta.url),'utf8'),code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,module={exports:{}}
  runInNewContext(code,{exports:module.exports,module,Buffer,Request,Response,AbortSignal,URL,console:{error(){}},process:{env},require:name=>{
   if(name.startsWith('@/'))return load(name.slice(2))
   if(name.startsWith('.'))return load(new URL(name,'file:///'+path+'.ts').pathname.slice(1))
   if(name==='@opennextjs/cloudflare')return {getCloudflareContext:()=>{if(!bindings)throw Error('no runtime');return {env:bindings}}}
   if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}}
   if(name==='resend')return {Resend:class {emails={send:async message=>{calls.emails++;calls.sent.push(message);if(options.mailThrows)throw Error('private provider detail');return options.mailResult??{data:{id:'local-test'},error:null}}}}}
   return require(name)
  }},{filename:path+'.ts'});modules.set(path,module.exports);return module.exports
 }
 const POST=load('app/api/contact/route').POST
 return {calls,post:(body=payload,headers={})=>POST(new Request('https://preview.example.test/api/contact',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1',...headers},body:typeof body==='string'?body:JSON.stringify(body)}))}
}
test('contact reserves a Cloudflare slot before its mocked email',async()=>{const f=fixture();assert.equal((await f.post()).status,200);assert.equal(f.calls.emails,1);assert.equal(f.calls.reservations.length,1);assert.equal(f.calls.reservations[0].ip,'192.0.2.1')})
test('200 denied contact requests never reach mail',async()=>{const f=fixture({result:{allowed:false,retryAfter:600}});for(let i=0;i<200;i++)assert.equal((await f.post()).status,429);assert.equal(f.calls.emails,0)})
for(const [name,options]of Object.entries({noBinding:{noBinding:true},noRuntime:{noContext:true},network:{fail:true},rejected:{status:500},malformed:{result:{allowed:'yes',retryAfter:1}},invalidWait:{result:{allowed:true,retryAfter:-1}},wrongRecipient:{env:{RESEND_TO:'not-authorized@example.test'}}}))test('contact fails closed: '+name,async()=>{const f=fixture(options);assert.equal((await f.post()).status,503);assert.equal(f.calls.emails,0)})
test('untrusted/spoofed forwarding headers cannot select a client',async()=>{const f=fixture();assert.equal((await f.post(payload,{'cf-connecting-ip':'invalid','x-forwarded-for':'192.0.2.9','x-vercel-forwarded-for':'192.0.2.9'})).status,503);assert.equal(f.calls.emails,0);assert.equal(f.calls.reservations.length,0)})
test('foreign origins, honeypot, invalid fields and malformed JSON never reserve',async()=>{const f=fixture();for(const [body,headers]of [[payload,{origin:'https://foreign.example.test'}],[{...payload,website:'filled'},{}],[{...payload,message:'x'},{}],['{invalid',{}]])assert.ok((await f.post(body,headers)).status>=400);assert.equal(f.calls.reservations.length,0)})
test('oversized streamed content is refused before any reservation',async()=>{const f=fixture();assert.equal((await f.post({...payload,message:'x'.repeat(9000)})).status,413);assert.equal(f.calls.reservations.length,0)})
test('missing mail setup and provider errors disclose no sensitive detail',async()=>{for(const options of [{env:{RESEND_API_KEY:''}},{mailThrows:true},{mailResult:{data:null,error:{message:'private provider detail'}}}]){const f=fixture(options),response=await f.post();assert.ok(response.status>=500);assert.ok(!(await response.text()).includes('private provider detail'))}})
