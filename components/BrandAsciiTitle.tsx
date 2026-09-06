"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  HOME_BRAND_FONT_WEIGHT,
  HOME_BRAND_LETTER_SPACING_EM,
  HOME_BRAND_LINE_HEIGHT,
  HOME_BRAND_SHUFFLE_MS,
  HOME_HOVER_HOLD_MS,
} from "@/lib/home-title-style"
import { runShuffleTransition } from "@/lib/shuffle-text-animation"
import { asciiGridToLevelGrid, type AsciiLevelGrid } from "@/lib/ascii-variation"
import {
  drawAsciiFrame,
  drawAsciiTextGrid,
  getRasterOptionsFromElement,
  rasterTextToAsciiGrid,
  type RasterTextOptions,
  type AsciiTextGrid,
} from "@/lib/raster-text-ascii"

const ASCII_CELL_PX = 5
const HOVER_RADIUS_PX = 88
const HOVER_FALLOFF = 0.55
const ASCII_ANIM_INTERVAL_MS = 90
const BRAND_SHUFFLE_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

interface BrandAsciiTitleProps {
  text: string
  alternateTexts: string[]
  mode: "day" | "night"
  enabled: boolean
  marginLeft: number
  fontSize: number
  scaleX: number
}

interface LocalPointer {
  x: number
  y: number
  radiusX: number
  radiusY: number
}

function toLocalPointer(
  clientX: number,
  clientY: number,
  contentRect: DOMRect,
  scaleX: number,
): LocalPointer {
  const safeScaleX = scaleX > 0 ? scaleX : 1
  const visualX = clientX - contentRect.left
  const visualY = clientY - contentRect.top

  return {
    x: visualX / safeScaleX,
    y: visualY,
    radiusX: HOVER_RADIUS_PX / safeScaleX,
    radiusY: HOVER_RADIUS_PX,
  }
}

function hoverZoneMask(pointer: LocalPointer, invert: boolean): string {
  const inner = `${HOVER_FALLOFF * 100}%`
  const at = `${pointer.x}px ${pointer.y}px`
  const size = `${pointer.radiusX}px ${pointer.radiusY}px`
  return invert
    ? `radial-gradient(ellipse ${size} at ${at}, transparent ${inner}, black 100%)`
    : `radial-gradient(ellipse ${size} at ${at}, black ${inner}, transparent 100%)`
}

function applyMask(el: HTMLElement | null, mask: string) {
  if (!el) return
  el.style.maskImage = mask
  el.style.webkitMaskImage = mask
}

function clearMask(el: HTMLElement | null) {
  if (!el) return
  el.style.maskImage = ""
  el.style.webkitMaskImage = ""
}

export default function BrandAsciiTitle({
  text,
  alternateTexts,
  mode,
  enabled,
  marginLeft,
  fontSize,
  scaleX,
}: BrandAsciiTitleProps) {
  const hitRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const visibleTextRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelGridRef = useRef<AsciiLevelGrid | null>(null)
  const textGridRef = useRef<AsciiTextGrid | null>(null)
  const rasterOptionsRef = useRef<RasterTextOptions | null>(null)
  const isShufflingRef = useRef(false)
  const layoutRef = useRef({ width: 0, height: 0 })
  const hoveringRef = useRef(false)
  const animTickRef = useRef(0)
  const animLoopRef = useRef(0)
  const lastAnimRef = useRef(0)
  const reducedMotionRef = useRef(false)
  const busyRef = useRef(false)
  const holdTimerRef = useRef<number | null>(null)
  const cancelTransitionRef = useRef<(() => void) | null>(null)
  const sequenceTokenRef = useRef(0)
  const textRef_value = useRef(text)
  const alternateTextsRef = useRef(alternateTexts)
  const [displayText, setDisplayText] = useState(text)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  textRef_value.current = text
  alternateTextsRef.current = alternateTexts

  const [layout, setLayout] = useState({ width: 0, height: 0 })

  const titleColorClass = mode === "night" ? "text-white" : "text-black"
  const asciiColor = mode === "night" ? "#ffffff" : "#000000"
  const visualWidth = layout.width > 0 ? layout.width * scaleX : undefined
  const visualHeight = layout.height

  const syncCanvasSize = (width: number, height: number) => {
    const canvas = canvasRef.current
    if (!canvas || width <= 0 || height <= 0) return
    canvas.width = width
    canvas.height = height
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }

  const rebuildAsciiGrid = (sourceText: string = text) => {
    const textEl = textRef.current
    if (!textEl || !enabled) return

    const options = getRasterOptionsFromElement(textEl, sourceText, ASCII_CELL_PX)
    if (!options) return

    rasterOptionsRef.current = { ...options, text }

    const grid = rasterTextToAsciiGrid({ ...options, text: sourceText })
    if (!grid) return

    textGridRef.current = grid
    levelGridRef.current = asciiGridToLevelGrid(grid)
    layoutRef.current = { width: grid.widthPx, height: grid.heightPx }
    setLayout({ width: grid.widthPx, height: grid.heightPx })
    syncCanvasSize(grid.widthPx, grid.heightPx)

    const ctx = canvasRef.current?.getContext("2d")
    if (ctx && textGridRef.current) {
      drawAsciiTextGrid(ctx, textGridRef.current, grid.widthPx, grid.heightPx, asciiColor)
    }
  }

  const redrawAsciiCanvas = (tick = animTickRef.current) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const { width, height } = layoutRef.current
    if (!ctx || width <= 0 || height <= 0) return

    if (isShufflingRef.current && textGridRef.current) {
      drawAsciiTextGrid(ctx, textGridRef.current, width, height, asciiColor)
      return
    }

    const grid = levelGridRef.current
    if (grid) {
      drawAsciiFrame(ctx, grid, tick, width, height, asciiColor)
    }
  }

  const syncAsciiToShuffle = (nextDisplayText: string, isShuffling: boolean) => {
    isShufflingRef.current = isShuffling
    const options = rasterOptionsRef.current
    if (!options || !enabled) return

    const grid = rasterTextToAsciiGrid({ ...options, text: nextDisplayText })
    if (!grid) return

    textGridRef.current = grid
    if (!isShuffling) {
      levelGridRef.current = asciiGridToLevelGrid(grid)
    }

    if (hoveringRef.current) {
      redrawAsciiCanvas()
    }
  }

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const cancelTransition = () => {
    cancelTransitionRef.current?.()
    cancelTransitionRef.current = null
  }

  const transitionText = useCallback(
    (from: string, to: string) =>
      new Promise<void>((resolve) => {
        cancelTransition()
        cancelTransitionRef.current = runShuffleTransition(from, to, {
          totalDuration: HOME_BRAND_SHUFFLE_MS,
          shuffleChars: BRAND_SHUFFLE_CHARS,
          onUpdate: (value) => {
            setDisplayText(value)
            syncAsciiToShuffle(value, true)
          },
          onComplete: () => {
            setDisplayText(to)
            syncAsciiToShuffle(to, false)
            cancelTransitionRef.current = null
            resolve()
          },
        })
      }),
    [enabled],
  )

  const runHoverSequence = useCallback(async () => {
    if (busyRef.current || prefersReducedMotion) return

    busyRef.current = true
    const token = ++sequenceTokenRef.current
    const primary = textRef_value.current
    const words = alternateTextsRef.current.filter((word) => word.trim().length > 0)
    const holdPerWord = Math.max(900, Math.round(HOME_HOVER_HOLD_MS * 0.55))

    clearHoldTimer()
    cancelTransition()

    if (words.length === 0) {
      busyRef.current = false
      return
    }

    let from = primary
    for (const word of words) {
      await transitionText(from, word)
      if (token !== sequenceTokenRef.current) return

      await new Promise<void>((resolve) => {
        holdTimerRef.current = window.setTimeout(() => {
          holdTimerRef.current = null
          resolve()
        }, holdPerWord)
      })
      if (token !== sequenceTokenRef.current) return
      from = word
    }

    await transitionText(from, primary)
    if (token !== sequenceTokenRef.current) return

    busyRef.current = false
    setDisplayText(primary)
    rebuildAsciiGrid(primary)
  }, [prefersReducedMotion, transitionText])

  useEffect(() => {
    if (busyRef.current) return
    setDisplayText(text)
  }, [text])

  useEffect(
    () => () => {
      clearHoldTimer()
      cancelTransition()
    },
    [],
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    reducedMotionRef.current = reduced
    setPrefersReducedMotion(reduced)
  }, [])

  useLayoutEffect(() => {
    if (!enabled || fontSize <= 0) {
      levelGridRef.current = null
      setLayout({ width: 0, height: 0 })
      return
    }

    let cancelled = false

    const build = async () => {
      await document.fonts.ready
      if (cancelled) return
      rebuildAsciiGrid()
    }

    build()
    return () => {
      cancelled = true
    }
  }, [enabled, text, fontSize, scaleX, mode])

  const stopAnimLoop = () => {
    if (animLoopRef.current) {
      window.cancelAnimationFrame(animLoopRef.current)
      animLoopRef.current = 0
    }
  }

  const startAnimLoop = () => {
    if (animLoopRef.current || reducedMotionRef.current) return

    const loop = (time: number) => {
      if (!hoveringRef.current) {
        stopAnimLoop()
        return
      }

      if (time - lastAnimRef.current >= ASCII_ANIM_INTERVAL_MS) {
        if (!isShufflingRef.current) {
          animTickRef.current += 1
          redrawAsciiCanvas(animTickRef.current)
        }
        lastAnimRef.current = time
      }

      animLoopRef.current = window.requestAnimationFrame(loop)
    }

    animLoopRef.current = window.requestAnimationFrame(loop)
  }

  useEffect(() => () => stopAnimLoop(), [])

  const updateHoverMasks = (pointer: LocalPointer) => {
    const forward = hoverZoneMask(pointer, false)
    const inverse = hoverZoneMask(pointer, true)
    applyMask(visibleTextRef.current, inverse)
    applyMask(canvasRef.current, forward)
  }

  const handlePointerEnter = () => {
    void runHoverSequence()
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || !contentRef.current || !levelGridRef.current) return

    const pointer = toLocalPointer(
      event.clientX,
      event.clientY,
      contentRef.current.getBoundingClientRect(),
      scaleX,
    )

    hoveringRef.current = true
    updateHoverMasks(pointer)
    if (canvasRef.current) canvasRef.current.style.visibility = "visible"
    redrawAsciiCanvas()
    startAnimLoop()
  }

  const handlePointerLeave = () => {
    hoveringRef.current = false
    stopAnimLoop()
    clearMask(visibleTextRef.current)
    if (canvasRef.current) {
      clearMask(canvasRef.current)
      canvasRef.current.style.visibility = "hidden"
    }
    animTickRef.current = 0
    lastAnimRef.current = 0
    if (!busyRef.current) {
      isShufflingRef.current = false
      rebuildAsciiGrid(text)
      setDisplayText(text)
    }
  }

  return (
    <div className="mt-4 md:mt-6" style={{ marginLeft: `${marginLeft}px` }}>
      <div
        ref={hitRef}
        className="relative cursor-crosshair select-none"
        style={{
          width: visualWidth ? `${visualWidth}px` : undefined,
          height: visualHeight ? `${visualHeight}px` : undefined,
        }}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 inline-block origin-left"
          style={{ transform: `scaleX(${scaleX})` }}
        >
          <p
            className={`font-electric-blue relative m-0 text-left lowercase ${titleColorClass}`}
            style={{
              fontSize: `${fontSize}px`,
              letterSpacing: `${HOME_BRAND_LETTER_SPACING_EM}em`,
              lineHeight: HOME_BRAND_LINE_HEIGHT,
              fontWeight: HOME_BRAND_FONT_WEIGHT,
              fontSynthesis: "none",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            <span
              ref={textRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 opacity-0"
            >
              {text}
            </span>
            <span
              ref={visibleTextRef}
              className="relative block"
            >
              {displayText}
            </span>
          </p>

          <canvas
            ref={canvasRef}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-[1]"
            style={{ visibility: "hidden", contain: "strict" }}
          />
        </div>
      </div>
    </div>
  )
}
