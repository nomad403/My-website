import type { AsciiGpuSource } from "@/lib/ascii/ascii-gpu-pass"

const SPHERES_ESM =
  "https://cdn.jsdelivr.net/npm/threejs-components@0.0.8/build/backgrounds/spheres2.cdn.min.js"
// The scene and ASCII pass must share the same pinned Three.js module.
const THREE_ESM = "https://cdn.jsdelivr.net/npm/three@0.170.0/+esm"

function importModules() {
  return Promise.all([
    import(/* webpackIgnore: true */ /* @vite-ignore */ SPHERES_ESM),
    import(/* webpackIgnore: true */ /* @vite-ignore */ THREE_ESM) as Promise<AsciiGpuSource["api"]>,
  ])
}

let modulesPromise: ReturnType<typeof importModules> | null = null

/** Warm the downloads without creating a scene or a WebGL context. */
export function loadSpheresModules() {
  if (!modulesPromise) {
    modulesPromise = importModules().catch((error) => {
      // A failed preload must not prevent another attempt when the scene mounts.
      modulesPromise = null
      throw error
    })
  }
  return modulesPromise
}
