export function isInteractiveClickTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    "a, button, input, textarea, select, label, [role='button'], [role='link']"
  )
}

export const ORIENTATION_GRANTED_EVENT = "nomad403:orientation-granted"
// Session grant only — never persist sensor access in localStorage.
let orientationGranted = false

type OrientationCtor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>
}

function deviceOrientationCtor() {
  if (typeof window === "undefined") return undefined
  return (window as unknown as { DeviceOrientationEvent?: OrientationCtor })
    .DeviceOrientationEvent
}

export function wasOrientationGranted() {
  return orientationGranted
}

export function resetOrientationPermission() {
  orientationGranted = false
}

/** iOS Safari: sensor access needs an explicit user gesture each browsing session. */
export function orientationRequiresUserPrompt() {
  const orientation = deviceOrientationCtor()
  return typeof orientation?.requestPermission === "function"
}

/** Android / desktop-touch: listeners work without a permission prompt. */
export function enableOrientationWithoutPrompt() {
  if (!deviceOrientationCtor()) {
    orientationGranted = false
    return false
  }
  orientationGranted = true
  notifyOrientationGranted()
  return true
}

/**
 * Session sensor state for the experience gate.
 * - unsupported: no DeviceOrientation API
 * - granted: already usable this session
 * - prompt: must ask (saved preference alone is not enough)
 * - denied: OS blocked; do not re-nag aggressively
 */
export type OrientationSessionState =
  | "unsupported"
  | "granted"
  | "prompt"
  | "denied"

export async function readOrientationSessionState(): Promise<OrientationSessionState> {
  if (typeof window === "undefined") return "unsupported"
  if (orientationGranted) return "granted"

  const orientation = deviceOrientationCtor()
  if (!orientation) return "unsupported"

  if (typeof orientation.requestPermission !== "function") {
    return "granted"
  }

  // Permissions API is incomplete for deviceorientation on many browsers;
  // treat an explicit prompt API as indeterminate until this session grants it.
  try {
    const permissions = navigator.permissions
    if (permissions?.query) {
      const status = await permissions.query({
        name: "accelerometer" as PermissionName,
      })
      if (status.state === "granted") return "granted"
      if (status.state === "denied") return "denied"
    }
  } catch {
    // ignore — fall through to prompt
  }

  return "prompt"
}

/** Call only from the explained experience gate's affirmative click. */
export async function requestOrientationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const orientation = deviceOrientationCtor()
  if (!orientation) return false
  try {
    orientationGranted =
      typeof orientation.requestPermission === "function"
        ? (await orientation.requestPermission()) === "granted"
        : true
  } catch {
    orientationGranted = false
  }
  if (orientationGranted) notifyOrientationGranted()
  return orientationGranted
}

export function notifyOrientationGranted() {
  if (typeof window === "undefined" || !orientationGranted) return
  window.dispatchEvent(new CustomEvent(ORIENTATION_GRANTED_EVENT))
}
