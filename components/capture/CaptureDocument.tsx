"use client"

import { useEffect } from "react"
import { getCaptureScale } from "@/lib/capture/config"

/** Marks the logical iframe document without changing its viewport semantics. */
export default function CaptureDocument() {
  useEffect(() => {
    const root = document.documentElement
    root.classList.add("capture-document")
    root.style.setProperty("--capture-scale", String(getCaptureScale(window.location.search)))
    return () => {
      root.classList.remove("capture-document")
      root.style.removeProperty("--capture-scale")
    }
  }, [])

  return null
}
