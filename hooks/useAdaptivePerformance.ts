"use client"

import { useEffect, useState } from "react"
import {
  downgradePerformanceTier,
  type PerformanceTier,
} from "@/lib/performance"

const SAMPLE_MS = 1600
const MIN_AVG_FPS = 40
const WARMUP_MS = 400

/** Shared across hook instances so Home + ParticleText see the same tier. */
let sharedEffectiveTier: PerformanceTier | null = null
let measurementStarted = false
let measurementFinished = false
let downgradeApplied = false
const listeners = new Set<(tier: PerformanceTier) => void>()

function notify(tier: PerformanceTier) {
  sharedEffectiveTier = tier
  listeners.forEach((listener) => listener(tier))
}

function startFpsMeasurement(baseTier: PerformanceTier) {
  if (measurementStarted || measurementFinished || typeof window === "undefined") {
    return
  }
  measurementStarted = true

  let frames = 0
  let measuring = false
  let raf = 0
  let measureStart = 0
  let cancelled = false

  const warmupTimer = window.setTimeout(() => {
    if (cancelled) return
    measuring = true
    measureStart = performance.now()
    frames = 0

    const tick = (now: number) => {
      if (cancelled || !measuring) return
      frames += 1

      if (now - measureStart >= SAMPLE_MS) {
        measuring = false
        measurementFinished = true
        const elapsed = Math.max(1, now - measureStart)
        const avgFps = (frames * 1000) / elapsed

        if (!downgradeApplied && avgFps < MIN_AVG_FPS && baseTier !== "low") {
          downgradeApplied = true
          notify(downgradePerformanceTier(baseTier))
        }
        return
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
  }, WARMUP_MS)

  return () => {
    cancelled = true
    measuring = false
    window.clearTimeout(warmupTimer)
    cancelAnimationFrame(raf)
    // React Strict Mode remounts: allow a fresh measurement if we never finished.
    if (!measurementFinished) {
      measurementStarted = false
    }
  }
}

/**
 * Starts from the detected tier, then downgrades one step once if
 * the average FPS during the first ~2s stays below 40.
 */
export function useAdaptivePerformance(baseTier: PerformanceTier | null): PerformanceTier | null {
  const [effectiveTier, setEffectiveTier] = useState<PerformanceTier | null>(
    () => sharedEffectiveTier ?? baseTier
  )

  useEffect(() => {
    if (!baseTier) return

    if (sharedEffectiveTier === null) {
      notify(baseTier)
    }

    setEffectiveTier(sharedEffectiveTier ?? baseTier)

    const listener = (tier: PerformanceTier) => setEffectiveTier(tier)
    listeners.add(listener)

    const stop = startFpsMeasurement(sharedEffectiveTier ?? baseTier)

    return () => {
      listeners.delete(listener)
      stop?.()
    }
  }, [baseTier])

  return effectiveTier
}
