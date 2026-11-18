import {randomUUID} from "node:crypto"
import type {PromotionAdminStore,PromotionInput} from "../../billing/promotion-admin"
import type {D1Connection,D1Binding} from "./types"
import {nullableDate,milliseconds,uuid} from "./codec"

type Row=Record<string,string|number|null>
function dates(row:Row,fields:string[]):Record<string,unknown>{
 const result:Record<string,unknown>={...row}
 for(const field of fields)result[field]=nullableDate(row[field] as number|null)
 return result
}
/** No raw promotion code/hash in list/detail projections; all audit is transactional SQL. */
export class D1PromotionAdminStore implements PromotionAdminStore {
 constructor(private readonly db:D1Connection){}
 async create(input:PromotionInput){
  return this.db.prepare("INSERT INTO promotion_codes(id,code_hash,code_hint,plan_code,expires_at,max_redemptions,restricted_email,usage_terms,internal_notes,created_by,changed_by) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(code_hash) DO NOTHING RETURNING id").bind(randomUUID(),input.codeHash,input.codeHint,input.planCode,input.expiresAt?milliseconds(input.expiresAt):null,input.maxRedemptions,input.restrictedEmail,input.usageTerms,input.internalNotes,uuid(input.actorId),uuid(input.actorId)).first<{id:string}>()
 }
 async list(limit:number,offset:number){
  const {results}=await this.db.prepare(`SELECT c.id,c.code_hint AS "codeHint",c.plan_code AS "planCode",c.created_at AS "createdAt",c.expires_at AS "expiresAt",c.disabled_at AS "disabledAt",c.max_redemptions AS "maxRedemptions",c.restricted_email AS "restrictedEmail",c.usage_terms AS "usageTerms",c.internal_notes AS "internalNotes",(SELECT count(*) FROM promotion_redemptions r WHERE r.promotion_code_id=c.id AND r.status='consumed') AS consumed,(SELECT count(*) FROM promotion_redemptions r WHERE r.promotion_code_id=c.id AND r.status='reserved') AS reserved FROM promotion_codes c ORDER BY c.created_at DESC,c.id DESC LIMIT ? OFFSET ?`).bind(limit,offset).all<Row>()
  return results.map(row=>dates(row,["createdAt","expiresAt","disabledAt"]))
 }
 async detail(id:string,offset=0){
  const key=uuid(id)
  const [promotions,reservations,history]=await this.db.batch<Row>([
   this.db.prepare(`SELECT id,code_hint AS "codeHint",plan_code AS "planCode",created_at AS "createdAt",usage_terms AS "usageTerms",internal_notes AS "internalNotes" FROM promotion_codes WHERE id=?`).bind(key),
   this.db.prepare(`SELECT r.id,r.status,r.created_at AS "createdAt",r.updated_at AS "updatedAt",u.email,s.id AS "subscriptionId",s.status AS "subscriptionStatus",s.amount_cents AS "amountCents",s.commercial_terms AS "commercialTerms" FROM promotion_redemptions r JOIN users u ON u.id=r.user_id LEFT JOIN subscriptions s ON s.promotion_redemption_id=r.id WHERE r.promotion_code_id=? ORDER BY r.created_at DESC,r.id DESC LIMIT 200 OFFSET ?`).bind(key,offset),
   this.db.prepare(`SELECT id,action,created_at AS "createdAt",actor_user_id AS "actorId",CAST(json_extract(metadata,'$.redemptionId') AS TEXT) AS "redemptionId" FROM audit_logs WHERE json_extract(metadata,'$.promotionId')=? ORDER BY created_at DESC,id DESC LIMIT 200 OFFSET ?`).bind(key,offset),
  ])
  const row=promotions.results[0]
  return row?{...dates(row,["createdAt"]),reservations:reservations.results.map(r=>dates(r,["createdAt","updatedAt"])),history:history.results.map(r=>dates(r,["createdAt"])),offset,hasMore:reservations.results.length===200||history.results.length===200,legacy:row.codeHint===null}:null
 }
 async change(id:string,actorId:string,input:{disable?:true;internalNotes?:string}){
  // One statement resolves disable races without a read/write gap. Never re-enable or replace its first date.
  const row=await this.db.prepare("UPDATE promotion_codes SET changed_by=?,disabled_at=CASE WHEN ?=1 THEN coalesce(disabled_at,?) ELSE disabled_at END,internal_notes=CASE WHEN ?=1 THEN ? ELSE internal_notes END WHERE id=? RETURNING id").bind(uuid(actorId),input.disable?1:0,Date.now(),input.internalNotes!==undefined?1:0,input.internalNotes??null,uuid(id)).first<{id:string}>()
  return row!==null
 }
}
export function createD1PromotionAdminStore(binding:D1Binding){return new D1PromotionAdminStore(binding.withSession("first-primary"))}
