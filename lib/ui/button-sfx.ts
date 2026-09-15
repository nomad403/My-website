import { playSiteSfx, unlockSiteSfx } from "@/lib/ui/site-sfx"

/** @deprecated use playSiteSfx("ui.tap") — conservé pour compat. */
export function preloadButtonSfx() {
  unlockSiteSfx()
}

export function playButtonSfx() {
  playSiteSfx("ui.tap")
}
