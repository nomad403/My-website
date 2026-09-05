"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import ShuffleDualLines from "@/components/ShuffleDualLines"
import BrandAsciiTitle from "@/components/BrandAsciiTitle"
import {
  HOME_BRAND_FONT_WEIGHT,
  HOME_BRAND_LETTER_SPACING_EM,
  HOME_BRAND_LINE_HEIGHT,
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
} from "@/lib/home-title-style"
import {
  readHeaderBandLayout,
  type HeaderBandLayout,
} from "@/lib/home-header-band"

interface HomeTitleProps {
  lines: string[]
  alternateLines: string[]
  alternateBrandText: string
  mode: "day" | "night"
  isMobile: boolean
  ready: boolean
}

const BRAND_FONT_FAMILY = '"Electric Blue", ui-sans-serif, system-ui, sans-serif'
const TITLE_FONT_FAMILY = '"Geist Mono", ui-monospace, monospace'

function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  letterSpacingEm: number,
) {
  const probe = document.createElement("span")
  probe.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-family: ${fontFamily};
    font-weight: ${fontWeight};
    font-synthesis: none;
    letter-spacing: ${letterSpacingEm}em;
    font-size: ${fontSize}px;
  `
  probe.textContent = text
  document.body.appendChild(probe)
  const width = probe.offsetWidth
  document.body.removeChild(probe)
  return width
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
  alternateBrandText,
  mode,
  isMobile,
  ready,
}: HomeTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(24)
  const [brandFontSize, setBrandFontSize] = useState(48)
  const [brandScaleX, setBrandScaleX] = useState(1)
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

  const lineStyle = {
    fontSize: `${fontSize}px`,
    letterSpacing: `${HOME_TITLE_LETTER_SPACING_EM}em`,
    lineHeight: isMobile ? HOME_TITLE_LINE_HEIGHT_MOBILE : HOME_TITLE_LINE_HEIGHT,
    fontSynthesis: "none" as const,
  }

  const titleColorClass = mode === "night" ? "text-white" : "text-black"

  useEffect(() => {
    const container = containerRef.current
    if (!container || lines.length === 0) return

    const update = () => {
      const containerWidth = container.clientWidth
      const layout = readHeaderBandLayout(container, isMobile)
      const welcomeWidth = layout?.welcomeWidth ?? containerWidth * HOME_TITLE_WIDTH_RATIO

      const brandWidth = layout?.width ?? containerWidth
      const nextBrandFontSize = fitFontSize(
        HOME_BRAND_TEXT,
        brandWidth,
        maxBrandFontPx,
        HOME_BRAND_MIN_FONT_PX,
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
        maxFontPx,
        Math.floor(nextBrandFontSize * brandRatio),
      )

      const sizes = [...lines, ...alternateLines].map((line) =>
        fitFontSize(
          line,
          welcomeWidth,
          titleMaxPx,
          HOME_TITLE_MIN_FONT_PX,
          TITLE_FONT_FAMILY,
          400,
          HOME_TITLE_LETTER_SPACING_EM,
        ),
      )

      setHeaderBand(
        layout ?? {
          left: 0,
          width: containerWidth,
          welcomeWidth,
        },
      )
      setBrandFontSize(nextBrandFontSize)
      setBrandScaleX(
        naturalBrandWidth > 0 && brandWidth > 0 ? brandWidth / naturalBrandWidth : 1,
      )
      setFontSize(Math.min(...sizes))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    window.addEventListener("resize", update)

    return () => {
      ro.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [lines, alternateLines, maxFontPx, maxBrandFontPx, isMobile])

  return (
    <div className="pointer-events-auto w-full min-w-0 px-4 md:px-8">
      <div ref={containerRef} className="mx-auto w-full max-w-7xl">
        <div
          className="flex min-w-0 flex-col"
          style={{
            marginLeft: `${headerBand.left}px`,
            width:
              headerBand.welcomeWidth > 0
                ? `${headerBand.welcomeWidth}px`
                : undefined,
          }}
        >
          <ShuffleDualLines
            key={[...dualLines.map((line) => line.primary), ...dualLines.map((line) => line.alternate)].join("|")}
            lines={dualLines}
            className="w-full cursor-default"
            lineClassName={`font-home-title w-full text-left normal-case ${titleColorClass}`}
            lineStyle={lineStyle}
            lineGapClassName=""
            enableHover
            introShuffle={ready}
            holdDurationMs={HOME_HOVER_HOLD_MS}
            shuffleDurationMs={HOME_TITLE_SHUFFLE_MS}
            lineStaggerMs={HOME_TITLE_STAGGER_MS}
          />
        </div>
        <BrandAsciiTitle
          text={HOME_BRAND_TEXT}
          alternateText={alternateBrandText}
          mode={mode}
          enabled={ready && !isMobile}
          marginLeft={headerBand.left}
          fontSize={brandFontSize}
          scaleX={brandScaleX}
        />
      </div>
    </div>
  )
}
