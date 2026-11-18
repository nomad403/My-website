"use client"

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import {
  easeOutQuint,
  measureSnapBlocks,
  pickMagneticTarget,
  snapDurationMs,
} from "@/lib/specialist/magnetic-snap"

interface UseSpecialistMagneticSnapOptions {
  scrollerRef: RefObject<HTMLDivElement | null>
  blockRefs: MutableRefObject<Map<string, HTMLElement>>
  /** Disable while a service row is expanded (height is unstable). */
  enabled: boolean
  reducedMotion: boolean
  /** Live category while dragging — no shuffle. */
  onActiveCategory: (categoryId: string) => void
  /** Category after magnetic settle — may shuffle. */
  onSettledCategory: (categoryId: string) => void
}

/**
 * Free native scroll during the gesture, then a smooth adaptive magnetic snap
 * to the nearest (or momentum-biased) category block.
 */
export function useSpecialistMagneticSnap({
  scrollerRef,
  blockRefs,
  enabled,
  reducedMotion,
  onActiveCategory,
  onSettledCategory,
}: UseSpecialistMagneticSnapOptions) {
  const enabledRef = useRef(enabled)
  const reducedMotionRef = useRef(reducedMotion)
  const onActiveRef = useRef(onActiveCategory)
  const onSettledRef = useRef(onSettledCategory)
  enabledRef.current = enabled
  reducedMotionRef.current = reducedMotion
  onActiveRef.current = onActiveCategory
  onSettledRef.current = onSettledCategory

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let disposed = false
    let lastScrollTop = scroller.scrollTop
    let velocity = 0
    let idleTimer = 0
    let glideFrame = 0
    let ticking = false
    let snapping = false
    const hasScrollEnd = "onscrollend" in scroller

    const cancelGlide = () => {
      if (glideFrame) {
        cancelAnimationFrame(glideFrame)
        glideFrame = 0
      }
    }

    const readBlocks = () =>
      measureSnapBlocks(scroller, blockRefs.current.values())

    const syncActiveFromScroll = () => {
      const blocks = readBlocks()
      if (blocks.length === 0) return
      const target = pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        0,
        blocks,
      )
      if (target) onActiveRef.current(target.id)
    }

    const glideTo = (to: number, categoryId: string, durationMs: number) => {
      const from = scroller.scrollTop
      const distance = to - from
      if (Math.abs(distance) < 1.5 || durationMs <= 0) {
        scroller.scrollTop = to
        snapping = false
        onSettledRef.current(categoryId)
        return
      }

      cancelGlide()
      snapping = true
      const startedAt = performance.now()

      const step = (now: number) => {
        if (disposed) return
        const progress = Math.min(1, (now - startedAt) / durationMs)
        scroller.scrollTop = from + distance * easeOutQuint(progress)
        if (progress < 1) {
          glideFrame = window.requestAnimationFrame(step)
          return
        }
        glideFrame = 0
        snapping = false
        onSettledRef.current(categoryId)
      }

      glideFrame = window.requestAnimationFrame(step)
    }

    const settle = () => {
      if (disposed || !enabledRef.current || snapping) return
      const blocks = readBlocks()
      if (blocks.length === 0) return

      const target = pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        velocity,
        blocks,
      )
      if (!target) return

      const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight)
      const to = Math.min(maxScroll, Math.max(0, target.top))
      const distance = to - scroller.scrollTop
      glideTo(to, target.id, snapDurationMs(distance, reducedMotionRef.current))
    }

    const onScroll = () => {
      if (snapping) return
      const scrollTop = scroller.scrollTop
      velocity = scrollTop - lastScrollTop
      lastScrollTop = scrollTop

      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(() => {
          ticking = false
          if (!disposed && !snapping) syncActiveFromScroll()
        })
      }

      window.clearTimeout(idleTimer)
      if (!enabledRef.current) return
      idleTimer = window.setTimeout(settle, hasScrollEnd ? 140 : 110)
    }

    const onScrollEnd = () => {
      window.clearTimeout(idleTimer)
      if (enabledRef.current) settle()
    }

    const onWheel = () => {
      // User took over: abort an in-flight magnetic glide.
      if (snapping) {
        cancelGlide()
        snapping = false
      }
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    scroller.addEventListener("wheel", onWheel, { passive: true })
    scroller.addEventListener("touchstart", onWheel, { passive: true })
    if (hasScrollEnd) {
      scroller.addEventListener("scrollend", onScrollEnd)
    }

    return () => {
      disposed = true
      window.clearTimeout(idleTimer)
      cancelGlide()
      scroller.removeEventListener("scroll", onScroll)
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("touchstart", onWheel)
      if (hasScrollEnd) {
        scroller.removeEventListener("scrollend", onScrollEnd)
      }
    }
  }, [scrollerRef, blockRefs])
}
