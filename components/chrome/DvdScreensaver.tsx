"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { ASCII_LUMINANCE_GRADIENT } from "@/lib/ascii/ascii-gradient"
import {
  asciiGridToLevelGrid,
  type AsciiLevelGrid,
} from "@/lib/ascii/ascii-variation"
import { rasterTextToAsciiGrid } from "@/lib/ascii/raster-text-ascii"
import { HOME_BRAND_FONT_WEIGHT } from "@/lib/home/home-title-style"
import { subscribeDemoPointer } from "@/lib/demo/demo-pointer-store"

/** Palette site — lisible sur fond blanc. */
const SITE_COLORS = [
  "#ff0000",
  "#00e5ff",
  "#ff00aa",
  "#00ff88",
  "#ff6b00",
  "#111111",
] as const

const IDLE_MS = 60_000
const BRAND = "nomad403"
const FONT_FAMILY = '"Electric Blue", ui-sans-serif, system-ui, sans-serif'
const SPEED_PX_S = 132
const ASCII_CELL_PX = 4
const COLOR_BLEND_MS = 640
/** Propagation de l’onde à travers le glyph (px/s). */
const WAVE_SPEED = 420
/** Largeur du front (px) — plus petit = plus pointu. */
const WAVE_SIGMA = 11
/** Amplitude de déformation max (px). */
const WAVE_AMP = 15
const WAVE_LIFE_MS = 900
const CELL_DRAW = 9

type Ripple = {
  /** Origine locale dans le glyph (px). */
  ox: number
  oy: number
  born: number
}

type ColorBlend = {
  from: string
  to: string
  start: number
}

type InkCell = {
  col: number
  row: number
  level: number
  x: number
  y: number
}

function pickNextColor(current: string) {
  let next = current
  while (next === current) {
    next = SITE_COLORS[Math.floor(Math.random() * SITE_COLORS.length)]!
  }
  return next
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "")
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h
  const n = Number.parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function parseColor(input: string) {
  if (input.startsWith("#")) return hexToRgb(input)
  const m = input.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) }
  return hexToRgb("#111111")
}

function lerpColor(from: string, to: string, t: number) {
  const a = parseColor(from)
  const b = parseColor(to)
  const k = Math.max(0, Math.min(1, t))
  return `rgb(${Math.round(a.r + (b.r - a.r) * k)}, ${Math.round(a.g + (b.g - a.g) * k)}, ${Math.round(a.b + (b.b - a.b) * k)})`
}

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3
}

function buildBrandAscii(fontSize: number): AsciiLevelGrid | null {
  const letterSpacingPx = Math.round(fontSize * -0.02)
  const widthPx = Math.ceil(fontSize * BRAND.length * 0.64 + fontSize * 0.45)
  const heightPx = Math.ceil(fontSize * 1.1)
  const grid = rasterTextToAsciiGrid({
    text: BRAND,
    fontSize,
    fontWeight: HOME_BRAND_FONT_WEIGHT,
    fontFamily: FONT_FAMILY,
    letterSpacingPx,
    widthPx,
    heightPx,
    textOffsetX: Math.round(fontSize * 0.06),
    textOffsetY: Math.round(fontSize * 0.05),
    cellPx: ASCII_CELL_PX,
  })
  if (!grid) return null
  return asciiGridToLevelGrid(grid)
}

function gridToInk(grid: AsciiLevelGrid): {
  cells: InkCell[]
  w: number
  h: number
} {
  const { cols, rows, levels } = grid
  let minCol = cols
  let maxCol = -1
  let minRow = rows
  let maxRow = -1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const level = levels[row * cols + col] ?? 0
      if (level < 2) continue
      if (col < minCol) minCol = col
      if (col > maxCol) maxCol = col
      if (row < minRow) minRow = row
      if (row > maxRow) maxRow = row
    }
  }

  if (maxCol < minCol || maxRow < minRow) {
    return { cells: [], w: CELL_DRAW, h: CELL_DRAW }
  }

  const cells: InkCell[] = []
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const level = levels[row * cols + col] ?? 0
      if (level < 2) continue
      const localCol = col - minCol
      const localRow = row - minRow
      cells.push({
        col: localCol,
        row: localRow,
        level,
        x: localCol * CELL_DRAW + CELL_DRAW * 0.5,
        y: localRow * CELL_DRAW + CELL_DRAW * 0.5,
      })
    }
  }

  // Boîte serrée sur l’encre réelle (+ marge onde pour ne pas clipper).
  const pad = WAVE_AMP + CELL_DRAW
  const contentW = (maxCol - minCol + 1) * CELL_DRAW
  const contentH = (maxRow - minRow + 1) * CELL_DRAW
  const originX = pad * 0.5
  const originY = pad * 0.5

  for (const cell of cells) {
    cell.x += originX
    cell.y += originY
  }

  return {
    cells,
    w: contentW + pad,
    h: contentH + pad,
  }
}

/**
 * Front d’onde radial : déplace chaque cellule le long de la normale,
 * avec une crête étroite (sigma) pour un rendu pointu.
 */
function sampleRipples(
  x: number,
  y: number,
  ripples: Ripple[],
  now: number,
): { dx: number; dy: number; energy: number } {
  let dx = 0
  let dy = 0
  let energy = 0

  for (const ripple of ripples) {
    const age = (now - ripple.born) / 1000
    if (age < 0 || age * 1000 > WAVE_LIFE_MS) continue

    const life = Math.exp(-age / (WAVE_LIFE_MS / 1000 / 2.1))
    const radius = age * WAVE_SPEED
    const vx = x - ripple.ox
    const vy = y - ripple.oy
    const dist = Math.hypot(vx, vy)
    const nx = dist > 0.001 ? vx / dist : 0
    const ny = dist > 0.001 ? vy / dist : 0

    const front = dist - radius
    const envelope = Math.exp(-(front * front) / (2 * WAVE_SIGMA * WAVE_SIGMA))
    // Légère oscillation secondaire pour le grain ASCII, très contenue.
    const grain = 1 + Math.sin(dist * 0.22 - age * 14) * 0.12
    const impulse = envelope * life * grain

    dx += nx * impulse * WAVE_AMP
    dy += ny * impulse * WAVE_AMP
    energy += impulse
  }

  return { dx, dy, energy: Math.min(1.6, energy) }
}

function glyphChar(level: number, col: number, row: number, tick: number, energy: number) {
  const levelsMax = ASCII_LUMINANCE_GRADIENT.length - 1
  const phase = col * 0.73 + row * 1.09
  const t = tick * 0.38 + phase
  const mix =
    Math.sin(t) * 0.35 + Math.sin(t * 1.27 + phase) * 0.28 + energy * 0.9
  const spread = 1 + Math.round(energy * 2.2)
  const index = Math.max(
    0,
    Math.min(levelsMax, level + Math.round(mix * spread)),
  )
  return ASCII_LUMINANCE_GRADIENT[index] ?? "@"
}

/**
 * Écran de veille DVD — fond blanc, glyph ASCII déformé
 * par une onde de choc générative à chaque collision.
 */
export default function DvdScreensaver() {
  const pathname = usePathname()
  const disabled = pathname?.startsWith("/demo") ?? false

  const [active, setActive] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const inkRef = useRef<InkCell[]>([])
  const glyphSizeRef = useRef({ w: 0, h: 0 })
  const colorRef = useRef<string>(SITE_COLORS[1]!)
  const targetColorRef = useRef<string>(SITE_COLORS[1]!)
  const blendRef = useRef<ColorBlend | null>(null)
  const ripplesRef = useRef<Ripple[]>([])
  const posRef = useRef({ x: 40, y: 40, vx: SPEED_PX_S, vy: SPEED_PX_S * 0.82 })
  const rafRef = useRef(0)
  const idleTimerRef = useRef(0)
  const lastTsRef = useRef(0)
  const tickRef = useRef(0)

  useEffect(() => {
    if (disabled) {
      setActive(false)
      return
    }

    const clearIdle = () => window.clearTimeout(idleTimerRef.current)
    const armIdle = () => {
      clearIdle()
      idleTimerRef.current = window.setTimeout(() => setActive(true), IDLE_MS)
    }
    const onActivity = () => {
      setActive(false)
      armIdle()
    }

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
      "scroll",
    ]
    for (const type of events) {
      window.addEventListener(type, onActivity, { passive: true })
    }
    const unsubDemo = subscribeDemoPointer((sample) => {
      if (sample.active) onActivity()
    })
    armIdle()

    return () => {
      clearIdle()
      for (const type of events) window.removeEventListener(type, onActivity)
      unsubDemo()
    }
  }, [disabled])

  useEffect(() => {
    if (!active || disabled) {
      cancelAnimationFrame(rafRef.current)
      ripplesRef.current = []
      return
    }

    let cancelled = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const boot = async () => {
      const fontSize = Math.min(
        110,
        Math.max(44, Math.round(window.innerWidth * 0.09)),
      )
      try {
        await document.fonts.load(
          `${HOME_BRAND_FONT_WEIGHT} ${fontSize}px "Electric Blue"`,
        )
      } catch {
        /* ignore */
      }
      if (cancelled) return

      const grid = buildBrandAscii(fontSize)
      const packed = grid
        ? gridToInk(grid)
        : { cells: [] as InkCell[], w: CELL_DRAW * 8, h: CELL_DRAW * 3 }
      inkRef.current = packed.cells
      glyphSizeRef.current = { w: packed.w, h: packed.h }

      const start = pickNextColor("#ffffff")
      colorRef.current = start
      targetColorRef.current = start
      blendRef.current = null
      ripplesRef.current = []

      const dirX = Math.random() > 0.5 ? 1 : -1
      const dirY = Math.random() > 0.5 ? 1 : -1
      posRef.current = {
        x: 32 + Math.random() * 60,
        y: 32 + Math.random() * 60,
        vx: SPEED_PX_S * dirX,
        vy: SPEED_PX_S * 0.82 * dirY,
      }
      lastTsRef.current = performance.now()
      tickRef.current = 0

      const dpr = Math.min(2, window.devicePixelRatio || 1)

      const spawnRipple = (edge: "left" | "right" | "top" | "bottom") => {
        const { w, h } = glyphSizeRef.current
        const now = performance.now()
        let ox = w * 0.5
        let oy = h * 0.5
        if (edge === "left") {
          ox = 0
          oy = h * 0.5
        } else if (edge === "right") {
          ox = w
          oy = h * 0.5
        } else if (edge === "top") {
          ox = w * 0.5
          oy = 0
        } else {
          ox = w * 0.5
          oy = h
        }
        ripplesRef.current.push({ ox, oy, born: now })
        if (ripplesRef.current.length > 3) {
          ripplesRef.current = ripplesRef.current.slice(-3)
        }
      }

      const hit = (
        edge: "left" | "right" | "top" | "bottom",
        corner?: { ox: number; oy: number },
      ) => {
        const next = pickNextColor(targetColorRef.current)
        targetColorRef.current = next
        blendRef.current = {
          from: colorRef.current,
          to: next,
          start: performance.now(),
        }
        if (corner) {
          ripplesRef.current.push({ ...corner, born: performance.now() })
          if (ripplesRef.current.length > 3) {
            ripplesRef.current = ripplesRef.current.slice(-3)
          }
        } else {
          spawnRipple(edge)
        }
      }

      const step = (now: number) => {
        if (cancelled) return
        const dt = Math.min(0.05, (now - lastTsRef.current) / 1000)
        lastTsRef.current = now
        tickRef.current += dt * 60

        ripplesRef.current = ripplesRef.current.filter(
          (r) => now - r.born < WAVE_LIFE_MS,
        )

        const blend = blendRef.current
        if (blend) {
          const t = (now - blend.start) / COLOR_BLEND_MS
          if (t >= 1) {
            colorRef.current = blend.to
            blendRef.current = null
          } else {
            colorRef.current = lerpColor(
              blend.from,
              blend.to,
              easeOutCubic(t),
            )
          }
        }

        const vw = window.visualViewport?.width ?? window.innerWidth
        const vh = window.visualViewport?.height ?? window.innerHeight
        const { w, h } = glyphSizeRef.current
        const maxX = Math.max(0, vw - w)
        const maxY = Math.max(0, vh - h)
        let { x, y, vx, vy } = posRef.current

        x += vx * dt
        y += vy * dt

        let hitX = false
        let hitY = false
        let edgeX: "left" | "right" | null = null
        let edgeY: "top" | "bottom" | null = null

        if (x <= 0) {
          x = 0
          vx = Math.abs(vx)
          hitX = true
          edgeX = "left"
        } else if (x >= maxX) {
          x = maxX
          vx = -Math.abs(vx)
          hitX = true
          edgeX = "right"
        }
        if (y <= 0) {
          y = 0
          vy = Math.abs(vy)
          hitY = true
          edgeY = "top"
        } else if (y >= maxY) {
          y = maxY
          vy = -Math.abs(vy)
          hitY = true
          edgeY = "bottom"
        }

        if (hitX && hitY && edgeX && edgeY) {
          hit(edgeX, {
            ox: edgeX === "left" ? 0 : w,
            oy: edgeY === "top" ? 0 : h,
          })
        } else if (hitX && edgeX) {
          hit(edgeX)
        } else if (hitY && edgeY) {
          hit(edgeY)
        }

        posRef.current = { x, y, vx, vy }

        if (
          canvas.width !== Math.floor(vw * dpr) ||
          canvas.height !== Math.floor(vh * dpr)
        ) {
          canvas.width = Math.floor(vw * dpr)
          canvas.height = Math.floor(vh * dpr)
          canvas.style.width = `${vw}px`
          canvas.style.height = `${vh}px`
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, vw, vh)
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, vw, vh)

        ctx.font = `700 ${CELL_DRAW + 1}px "Geist Mono", ui-monospace, monospace`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = colorRef.current

        const ripples = ripplesRef.current
        const tick = tickRef.current

        for (const cell of inkRef.current) {
          const { dx, dy, energy } = sampleRipples(cell.x, cell.y, ripples, now)
          const px = x + cell.x + dx
          const py = y + cell.y + dy
          const ch = glyphChar(cell.level, cell.col, cell.row, tick, energy)
          ctx.globalAlpha = energy > 0.08 ? Math.min(1, 0.72 + energy * 0.35) : 0.92
          ctx.fillText(ch, px, py)
        }
        ctx.globalAlpha = 1

        rafRef.current = requestAnimationFrame(step)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    void boot()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
    }
  }, [active, disabled])

  if (!active || disabled) return null

  return (
    <canvas
      ref={canvasRef}
      role="presentation"
      aria-hidden
      className="fixed inset-0 z-[10000]"
      style={{ cursor: "none", background: "#ffffff" }}
    />
  )
}
