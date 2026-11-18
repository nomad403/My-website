/** Pure helpers for magnetic category snap in the expertise list. */

export function easeOutQuint(t: number) {
  const p = 1 - Math.min(1, Math.max(0, t))
  return 1 - p ** 5
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Wheel / trackpad impulse tuning — continuous motion, no idle pause. */
export const MAGNET_WHEEL_IMMEDIATE = 0.62
export const MAGNET_WHEEL_IMPULSE = 0.42
export const MAGNET_WHEEL_FRICTION = 0.905
export const MAGNET_WHEEL_MAX_VELOCITY = 56
export const MAGNET_MIN_VELOCITY = 0.28
/** Below this speed the magnet dominates and finishes the settle. */
export const MAGNET_CAPTURE_VELOCITY = 2.8
export const MAGNET_PULL_MIN = 0.1
export const MAGNET_PULL_MAX = 0.32
export const MAGNET_SETTLE_DISTANCE = 0.65
export const MAGNET_SETTLE_VELOCITY = 0.35

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

  const maxForesight = viewport * 0.48
  const foresight = clamp(velocity * 12, -maxForesight, maxForesight)
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

/**
 * One physics step: friction + magnetic pull that strengthens as speed drops.
 * Returns the next velocity (px/frame). Caller applies it to scrollTop.
 */
export function stepMagneticVelocity(
  scrollTop: number,
  targetTop: number,
  velocity: number,
  friction = MAGNET_WHEEL_FRICTION,
): number {
  const distance = targetTop - scrollTop
  const speed = Math.abs(velocity)
  const pull = clamp(
    MAGNET_PULL_MIN + (1 - clamp(speed / 22, 0, 1)) * (MAGNET_PULL_MAX - MAGNET_PULL_MIN),
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

/** Normalize wheel delta to roughly pixel units. */
export function normalizeWheelDelta(event: WheelEvent, viewport: number) {
  let delta = event.deltaY
  if (event.deltaMode === 1) delta *= 16
  if (event.deltaMode === 2) delta *= viewport
  return delta
}
