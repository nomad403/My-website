/**
 * Layout follows CSS width. Large portrait viewports keep the desktop layout
 * for vertical captures in DevTools.
 */
export const MOBILE_VIEWPORT_QUERY = "(max-width: 767px)"

export function matchesMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
}
