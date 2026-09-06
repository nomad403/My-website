"use client"

import { useEffect, useState } from "react"

/** Vrai uniquement sur appareils avec vrai hover (souris), pas au tap tactile. */
const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)"

export function useCanHover() {
  // false au SSR / 1er rendu → évite les hovers fantômes au tap mobile
  const [canHover, setCanHover] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(CAN_HOVER_QUERY)
    const update = () => setCanHover(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  return canHover
}
