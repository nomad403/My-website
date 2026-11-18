/** Pure helpers for inertia-based magnetic category snap. */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Take over native coast when speed falls under this (px/frame ~16ms). */
export const MAGNET_CAPTURE_VELOCITY = 3.2
export const MAGNET_MIN_VELOCITY = 0.22
export const MAGNET_FRICTION = 0.86
export const MAGNET_PULL_MIN = 0.12
export const MAGNET_PULL_MAX = 0.3
export const MAGNET_SETTLE_DISTANCE = 0.6
export const MAGNET_SETTLE_VELOCITY = 0.3
/** Wait after last wheel/touch before treating motion as coast. */
export const MAGNET_COAST_IDLE_MS = 48
/** Fallback if scrollend is missing. */
export const MAGNET_SETTLE_FALLBACK_MS = 72
export const MAGNET_VELOCITY_EMA = 0.55

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
 * Inertia-aware target:
 * - slow / short coast → nearest category
 * - fast fling → commit to the next/prev category in that direction
 */
export function pickMagneticTarget(
  scrollTop: number,
  viewport: number,
  velocity: number,
  blocks: SnapBlock[],
): SnapBlock | null {
  if (blocks.length === 0) return null

  const speed = Math.abs(velocity)
  const maxForesight = viewport * 0.55
  // Stronger foresight with inertia so a decisive flick lands on the next block.
  const foresight = clamp(velocity * (speed > 2.5 ? 18 : 10), -maxForesight, maxForesight)
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

  if (speed > 1.4) {
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

/**
 * Spring step: keep residual inertia, pull harder as speed drops.
 */
export function stepMagneticVelocity(
  scrollTop: number,
  targetTop: number,
  velocity: number,
  friction = MAGNET_FRICTION,
): number {
  const distance = targetTop - scrollTop
  const speed = Math.abs(velocity)
  const pull = clamp(
    MAGNET_PULL_MIN +
      (1 - clamp(speed / 18, 0, 1)) * (MAGNET_PULL_MAX - MAGNET_PULL_MIN),
    MAGNET_PULL_MIN,
    MAGNET_PULL_MAX,
  )
  return velocity * friction + distance * pull
}

export function isMagnetSettled(
  scrollTop: number,
  targetTop: number,
  velocity: number,
) {
  return (
    Math.abs(targetTop - scrollTop) < MAGNET_SETTLE_DISTANCE &&
    Math.abs(velocity) < MAGNET_SETTLE_VELOCITY
  )
}
