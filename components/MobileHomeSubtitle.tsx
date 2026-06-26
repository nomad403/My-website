"use client"

import { useEffect, useRef, useState } from "react"
import ShuffleText from "@/components/ShuffleText"

interface MobileHomeSubtitleProps {
  text: string
  triggerShuffle: boolean
  mode: "day" | "night"
}

const MIN_FONT_PX = 9
const MAX_FONT_PX = 24
const LETTER_SPACING_EM = 0.08

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

function fitFontSize(text: string, availableWidth: number) {
  if (availableWidth <= 0 || !text) return MIN_FONT_PX

  let min = MIN_FONT_PX
  let max = MAX_FONT_PX
  let best = min

  while (min <= max) {
    const mid = Math.floor((min + max) / 2)
    if (measureTextWidth(text, mid) <= availableWidth) {
      best = mid
      min = mid + 1
    } else {
      max = mid - 1
    }
  }

  return best
}

export default function MobileHomeSubtitle({
  text,
  triggerShuffle,
  mode,
}: MobileHomeSubtitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fontSize, setFontSize] = useState(16)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const update = () => {
      setFontSize(fitFontSize(text, container.clientWidth))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(container)
    return () => ro.disconnect()
  }, [text])

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
          triggerShuffle={triggerShuffle}
          enableHover={false}
          totalDuration={1200}
          shuffleDuration={150}
          letterDelay={12}
        >
          {text}
        </ShuffleText>
      </p>
    </div>
  )
}
