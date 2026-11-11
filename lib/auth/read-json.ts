export type JsonBody = {ok:true;value:unknown}|{ok:false;status:number;code:string}
/** Bound bytes while reading, including chunked bodies and misleading Content-Length. */
export async function readJson(request:Request):Promise<JsonBody>{
 if(request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()!=="application/json")return {ok:false,status:415,code:"unsupported_media"}
 if(Number(request.headers.get("content-length")??0)>8192)return {ok:false,status:413,code:"payload_too_large"}
 const reader=request.body?.getReader()
 if(!reader)return {ok:false,status:400,code:"invalid_json"}
 const chunks:Uint8Array[]=[]
 let size=0
 try{
  while(true){
   const chunk=await reader.read()
   if(chunk.done)break
   size+=chunk.value.byteLength
   if(size>8192){await reader.cancel().catch(()=>undefined);return {ok:false,status:413,code:"payload_too_large"}}
   chunks.push(chunk.value)
  }
  const bytes=new Uint8Array(size);let offset=0
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  return {ok:true,value:JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as unknown}
 }catch{return {ok:false,status:400,code:"invalid_json"}}
 finally{reader.releaseLock()}
}
