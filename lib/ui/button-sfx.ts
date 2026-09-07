const SFX_SRC = "/sfx/428069__newagesoup__newagesoup_fx_gui_38.wav"
const VOLUME = 0.4

let template: HTMLAudioElement | null = null

function canPlaySfx() {
  if (typeof window === "undefined") return false
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function preloadButtonSfx() {
  if (!canPlaySfx() || template) return
  template = new Audio(SFX_SRC)
  template.volume = VOLUME
  template.load()
}

export function playButtonSfx() {
  if (!canPlaySfx()) return

  if (!template) {
    preloadButtonSfx()
  }
  if (!template) return

  const clip = template.cloneNode() as HTMLAudioElement
  clip.volume = VOLUME
  void clip.play().catch(() => {})
}
