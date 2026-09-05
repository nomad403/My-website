"use client"

import { useEffect, useMemo, useState } from "react"
import {
  getPerformanceProfile,
  probePerformanceTierOnce,
  type PerformanceProfile,
  type PerformanceTier,
} from "@/lib/performance"

/** Shared resolved tier so Home progressive load stays in sync. */
let sharedResolvedTier: PerformanceTier | null = null
const listeners = new Set<(tier: PerformanceTier) => void>()

function publishTier(tier: PerformanceTier) {
  sharedResolvedTier = tier
  listeners.forEach((listener) => listener(tier))
}

/**
 * Résout le profil UNE fois via sonde splash (hardware + FPS).
 * Pas de downgrade mid-session : évite le flash high → low.
 */
export function usePerformanceProfile() {
  const [tier, setTier] = useState<PerformanceTier | null>(
    () => sharedResolvedTier
  )

  useEffect(() => {
    if (sharedResolvedTier) {
      setTier(sharedResolvedTier)
      return
    }

    const listener = (next: PerformanceTier) => setTier(next)
    listeners.add(listener)

    let cancelled = false
    probePerformanceTierOnce().then((probed) => {
      if (cancelled) return
      publishTier(probed)
    })

    return () => {
      cancelled = true
      listeners.delete(listener)
    }
  }, [])

  const profile: PerformanceProfile | null = useMemo(() => {
    if (!tier) return null
    return getPerformanceProfile(tier)
  }, [tier])

  return {
    profile,
    /** Avant résolution, on assume low pour ne jamais monter du high par erreur. */
    tier: tier ?? "low",
    isReady: profile !== null,
  }
}
