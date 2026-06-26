"use client"

import { useEffect, useState } from "react"
import {
  getLoadStageFlags,
  type LoadStage,
  type PerformanceProfile,
} from "@/lib/performance"

export function useProgressiveLoad(
  profile: PerformanceProfile | null,
  options?: { skipParticles?: boolean }
) {
  const [stage, setStage] = useState<LoadStage>("shell")
  const skipParticles = options?.skipParticles ?? false

  useEffect(() => {
    if (!profile) return

    const { stageDelays } = profile.loading
    const asciiAt = stageDelays.spheres + stageDelays.ascii
    const particlesAt = asciiAt + stageDelays.particles

    const timers = [
      setTimeout(
        () => setStage((prev) => (prev === "shell" ? "spheres" : prev)),
        stageDelays.spheres
      ),
      setTimeout(
        () => setStage((prev) => (prev === "shell" || prev === "spheres" ? "ascii" : prev)),
        asciiAt
      ),
    ]

    if (!skipParticles) {
      timers.push(
        setTimeout(
          () => setStage((prev) => (prev === "ascii" ? "particles" : prev)),
          particlesAt
        )
      )
    }

    return () => timers.forEach(clearTimeout)
  }, [profile, skipParticles])

  return { stage, ...getLoadStageFlags(stage) }
}
