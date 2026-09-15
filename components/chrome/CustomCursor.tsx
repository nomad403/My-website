"use client"

import { useEffect, useRef, useState } from "react"
import { subscribeDemoPointer } from "@/lib/demo/demo-pointer-store"

export default function CustomCursor() {
  const [isEnabled, setIsEnabled] = useState(true)
  const hRef = useRef<HTMLDivElement>(null)
  const vRef = useRef<HTMLDivElement>(null)
  const xLabelRef = useRef<HTMLDivElement>(null)
  const yLabelRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const demoActiveRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const prefersCoarsePointer =
      window.matchMedia?.("(pointer: coarse)")?.matches ?? false
    setIsEnabled(!prefersCoarsePointer)
    if (prefersCoarsePointer) return

    const applyDom = (x: number, y: number) => {
      const xi = Math.round(x)
      const yi = Math.round(y)
      if (hRef.current) hRef.current.style.top = `${yi}px`
      if (vRef.current) vRef.current.style.left = `${xi}px`
      if (xLabelRef.current) xLabelRef.current.textContent = String(xi)
      if (yLabelRef.current) yLabelRef.current.textContent = String(yi)
    }

    const tick = () => {
      const pos = posRef.current
      const target = targetRef.current
      // En démo : lerp fluide ; souris : presque direct.
      const k = demoActiveRef.current ? 0.16 : 0.55
      pos.x += (target.x - pos.x) * k
      pos.y += (target.y - pos.y) * k
      applyDom(pos.x, pos.y)
      rafRef.current = requestAnimationFrame(tick)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (demoActiveRef.current) return
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const unsubDemo = subscribeDemoPointer((sample) => {
      demoActiveRef.current = sample.active
      if (sample.active) {
        targetRef.current = { x: sample.x, y: sample.y }
      }
    })

    window.addEventListener("mousemove", handleMouseMove)
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      unsubDemo()
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  if (!isEnabled) return null

  return (
    <>
      <div
        ref={hRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: 0,
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "top",
        }}
      >
        <div
          className="border-t w-full relative"
          style={{ borderColor: "#c0c0c0" }}
        >
          <div
            ref={xLabelRef}
            style={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#c0c0c0",
              fontSize: 10,
              fontWeight: 500,
              fontFamily: "var(--font-enigma), ui-monospace, monospace",
            }}
          >
            0
          </div>
        </div>
      </div>
      <div
        ref={vRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          width: 0,
          pointerEvents: "none",
          zIndex: 9999,
          willChange: "left",
        }}
      >
        <div
          className="border-l h-full relative"
          style={{ borderColor: "#808080" }}
        >
          <div
            ref={yLabelRef}
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              color: "#808080",
              fontSize: 10,
              fontWeight: 500,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              fontFamily: "var(--font-enigma), ui-monospace, monospace",
            }}
          >
            0
          </div>
        </div>
      </div>
    </>
  )
}
