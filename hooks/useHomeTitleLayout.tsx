"use client"

import {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  HOME_BRAND_FONT_WEIGHT,
  HOME_BRAND_LETTER_SPACING_EM,
  HOME_BRAND_MAX_FONT_PX_DESKTOP,
  HOME_BRAND_MAX_FONT_PX_MOBILE,
  HOME_BRAND_MIN_FONT_PX,
  HOME_BRAND_TEXT,
  HOME_TITLE_LETTER_SPACING_EM,
  HOME_TITLE_BRAND_SIZE_RATIO_DESKTOP,
  HOME_TITLE_BRAND_SIZE_RATIO_MOBILE,
  HOME_TITLE_MAX_FONT_PX_DESKTOP,
  HOME_TITLE_MAX_FONT_PX_MOBILE,
  HOME_TITLE_MIN_FONT_PX,
  HOME_TITLE_STAGGER_MS,
  HOME_TITLE_WIDTH_RATIO,
} from "@/lib/home-title-style"
import { readHeaderBandLayout, type HeaderBandLayout } from "@/lib/home-header-band"

const BRAND_FONT_FAMILY = '"Electric Blue", ui-sans-serif, system-ui, sans-serif'
const TITLE_FONT_FAMILY = '"Geist Mono", ui-monospace, monospace'

interface HomeTitleLayoutValue {
  fontSize: number
  brandFontSize: number
  brandScaleX: number
  headerBand: HeaderBandLayout
  shuffleKeys: number[]
}

const HomeTitleLayoutContext = createContext<HomeTitleLayoutValue | null>(null)

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

interface HomeTitleProviderProps {
  lines: string[]
  isMobile: boolean
  ready: boolean
  children: ReactNode
}

export function HomeTitleProvider({
  lines,
  isMobile,
  ready,
  children,
}: HomeTitleProviderProps) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(24)
  const [brandFontSize, setBrandFontSize] = useState(48)
  const [brandScaleX, setBrandScaleX] = useState(1)
  const [headerBand, setHeaderBand] = useState<HeaderBandLayout>({
    left: 0,
    width: 0,
    welcomeWidth: 0,
  })
  const [shuffleKeys, setShuffleKeys] = useState<number[]>(() => lines.map(() => 0))

  const maxFontPx = isMobile ? HOME_TITLE_MAX_FONT_PX_MOBILE : HOME_TITLE_MAX_FONT_PX_DESKTOP
  const maxBrandFontPx = isMobile
    ? HOME_BRAND_MAX_FONT_PX_MOBILE
    : HOME_BRAND_MAX_FONT_PX_DESKTOP

  useEffect(() => {
    setShuffleKeys(lines.map(() => 0))
  }, [lines])

  useEffect(() => {
    const container = measureRef.current
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

      const sizes = lines.map((line) =>
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
  }, [lines, maxFontPx, maxBrandFontPx, isMobile])

  useEffect(() => {
    if (!ready || lines.length === 0) return

    const timers = lines.map((_, index) =>
      window.setTimeout(() => {
        setShuffleKeys((keys) => {
          const next = [...keys]
          next[index] = (next[index] ?? 0) + 1
          return next
        })
      }, index * HOME_TITLE_STAGGER_MS),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [ready, lines])

  return (
    <HomeTitleLayoutContext.Provider
      value={{ fontSize, brandFontSize, brandScaleX, headerBand, shuffleKeys }}
    >
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 px-4 opacity-0 sm:px-8"
      >
        <div className="mx-auto w-full max-w-7xl" />
      </div>
      {children}
    </HomeTitleLayoutContext.Provider>
  )
}

export function useHomeTitleLayoutContext() {
  const ctx = useContext(HomeTitleLayoutContext)
  if (!ctx) {
    throw new Error("useHomeTitleLayoutContext requires HomeTitleProvider")
  }
  return ctx
}
