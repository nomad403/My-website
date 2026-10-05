"use client"

import { useEffect, useRef } from "react"
import { createAsciiGpuPass, type AsciiGpuSource, type AsciiGpuOptions } from "@/lib/ascii/ascii-gpu-pass"
import { VIEWPORT_BLEED_PX } from "@/lib/ascii/viewport-bleed"

interface Props extends Omit<AsciiGpuOptions, "cols" | "rows"> {
  source: AsciiGpuSource
  onReady: (ready: boolean) => void
  onError: () => void
}

export default function AsciiGpuOverlay({ source, onReady, onError, ...options }: Props) {
  const pass = useRef<ReturnType<typeof createAsciiGpuPass> | null>(null)
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    const rebuild = () => {
      pass.current?.dispose()
      pass.current = null
      const bleed = VIEWPORT_BLEED_PX * 2
      const probe = document.createElement("canvas").getContext("2d")
      if (!probe) { onError(); return }
      probe.font = `${options.fontPx}px Consolas, Monaco, "Liberation Mono", monospace`
      const charWidth = Math.max(options.fontPx * 0.6,
        (probe.measureText("M").width + probe.measureText("W").width) / 2)
      try {
        const next = createAsciiGpuPass(source, {
          ...latest.current,
          cols: Math.ceil((window.innerWidth + bleed) / charWidth),
          rows: Math.ceil((window.innerHeight + bleed) / options.fontPx),
        })
        pass.current = next
        try {
          next.prepare()
          onReady(true)
        } catch (error) {
          next.dispose()
          pass.current = null
          throw error
        }
      } catch (error) {
        console.warn("ASCII GPU unavailable; using CPU fallback", error)
        onError()
      }
    }
    rebuild()
    // Match the library's resize debounce; don't allocate targets per event.
    let timer: ReturnType<typeof setTimeout> | undefined
    const resize = () => {
      clearTimeout(timer)
      timer = setTimeout(rebuild, 120)
    }
    window.addEventListener("resize", resize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", resize)
      pass.current?.dispose()
      pass.current = null
      onReady(false)
    }
  }, [source, options.fontPx, onReady, onError])

  useEffect(() => { pass.current?.update(options) }, [options.color, options.opacity, options.visible, options.invert, options.mode])
  return null
}
