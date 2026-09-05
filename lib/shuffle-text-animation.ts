const DEFAULT_SHUFFLE_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()"

export function pickShuffleChar(
  chars: string = DEFAULT_SHUFFLE_CHARS,
): string {
  return chars[Math.floor(Math.random() * chars.length)] ?? "?"
}

export interface ShuffleTransitionOptions {
  totalDuration?: number
  ratioA?: number
  shuffleChars?: string
  onUpdate: (text: string) => void
  onComplete?: () => void
}

/** Transition animée entre deux chaînes (shuffle puis révélation progressive). */
export function runShuffleTransition(
  from: string,
  to: string,
  {
    totalDuration = 900,
    ratioA = 0.4,
    shuffleChars = DEFAULT_SHUFFLE_CHARS,
    onUpdate,
    onComplete,
  }: ShuffleTransitionOptions,
): () => void {
  let raf = 0
  let active = true
  const start = performance.now()
  const maxLen = Math.max(from.length, to.length)
  const targetLen = to.length

  const shuffleAt = (index: number) => {
    const ch = from[index] ?? to[index] ?? " "
    return ch === " " ? " " : pickShuffleChar(shuffleChars)
  }

  const tick = (now: number) => {
    if (!active) return

    const elapsed = now - start
    const progress = Math.min(1, elapsed / totalDuration)

    if (progress < ratioA) {
      const frame = Array.from({ length: maxLen }, (_, index) =>
        shuffleAt(index),
      ).join("")
      onUpdate(frame)
    } else if (progress < 1) {
      const q = (progress - ratioA) / (1 - ratioA)
      const cutoff = Math.floor(q * targetLen)
      const frame = Array.from({ length: targetLen }, (_, index) => {
        if (index < cutoff) return to[index] ?? " "
        return shuffleAt(index)
      }).join("")
      onUpdate(frame)
    } else {
      onUpdate(to)
      onComplete?.()
      return
    }

    raf = requestAnimationFrame(tick)
  }

  raf = requestAnimationFrame(tick)

  return () => {
    active = false
    if (raf) cancelAnimationFrame(raf)
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}
