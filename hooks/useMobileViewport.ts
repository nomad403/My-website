"use client"

import { useEffect, useState } from "react"
import { MOBILE_VIEWPORT_QUERY } from "@/lib/ui/viewport"

export function useMobileViewport() {
  // Toujours false au SSR + 1er rendu client → évite les mismatches d'hydratation.
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_VIEWPORT_QUERY)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return isMobile
}
