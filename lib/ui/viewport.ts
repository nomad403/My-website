/**
 * A tall viewport is intentionally treated as the compact layout even when its
 * pixel width is large (for example a 1080 × 1920 capture target).
 */
export const MOBILE_VIEWPORT_QUERY =
  "(max-width: 767px), (orientation: portrait)"
