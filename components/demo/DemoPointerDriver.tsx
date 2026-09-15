"use client"

import { useEffect } from "react"
import {
  clearDemoPointer,
  setDemoPointer,
} from "@/lib/demo/demo-pointer-store"

type Props = {
  /** Actif pendant la lecture démo. */
  active: boolean
}

/**
 * Trajectoire continue / fluide du curseur virtuel (jamais de sauts).
 * Lissage interne + phases lentes pour un mouvement « humain ».
 */
export default function DemoPointerDriver({ active }: Props) {
  useEffect(() => {
    if (!active || typeof window === "undefined") {
      clearDemoPointer()
      return
    }

    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(max, v))

    let raf = 0
    let lastTs = performance.now()
    // Position lissée (ce qu’on publie).
    let x = window.innerWidth * 0.5
    let y = window.innerHeight * 0.42
    // Phases continues — pas de reseed brutal.
    const phase = {
      a: Math.random() * Math.PI * 2,
      b: Math.random() * Math.PI * 2,
      c: Math.random() * Math.PI * 2,
      d: Math.random() * Math.PI * 2,
      e: Math.random() * Math.PI * 2,
    }
    // Temps logique (avance même si tab throttle).
    let t = 0

    const sampleTarget = (w: number, h: number, time: number) => {
      const mx = w * 0.12
      const my = h * 0.14
      const cx = w * 0.5
      const cy = h * 0.48
      // Courbes lentes superposées → chemin organique sans rupture.
      const tx =
        cx +
        Math.sin(time * 0.22 + phase.a) * w * 0.28 +
        Math.sin(time * 0.11 + phase.b) * w * 0.14 +
        Math.sin(time * 0.37 + phase.e) * w * 0.06
      const ty =
        cy +
        Math.cos(time * 0.19 + phase.c) * h * 0.24 +
        Math.sin(time * 0.13 + phase.d) * h * 0.12 +
        Math.cos(time * 0.31 + phase.a) * h * 0.05
      return {
        x: clamp(tx, mx, w - mx),
        y: clamp(ty, my, h - my),
      }
    }

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000)
      lastTs = now
      t += dt

      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      const target = sampleTarget(w, h, t)

      // Lerp adaptatif : plus rapide si loin, toujours fluide.
      const dx = target.x - x
      const dy = target.y - y
      const dist = Math.hypot(dx, dy)
      const follow = Math.min(0.14, 0.045 + dist / Math.max(w, h) * 0.2)
      x += dx * follow
      y += dy * follow

      const nx = clamp((x / w) * 2 - 1, -1, 1)
      const ny = clamp(-((y / h) * 2 - 1), -1, 1)

      setDemoPointer({ x, y, nx, ny, active: true })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      clearDemoPointer()
    }
  }, [active])

  return null
}
