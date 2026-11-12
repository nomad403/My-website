import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
// Optional path reuses an existing local runtime; no install, login or remote calls.
const runtimeRoot=resolve(process.argv[2] || process.cwd());
const require=createRequire(resolve(runtimeRoot,'package.json'));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{
 name:'d1-local-proof',compatibilityDate:'2026-11-10',compatibilityFlags:['nodejs_compat'],
 modules:[{type:'ESModule',path:resolve('nomad403-proof-worker.mjs'),contents:'export default {fetch(){return new Response("local proof")}}'}],
 d1Databases:{DB:'nomad403-proof-local-only'},
 outboundService:()=>{throw new Error('Network forbidden')}
}]}));
const results=[];
try {
 const db=await mf.getD1Database('DB');
 await db.prepare('CREATE TABLE counter(id INTEGER PRIMARY KEY,n INTEGER NOT NULL CHECK(n>=0 AND n<=60))').run();
 await db.prepare('INSERT INTO counter VALUES(1,0)').run();
 await db.prepare('CREATE TABLE ledger(id TEXT PRIMARY KEY,minutes INTEGER NOT NULL)').run();
 await db.prepare('CREATE TABLE required_change(ok INTEGER NOT NULL CHECK(ok=1))').run();
 await assert.rejects(db.prepare('BEGIN').run());
 results.push('interactive BEGIN rejected');
 await assert.rejects(db.batch([db.prepare('UPDATE counter SET n=20 WHERE id=1'),db.prepare('INSERT INTO required_change VALUES(0)')]));
 assert.equal((await db.prepare('SELECT n FROM counter').first()).n,0);
 results.push('batch failure rolls back earlier writes');
 await db.batch([db.prepare('UPDATE counter SET n=n+80 WHERE id=1 AND n+80<=60'),db.prepare("INSERT INTO ledger VALUES('unsafe-proof',80)")]);
 assert.equal((await db.prepare('SELECT n FROM counter').first()).n,0);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM ledger').first()).n,1);
 await db.prepare('DELETE FROM ledger').run();
 results.push('zero-row guarded update does NOT abort a batch (hazard reproduced)');
 const complete=id=>db.batch([
  db.prepare('UPDATE counter SET n=n+40 WHERE id=1 AND n+40<=60'),
  db.prepare('INSERT INTO required_change VALUES(CASE WHEN changes()=1 THEN 1 ELSE 0 END)'),
  db.prepare('INSERT INTO ledger VALUES(?,40)').bind(id),
 ]);
 const attempts=await Promise.allSettled(Array.from({length:20},(_,i)=>complete('request-'+i)));
 assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await db.prepare('SELECT n FROM counter').first()).n,40);
 assert.equal((await db.prepare('SELECT count(*) AS n FROM ledger').first()).n,1);
 results.push('20 concurrent guarded batches: one debit, one ledger entry, 19 complete rollbacks');
 await db.prepare('CREATE TABLE magic_links(id TEXT PRIMARY KEY,consumed INTEGER NOT NULL CHECK(consumed IN(0,1)))').run();
 await db.prepare("INSERT INTO magic_links VALUES('test-link',0)").run();
 const links=await Promise.all(Array.from({length:20},()=>db.prepare("UPDATE magic_links SET consumed=1 WHERE id='test-link' AND consumed=0 RETURNING id").all()));
 assert.equal(links.reduce((n,r)=>n+r.results.length,0),1);
 results.push('20 concurrent consumptions: one magic link winner');
 await db.prepare('CREATE TABLE receipts(id TEXT PRIMARY KEY)').run();
 await db.prepare('CREATE TABLE accounting(id TEXT PRIMARY KEY,cents INTEGER NOT NULL)').run();
 const event=()=>db.batch([db.prepare("INSERT INTO receipts VALUES('evt-test')"),db.prepare("INSERT INTO accounting VALUES('payment-test',1500)")]);
 const events=await Promise.allSettled(Array.from({length:20},event));
 assert.equal(events.filter(r=>r.status==='fulfilled').length,1);
 assert.equal((await db.prepare('SELECT sum(cents) AS n FROM accounting').first()).n,1500);
 results.push('20 duplicate receipt batches: one accounting write');
 console.log(JSON.stringify({runtime:'local Miniflare/workerd D1',scope:'synthetic feasibility only; not Shop adapters',passed:results.length,results},null,2));
} finally {await mf.dispose()}
