"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { delay, runShuffleTransition } from "@/lib/ui/shuffle-text-animation"
import { useCanHover } from "@/hooks/useCanHover"
import { DEMO_HOLD_MS, DEMO_SHUFFLE_MS } from "@/lib/demo/script"

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
  /**
   * Incrémente pour forcer une narration : affiche le texte courant → alternate,
   * puis reste dessus (pas de retour « in » vers primary).
   */
  playToken?: number
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
  playToken = 0,
  shuffleChars,
  renderLineWrapper,
}: ShuffleDualLinesProps) {
  const canHoverDevice = useCanHover()
  const hoverEnabled = enableHover && canHoverDevice
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
    (index: number, from: string, to: string, durationMs = shuffleDurationMs) =>
      new Promise<void>((resolve) => {
        const cancel = runShuffleTransition(from, to, {
          totalDuration: durationMs,
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
      direction: "toAlternate" | "toPrimary" | "intro" | "toPrimaryFromDisplay",
      token: number,
      options?: { durationMs?: number; staggerMs?: number },
    ) => {
      const currentLines = linesRef.current
      const durationMs = options?.durationMs ?? shuffleDurationMs
      const staggerMs = options?.staggerMs ?? lineStaggerMs

      await Promise.all(
        currentLines.map(async (line, index) => {
          await delay(index * staggerMs)
          if (token !== sequenceTokenRef.current) return

          if (direction === "intro") {
            await transitionLine(index, line.primary, line.primary, durationMs)
            return
          }

          if (direction === "toPrimaryFromDisplay") {
            const from = displayLinesRef.current[index] ?? line.primary
            const to = line.primary
            if (from === to) {
              setLineText(index, to)
              return
            }
            await transitionLine(index, from, to, durationMs)
            return
          }

          if (direction === "toAlternate") {
            const from = displayLinesRef.current[index] ?? line.primary
            const to = line.alternate
            if (from === to) {
              setLineText(index, to)
              return
            }
            await transitionLine(index, from, to, durationMs)
            return
          }

          const from = displayLinesRef.current[index] ?? line.alternate
          const to = line.primary
          if (from === to) return
          await transitionLine(index, from, to, durationMs)
        }),
      )
    },
    [lineStaggerMs, setLineText, shuffleDurationMs, transitionLine],
  )

  /** Hover : primary → alternate → primary. */
  const runHoverLoop = useCallback(async () => {
    if (busyRef.current) return

    busyRef.current = true
    const token = ++sequenceTokenRef.current
    clearHoldTimer()
    cancelTransitions()

    // Partir du primary affiché.
    setDisplayLines(linesRef.current.map((line) => line.primary))
    displayLinesRef.current = linesRef.current.map((line) => line.primary)

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
  }, [holdDurationMs, runStaggeredTransition, shuffleDurationMs])

  /**
   * Démo / playToken — timeline fixe :
   * [shuffle|pad] → hold primary → [shuffle|pad] → hold alternate.
   * Même durée d’affichage pour chaque beat, avec ou sans changement de texte.
   */
  const runDemoSequence = useCallback(async () => {
    busyRef.current = true
    const token = ++sequenceTokenRef.current
    clearHoldTimer()
    cancelTransitions()

    const nextLines = linesRef.current
    const shuffleMs = DEMO_SHUFFLE_MS
    const holdMs = DEMO_HOLD_MS

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        holdTimerRef.current = window.setTimeout(() => {
          holdTimerRef.current = null
          resolve()
        }, ms)
      })

    const onPrimary = nextLines.every(
      (line, index) =>
        (displayLinesRef.current[index] ?? line.primary) === line.primary,
    )

    // Phase 1 : arriver sur primary (shuffle si changement, sinon pad).
    const demoMotion = { durationMs: shuffleMs, staggerMs: 0 }
    if (!onPrimary) {
      phaseRef.current = "to-primary"
      await runStaggeredTransition("toPrimaryFromDisplay", token, demoMotion)
      if (token !== sequenceTokenRef.current) return
    } else {
      setDisplayLines(nextLines.map((line) => line.primary))
      displayLinesRef.current = nextLines.map((line) => line.primary)
      await wait(shuffleMs)
      if (token !== sequenceTokenRef.current) return
    }

    // Phase 2 : lecture primary.
    phaseRef.current = "holding-alt"
    await wait(holdMs)
    if (token !== sequenceTokenRef.current) return

    // Phase 3 : out vers alternate (ou pad si identique) — sans sfx.
    const hasAlternate = nextLines.some(
      (line) => line.primary !== line.alternate,
    )
    if (hasAlternate) {
      phaseRef.current = "to-alt"
      await runStaggeredTransition("toAlternate", token, demoMotion)
      if (token !== sequenceTokenRef.current) return
    } else {
      await wait(shuffleMs)
      if (token !== sequenceTokenRef.current) return
    }

    // Phase 4 : lecture alternate (durée égale au primary).
    setDisplayLines(nextLines.map((line) => line.alternate))
    phaseRef.current = "holding-alt"
    await wait(holdMs)
    if (token !== sequenceTokenRef.current) return

    phaseRef.current = "idle"
    busyRef.current = false
  }, [runStaggeredTransition])

  const handleMouseEnter = () => {
    if (!hoverEnabled || busyRef.current) return
    void runHoverLoop()
  }

  useEffect(() => {
    if (!playToken) return
    void runDemoSequence()
  }, [playToken, runDemoSequence])

  useEffect(() => {
    if (!introShuffle || introPlayedRef.current || lines.length === 0) return
    if (playToken > 0) {
      introPlayedRef.current = true
      return
    }
    introPlayedRef.current = true

    void (async () => {
      if (busyRef.current) return
      busyRef.current = true
      phaseRef.current = "to-primary"
      const token = ++sequenceTokenRef.current
      await runStaggeredTransition("intro", token)
      if (token !== sequenceTokenRef.current) return
      phaseRef.current = "idle"
      busyRef.current = false
    })()
  }, [introShuffle, lines.length, playToken, runStaggeredTransition, shuffleDurationMs])

  useEffect(() => {
    if (busyRef.current || playToken > 0) return
    setDisplayLines(lines.map((line) => line.primary))
  }, [lines, playToken])

  useEffect(
    () => () => {
      clearHoldTimer()
      cancelTransitions()
    },
    [],
  )

  return (
    <span
      className={className}
      onMouseEnter={hoverEnabled ? handleMouseEnter : undefined}
    >
      {displayLines.map((text, index) => {
        const lineNode = (
          <span
            key={`${index}-${lines[index]?.primary ?? index}`}
            className={`block ${
              text.length === 0 ? "h-0 overflow-hidden" : index > 0 ? lineGapClassName : ""
            } ${lineClassName}`}
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
