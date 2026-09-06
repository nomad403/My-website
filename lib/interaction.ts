export function isInteractiveClickTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return !!target.closest(
    "a, button, input, textarea, select, label, [role='button'], [role='link']"
  )
}

export const ORIENTATION_GRANTED_EVENT = "nomad403:orientation-granted"

export function notifyOrientationGranted() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(ORIENTATION_GRANTED_EVENT))
}

export function attachOrientationPermissionOnBackgroundGesture(
  requestPermission: () => void | Promise<void>
) {
  if (typeof window === "undefined") return () => {}

  const handleGesture = (event: Event) => {
    if (isInteractiveClickTarget(event.target)) return
    window.removeEventListener("touchend", handleGesture)
    window.removeEventListener("click", handleGesture)
    void requestPermission()
  }

  window.addEventListener("touchend", handleGesture, { passive: true })
  window.addEventListener("click", handleGesture, { passive: true })

  return () => {
    window.removeEventListener("touchend", handleGesture)
    window.removeEventListener("click", handleGesture)
  }
}
