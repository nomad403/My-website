"use client"

import { useEffect, useState } from "react"
import { ORIENTATION_GRANTED_EVENT, wasOrientationGranted } from "@/lib/ui/interaction"
import {
  HOME_TITLE_SHUFFLE_MS,
  HOME_TITLE_STAGGER_MS,
} from "@/lib/home/home-title-style"

const HOLD_MS = 3800

/** Show the localized hint on each home arrival after explicit sensor consent. */
export function useGyroRotateHint(
  currentPage: string,
  showHomeTitle: boolean,
) {
  const [rotateHintActive, setRotateHintActive] = useState(false)
  useEffect(() => {
    setRotateHintActive(false)
    if (currentPage !== "home" || !showHomeTitle) return

    let holdTimer: ReturnType<typeof setTimeout> | null = null
    let shown = false

    const onGranted = () => {
      if (shown || !wasOrientationGranted()) return
      shown = true
      setRotateHintActive(true)
      holdTimer = setTimeout(() => {
        setRotateHintActive(false)
      }, HOME_TITLE_SHUFFLE_MS + HOME_TITLE_STAGGER_MS + HOLD_MS)
    }

    window.addEventListener(ORIENTATION_GRANTED_EVENT, onGranted)
    // Consent may predate the title or be granted on another page. Do not wait
    // for the first sensor reading, which can arrive late or never arrive.
    onGranted()
    return () => {
      window.removeEventListener(ORIENTATION_GRANTED_EVENT, onGranted)
      if (holdTimer) clearTimeout(holdTimer)
    }
  }, [currentPage, showHomeTitle])

  return rotateHintActive
}
