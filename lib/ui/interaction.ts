export function isInteractiveClickTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    "a, button, input, textarea, select, label, [role='button'], [role='link']"
  )
}

export const ORIENTATION_GRANTED_EVENT = "nomad403:orientation-granted"
// Consent belongs to this entry, never to a cached/localStorage choice.
let orientationGranted = false

export function wasOrientationGranted() {
  return orientationGranted
}

export function resetOrientationPermission() {
  orientationGranted = false
}

/** Call only from the explained experience gate's affirmative click. */
export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const orientation = (window as unknown as {
    DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<PermissionState>
    }
  }).DeviceOrientationEvent
  if (!orientation) return false
  try {
    orientationGranted = typeof orientation.requestPermission === "function"
      ? await orientation.requestPermission() === "granted"
      : true
  } catch {
    orientationGranted = false
  }
  return orientationGranted
}

export function notifyOrientationGranted() {
  if (typeof window === "undefined" || !orientationGranted) return
  window.dispatchEvent(new CustomEvent(ORIENTATION_GRANTED_EVENT))
}
