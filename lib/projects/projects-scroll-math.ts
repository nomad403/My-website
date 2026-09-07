export interface ListMetrics {
  itemHeight: number
  paddingY: number
  viewport: number
  cycleHeight: number
  loopBlocks: number
  middleBlock: number
  trackHeight: number
}

export const MIN_LOOP_SCROLL = 24000
export const MIN_LOOP_BLOCKS = 5
export const RECENTER_DRIFT_BLOCKS = 4
export const MIN_OVERSCAN = 12
export const MAX_OVERSCAN = 40

export const WHEEL_IMMEDIATE = 0.12
export const WHEEL_IMPULSE = 0.08
export const WHEEL_FRICTION = 0.88
export const WHEEL_MIN_VELOCITY = 0.85
export const WHEEL_MAX_VELOCITY = 32
export const SNAP_CAPTURE_VELOCITY = 5
export const SNAP_CAPTURE_FRACTION = 0.28
export const SNAP_GLIDE_MS = 220
/** Durée de base pour un scroll animé vers un item cliqué. */
export const SELECT_GLIDE_MS = 280
export const SELECT_GLIDE_MS_PER_ITEM = 55
export const SELECT_GLIDE_MS_MAX = 520

const JUMP_FROM = 0.28
const JUMP_TO = 0.72
const JUMP_LUT_SIZE = 64
const JUMP_LUT = (() => {
  const table = new Float32Array(JUMP_LUT_SIZE + 1)
  const span = JUMP_TO - JUMP_FROM
  for (let i = 0; i <= JUMP_LUT_SIZE; i += 1) {
    const progress = i / JUMP_LUT_SIZE
    if (progress <= JUMP_FROM || progress >= JUMP_TO) {
      table[i] = 0
      continue
    }
    table[i] = Math.sin(((progress - JUMP_FROM) / span) * Math.PI)
  }
  return table
})()

export const EMPTY_METRICS: ListMetrics = {
  itemHeight: 0,
  paddingY: 0,
  viewport: 0,
  cycleHeight: 0,
  loopBlocks: MIN_LOOP_BLOCKS,
  middleBlock: (MIN_LOOP_BLOCKS - 1) / 2,
  trackHeight: 0,
}

export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function jumpFactor(progress: number): number {
  const x = clamp(progress, 0, 1) * JUMP_LUT_SIZE
  const i = Math.floor(x)
  const t = x - i
  const a = JUMP_LUT[i]
  const b = JUMP_LUT[Math.min(i + 1, JUMP_LUT_SIZE)]
  return a + (b - a) * t
}

export function computeLoopBlocks(cycleHeight: number): number {
  if (cycleHeight <= 0) return MIN_LOOP_BLOCKS
  const blocks = Math.max(
    MIN_LOOP_BLOCKS,
    Math.ceil(MIN_LOOP_SCROLL / cycleHeight),
  )
  return blocks % 2 === 0 ? blocks + 1 : blocks
}

export function titleOffsetForVirtualIndex(
  virtualIndex: number,
  activeVirtualIndex: number,
  expandExtra: number,
): number {
  return virtualIndex > activeVirtualIndex ? expandExtra : 0
}

export function scrollTopForVirtualIndex(
  virtualIndex: number,
  metrics: ListMetrics,
  activeVirtualIndex = virtualIndex,
  expandExtra = 0,
): number {
  const { itemHeight, paddingY, viewport } = metrics
  const shift = titleOffsetForVirtualIndex(
    virtualIndex,
    activeVirtualIndex,
    expandExtra,
  )
  return (
    paddingY + virtualIndex * itemHeight + shift + itemHeight / 2 - viewport / 2
  )
}

export function computeOverscan(metrics: ListMetrics): number {
  if (metrics.itemHeight <= 0) return MIN_OVERSCAN
  return clamp(
    Math.ceil(metrics.viewport / metrics.itemHeight),
    MIN_OVERSCAN,
    MAX_OVERSCAN,
  )
}

export function nearestVirtualIndex(
  scrollTop: number,
  metrics: ListMetrics,
  velocity = 0,
  activeHint = 0,
  expandExtra = 0,
): number {
  const { itemHeight, paddingY, viewport } = metrics
  if (itemHeight <= 0) return 0

  const viewportCenter = scrollTop + viewport / 2
  const bias = Math.abs(velocity) < 0.5 ? 0 : Math.sign(velocity) * 0.22
  const raw =
    (viewportCenter - paddingY - itemHeight / 2) / itemHeight + bias

  if (expandExtra <= 0) {
    return Math.round(raw)
  }

  const lo = Math.floor(raw) - 3
  const hi = Math.ceil(raw) + 3
  let best = Math.round(raw)
  let bestDist = Number.POSITIVE_INFINITY

  for (let vi = lo; vi <= hi; vi += 1) {
    const shift = titleOffsetForVirtualIndex(vi, activeHint, expandExtra)
    const center = paddingY + vi * itemHeight + shift + itemHeight / 2
    const dist = Math.abs(viewportCenter - center)
    if (dist < bestDist) {
      bestDist = dist
      best = vi
    }
  }

  return best
}

export function loopShift(
  scrollTop: number,
  metrics: ListMetrics,
  driftBlocks: number,
): number {
  const { cycleHeight, middleBlock, paddingY, itemHeight, viewport } = metrics
  if (cycleHeight <= 0) return 0

  const center =
    paddingY + middleBlock * cycleHeight + itemHeight / 2 - viewport / 2
  const drift = scrollTop - center
  if (Math.abs(drift) <= cycleHeight * driftBlocks) return 0
  return -Math.round(drift / cycleHeight) * cycleHeight
}

export function sameMetrics(a: ListMetrics, b: ListMetrics): boolean {
  return a.itemHeight === b.itemHeight && a.viewport === b.viewport
}

export function supportsScrollEndEvent(): boolean {
  return typeof window !== "undefined" && "onscrollend" in window
}

export function normalizeWheelDelta(event: WheelEvent, viewport: number): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * viewport
  }
  return event.deltaY
}
