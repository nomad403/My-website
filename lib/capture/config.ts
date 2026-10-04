/** The one and only logical canvas used by capture mode. */
export const CAPTURE_CONFIG = {
  baseWidth: 1080,
  baseHeight: 1920,
  aspectRatio: 9 / 16,
} as const

export type CaptureMode = "off" | "host" | "frame"

export function getCaptureMode(search: string): CaptureMode {
  const capture = new URLSearchParams(search).get("capture")
  if (capture === "frame") return "frame"
  return capture === "1" ? "host" : "off"
}

export function getCaptureScale(search: string): number {
  const value = Number(new URLSearchParams(search).get("captureScale"))
  return Number.isFinite(value) && value > 0 ? value : 1
}
