export type PerformanceTier = "high" | "mid" | "low"
export type AsciiMode = "plain" | "dither" | "sobel"

export interface PerformanceProfile {
  tier: PerformanceTier
  spheres: {
    count: number
  }
  ascii: {
    fps: number
    fontPxOverride: number | null
    forceMode: AsciiMode | null
    domUpdateEvery: number
  }
  particles: {
    pixelDensity: number
    enableBlur: boolean
    targetFps: number
    mapRegionWidthRatio: number
    mapRegionHeightRatio: number
  }
  loading: {
    maxPreloadMs: number
    stageDelays: {
      spheres: number
      ascii: number
      particles: number
    }
  }
}

const HIGH_PROFILE: PerformanceProfile = {
  tier: "high",
  spheres: { count: 200 },
  ascii: {
    fps: 60,
    fontPxOverride: null,
    forceMode: null,
    domUpdateEvery: 2,
  },
  particles: {
    pixelDensity: 4,
    enableBlur: true,
    targetFps: 60,
    mapRegionWidthRatio: 0.9,
    mapRegionHeightRatio: 0.35,
  },
  loading: {
    maxPreloadMs: 900,
    stageDelays: { spheres: 0, ascii: 200, particles: 700 },
  },
}

const MID_PROFILE: PerformanceProfile = {
  tier: "mid",
  spheres: { count: 120 },
  ascii: {
    fps: 60,
    fontPxOverride: 9,
    forceMode: null,
    domUpdateEvery: 3,
  },
  particles: {
    pixelDensity: 7,
    enableBlur: false,
    targetFps: 40,
    mapRegionWidthRatio: 0.88,
    mapRegionHeightRatio: 0.3,
  },
  loading: {
    maxPreloadMs: 1400,
    stageDelays: { spheres: 0, ascii: 400, particles: 1000 },
  },
}

const LOW_PROFILE: PerformanceProfile = {
  tier: "low",
  spheres: { count: 80 },
  ascii: {
    fps: 60,
    fontPxOverride: 10,
    forceMode: null,
    domUpdateEvery: 4,
  },
  particles: {
    pixelDensity: 10,
    enableBlur: false,
    targetFps: 30,
    mapRegionWidthRatio: 0.85,
    mapRegionHeightRatio: 0.25,
  },
  loading: {
    maxPreloadMs: 1200,
    stageDelays: { spheres: 0, ascii: 350, particles: 900 },
  },
}

const TIER_RANK: Record<PerformanceTier, number> = {
  high: 2,
  mid: 1,
  low: 0,
}

const TIER_BY_RANK: PerformanceTier[] = ["low", "mid", "high"]

export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === "undefined") return "high"

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "low"
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency

  if (memory !== undefined && memory <= 4) return "low"
  if (cores !== undefined && cores <= 4) return "low"

  if (memory !== undefined && memory <= 8) return "mid"
  if (cores !== undefined && cores <= 8) return "mid"

  return "high"
}

export function downgradePerformanceTier(tier: PerformanceTier): PerformanceTier {
  const next = TIER_RANK[tier] - 1
  return TIER_BY_RANK[Math.max(0, next)]
}

export function minPerformanceTier(a: PerformanceTier, b: PerformanceTier): PerformanceTier {
  return TIER_RANK[a] <= TIER_RANK[b] ? a : b
}

const SOFT_GPU_RE =
  /swiftshader|llvmpipe|softpipe|microsoft basic render|google swiftshader|mesa offscreen/i

function detectSoftwareGpu(): boolean {
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
    if (!gl) return true

    const ext = gl.getExtension("WEBGL_debug_renderer_info")
    if (ext) {
      const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "")
      if (SOFT_GPU_RE.test(renderer)) return true
    }
    return false
  } catch {
    return true
  }
}

function measureRafFps(sampleMs: number): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0
    const start = performance.now()

    const tick = (now: number) => {
      frames += 1
      if (now - start >= sampleMs) {
        resolve((frames * 1000) / Math.max(1, now - start))
        return
      }
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}

/** Charge légère GPU pendant le splash pour affiner le tier. */
function stressGpuWhileMeasuring(sampleMs: number): Promise<number> {
  if (typeof document === "undefined") return measureRafFps(sampleMs)

  const canvas = document.createElement("canvas")
  canvas.width = 256
  canvas.height = 256
  const gl = canvas.getContext("webgl", {
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
  }) as WebGLRenderingContext | null

  if (!gl) return measureRafFps(sampleMs)

  return new Promise((resolve) => {
    let frames = 0
    const start = performance.now()

    const tick = (now: number) => {
      frames += 1
      const t = (now - start) / sampleMs
      gl.viewport(0, 0, 256, 256)
      gl.clearColor(t % 1, 0.2, 1 - (t % 1), 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      // Quelques draw clear supplémentaires pour stresser sans bloquer le main thread trop fort
      for (let i = 0; i < 8; i++) {
        gl.clear(gl.COLOR_BUFFER_BIT)
      }

      if (now - start >= sampleMs) {
        resolve((frames * 1000) / Math.max(1, now - start))
        return
      }
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}

/**
 * Sonde hardware + FPS réel avant le montage des effets lourds.
 * Retourne le tier final avant de monter les effets lourds.
 */
export async function probePerformanceTier(): Promise<PerformanceTier> {
  const staticTier = detectPerformanceTier()
  if (typeof window === "undefined") return staticTier

  if (detectSoftwareGpu()) return "low"

  // Connection lente / save-data → rester conservateur
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection
  if (connection?.saveData) {
    return minPerformanceTier(staticTier, "mid")
  }
  if (connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") {
    return "low"
  }

  const fps = await stressGpuWhileMeasuring(750)

  let fpsTier: PerformanceTier = "high"
  if (fps < 32) fpsTier = "low"
  else if (fps < 50) fpsTier = "mid"

  return minPerformanceTier(staticTier, fpsTier)
}

let sharedProbePromise: Promise<PerformanceTier> | null = null

/** Une seule sonde partagée pour tous les hooks de chargement. */
export function probePerformanceTierOnce(): Promise<PerformanceTier> {
  if (!sharedProbePromise) {
    sharedProbePromise = probePerformanceTier()
  }
  return sharedProbePromise
}

export function getPerformanceProfile(tier: PerformanceTier = "high"): PerformanceProfile {
  if (tier === "low") return LOW_PROFILE
  if (tier === "mid") return MID_PROFILE
  return HIGH_PROFILE
}

export function resolveAsciiSettings(
  pageAscii: { mode: AsciiMode; fontPx: number },
  profile: PerformanceProfile,
) {
  return {
    mode: profile.ascii.forceMode ?? pageAscii.mode,
    fontPx: profile.ascii.fontPxOverride ?? pageAscii.fontPx,
    fps: profile.ascii.fps,
    domUpdateEvery: profile.ascii.domUpdateEvery,
  }
}

export type LoadStage = "shell" | "spheres" | "ascii" | "particles"

export function getLoadStageFlags(stage: LoadStage) {
  return {
    showSpheres: stage !== "shell",
    showAscii: stage === "ascii" || stage === "particles",
    showParticles: stage === "particles",
  }
}
