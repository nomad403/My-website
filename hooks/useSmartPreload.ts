"use client"

import { useEffect, useState } from "react"
import type { LoadStage, PerformanceProfile } from "@/lib/performance"

export function useSmartPreload(
  profile: PerformanceProfile | null,
  loadStage: LoadStage,
  bgCanvas: HTMLCanvasElement | null
) {
  const [isPreloaded, setIsPreloaded] = useState(false)

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

    if (loadStage === "particles" && bgCanvas) {
      const earlyTimer = setTimeout(finish, 120)
      return () => {
        clearTimeout(maxTimer)
        clearTimeout(earlyTimer)
      }
    }

    return () => clearTimeout(maxTimer)
  }, [profile, loadStage, bgCanvas, isPreloaded])

  return isPreloaded
}
