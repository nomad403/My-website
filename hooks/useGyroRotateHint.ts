"use client"

import { useEffect, useRef, useState } from "react"
import { ORIENTATION_GRANTED_EVENT } from "@/lib/interaction"
import {
  markGyroHintShown,
  wasGyroHintShown,
} from "@/hooks/useGyroscopeAccessible"
import {
  HOME_TITLE_SHUFFLE_MS,
  HOME_TITLE_STAGGER_MS,
} from "@/lib/home-title-style"

const HOLD_MS = 3800

/** Après autorisation gyro : shuffle du titre → hint FR/EN, une fois par session. */
export function useGyroRotateHint(
  currentPage: string,
  showHomeTitle: boolean,
) {
  const [rotateHintActive, setRotateHintActive] = useState(false)
  const currentPageRef = useRef(currentPage)
  const showHomeTitleRef = useRef(showHomeTitle)
  currentPageRef.current = currentPage
  showHomeTitleRef.current = showHomeTitle

  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | null = null

    const onGranted = () => {
      if (wasGyroHintShown()) return
      markGyroHintShown()
      if (currentPageRef.current !== "home" || !showHomeTitleRef.current) return
      setRotateHintActive(true)
      holdTimer = setTimeout(() => {
        setRotateHintActive(false)
      }, HOME_TITLE_SHUFFLE_MS + HOME_TITLE_STAGGER_MS + HOLD_MS)
    }

    window.addEventListener(ORIENTATION_GRANTED_EVENT, onGranted)
    return () => {
      window.removeEventListener(ORIENTATION_GRANTED_EVENT, onGranted)
      if (holdTimer) clearTimeout(holdTimer)
    }
  }, [])

  return rotateHintActive
}
