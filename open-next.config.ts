import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache"

// Preserve the cache bucket already populated by the failed migration.
// Configuration is committed; never run the automatic migrate command in CI.
export default {
  ...defineCloudflareConfig({ incrementalCache: r2IncrementalCache }),
  // Never call the platform dispatcher recursively from inside OpenNext.
  buildCommand: "npm run build:next",
}
