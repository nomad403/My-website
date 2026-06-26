export type PerformanceTier = "high" | "low"
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
    fps: 50,
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
    maxPreloadMs: 700,
    stageDelays: { spheres: 0, ascii: 150, particles: 350 },
  },
}

const LOW_PROFILE: PerformanceProfile = {
  tier: "low",
  spheres: { count: 80 },
  ascii: {
    fps: 24,
    fontPxOverride: null,
    forceMode: null,
    domUpdateEvery: 3,
  },
  particles: {
    pixelDensity: 10,
    enableBlur: false,
    targetFps: 30,
    mapRegionWidthRatio: 0.85,
    mapRegionHeightRatio: 0.25,
  },
  loading: {
    maxPreloadMs: 500,
    stageDelays: { spheres: 0, ascii: 250, particles: 550 },
  },
}

export function detectPerformanceTier(): PerformanceTier {
  if (typeof window === "undefined") return "high"

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "low"
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const cores = navigator.hardwareConcurrency

  if (memory !== undefined && memory <= 4) return "low"
  if (cores !== undefined && cores <= 4) return "low"

  return "high"
}

export function getPerformanceProfile(tier: PerformanceTier = "high"): PerformanceProfile {
  return tier === "low" ? LOW_PROFILE : HIGH_PROFILE
}

export function resolveAsciiSettings(
  pageAscii: { mode: AsciiMode; fontPx: number },
  profile: PerformanceProfile
) {
  return {
    mode: profile.ascii.forceMode ?? pageAscii.mode,
    fontPx: profile.ascii.fontPxOverride ?? pageAscii.fontPx,
    fps: profile.ascii.fps,
    domUpdateEvery: profile.ascii.domUpdateEvery,
  }
}

/** Tailles responsive des particules — densité réduite sur petits écrans et profil low. */
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
