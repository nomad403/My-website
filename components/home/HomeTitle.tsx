"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import BrandAsciiTitle from "@/components/home/BrandAsciiTitle"
import {
  HOME_BRAND_FONT_WEIGHT,
  HOME_BRAND_LETTER_SPACING_EM,
  HOME_BRAND_MAX_FONT_PX_DESKTOP,
  HOME_BRAND_MAX_FONT_PX_MOBILE,
  HOME_BRAND_MIN_FONT_PX,
  HOME_BRAND_TEXT,
  HOME_TITLE_LETTER_SPACING_EM,
  HOME_TITLE_LINE_HEIGHT,
  HOME_TITLE_LINE_HEIGHT_MOBILE,
  HOME_TITLE_BRAND_SIZE_RATIO_DESKTOP,
  HOME_TITLE_BRAND_SIZE_RATIO_MOBILE,
  HOME_TITLE_MAX_FONT_PX_DESKTOP,
  HOME_TITLE_MAX_FONT_PX_MOBILE,
  HOME_TITLE_MIN_FONT_PX,
  HOME_TITLE_SHUFFLE_MS,
  HOME_TITLE_STAGGER_MS,
  HOME_TITLE_WIDTH_RATIO,
  HOME_HOVER_HOLD_MS,
} from "@/lib/home/home-title-style"
import { DEMO_HOLD_MS, DEMO_SHUFFLE_MS } from "@/lib/demo/script"
import {
  readHeaderBandLayout,
  type HeaderBandLayout,
} from "@/lib/home/home-header-band"

interface HomeTitleProps {
  lines: string[]
  alternateLines: string[]
  alternateBrandTexts: string[]
  mode: "day" | "night"
  isMobile: boolean
  ready: boolean
  enableHover?: boolean
  /** Token démo : force le shuffle narratif du titre. */
  playToken?: number
}

const BRAND_FONT_FAMILY = '"Electric Blue", ui-sans-serif, system-ui, sans-serif'
const TITLE_FONT_FAMILY = '"Geist Mono", ui-monospace, monospace'
let measureContext: CanvasRenderingContext2D | null = null

function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  letterSpacingEm: number,
) {
  measureContext ??= document.createElement("canvas").getContext("2d")
  if (!measureContext) return text.length * fontSize * (0.6 + letterSpacingEm)
  measureContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return measureContext.measureText(text).width + text.length * letterSpacingEm * fontSize
}

function fitFontSize(
  text: string,
  availableWidth: number,
  maxFontPx: number,
  minFontPx: number,
  fontFamily: string,
  fontWeight: number,
  letterSpacingEm: number,
) {
  if (availableWidth <= 0 || !text) return minFontPx

  let min = minFontPx
  let max = maxFontPx
  let best = min

  while (min <= max) {
    const mid = Math.floor((min + max) / 2)
    if (
      measureTextWidth(text, mid, fontFamily, fontWeight, letterSpacingEm) <=
      availableWidth
    ) {
      best = mid
      min = mid + 1
    } else {
      max = mid - 1
    }
  }

  return best
}

export default function HomeTitle({
  lines,
  alternateLines,
  alternateBrandTexts,
  mode,
  isMobile,
  ready,
  enableHover = true,
  playToken = 0,
}: HomeTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(24)
  const [brandFontSize, setBrandFontSize] = useState(48)
  const [brandScaleX, setBrandScaleX] = useState(1)
  const [layoutReady, setLayoutReady] = useState(false)
  const [headerBand, setHeaderBand] = useState<HeaderBandLayout>({
    left: 0,
    width: 0,
    welcomeWidth: 0,
  })

  const dualLines = useMemo(
    () =>
      lines.map((primary, index) => ({
        primary,
        alternate: alternateLines[index] ?? primary,
      })),
    [lines, alternateLines],
  )

  const maxFontPx = isMobile ? HOME_TITLE_MAX_FONT_PX_MOBILE : HOME_TITLE_MAX_FONT_PX_DESKTOP
  const maxBrandFontPx = isMobile
    ? HOME_BRAND_MAX_FONT_PX_MOBILE
    : HOME_BRAND_MAX_FONT_PX_DESKTOP

  const titleFontWeight = isMobile ? 400 : 300

  const lineStyle = {
    fontSize: `${fontSize}px`,
    fontWeight: titleFontWeight,
    letterSpacing: `${HOME_TITLE_LETTER_SPACING_EM}em`,
    lineHeight: isMobile ? HOME_TITLE_LINE_HEIGHT_MOBILE : HOME_TITLE_LINE_HEIGHT,
    fontSynthesis: "none" as const,
  }

  const titleColorClass = mode === "night" ? "text-white" : "text-black"
  const titleFontClass = isMobile ? "font-home-title-mobile" : "font-home-title"

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || lines.length === 0) return

    const update = () => {
      // The fitted title uses pixels; follow the rem-based UI scale as well.
      const uiScale = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16
      const containerWidth = container.clientWidth
      const layout = readHeaderBandLayout(container, isMobile)
      const logoLeft = layout?.left ?? 0
      // Mobile : toute la largeur utile sous le logo, pour garder exactement 2 lignes nowrap.
      const welcomeWidth = isMobile
        ? Math.max(0, containerWidth - logoLeft)
        : layout?.welcomeWidth ?? containerWidth * HOME_TITLE_WIDTH_RATIO

      const brandWidth = layout?.width ?? containerWidth
      const nextBrandFontSize = fitFontSize(
        HOME_BRAND_TEXT,
        brandWidth,
        Math.floor(maxBrandFontPx * uiScale),
        Math.floor(HOME_BRAND_MIN_FONT_PX * uiScale),
        BRAND_FONT_FAMILY,
        HOME_BRAND_FONT_WEIGHT,
        HOME_BRAND_LETTER_SPACING_EM,
      )
      const naturalBrandWidth = measureTextWidth(
        HOME_BRAND_TEXT,
        nextBrandFontSize,
        BRAND_FONT_FAMILY,
        HOME_BRAND_FONT_WEIGHT,
        HOME_BRAND_LETTER_SPACING_EM,
      )

      const brandRatio = isMobile
        ? HOME_TITLE_BRAND_SIZE_RATIO_MOBILE
        : HOME_TITLE_BRAND_SIZE_RATIO_DESKTOP
      const titleMaxPx = Math.min(
        Math.floor(maxFontPx * uiScale),
        Math.floor(nextBrandFontSize * brandRatio),
      )

      const sizes = [...lines, ...alternateLines].map((line) =>
        fitFontSize(
          line,
          welcomeWidth,
          titleMaxPx,
          Math.floor(HOME_TITLE_MIN_FONT_PX * uiScale),
          TITLE_FONT_FAMILY,
          titleFontWeight,
          HOME_TITLE_LETTER_SPACING_EM,
        ),
      )

      setHeaderBand({
        left: logoLeft,
        width: layout?.width ?? containerWidth,
        welcomeWidth,
      })
      setBrandFontSize(nextBrandFontSize)
      setBrandScaleX(
        naturalBrandWidth > 0 && brandWidth > 0 ? brandWidth / naturalBrandWidth : 1,
      )
      setFontSize(Math.min(...sizes))
    }

    let cancelled = false
    let fontsReady = false
    const updateWhenReady = () => {
      if (!cancelled && fontsReady) update()
    }
    // Fit using the actual fonts before revealing the title. Fallback-font
    // measurements would otherwise move the bottom-aligned block later.
    const fonts = [
      document.fonts.load(`${titleFontWeight} 24px ${TITLE_FONT_FAMILY}`),
      document.fonts.load(`${HOME_BRAND_FONT_WEIGHT} 48px ${BRAND_FONT_FAMILY}`),
    ]
    const reveal = () => {
      if (cancelled) return
      fontsReady = true
      update()
      setLayoutReady(true)
    }
    if (document.fonts.check(`${titleFontWeight} 24px ${TITLE_FONT_FAMILY}`)
      && document.fonts.check(`${HOME_BRAND_FONT_WEIGHT} 48px ${BRAND_FONT_FAMILY}`)) {
      reveal()
    } else {
      setLayoutReady(false)
      void Promise.allSettled(fonts).then(reveal)
    }
    const ro = new ResizeObserver(updateWhenReady)
    ro.observe(container)
    window.addEventListener("resize", updateWhenReady)

    return () => {
      cancelled = true
      ro.disconnect()
      window.removeEventListener("resize", updateWhenReady)
    }
  }, [lines, alternateLines, maxFontPx, maxBrandFontPx, isMobile, titleFontWeight])

  return (
    <div data-capture="home-title" className="pointer-events-auto w-full min-w-0 px-4 md:px-8"
      style={{ visibility: layoutReady ? "visible" : "hidden" }}>
      <div ref={containerRef} className="mx-auto w-full max-w-7xl">
        <div
          className="flex min-w-0 flex-col overflow-hidden"
          style={{
            marginLeft: `${headerBand.left}px`,
            width:
              headerBand.welcomeWidth > 0
                ? `${headerBand.welcomeWidth}px`
                : undefined,
          }}
        >
          <ShuffleDualLines
            lines={dualLines}
            className="w-full max-w-full cursor-default"
            lineClassName={`${titleFontClass} block w-full max-w-full overflow-hidden text-left normal-case whitespace-nowrap ${titleColorClass}`}
            lineStyle={lineStyle}
            lineGapClassName=""
            enableHover={enableHover}
            introShuffle={ready && layoutReady && playToken === 0}
            playToken={playToken}
            holdDurationMs={playToken > 0 ? DEMO_HOLD_MS : HOME_HOVER_HOLD_MS}
            shuffleDurationMs={playToken > 0 ? DEMO_SHUFFLE_MS : HOME_TITLE_SHUFFLE_MS}
            lineStaggerMs={playToken > 0 ? 0 : HOME_TITLE_STAGGER_MS}
          />
        </div>
        <BrandAsciiTitle
          text={HOME_BRAND_TEXT}
          alternateTexts={alternateBrandTexts}
          mode={mode}
          enabled={ready && layoutReady && !isMobile}
          marginLeft={headerBand.left}
          fontSize={brandFontSize}
          scaleX={brandScaleX}
        />
      </div>
    </div>
  )
}
