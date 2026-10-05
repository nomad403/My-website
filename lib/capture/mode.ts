export function isCaptureMode(search: string) {
  return new URLSearchParams(search).get("capture") === "1"
}
