"use client"

import { useEffect, useRef, useState } from "react"
import ShuffleText from "@/components/ShuffleText"
import {
  markGyroHintShown,
  wasGyroHintShown,
} from "@/hooks/useGyroscopeAccessible"

interface MobileHomeSubtitleProps {
  subtitle: string
  rotateHint: string
  triggerShuffle: boolean
  gyroAccessible: boolean
  mode: "day" | "night"
}

const MIN_FONT_PX = 9
const MAX_FONT_PX = 24
const LETTER_SPACING_EM = 0.08
const SHUFFLE_MS = 1200
const SUBTITLE_HOLD_MS = 2200
const ROTATE_HOLD_MS = 2600

type DisplayPhase = "subtitle" | "rotate"

function measureTextWidth(text: string, fontSize: number) {
  const probe = document.createElement("span")
  probe.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-family: var(--font-jetbrains), ui-monospace, monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: ${LETTER_SPACING_EM}em;
    font-size: ${fontSize}px;
  `
  probe.textContent = text
  document.body.appendChild(probe)
  const width = probe.offsetWidth
  document.body.removeChild(probe)
  return width
}

function fitFontSize(texts: string[], availableWidth: number) {
  if (availableWidth <= 0 || texts.length === 0) return MIN_FONT_PX

  let min = MIN_FONT_PX
  let max = MAX_FONT_PX
  let best = min

  while (min <= max) {
    const mid = Math.floor((min + max) / 2)
    const fitsAll = texts.every((text) => measureTextWidth(text, mid) <= availableWidth)
    if (fitsAll) {
      best = mid
      min = mid + 1
    } else {
      max = mid - 1
    }
  }

  return best
}

export default function MobileHomeSubtitle({
  subtitle,
  rotateHint,
  triggerShuffle,
  gyroAccessible,
  mode,
}: MobileHomeSubtitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sequenceStartedRef = useRef(false)
  const [fontSize, setFontSize] = useState(16)
  const [phase, setPhase] = useState<DisplayPhase>("subtitle")
  const [shuffleKey, setShuffleKey] = useState(0)

  const displayedText = phase === "rotate" ? rotateHint : subtitle
  const fitTexts = [subtitle, rotateHint]

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => {
      setFontSize(fitFontSize(fitTexts, container.clientWidth))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    return () => ro.disconnect()
  }, [subtitle, rotateHint])

  useEffect(() => {
    if (!triggerShuffle || !gyroAccessible || sequenceStartedRef.current || wasGyroHintShown()) {
      return
    }

    sequenceStartedRef.current = true

    const toRotate = window.setTimeout(() => {
      setPhase("rotate")
      setShuffleKey((key) => key + 1)
    }, SUBTITLE_HOLD_MS + SHUFFLE_MS)

    const toSubtitle = window.setTimeout(() => {
      setPhase("subtitle")
      setShuffleKey((key) => key + 1)
      markGyroHintShown()
    }, SUBTITLE_HOLD_MS + SHUFFLE_MS + ROTATE_HOLD_MS + SHUFFLE_MS)

    return () => {
      window.clearTimeout(toRotate)
      window.clearTimeout(toSubtitle)
    }
  }, [triggerShuffle, gyroAccessible])

  useEffect(() => {
    if (!gyroAccessible) {
      setPhase("subtitle")
    }
  }, [subtitle, rotateHint])

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <p
        className={`font-jetbrains font-bold text-center uppercase whitespace-nowrap ${
          mode === "night" ? "text-white" : "text-black"
        }`}
        style={{
          fontSize: `${fontSize}px`,
          letterSpacing: `${LETTER_SPACING_EM}em`,
          lineHeight: 1.15,
        }}
      >
        <ShuffleText
          triggerShuffle={triggerShuffle && shuffleKey === 0}
          shuffleKey={shuffleKey}
          enableHover={false}
          totalDuration={SHUFFLE_MS}
          shuffleDuration={150}
          letterDelay={12}
        >
          {displayedText}
        </ShuffleText>
      </p>
    </div>
  )
}
