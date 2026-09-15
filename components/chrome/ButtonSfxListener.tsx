"use client"

import { useEffect } from "react"
import { playButtonSfx, preloadButtonSfx } from "@/lib/ui/button-sfx"
import { unlockSiteSfx } from "@/lib/ui/site-sfx"

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
  useEffect(() => {
    const unlock = () => {
      void unlockSiteSfx()
    }
    const handleClick = (event: MouseEvent) => {
      if (!findInteractiveTarget(event.target)) return
      void unlockSiteSfx().then(() => {
        preloadButtonSfx()
        playButtonSfx()
      })
    }

    document.addEventListener("pointerdown", unlock, { passive: true })
    document.addEventListener("keydown", unlock, { passive: true })
    document.addEventListener("click", handleClick, { passive: true })

    return () => {
      document.removeEventListener("pointerdown", unlock)
      document.removeEventListener("keydown", unlock)
      document.removeEventListener("click", handleClick)
    }
  }, [])

  return null
}
