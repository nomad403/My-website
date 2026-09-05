"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { delay, runShuffleTransition } from "@/lib/shuffle-text-animation"

export interface DualLine {
  primary: string
  alternate: string
}

interface ShuffleDualLinesProps {
  lines: DualLine[]
  className?: string
  lineClassName?: string
  lineStyle?: CSSProperties
  lineGapClassName?: string
  holdDurationMs?: number
  shuffleDurationMs?: number
  lineStaggerMs?: number
  enableHover?: boolean
  introShuffle?: boolean
  shuffleChars?: string
  renderLineWrapper?: (lineNode: ReactNode, index: number) => ReactNode
}

type SequencePhase = "idle" | "to-alt" | "holding-alt" | "to-primary"

export default function ShuffleDualLines({
  lines,
  className = "",
  lineClassName = "",
  lineStyle,
  lineGapClassName = "mt-0.5",
  holdDurationMs = 2500,
  shuffleDurationMs = 900,
  lineStaggerMs = 80,
  enableHover = true,
  introShuffle = false,
  shuffleChars,
  renderLineWrapper,
}: ShuffleDualLinesProps) {
  const [displayLines, setDisplayLines] = useState<string[]>(() =>
    lines.map((line) => line.primary),
  )

  const linesRef = useRef(lines)
  const displayLinesRef = useRef(displayLines)
  const phaseRef = useRef<SequencePhase>("idle")
  const busyRef = useRef(false)
  const cancelTransitionsRef = useRef<Array<() => void>>([])
  const holdTimerRef = useRef<number | null>(null)
  const introPlayedRef = useRef(false)
  const sequenceTokenRef = useRef(0)

  linesRef.current = lines
  displayLinesRef.current = displayLines

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const cancelTransitions = () => {
    cancelTransitionsRef.current.forEach((cancel) => cancel())
    cancelTransitionsRef.current = []
  }

  const setLineText = useCallback((index: number, text: string) => {
    setDisplayLines((current) => {
      const next = [...current]
      next[index] = text
      displayLinesRef.current = next
      return next
    })
  }, [])

  const transitionLine = useCallback(
    (index: number, from: string, to: string) =>
      new Promise<void>((resolve) => {
        const cancel = runShuffleTransition(from, to, {
          totalDuration: shuffleDurationMs,
          shuffleChars,
          onUpdate: (text) => setLineText(index, text),
          onComplete: resolve,
        })
        cancelTransitionsRef.current.push(cancel)
      }),
    [setLineText, shuffleDurationMs, shuffleChars],
  )

  const runStaggeredTransition = useCallback(
    async (
      direction: "toAlternate" | "toPrimary" | "intro",
      token: number,
    ) => {
      const currentLines = linesRef.current

      await Promise.all(
        currentLines.map(async (line, index) => {
          await delay(index * lineStaggerMs)
          if (token !== sequenceTokenRef.current) return

          if (direction === "intro") {
            await transitionLine(index, line.primary, line.primary)
            return
          }

          if (direction === "toAlternate") {
            const from = line.primary
            const to = line.alternate
            if (from === to) return
            await transitionLine(index, from, to)
            return
          }

          const from = displayLinesRef.current[index] ?? line.alternate
          const to = line.primary
          if (from === to) return
          await transitionLine(index, from, to)
        }),
      )
    },
    [lineStaggerMs, transitionLine],
  )

  const runHoverSequence = useCallback(async () => {
    if (busyRef.current || !enableHover) return

    busyRef.current = true
    const token = ++sequenceTokenRef.current
    clearHoldTimer()
    cancelTransitions()

    phaseRef.current = "to-alt"
    await runStaggeredTransition("toAlternate", token)
    if (token !== sequenceTokenRef.current) return

    phaseRef.current = "holding-alt"

    await new Promise<void>((resolve) => {
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null
        resolve()
      }, holdDurationMs)
    })
    if (token !== sequenceTokenRef.current) return

    phaseRef.current = "to-primary"
    await runStaggeredTransition("toPrimary", token)
    if (token !== sequenceTokenRef.current) return

    phaseRef.current = "idle"
    busyRef.current = false
    setDisplayLines(linesRef.current.map((line) => line.primary))
  }, [enableHover, holdDurationMs, runStaggeredTransition])

  const handleMouseEnter = () => {
    if (!enableHover || busyRef.current) return
    void runHoverSequence()
  }

  useEffect(() => {
    if (!introShuffle || introPlayedRef.current || lines.length === 0) return
    introPlayedRef.current = true

    void (async () => {
      busyRef.current = true
      phaseRef.current = "to-primary"
      const token = ++sequenceTokenRef.current
      await runStaggeredTransition("intro", token)
      if (token !== sequenceTokenRef.current) return
      phaseRef.current = "idle"
      busyRef.current = false
    })()
  }, [introShuffle, lines.length, runStaggeredTransition])

  useEffect(() => {
    if (busyRef.current) return
    setDisplayLines(lines.map((line) => line.primary))
  }, [lines])

  useEffect(
    () => () => {
      clearHoldTimer()
      cancelTransitions()
    },
    [],
  )

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      {displayLines.map((text, index) => {
        const lineNode = (
          <span
            key={`${index}-${lines[index]?.primary ?? index}`}
            className={`block ${index > 0 ? lineGapClassName : ""} ${lineClassName}`}
            style={lineStyle}
          >
            {text}
          </span>
        )

        return renderLineWrapper ? renderLineWrapper(lineNode, index) : lineNode
      })}
    </span>
  )
}
