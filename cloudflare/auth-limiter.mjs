import {createHmac,randomBytes} from 'node:crypto'
export class AuthLimiter {
 constructor(ctx){this.ctx=ctx;this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS metadata(k TEXT PRIMARY KEY,v TEXT NOT NULL)');this.sql.exec('CREATE TABLE IF NOT EXISTS counters(k TEXT PRIMARY KEY,n INTEGER NOT NULL,expires INTEGER NOT NULL)');this.sql.exec('CREATE INDEX IF NOT EXISTS counters_expiry ON counters(expires)');this.sql.exec("INSERT OR IGNORE INTO metadata VALUES('salt',?)",randomBytes(32).toString('hex'));this.salt=this.sql.exec("SELECT v FROM metadata WHERE k='salt'").one().v}
 now(){return Math.floor(Date.now()/1000)}
 async fetch(request){
  if(request.method!=='POST'||new URL(request.url).pathname!=='/consume')return new Response(null,{status:404})
  const body=await request.text();if(body.length>4096)return new Response(null,{status:413})
  let input;try{input=JSON.parse(body)}catch{return new Response(null,{status:400})}
  if(!input||typeof input.key!=='string'||!input.key||input.key.length>512||!Number.isInteger(input.limit)||input.limit<1||input.limit>10000||!Number.isInteger(input.windowSeconds)||input.windowSeconds<1||input.windowSeconds>86400)return new Response(null,{status:400})
  const key=createHmac('sha256',this.salt).update(input.key).digest('hex'),now=this.now()
  const result=this.ctx.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM counters WHERE k IN (SELECT k FROM counters WHERE expires<=? LIMIT 128)',now)
   const old=this.sql.exec('SELECT n,expires FROM counters WHERE k=?',key).toArray()[0],row=old?.expires>now?old:{n:0,expires:now+input.windowSeconds}
   if(row.n>=input.limit)return {allowed:false,retryAfter:Math.max(1,row.expires-now)}
   this.sql.exec('INSERT INTO counters VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET n=excluded.n,expires=excluded.expires',key,row.n+1,row.expires)
   return {allowed:true,retryAfter:0}
  })
  return Response.json(result)
 }
}
