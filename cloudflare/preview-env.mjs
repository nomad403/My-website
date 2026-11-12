// Explicit Preview allowlist: production credentials, external services and SQL URLs never pass through.
const keys=['APP_URL','ADMIN_EMAILS','QUALIFICATION_EMAILS','RESEND_TO','RESEND_FROM','RESEND_API_KEY','AUTH_SECRET','AUTH_MFA_KEY','STRIPE_SECRET_KEY','STRIPE_PUBLISHABLE_KEY','STRIPE_WEBHOOK_SECRET','STRIPE_PRICE_ESSENTIAL_MONTHLY','STRIPE_PRICE_ESSENTIAL_YEARLY','STRIPE_PRICE_PLUS_MONTHLY','STRIPE_PRICE_PLUS_YEARLY','STRIPE_PRICE_PREMIUM_MONTHLY','STRIPE_PRICE_PREMIUM_YEARLY','STRIPE_PRICE_FRIEND_HOST_MONTHLY','STRIPE_PRICE_FRIEND_CARE_MONTHLY']
export function previewEnvironment(env,ctx){
 if(env.NOMAD403_ENV!=='preview'||env.SHOP_ENABLED!=='1'||env.SHOP_DB_ID!=='2eb5526a-1d0c-469c-ae36-debe83ec8218'||typeof env.SHOP_DB?.prepare!=='function'||!/^preview\/[a-f0-9]{12}\/[A-Za-z0-9_-]{1,100}$/.test(env.NEXT_INC_CACHE_R2_PREFIX??'')||typeof env.NEXT_INC_CACHE_R2_BUCKET?.get!=='function'||typeof ctx.exports?.PreviewSelfReference?.fetch!=='function')throw new Error('Preview environment incomplete')
 const result={NOMAD403_ENV:'preview',SHOP_ENABLED:'1',SHOP_DB_ID:env.SHOP_DB_ID,SHOP_DB:env.SHOP_DB,AUTH_LIMITER:env.AUTH_LIMITER,CONTACT_LIMITER:env.CONTACT_LIMITER,NEXT_INC_CACHE_R2_PREFIX:env.NEXT_INC_CACHE_R2_PREFIX,NEXT_INC_CACHE_R2_BUCKET:env.NEXT_INC_CACHE_R2_BUCKET,ASSETS:env.ASSETS,IMAGES:env.IMAGES,WORKER_SELF_REFERENCE:ctx.exports.PreviewSelfReference}
 for(const key of keys)if(typeof env[key]==='string')result[key]=env[key]
 if(result.APP_URL!=='https://qualification-shop-lot-7-my-website.glennrichard-dev.workers.dev')throw new Error('Unexpected qualification origin')
 if(result.STRIPE_SECRET_KEY&&!result.STRIPE_SECRET_KEY.startsWith('sk_test_'))throw new Error('Stripe test keys required')
 if(result.STRIPE_PUBLISHABLE_KEY&&!result.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_'))throw new Error('Stripe test keys required')
 return result
}
