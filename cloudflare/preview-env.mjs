// Runtime allowlist: never forward production secrets or external service bindings.
export function previewEnvironment(env, ctx) {
  if (env.NOMAD403_ENV !== "preview" ||
      !/^preview\/[a-f0-9]{12}\/[A-Za-z0-9_-]{1,100}$/.test(env.NEXT_INC_CACHE_R2_PREFIX ?? "") ||
      typeof env.NEXT_INC_CACHE_R2_BUCKET?.get !== "function" ||
      typeof ctx.exports?.PreviewSelfReference?.fetch !== "function")
    throw new Error("Preview environment incomplete")
  return {
    NOMAD403_ENV: "preview",
    NEXT_INC_CACHE_R2_PREFIX: env.NEXT_INC_CACHE_R2_PREFIX,
    NEXT_INC_CACHE_R2_BUCKET: env.NEXT_INC_CACHE_R2_BUCKET,
    ASSETS: env.ASSETS,
    IMAGES: env.IMAGES,
    CONTACT_LIMITER: env.CONTACT_LIMITER,
    WORKER_SELF_REFERENCE: ctx.exports.PreviewSelfReference,
  }
}
