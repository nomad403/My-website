"use client"

import { useEffect, useState } from "react"
import {
  detectPerformanceTier,
  getPerformanceProfile,
  type PerformanceProfile,
  type PerformanceTier,
} from "@/lib/performance"

export function usePerformanceProfile() {
  const [profile, setProfile] = useState<PerformanceProfile | null>(null)
  const [tier, setTier] = useState<PerformanceTier>("high")

  useEffect(() => {
    const detected = detectPerformanceTier()
    setTier(detected)
    setProfile(getPerformanceProfile(detected))
  }, [])

  return { profile, tier, isReady: profile !== null }
}
