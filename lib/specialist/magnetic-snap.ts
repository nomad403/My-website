/** Pure helpers for magnetic category snap in the expertise list. */

export function easeOutQuint(t: number) {
  const p = 1 - Math.min(1, Math.max(0, t))
  return 1 - p ** 5
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export interface SnapBlock {
  id: string
  top: number
}

/** Absolute content tops for each category block inside the scroller. */
export function measureSnapBlocks(
  scroller: HTMLElement,
  blocks: Iterable<HTMLElement>,
): SnapBlock[] {
  const scrollerTop = scroller.getBoundingClientRect().top
  const scrollTop = scroller.scrollTop
  const measured: SnapBlock[] = []

  for (const el of blocks) {
    const id = el.dataset.categoryId
    if (!id) continue
    const top = el.getBoundingClientRect().top - scrollerTop + scrollTop
    measured.push({ id, top })
  }

  measured.sort((a, b) => a.top - b.top)
  return measured
}

/**
 * Adaptive magnetic target:
 * - slow scroll → nearest category start
 * - fast scroll → bias toward the next category in the fling direction
 */
export function pickMagneticTarget(
  scrollTop: number,
  viewport: number,
  velocity: number,
  blocks: SnapBlock[],
): SnapBlock | null {
  if (blocks.length === 0) return null

  const maxForesight = viewport * 0.42
  const foresight = clamp(velocity * 10, -maxForesight, maxForesight)
  const probe = scrollTop + foresight

  let best = blocks[0]
  let bestDistance = Math.abs(blocks[0].top - probe)

  for (let i = 1; i < blocks.length; i++) {
    const distance = Math.abs(blocks[i].top - probe)
    if (distance < bestDistance) {
      best = blocks[i]
      bestDistance = distance
    }
  }

  // Strong fling: commit to the next/prev category along the momentum.
  if (Math.abs(velocity) > 1.1) {
    const direction = Math.sign(velocity)
    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i]
      const next = blocks[i + 1]
      if (probe >= current.top && probe <= next.top) {
        return direction > 0 ? next : current
      }
      if (probe < current.top && i === 0 && direction < 0) return current
      if (probe > next.top && i === blocks.length - 2 && direction > 0) return next
    }
  }

  return best
}

/** Duration scales with distance; short hops stay snappy, long hops stay smooth. */
export function snapDurationMs(distance: number, reducedMotion: boolean) {
  if (reducedMotion) return 0
  const abs = Math.abs(distance)
  if (abs < 2) return 0
  return clamp(280 + abs * 0.45, 320, 720)
}
