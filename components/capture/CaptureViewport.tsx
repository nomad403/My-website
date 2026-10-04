"use client"

import { useEffect, useState } from "react"
import { CAPTURE_CONFIG } from "@/lib/capture/config"

type Viewport = { width: number; height: number }

function readViewport(): Viewport {
  return { width: window.innerWidth, height: window.innerHeight }
}

/**
 * Keeps the application in a real 1080 × 1920 browsing context, then scales
 * that context as one composited layer. This makes CSS/JS media queries,
 * fixed elements and viewport units all resolve against the design viewport.
 */
export default function CaptureViewport() {
  const [viewport, setViewport] = useState<Viewport | null>(null)

  useEffect(() => {
    const update = () => setViewport(readViewport())
    update()
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
    }
  }, [])

  const width = viewport?.width ?? CAPTURE_CONFIG.baseWidth
  const height = viewport?.height ?? CAPTURE_CONFIG.baseHeight
  const scale = Math.min(
    width / CAPTURE_CONFIG.baseWidth,
    height / CAPTURE_CONFIG.baseHeight,
  )
  const frameUrl = new URL(window.location.href)
  frameUrl.searchParams.set("capture", "frame")
  frameUrl.searchParams.set("captureScale", String(scale))

  return (
    <main className="capture-viewport" aria-label="Capture viewport">
      <iframe
        key={frameUrl.href}
        className="capture-viewport__frame"
        src={frameUrl.href}
        title="Nomad403 capture composition"
        style={{
          width: CAPTURE_CONFIG.baseWidth,
          height: CAPTURE_CONFIG.baseHeight,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      />
    </main>
  )
}
