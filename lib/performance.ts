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

export interface ParticleLayout {
  fontSize: number
  particleDensity: number
  pixelDensity: number
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

export function getPerformanceProfile(tier: PerformanceTier = "high"): PerformanceProfile {
  if (tier === "low") return LOW_PROFILE
  if (tier === "mid") return MID_PROFILE
  return HIGH_PROFILE
}

export function resolveAsciiSettings(
  pageAscii: { mode: AsciiMode; fontPx: number },
  profile: PerformanceProfile,
  options?: { particlesActiveOnHome?: boolean }
) {
  const particlesActiveOnHome = options?.particlesActiveOnHome ?? false
  const throttleHome = particlesActiveOnHome && profile.tier !== "high"

  return {
    mode: profile.ascii.forceMode ?? pageAscii.mode,
    fontPx: throttleHome
      ? Math.max(profile.ascii.fontPxOverride ?? pageAscii.fontPx, 10)
      : profile.ascii.fontPxOverride ?? pageAscii.fontPx,
    fps: profile.ascii.fps,
    domUpdateEvery: throttleHome
      ? Math.max(profile.ascii.domUpdateEvery, 4)
      : profile.ascii.domUpdateEvery,
  }
}

/** Tailles responsive des particules — densité réduite sur petits écrans et profil mid/low. */
export function getParticleLayout(width: number, profile: PerformanceProfile): ParticleLayout {
  let fontSize: number
  let particleDensity: number

  if (width < 480) {
    fontSize = 24
    particleDensity = 3
  } else if (width < 768) {
    fontSize = 32
    particleDensity = 2
  } else if (width < 1024) {
    fontSize = 50
    particleDensity = 2
  } else if (width < 1440) {
    fontSize = 90
    particleDensity = 2
  } else {
    fontSize = 100
    particleDensity = 1
  }

  if (profile.tier === "low") {
    particleDensity = Math.max(1, particleDensity - 1)
  } else if (profile.tier === "mid") {
    particleDensity = Math.max(1, particleDensity)
  }

  return {
    fontSize,
    particleDensity,
    pixelDensity: profile.particles.pixelDensity,
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
