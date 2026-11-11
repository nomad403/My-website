// OpenNext's documented custom-Worker pattern: retain its fetch handler.
import handler from "../.open-next/worker.js"
export { ContactLimiter } from "./contact-limiter.mjs"
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "../.open-next/worker.js"
export default { fetch: handler.fetch }
