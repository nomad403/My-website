"use client"

import { useEffect } from "react"
import { playButtonSfx, preloadButtonSfx } from "@/lib/button-sfx"

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
    const handleClick = (event: MouseEvent) => {
      if (!findInteractiveTarget(event.target)) return
      preloadButtonSfx()
      playButtonSfx()
    }

    document.addEventListener("click", handleClick, { passive: true })

    return () => {
      document.removeEventListener("click", handleClick)
    }
  }, [])

  return null
}
