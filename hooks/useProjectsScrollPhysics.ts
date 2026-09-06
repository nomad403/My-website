"use client"

import { useEffect, type MutableRefObject, type RefObject } from "react"
import {
  RECENTER_DRIFT_BLOCKS,
  SNAP_CAPTURE_FRACTION,
  SNAP_CAPTURE_VELOCITY,
  SELECT_GLIDE_MS,
  SELECT_GLIDE_MS_MAX,
  SELECT_GLIDE_MS_PER_ITEM,
  SNAP_GLIDE_MS,
  WHEEL_FRICTION,
  WHEEL_IMMEDIATE,
  WHEEL_IMPULSE,
  WHEEL_MAX_VELOCITY,
  WHEEL_MIN_VELOCITY,
  clamp,
  easeOutQuint,
  loopShift,
  nearestVirtualIndex,
  normalizeWheelDelta,
  scrollTopForVirtualIndex,
  supportsScrollEndEvent,
  type ListMetrics,
} from "@/lib/projects-scroll-math"

interface UseProjectsScrollPhysicsArgs {
  scrollerRef: RefObject<HTMLDivElement | null>
  metricsRef: MutableRefObject<ListMetrics>
  velocityRef: MutableRefObject<number>
  lastScrollTopRef: MutableRefObject<number>
  frameRef: MutableRefObject<number>
  requestScrollTop: (target: number) => void
  syncWindow: (scrollTop: number) => boolean
  paintFallback: (scrollTop: number) => void
  /** Appelé pour animer le scroll vers un virtualIndex (clic item). */
  animateToVirtualIndexRef?: MutableRefObject<
    ((virtualIndex: number) => void) | null
  >
}

export function useProjectsScrollPhysics({
  scrollerRef,
  metricsRef,
  velocityRef,
  lastScrollTopRef,
  frameRef,
  requestScrollTop,
  syncWindow,
  paintFallback,
  animateToVirtualIndexRef,
}: UseProjectsScrollPhysicsArgs) {
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let disposed = false
    let idleTimer = 0
    let flingFrame = 0
    let glideFrame = 0
    let flingVelocity = 0
    const hasScrollEnd = supportsScrollEndEvent()

    const isAnimating = () => flingFrame !== 0 || glideFrame !== 0

    const cancelMotion = () => {
      if (flingFrame) {
        window.cancelAnimationFrame(flingFrame)
        flingFrame = 0
      }
      if (glideFrame) {
        window.cancelAnimationFrame(glideFrame)
        glideFrame = 0
      }
      flingVelocity = 0
    }

    const setSnapEnabled = (enabled: boolean) => {
      scroller.style.scrollSnapType = enabled ? "" : "none"
    }

    const settle = () => {
      if (disposed) return
      window.clearTimeout(idleTimer)

      if (isAnimating()) {
        idleTimer = window.setTimeout(settle, 120)
        return
      }

      velocityRef.current = 0

      const shift = loopShift(
        scroller.scrollTop,
        metricsRef.current,
        RECENTER_DRIFT_BLOCKS,
      )
      if (shift !== 0) {
        requestScrollTop(scroller.scrollTop + shift)
        return
      }

      syncWindow(scroller.scrollTop)
      paintFallback(scroller.scrollTop)
    }

    const frame = () => {
      frameRef.current = 0
      if (disposed) return

      const scrollTop = scroller.scrollTop
      velocityRef.current = scrollTop - lastScrollTopRef.current
      lastScrollTopRef.current = scrollTop

      const currentMetrics = metricsRef.current
      if (currentMetrics.itemHeight > 0) {
        const maxScrollTop =
          currentMetrics.trackHeight - currentMetrics.viewport
        if (
          scrollTop < currentMetrics.viewport ||
          scrollTop > maxScrollTop - currentMetrics.viewport
        ) {
          const shift = loopShift(scrollTop, currentMetrics, 0)
          if (shift !== 0) {
            cancelMotion()
            requestScrollTop(scrollTop + shift)
            return
          }
        }
      }

      syncWindow(scrollTop)
      paintFallback(scrollTop)
    }

    const onScroll = () => {
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(frame)
      }
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(settle, hasScrollEnd ? 320 : 140)
    }

    const glideTo = (to: number, durationMs: number) => {
      const from = scroller.scrollTop
      const distance = to - from
      if (Math.abs(distance) < 0.5) {
        setSnapEnabled(true)
        settle()
        return
      }

      cancelMotion()
      setSnapEnabled(false)
      velocityRef.current = 0

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
        setSnapEnabled(true)
        settle()
      }
      glideFrame = window.requestAnimationFrame(step)
    }

    const glideToNearest = () => {
      const currentMetrics = metricsRef.current
      if (currentMetrics.itemHeight <= 0) {
        setSnapEnabled(true)
        return
      }

      const to = scrollTopForVirtualIndex(
        nearestVirtualIndex(
          scroller.scrollTop,
          currentMetrics,
          velocityRef.current,
        ),
        currentMetrics,
      )
      glideTo(to, SNAP_GLIDE_MS)
    }

    const animateToVirtualIndex = (virtualIndex: number) => {
      const currentMetrics = metricsRef.current
      if (currentMetrics.itemHeight <= 0) return

      const to = scrollTopForVirtualIndex(virtualIndex, currentMetrics)
      const blocks = Math.abs(to - scroller.scrollTop) / currentMetrics.itemHeight
      const duration = clamp(
        SELECT_GLIDE_MS + blocks * SELECT_GLIDE_MS_PER_ITEM,
        SELECT_GLIDE_MS,
        SELECT_GLIDE_MS_MAX,
      )
      glideTo(to, duration)
    }

    if (animateToVirtualIndexRef) {
      animateToVirtualIndexRef.current = animateToVirtualIndex
    }

    const fling = () => {
      if (disposed) return
      scroller.scrollTop += flingVelocity
      const velocityBeforeDecay = flingVelocity
      flingVelocity *= WHEEL_FRICTION
      velocityRef.current = flingVelocity

      const currentMetrics = metricsRef.current
      if (currentMetrics.itemHeight > 0) {
        const target = scrollTopForVirtualIndex(
          nearestVirtualIndex(
            scroller.scrollTop,
            currentMetrics,
            velocityBeforeDecay,
          ),
          currentMetrics,
        )
        const distance = Math.abs(scroller.scrollTop - target)
        if (
          Math.abs(flingVelocity) < SNAP_CAPTURE_VELOCITY &&
          distance < currentMetrics.itemHeight * SNAP_CAPTURE_FRACTION
        ) {
          flingFrame = 0
          flingVelocity = 0
          glideToNearest()
          return
        }
      }

      if (Math.abs(flingVelocity) > WHEEL_MIN_VELOCITY) {
        flingFrame = window.requestAnimationFrame(fling)
        return
      }
      flingFrame = 0
      flingVelocity = 0
      glideToNearest()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()

      if (glideFrame) {
        window.cancelAnimationFrame(glideFrame)
        glideFrame = 0
      }
      setSnapEnabled(false)

      const currentMetrics = metricsRef.current
      const itemHeight = Math.max(1, currentMetrics.itemHeight || 48)
      const delta = normalizeWheelDelta(event, scroller.clientHeight)
      const immediate = clamp(
        delta * WHEEL_IMMEDIATE,
        -itemHeight * 0.35,
        itemHeight * 0.35,
      )
      const impulse = clamp(
        delta * WHEEL_IMPULSE,
        -itemHeight * 0.45,
        itemHeight * 0.45,
      )
      scroller.scrollTop += immediate
      flingVelocity = clamp(
        flingVelocity + impulse,
        -WHEEL_MAX_VELOCITY,
        WHEEL_MAX_VELOCITY,
      )
      velocityRef.current = flingVelocity

      if (!flingFrame) flingFrame = window.requestAnimationFrame(fling)
    }

    scroller.addEventListener("scroll", onScroll, { passive: true })
    scroller.addEventListener("wheel", onWheel, { passive: false })
    if (hasScrollEnd) scroller.addEventListener("scrollend", settle)

    return () => {
      disposed = true
      cancelMotion()
      if (animateToVirtualIndexRef) {
        animateToVirtualIndexRef.current = null
      }
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("scroll", onScroll)
      if (hasScrollEnd) scroller.removeEventListener("scrollend", settle)
      window.clearTimeout(idleTimer)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    }
  }, [
    animateToVirtualIndexRef,
    frameRef,
    lastScrollTopRef,
    metricsRef,
    paintFallback,
    requestScrollTop,
    scrollerRef,
    syncWindow,
    velocityRef,
  ])
}
