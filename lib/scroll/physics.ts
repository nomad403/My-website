/** Shared scroll / snap physics used by expertise + projects. */

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function easeOutQuint(t: number) {
  const p = 1 - Math.min(1, Math.max(0, t))
  return 1 - p ** 5
}

export function blendEma(previous: number, sample: number, alpha: number) {
  return previous * (1 - alpha) + sample * alpha
}

export function supportsScrollEndEvent() {
  return typeof window !== "undefined" && "onscrollend" in window
}

export function normalizeWheelDelta(event: WheelEvent, viewport: number) {
  let delta = event.deltaY
  if (event.deltaMode === 1) delta *= 16
  if (event.deltaMode === 2) delta *= viewport
  return delta
}

/** Near-critical spring — magnetic but continuous with native coast. */
export const SCROLL_SPRING_STIFFNESS = 108
export const SCROLL_SPRING_DAMPING = 20.6
export const SCROLL_SETTLE_DISTANCE = 0.5
export const SCROLL_SETTLE_VELOCITY = 34
export const SCROLL_HANDOFF_MAX_VELOCITY = 2200
export const SCROLL_VELOCITY_EMA = 0.36

export interface SpringState {
  position: number
  /** px/s */
  velocity: number
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
  stiffness = SCROLL_SPRING_STIFFNESS,
  damping = SCROLL_SPRING_DAMPING,
): SpringState {
  const step = clamp(dt, 1 / 240, 1 / 30)
  const accel = -stiffness * (position - target) - damping * velocity
  const nextVelocity = velocity + accel * step
  const nextPosition = position + nextVelocity * step
  return { position: nextPosition, velocity: nextVelocity }
}

export function isSpringSettled(
  position: number,
  target: number,
  velocity: number,
  distanceEps = SCROLL_SETTLE_DISTANCE,
  velocityEps = SCROLL_SETTLE_VELOCITY,
) {
  return (
    Math.abs(target - position) < distanceEps &&
    Math.abs(velocity) < velocityEps
  )
}

/**
 * Continuity-first handoff: keep coast energy whenever possible.
 * Avoids the “pause then yank” of hard velocity reseeding.
 */
export function handoffTowardTarget(
  distance: number,
  sampledVelocity: number,
  maxVelocity = SCROLL_HANDOFF_MAX_VELOCITY,
): number {
  const toward = Math.sign(distance) || 1
  const travel = Math.abs(distance)
  let velocity = clamp(sampledVelocity, -maxVelocity, maxVelocity)
  const speed = Math.abs(velocity)
  const aligned = Math.sign(velocity) === toward || speed < 1

  if (aligned) {
    // Already moving toward the detent — pass through; only nudge if nearly stopped.
    if (speed >= 90) return velocity
    const softPull = clamp(travel * 1.35, 70, 520)
    return toward * Math.max(speed, softPull)
  }

  // Opposing coast (overshoot): bleed gently, don't hard-reverse.
  const bled = toward * Math.min(speed * 0.45, 420)
  const floor = clamp(travel * 1.1, 60, 380)
  return toward * Math.max(Math.abs(bled), floor)
}
