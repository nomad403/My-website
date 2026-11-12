import { WorkerEntrypoint } from "cloudflare:workers"
import handler from "../.open-next/worker.js"
import { previewEnvironment } from "./preview-env.mjs"
export { ContactLimiter } from "./contact-limiter.mjs"
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js"

// Same code, same Preview, same bindings. No hostname fetch or production service fallback.
export class PreviewSelfReference extends WorkerEntrypoint {
  fetch(request) {
    return handler.fetch(request, previewEnvironment(this.env, this.ctx), this.ctx)
  }
}
export default {
  fetch(request, env, ctx) {
    if (env.NOMAD403_ENV !== "preview") return handler.fetch(request, env, ctx)
    try {
      return handler.fetch(request, previewEnvironment(env, ctx), ctx)
    } catch {
      return new Response("Preview environment incomplete", { status: 503 })
    }
  },
}
