"use client"

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import {
  handoffVelocity,
  integrateSpring,
  isMagnetSettled,
  MAGNET_CAPTURE_VELOCITY,
  MAGNET_COAST_IDLE_MS,
  MAGNET_SETTLE_DISTANCE,
  MAGNET_SETTLE_FALLBACK_MS,
  MAGNET_VELOCITY_EMA,
  MAGNET_WHEEL_INTERRUPT_DELTA,
  measureSnapBlocks,
  nearestBlockIndex,
  pickStepTarget,
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
 * Native scroll, then a soft overdamped spring onto at most one category step.
 * Avoids hitch sources: no live rail writes, no settle restarts on residual wheel.
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
    /** px/s */
    let velocity = 0
    let frame = 0
    let idleTimer = 0
    let touching = false
    let driving = false
    let gestureActive = false
    let gestureOriginIndex = 0
    let lastScrollTop = scroller.scrollTop
    let lastScrollTs = performance.now()
    let lastInputTs = 0
    let driveTs = 0
    let lastCategoryId = ""
    let settledCategoryId = ""
    let lockedTarget: SnapBlock | null = null
    let selfScroll = false
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

    const writeScroll = (value: number) => {
      selfScroll = true
      scroller.scrollTop = value
      lastScrollTop = value
      lastScrollTs = performance.now()
      selfScroll = false
    }

    const emitActive = (categoryId: string) => {
      if (!categoryId || categoryId === lastCategoryId) return
      lastCategoryId = categoryId
      onActiveRef.current(categoryId)
    }

    const armGesture = () => {
      if (gestureActive) return
      const blocks = readBlocks()
      if (blocks.length === 0) return
      gestureOriginIndex = nearestBlockIndex(scroller.scrollTop, blocks)
      gestureActive = true
    }

    const finishSettle = (categoryId: string) => {
      cancelDrive()
      velocity = 0
      gestureActive = false
      if (categoryId && categoryId !== settledCategoryId) {
        settledCategoryId = categoryId
        onSettledRef.current(categoryId)
      } else if (categoryId) {
        emitActive(categoryId)
      }
    }

    const resolveStep = (useVelocity: number) => {
      const blocks = readBlocks()
      if (blocks.length === 0) return null
      if (!gestureActive) {
        gestureOriginIndex = nearestBlockIndex(scroller.scrollTop, blocks)
      }
      return pickStepTarget(
        scroller.scrollTop,
        useVelocity,
        blocks,
        gestureOriginIndex,
      )
    }

    const tick = (now: number) => {
      if (disposed) return
      frame = 0

      if (!enabledRef.current || touching || !lockedTarget) {
        cancelDrive()
        return
      }

      const blocks = readBlocks()
      const fresh = blocks.find((block) => block.id === lockedTarget!.id)
      const to = clampScroll((fresh ?? lockedTarget).top)
      emitActive(lockedTarget.id)

      if (reducedMotionRef.current) {
        writeScroll(to)
        finishSettle(lockedTarget.id)
        return
      }

      const dt = Math.min(0.032, Math.max(0.001, (now - driveTs) / 1000))
      driveTs = now

      if (isMagnetSettled(scroller.scrollTop, to, velocity)) {
        writeScroll(to)
        finishSettle(lockedTarget.id)
        return
      }

      const next = integrateSpring(scroller.scrollTop, velocity, to, dt)
      velocity = next.velocity
      writeScroll(clampScroll(next.position))

      if (isMagnetSettled(scroller.scrollTop, to, velocity)) {
        writeScroll(to)
        finishSettle(lockedTarget.id)
        return
      }

      frame = window.requestAnimationFrame(tick)
    }

    const beginSnap = () => {
      if (disposed || !enabledRef.current || touching || driving) return

      const target = resolveStep(velocity)
      if (!target) return

      const to = clampScroll(target.top)
      const distance = to - scroller.scrollTop

      if (Math.abs(distance) < MAGNET_SETTLE_DISTANCE) {
        writeScroll(to)
        finishSettle(target.id)
        return
      }

      if (reducedMotionRef.current) {
        writeScroll(to)
        finishSettle(target.id)
        return
      }

      velocity = handoffVelocity(distance, velocity)
      lockedTarget = target
      driving = true
      settledCategoryId = ""
      driveTs = performance.now()
      emitActive(target.id)
      frame = window.requestAnimationFrame(tick)
    }

    const interruptDriveForNewGesture = () => {
      if (!driving) return
      cancelDrive()
      gestureActive = false
    }

    const markInput = () => {
      lastInputTs = performance.now()
      armGesture()
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
        beginSnap()
      }, MAGNET_SETTLE_FALLBACK_MS)
    }

    const onPointerInput = () => {
      touching = true
      interruptDriveForNewGesture()
      markInput()
    }

    const onPointerRelease = () => {
      touching = false
      markInput()
      scheduleSettle()
    }

    const onWheel = (event: WheelEvent) => {
      touching = false

      // Trackpad keeps emitting tiny wheel events during coast/settle —
      // restarting the spring on those residuals is what felt like hitching.
      if (driving) {
        if (Math.abs(event.deltaY) < MAGNET_WHEEL_INTERRUPT_DELTA) return
        interruptDriveForNewGesture()
      }

      markInput()
    }

    const onScroll = () => {
      if (disposed || selfScroll) return

      const now = performance.now()
      const scrollTop = scroller.scrollTop
      const dtSec = Math.max(0.001, (now - lastScrollTs) / 1000)
      const instant = (scrollTop - lastScrollTop) / dtSec
      lastScrollTop = scrollTop
      lastScrollTs = now

      if (driving) return

      velocity =
        velocity * (1 - MAGNET_VELOCITY_EMA) + instant * MAGNET_VELOCITY_EMA

      if (!gestureActive && enabledRef.current) armGesture()

      const live = resolveStep(velocity)
      if (live) emitActive(live.id)

      if (!enabledRef.current || touching) return

      const sinceInput = now - lastInputTs
      if (
        sinceInput >= MAGNET_COAST_IDLE_MS &&
        Math.abs(velocity) > 12 &&
        Math.abs(velocity) <= MAGNET_CAPTURE_VELOCITY
      ) {
        window.clearTimeout(idleTimer)
        beginSnap()
        return
      }

      scheduleSettle()
    }

    const onScrollEnd = () => {
      window.clearTimeout(idleTimer)
      if (!enabledRef.current || touching || driving) return
      beginSnap()
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
