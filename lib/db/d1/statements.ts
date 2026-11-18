/** The migration format explicitly separates statements. Reject omitted separators:
 * D1 prepare() may silently prepare ONLY the first statement of a multi-statement string.
 * This scanner validates boundaries; SQLite still validates SQL syntax. It is not a SQL translator.
 */
function tokens(source: string): string[] {
 const result: string[] = []
 for (let i=0;i<source.length;) {
  const pair=source.slice(i,i+2),char=source[i]
  if (/\s/.test(char)) { i++; continue }
  if (pair==="--") { const end=source.indexOf("\n",i+2); i=end<0?source.length:end+1; continue }
  if (pair==="/*") { const end=source.indexOf("*/",i+2); if(end<0)throw new Error("Unterminated D1 SQL comment"); i=end+2; continue }
  if (char==="'" || char==='"' || char==="\u0060" || char==="[") {
   const close=char==="["?"]":char; i++; let closed=false
   while(i<source.length) {
    if(source[i]===close) {
     if(close!=="]" && source[i+1]===close) {i+=2;continue}
     i++;closed=true;break
    }
    i++
   }
   if(!closed)throw new Error("Unterminated D1 SQL quote")
   result.push("<quoted>");continue
  }
  const word=source.slice(i).match(/^[a-z_][a-z0-9_]*/i)?.[0]
  if(word) {result.push(word.toUpperCase());i+=word.length;continue}
  result.push(char);i++
 }
 return result
}
function assertSingleStatement(source: string): void {
 const words=tokens(source)
 if(!words.length || words[0]===";")throw new Error("Empty D1 statement")
 const trigger=words[0]==="CREATE" && (words[1]==="TRIGGER" || (["TEMP","TEMPORARY"].includes(words[1]) && words[2]==="TRIGGER"))
 let ended=false,body=false,bodyStarted=false,bodyClosed=false,cases=0
 for(const token of words) {
  if(ended)throw new Error("Missing D1 statement-breakpoint")
  if(trigger) {
   if(bodyClosed && token!==";")throw new Error("Missing D1 statement-breakpoint after trigger")
   if(token==="CASE")cases++
   else if(token==="BEGIN" && !bodyStarted) {body=true;bodyStarted=true}
   else if(token==="END") {
    if(cases>0)cases--
    else if(body) {body=false;bodyClosed=true}
   }
  }
  if(token===";" && !body)ended=true
 }
 if(trigger && (!bodyStarted || !bodyClosed || cases!==0))throw new Error("Incomplete D1 trigger")
}
export function d1Statements(source: string): string[] {
 const statements=source.replace(/\r\n/g,"\n").split(/^--> statement-breakpoint[^\S\r\n]*$/m).map(s=>s.trim())
 if(statements.some(s=>!s))throw new Error("Empty D1 migration statement")
 for(const statement of statements)assertSingleStatement(statement)
 return statements
}
