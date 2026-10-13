export type PerformanceTier = "high" | "mid" | "low"
export type AsciiMode = "plain" | "dither" | "sobel"

export interface PerformanceProfile {
  tier: PerformanceTier
  spheres: {
    count: number
    widthSegments: number
    heightSegments: number
    shadowMapSize: number
    maxPixelRatio: number
    maxPixelCount: number
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
  spheres: { count: 200, widthSegments: 24, heightSegments: 16, shadowMapSize: 512, maxPixelRatio: 1, maxPixelCount: 4_000_000 },
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
    stageDelays: { spheres: 0, ascii: 0, particles: 700 },
  },
}

const MID_PROFILE: PerformanceProfile = {
  tier: "mid",
  spheres: { count: 120, widthSegments: 20, heightSegments: 12, shadowMapSize: 512, maxPixelRatio: 1, maxPixelCount: 2_000_000 },
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
    stageDelays: { spheres: 0, ascii: 0, particles: 1000 },
  },
}

const LOW_PROFILE: PerformanceProfile = {
  tier: "low",
  spheres: { count: 80, widthSegments: 12, heightSegments: 8, shadowMapSize: 256, maxPixelRatio: 1, maxPixelCount: 360_000 },
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
    stageDelays: { spheres: 0, ascii: 0, particles: 900 },
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

    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info")
      const renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "") : ""
      return SOFT_GPU_RE.test(renderer)
    } finally {
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  } catch {
    return true
  }
}

/**
 * Stable hardware/GPU profile before mounting the decorative effects.
 * Startup scheduling and connection speed must not change ASCII definition.
 */
export async function probePerformanceTier(): Promise<PerformanceTier> {
  const staticTier = detectPerformanceTier()
  if (typeof window === "undefined") return staticTier

  if (detectSoftwareGpu()) return "low"

  // Respect an explicit data-saving preference, rather than the fluctuating
  // effectiveType hint, which says nothing about local rendering capability.
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean }
  }).connection
  if (connection?.saveData) {
    return minPerformanceTier(staticTier, "mid")
  }
  return staticTier
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
  viewport?: { width: number; height: number } | null,
) {
  const baseFontPx = profile.ascii.fontPxOverride ?? pageAscii.fontPx
  // Match the detail relative to the scene on smaller screens, regardless of
  // portrait/landscape orientation. Keep desktop size above a 720 px short edge.
  const shortEdge = viewport ? Math.min(viewport.width, viewport.height) : 720
  const densityScale = Math.min(1, Math.max(0, shortEdge) / 720)
  const fontPx = Math.min(baseFontPx, Math.max(4, baseFontPx * densityScale))
  return {
    mode: profile.ascii.forceMode ?? pageAscii.mode,
    fontPx,
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
