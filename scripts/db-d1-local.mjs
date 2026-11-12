// Deliberately LOCAL ONLY. No Cloudflare credentials, account IDs or remote flags.
import {resolve} from "node:path"
import {localD1} from "../tests/helpers/d1.mjs"
if(process.argv.length!==2)throw new Error("This command takes no arguments and supports local D1 only")
const fixture=await localD1({persistPath:resolve(".wrangler/d1-qualification")})
try {
 const {results}=await fixture.db.prepare("SELECT name FROM d1_schema_migrations ORDER BY name").all()
 console.log(JSON.stringify({target:"local-only",migrations:results.map(m=>m.name)},null,2))
}finally{await fixture.close()}
