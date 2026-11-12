import {getCloudflareContext} from "@opennextjs/cloudflare"
import type {D1Binding} from "../db/d1/types"
import type {LimiterNamespace} from "../auth/rate-limit"
export type CloudBindings=Record<string,unknown>&{SHOP_DB?:D1Binding;AUTH_LIMITER?:LimiterNamespace;CONTACT_LIMITER?:LimiterNamespace}
export function cloudBindings():CloudBindings|null{try{return getCloudflareContext().env as unknown as CloudBindings}catch{return null}}
export function runtimeVariables(bindings:CloudBindings|null=cloudBindings()):NodeJS.ProcessEnv{
 if(!bindings)return process.env
 return {...Object.fromEntries(Object.entries(bindings).filter((entry):entry is [string,string]=>typeof entry[1]==="string")),NODE_ENV:"production"}
}
