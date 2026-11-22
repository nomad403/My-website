"use client"

import { useEffect } from "react"
import { useAudioGate } from "@/components/chrome/AudioGate"
import { playButtonSfx, preloadButtonSfx } from "@/lib/ui/button-sfx"
import {
  armSiteSfxGestureUnlock,
  isSiteSfxMuted,
  primeSiteSfxFromUserGesture,
  startAmbientLoop,
  unlockSiteSfx,
} from "@/lib/ui/site-sfx"

const INTERACTIVE_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  'input[type="submit"]:not(:disabled)',
  'input[type="button"]:not(:disabled)',
  '[role="button"]:not([aria-disabled="true"])',
  ".cursor-pointer",
].join(", ")

function findInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return null

  const el = target.closest(INTERACTIVE_SELECTOR)
  if (!el || el.closest("[data-no-sfx]")) return null

  if (el instanceof HTMLButtonElement && el.disabled) return null
  if (el instanceof HTMLInputElement && el.disabled) return null
  if (el.getAttribute("aria-disabled") === "true") return null

  return el
}

export default function ButtonSfxListener() {
  const { visible: entryVisible } = useAudioGate()
  useEffect(() => {
    if (entryVisible) return

    // After reload with saved preference: wait for the next real gesture.
    armSiteSfxGestureUnlock()
    startAmbientLoop()

    const unlock = () => {
      if (isSiteSfxMuted()) return
      primeSiteSfxFromUserGesture()
      startAmbientLoop()
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isSiteSfxMuted()) return
      primeSiteSfxFromUserGesture()
      if (!findInteractiveTarget(event.target)) return
      preloadButtonSfx()
      // Play in the same gesture turn; resume() may still be pending but
      // playSiteSfx retries once the context is running.
      playButtonSfx()
      void unlockSiteSfx()
    }

    document.addEventListener("pointerdown", unlock, { capture: true, passive: true })
    document.addEventListener("keydown", unlock, { capture: true, passive: true })
    document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true })

    return () => {
      document.removeEventListener("pointerdown", unlock, true)
      document.removeEventListener("keydown", unlock, true)
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [entryVisible])

  return null
}
