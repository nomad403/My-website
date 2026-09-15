/**
 * Pointeur virtuel partagé pour /demo — curseur cross + tilt sphères.
 */

export type DemoPointerSample = {
  /** px viewport */
  x: number
  y: number
  /** −1…1, même convention que SpheresPacking */
  nx: number
  ny: number
  active: boolean
}

type Listener = (sample: DemoPointerSample) => void

const IDLE: DemoPointerSample = {
  x: 0,
  y: 0,
  nx: 0,
  ny: 0,
  active: false,
}

let current: DemoPointerSample = IDLE
const listeners = new Set<Listener>()

export function getDemoPointer(): DemoPointerSample {
  return current
}

export function setDemoPointer(sample: DemoPointerSample) {
  current = sample
  listeners.forEach((listener) => listener(current))
}

export function clearDemoPointer() {
  setDemoPointer({ ...IDLE, x: current.x, y: current.y })
}

export function subscribeDemoPointer(listener: Listener) {
  listeners.add(listener)
  listener(current)
  return () => {
    listeners.delete(listener)
  }
}
