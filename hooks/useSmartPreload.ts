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
  const readyStage: LoadStage = options?.skipParticles ? "ascii" : "particles"

  useEffect(() => {
    if (!profile || isPreloaded) return

    let done = false
    const finish = () => {
      if (!done) {
        done = true
        setIsPreloaded(true)
      }
    }

    const maxTimer = setTimeout(finish, profile.loading.maxPreloadMs)

    if (loadStage === readyStage && bgCanvas) {
      const earlyTimer = setTimeout(finish, 120)
      return () => {
        clearTimeout(maxTimer)
        clearTimeout(earlyTimer)
      }
    }

    return () => clearTimeout(maxTimer)
  }, [profile, loadStage, bgCanvas, isPreloaded, readyStage])

  return isPreloaded
}
