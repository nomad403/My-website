"use client"

import { useEffect, useState } from "react"

export function useViewportSize() {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setSize(previous => previous?.width === width && previous.height === height
        ? previous : { width, height })
    }
    update()
    let timer: ReturnType<typeof setTimeout> | undefined
    const resize = () => {
      clearTimeout(timer)
      // Update before the GPU overlay's 120 ms resize debounce so its pending
      // rebuild is cancelled when the responsive character size changes.
      timer = setTimeout(update, 100)
    }
    window.addEventListener("resize", resize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return size
}
