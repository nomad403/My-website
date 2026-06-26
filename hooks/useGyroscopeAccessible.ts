"use client"

import { useEffect, useState } from "react"

const GYRO_HINT_SHOWN_KEY = "nomad403-gyro-hint-shown"

export function wasGyroHintShown() {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(GYRO_HINT_SHOWN_KEY) === "1"
}

export function markGyroHintShown() {
  if (typeof window === "undefined") return
  sessionStorage.setItem(GYRO_HINT_SHOWN_KEY, "1")
}

export function useGyroscopeAccessible(isMobile: boolean) {
  const [accessible, setAccessible] = useState(false)

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return

    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false
    if (!coarse) return

    const deviceOrientationCtor = (window as Record<string, any>)
      .DeviceOrientationEvent as (typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>
    }) | undefined
    if (!deviceOrientationCtor) return

    let resolved = false
    const markReady = () => {
      if (resolved) return
      resolved = true
      setAccessible(true)
    }

    const handleOrientation = () => {
      markReady()
      window.removeEventListener("deviceorientation", handleOrientation, true)
    }

    window.addEventListener("deviceorientation", handleOrientation, true)

    if (typeof deviceOrientationCtor.requestPermission !== "function") {
      const fallback = window.setTimeout(markReady, 400)
      return () => {
        window.clearTimeout(fallback)
        window.removeEventListener("deviceorientation", handleOrientation, true)
      }
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true)
    }
  }, [isMobile])

  return accessible
}
