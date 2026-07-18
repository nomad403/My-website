"use client"

import { useEffect, useMemo, useState } from "react"
import {
  detectPerformanceTier,
  getPerformanceProfile,
  type PerformanceProfile,
  type PerformanceTier,
} from "@/lib/performance"
import { useAdaptivePerformance } from "@/hooks/useAdaptivePerformance"

export function usePerformanceProfile() {
  const [baseTier, setBaseTier] = useState<PerformanceTier | null>(null)
  const effectiveTier = useAdaptivePerformance(baseTier)

  useEffect(() => {
    setBaseTier(detectPerformanceTier())
  }, [])

  const profile: PerformanceProfile | null = useMemo(() => {
    if (!effectiveTier) return null
    return getPerformanceProfile(effectiveTier)
  }, [effectiveTier])

  return {
    profile,
    tier: effectiveTier ?? "high",
    baseTier: baseTier ?? "high",
    isReady: profile !== null,
  }
}
