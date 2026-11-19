/** Pure helpers for step-locked, spring-settled category snap. */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Coast handoff when |v| falls under this (px/s). */
export const MAGNET_CAPTURE_VELOCITY = 520
export const MAGNET_SETTLE_DISTANCE = 0.45
export const MAGNET_SETTLE_VELOCITY = 22
export const MAGNET_COAST_IDLE_MS = 52
export const MAGNET_SETTLE_FALLBACK_MS = 72
export const MAGNET_VELOCITY_EMA = 0.34

/**
 * Slightly overdamped spring — smooth arrival, no rebound hitch.
 * damping ≈ 2 * sqrt(stiffness) * 1.08
 */
export const MAGNET_SPRING_STIFFNESS = 54
export const MAGNET_SPRING_DAMPING = 15.9

export const MAGNET_STEP_COMMIT = 0.28
export const MAGNET_STEP_VELOCITY = 180
export const MAGNET_STEP_SLACK_PX = 14
export const MAGNET_HANDOFF_MAX_VELOCITY = 1400
/** Ignore tiny trackpad residuals while a spring settle is already running. */
export const MAGNET_WHEEL_INTERRUPT_DELTA = 10

export interface SnapBlock {
  id: string
  top: number
}

export interface SpringState {
  position: number
  /** px/s */
  velocity: number
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

export function nearestBlockIndex(scrollTop: number, blocks: SnapBlock[]): number {
  if (blocks.length === 0) return 0
  let best = 0
  let bestDistance = Math.abs(blocks[0].top - scrollTop)
  for (let i = 1; i < blocks.length; i++) {
    const distance = Math.abs(blocks[i].top - scrollTop)
    if (distance < bestDistance) {
      best = i
      bestDistance = distance
    }
  }
  return best
}

/**
 * One gesture → at most one category step from the origin.
 */
export function pickStepTarget(
  scrollTop: number,
  velocity: number,
  blocks: SnapBlock[],
  originIndex: number,
): SnapBlock | null {
  if (blocks.length === 0) return null

  const origin = clamp(originIndex, 0, blocks.length - 1)
  const originBlock = blocks[origin]
  const prev = origin > 0 ? blocks[origin - 1] : null
  const next = origin < blocks.length - 1 ? blocks[origin + 1] : null
  const delta = scrollTop - originBlock.top

  const nextGap = next ? Math.max(1, next.top - originBlock.top) : 0
  const prevGap = prev ? Math.max(1, originBlock.top - prev.top) : 0

  const commitNext =
    next &&
    (delta >= nextGap * MAGNET_STEP_COMMIT ||
      delta >= nextGap * 0.5 ||
      (delta > MAGNET_STEP_SLACK_PX && velocity > MAGNET_STEP_VELOCITY))

  const commitPrev =
    prev &&
    (delta <= -prevGap * MAGNET_STEP_COMMIT ||
      delta <= -prevGap * 0.5 ||
      (delta < -MAGNET_STEP_SLACK_PX && velocity < -MAGNET_STEP_VELOCITY))

  if (commitNext && next) return next
  if (commitPrev && prev) return prev
  return originBlock
}

/**
 * Semi-implicit spring-damper, frame-rate independent.
 * velocity in px/s, dt in seconds.
 */
export function integrateSpring(
  position: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness = MAGNET_SPRING_STIFFNESS,
  damping = MAGNET_SPRING_DAMPING,
): SpringState {
  const step = clamp(dt, 1 / 240, 1 / 30)
  const accel = -stiffness * (position - target) - damping * velocity
  const nextVelocity = velocity + accel * step
  const nextPosition = position + nextVelocity * step
  return { position: nextPosition, velocity: nextVelocity }
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

/**
 * Keep native coast energy. Only gently redirect when opposing the detent —
 * never hard-reseed (that causes the snap hitch).
 */
export function handoffVelocity(
  distance: number,
  sampledVelocity: number,
): number {
  const toward = Math.sign(distance) || 1
  let velocity = clamp(
    sampledVelocity,
    -MAGNET_HANDOFF_MAX_VELOCITY,
    MAGNET_HANDOFF_MAX_VELOCITY,
  )

  if (Math.sign(velocity) === toward || Math.abs(velocity) < 1) {
    // Continuous: if nearly stopped, give a soft push proportional to travel.
    if (Math.abs(velocity) < 40) {
      velocity += toward * clamp(Math.abs(distance) * 1.1, 40, 380)
    }
    return velocity
  }

  // Opposing coast: bleed then ease toward the detent (no sudden flip spike).
  return toward * Math.min(Math.abs(velocity) * 0.22, 280)
}
