"use client"

import { useEffect, useState } from "react"
import type { LoadStage, PerformanceProfile } from "@/lib/performance"

export function useSmartPreload(
  profile: PerformanceProfile | null,
  loadStage: LoadStage,
  bgCanvas: HTMLCanvasElement | null,
  options?: { skipParticles?: boolean }
) {
  const [isPreloaded, setIsPreloaded] = useState(false)
  const skipParticles = options?.skipParticles ?? false
  const readyStage: LoadStage = skipParticles ? "ascii" : "particles"

  useEffect(() => {
    if (!profile || isPreloaded) return

    let done = false
    const finish = () => {
      if (!done) {
        done = true
        setIsPreloaded(true)
      }
    }

    // Mid/low: prefer waiting for the ready stage so the loader
    // doesn't hide before the heavy particle burst starts.
    const allowEarlyFinish = profile.tier === "high"
    const maxTimer = setTimeout(finish, profile.loading.maxPreloadMs)

    if (loadStage === readyStage && bgCanvas) {
      const earlyDelay = allowEarlyFinish ? 120 : profile.tier === "mid" ? 280 : 200
      const earlyTimer = setTimeout(finish, earlyDelay)
      return () => {
        clearTimeout(maxTimer)
        clearTimeout(earlyTimer)
      }
    }

    return () => clearTimeout(maxTimer)
  }, [profile, loadStage, bgCanvas, isPreloaded, readyStage])

  return isPreloaded
}
