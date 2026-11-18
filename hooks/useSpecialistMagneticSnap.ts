"use client"

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import {
  clamp,
  isMagnetSettled,
  MAGNET_CAPTURE_VELOCITY,
  MAGNET_COAST_IDLE_MS,
  MAGNET_MIN_VELOCITY,
  MAGNET_SETTLE_DISTANCE,
  MAGNET_SETTLE_FALLBACK_MS,
  MAGNET_VELOCITY_EMA,
  measureSnapBlocks,
  pickMagneticTarget,
  stepMagneticVelocity,
  type SnapBlock,
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
 * Native trackpad/touch scroll, then inertia-based magnetic snap.
 * No wheel hijack: sensitivity stays browser-native; we only finish the coast.
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
    let idleTimer = 0
    let touching = false
    let driving = false
    let lastScrollTop = scroller.scrollTop
    let lastScrollTs = performance.now()
    let lastInputTs = 0
    let lastCategoryId = ""
    let settledCategoryId = ""
    let lockedTarget: SnapBlock | null = null
    const hasScrollEnd = "onscrollend" in scroller

    const cancelDrive = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      driving = false
      lockedTarget = null
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
      cancelDrive()
      velocity = 0
      if (categoryId && categoryId !== settledCategoryId) {
        settledCategoryId = categoryId
        onSettledRef.current(categoryId)
      } else if (categoryId) {
        emitActive(categoryId)
      }
    }

    const resolveTarget = (useVelocity: number) => {
      const blocks = readBlocks()
      return pickMagneticTarget(
        scroller.scrollTop,
        scroller.clientHeight,
        useVelocity,
        blocks,
      )
    }

    const tick = () => {
      if (disposed) return
      frame = 0

      if (!enabledRef.current || touching || !lockedTarget) {
        cancelDrive()
        return
      }

      const to = clampScroll(lockedTarget.top)
      emitActive(lockedTarget.id)

      if (reducedMotionRef.current) {
        scroller.scrollTop = to
        finishSettle(lockedTarget.id)
        return
      }

      if (isMagnetSettled(scroller.scrollTop, to, velocity)) {
        scroller.scrollTop = to
        finishSettle(lockedTarget.id)
        return
      }

      velocity = stepMagneticVelocity(scroller.scrollTop, to, velocity)
      scroller.scrollTop = clampScroll(scroller.scrollTop + velocity)
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
      finishSettle(lockedTarget.id)
    }

    const beginSnap = (reason: "coast" | "end") => {
      if (disposed || !enabledRef.current || touching || driving) return

      const target = resolveTarget(velocity)
      if (!target) return

      const to = clampScroll(target.top)
      const distance = to - scroller.scrollTop

      if (Math.abs(distance) < MAGNET_SETTLE_DISTANCE) {
        scroller.scrollTop = to
        finishSettle(target.id)
        return
      }

      if (reducedMotionRef.current) {
        scroller.scrollTop = to
        finishSettle(target.id)
        return
      }

      // Inherit coast velocity; nudge toward target so motion never restarts from rest.
      if (Math.sign(velocity) !== Math.sign(distance) || Math.abs(velocity) < 0.4) {
        velocity = clamp(distance * 0.08, -MAGNET_CAPTURE_VELOCITY, MAGNET_CAPTURE_VELOCITY)
      }

      lockedTarget = target
      driving = true
      settledCategoryId = ""
      emitActive(target.id)
      void reason
      frame = window.requestAnimationFrame(tick)
    }

    const markInput = () => {
      lastInputTs = performance.now()
      if (driving) cancelDrive()
      window.clearTimeout(idleTimer)
    }

    const scheduleSettle = () => {
      window.clearTimeout(idleTimer)
      if (!enabledRef.current || touching || driving) return
      idleTimer = window.setTimeout(() => {
        if (disposed || touching || driving || !enabledRef.current) return
        const sinceInput = performance.now() - lastInputTs
        if (sinceInput < MAGNET_COAST_IDLE_MS) {
          scheduleSettle()
          return
        }
        beginSnap("end")
      }, MAGNET_SETTLE_FALLBACK_MS)
    }

    const onPointerInput = () => {
      touching = true
      markInput()
    }

    const onPointerRelease = () => {
      touching = false
      markInput()
      scheduleSettle()
    }

    const onWheel = () => {
      touching = false
      markInput()
    }

    const onScroll = () => {
      if (disposed) return

      const now = performance.now()
      const scrollTop = scroller.scrollTop
      const dt = Math.max(8, now - lastScrollTs)
      const instant = ((scrollTop - lastScrollTop) / dt) * 16.67
      lastScrollTop = scrollTop
      lastScrollTs = now

      if (driving) return

      velocity =
        velocity * (1 - MAGNET_VELOCITY_EMA) + instant * MAGNET_VELOCITY_EMA

      const live = resolveTarget(0)
      if (live) emitActive(live.id)

      if (!enabledRef.current || touching) return

      const sinceInput = now - lastInputTs
      // Native coast: once input stopped and speed drops, finish with inertia snap.
      if (
        sinceInput >= MAGNET_COAST_IDLE_MS &&
        Math.abs(velocity) > 0.05 &&
        Math.abs(velocity) <= MAGNET_CAPTURE_VELOCITY
      ) {
        window.clearTimeout(idleTimer)
        beginSnap("coast")
        return
      }

      scheduleSettle()
    }

    const onScrollEnd = () => {
      window.clearTimeout(idleTimer)
      if (!enabledRef.current || touching || driving) return
      beginSnap("end")
    }

    scroller.addEventListener("wheel", onWheel, { passive: true })
    scroller.addEventListener("touchstart", onPointerInput, { passive: true })
    scroller.addEventListener("touchend", onPointerRelease, { passive: true })
    scroller.addEventListener("touchcancel", onPointerRelease, { passive: true })
    scroller.addEventListener("pointerdown", onPointerInput, { passive: true })
    scroller.addEventListener("pointerup", onPointerRelease, { passive: true })
    scroller.addEventListener("scroll", onScroll, { passive: true })
    if (hasScrollEnd) scroller.addEventListener("scrollend", onScrollEnd)

    return () => {
      disposed = true
      window.clearTimeout(idleTimer)
      cancelDrive()
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("touchstart", onPointerInput)
      scroller.removeEventListener("touchend", onPointerRelease)
      scroller.removeEventListener("touchcancel", onPointerRelease)
      scroller.removeEventListener("pointerdown", onPointerInput)
      scroller.removeEventListener("pointerup", onPointerRelease)
      scroller.removeEventListener("scroll", onScroll)
      if (hasScrollEnd) scroller.removeEventListener("scrollend", onScrollEnd)
    }
  }, [scrollerRef, blockRefs])
}
