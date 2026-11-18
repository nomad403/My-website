"use client"

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import {
  clamp,
  isMagnetSettled,
  MAGNET_CAPTURE_VELOCITY,
  MAGNET_MIN_VELOCITY,
  MAGNET_SETTLE_DISTANCE,
  MAGNET_WHEEL_IMMEDIATE,
  MAGNET_WHEEL_IMMEDIATE_CAP,
  MAGNET_WHEEL_IMPULSE,
  MAGNET_WHEEL_IMPULSE_CAP,
  MAGNET_WHEEL_MAX_VELOCITY,
  measureSnapBlocks,
  normalizeWheelDelta,
  pickMagneticTarget,
  stepMagneticVelocity,
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
 * Continuous magnetic scroll: wheel/trackpad never idles then snaps.
 * Motion is one physics loop (impulse → friction → strengthening magnet).
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
    let velocity = 0
    let frame = 0
    let touching = false
    let lastScrollTop = scroller.scrollTop
    let lastScrollTs = performance.now()
    let lastCategoryId = ""
    let settledCategoryId = ""

    const cancelMotion = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const maxScroll = () =>
      Math.max(0, scroller.scrollHeight - scroller.clientHeight)

    const readBlocks = () =>
      measureSnapBlocks(scroller, blockRefs.current.values())

    const clampScroll = (value: number) =>
      Math.min(maxScroll(), Math.max(0, value))

    const emitActive = (categoryId: string) => {
      if (!categoryId || categoryId === lastCategoryId) return
      lastCategoryId = categoryId
      onActiveRef.current(categoryId)
    }

    const finishSettle = (categoryId: string) => {
      cancelMotion()
      velocity = 0
      if (categoryId && categoryId !== settledCategoryId) {
        settledCategoryId = categoryId
        onSettledRef.current(categoryId)
      } else if (categoryId) {
        emitActive(categoryId)
      }
    }

    const jumpToTarget = () => {
      const blocks = readBlocks()
      const target = pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        velocity,
        blocks,
      )
      if (!target) return
      scroller.scrollTop = clampScroll(target.top)
      finishSettle(target.id)
    }

    const tick = () => {
      if (disposed) return
      frame = 0

      if (!enabledRef.current || touching) {
        velocity = 0
        return
      }

      const blocks = readBlocks()
      if (blocks.length === 0) {
        velocity = 0
        return
      }

      const target = pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        velocity,
        blocks,
      )
      if (!target) {
        velocity = 0
        return
      }

      const to = clampScroll(target.top)
      emitActive(target.id)

      if (reducedMotionRef.current) {
        scroller.scrollTop = to
        finishSettle(target.id)
        return
      }

      if (isMagnetSettled(scroller.scrollTop, to, velocity)) {
        scroller.scrollTop = to
        finishSettle(target.id)
        return
      }

      // Once slow enough, magnet owns the rest — still continuous, no pause.
      if (Math.abs(velocity) < MAGNET_CAPTURE_VELOCITY) {
        velocity = stepMagneticVelocity(scroller.scrollTop, to, velocity)
      } else {
        velocity *= 0.94
        // Soft foresight pull so fast motion already leans toward the target.
        velocity += (to - scroller.scrollTop) * 0.035
      }

      const next = clampScroll(scroller.scrollTop + velocity)
      if (next === 0 || next === maxScroll()) {
        // Edge bounce kill — settle to nearest edge category.
        scroller.scrollTop = next
        velocity *= 0.4
      } else {
        scroller.scrollTop = next
      }

      lastScrollTop = scroller.scrollTop
      lastScrollTs = performance.now()

      if (
        Math.abs(velocity) > MAGNET_MIN_VELOCITY ||
        Math.abs(to - scroller.scrollTop) > MAGNET_SETTLE_DISTANCE
      ) {
        frame = window.requestAnimationFrame(tick)
        return
      }

      scroller.scrollTop = to
      finishSettle(target.id)
    }

    const ensureTick = () => {
      if (!frame && !disposed) frame = window.requestAnimationFrame(tick)
    }

    const onWheel = (event: WheelEvent) => {
      if (!enabledRef.current) return
      if (event.ctrlKey) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

      // Own the gesture so native inertia never dies, then a second snap starts.
      event.preventDefault()
      touching = false

      if (reducedMotionRef.current) {
        scroller.scrollTop = clampScroll(
          scroller.scrollTop + normalizeWheelDelta(event, scroller.clientHeight),
        )
        jumpToTarget()
        return
      }

      const delta = normalizeWheelDelta(event, scroller.clientHeight)
      const viewport = Math.max(1, scroller.clientHeight)
      const immediate = clamp(
        delta * MAGNET_WHEEL_IMMEDIATE,
        -viewport * MAGNET_WHEEL_IMMEDIATE_CAP,
        viewport * MAGNET_WHEEL_IMMEDIATE_CAP,
      )
      const impulse = clamp(
        delta * MAGNET_WHEEL_IMPULSE,
        -viewport * MAGNET_WHEEL_IMPULSE_CAP,
        viewport * MAGNET_WHEEL_IMPULSE_CAP,
      )

      scroller.scrollTop = clampScroll(scroller.scrollTop + immediate)
      velocity = clamp(
        velocity + impulse,
        -MAGNET_WHEEL_MAX_VELOCITY,
        MAGNET_WHEEL_MAX_VELOCITY,
      )
      lastScrollTop = scroller.scrollTop
      lastScrollTs = performance.now()
      settledCategoryId = ""

      const blocks = readBlocks()
      const live = pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        velocity,
        blocks,
      )
      if (live) emitActive(live.id)

      ensureTick()
    }

    const onTouchStart = () => {
      touching = true
      cancelMotion()
      velocity = 0
      lastScrollTop = scroller.scrollTop
      lastScrollTs = performance.now()
    }

    const onTouchEnd = () => {
      if (!enabledRef.current) {
        touching = false
        return
      }
      touching = false
      // Hand off native residual motion into the same continuous magnet loop.
      const now = performance.now()
      const dt = Math.max(8, now - lastScrollTs)
      const sampled = ((scroller.scrollTop - lastScrollTop) / dt) * 16.67
      velocity = clamp(sampled, -MAGNET_WHEEL_MAX_VELOCITY, MAGNET_WHEEL_MAX_VELOCITY)
      settledCategoryId = ""
      if (reducedMotionRef.current) {
        jumpToTarget()
        return
      }
      ensureTick()
    }

    const onScroll = () => {
      if (frame || !touching) return
      const now = performance.now()
      const scrollTop = scroller.scrollTop
      // Sample while finger is down so touchend inherits real momentum.
      const dt = Math.max(8, now - lastScrollTs)
      velocity = clamp(
        ((scrollTop - lastScrollTop) / dt) * 16.67,
        -MAGNET_WHEEL_MAX_VELOCITY,
        MAGNET_WHEEL_MAX_VELOCITY,
      )
      lastScrollTop = scrollTop
      lastScrollTs = now

      const blocks = readBlocks()
      const live = pickMagneticTarget(
        scrollTop,
        scroller.clientHeight,
        0,
        blocks,
      )
      if (live) emitActive(live.id)
    }

    scroller.addEventListener("wheel", onWheel, { passive: false })
    scroller.addEventListener("touchstart", onTouchStart, { passive: true })
    scroller.addEventListener("touchend", onTouchEnd, { passive: true })
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true })
    scroller.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      disposed = true
      cancelMotion()
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("touchstart", onTouchStart)
      scroller.removeEventListener("touchend", onTouchEnd)
      scroller.removeEventListener("touchcancel", onTouchEnd)
      scroller.removeEventListener("scroll", onScroll)
    }
  }, [scrollerRef, blockRefs])
}
