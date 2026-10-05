"use client"

import { useEffect, useState } from "react"
import type { LoadStage, PerformanceProfile } from "@/lib/ui/performance"

export function useSmartPreload(
  profile: PerformanceProfile | null,
  loadStage: LoadStage,
  bgCanvas: HTMLCanvasElement | null,
  options?: { skipParticles?: boolean }
) {
  const [isPreloaded, setIsPreloaded] = useState(false)
  const skipParticles = options?.skipParticles ?? false
  const readyStage: LoadStage = skipParticles ? "ascii" : "particles"

  // One deadline per profile; stage/canvas changes must not restart it.
  useEffect(() => {
    if (!profile || isPreloaded) return
    const timer = setTimeout(() => setIsPreloaded(true), profile.loading.maxPreloadMs)
    return () => clearTimeout(timer)
  }, [profile, isPreloaded])

  useEffect(() => {
    if (!profile || isPreloaded || loadStage !== readyStage || !bgCanvas) return
    const delay = profile.tier === "high" ? 120 : profile.tier === "mid" ? 280 : 200
    const timer = setTimeout(() => setIsPreloaded(true), delay)
    return () => clearTimeout(timer)
  }, [profile, loadStage, bgCanvas, isPreloaded, readyStage])

  return isPreloaded
}
