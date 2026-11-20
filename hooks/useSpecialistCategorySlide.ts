"use client"

import { useEffect, useRef, type MutableRefObject, type RefObject } from "react"
import { clamp, easeOutQuint, normalizeWheelDelta } from "@/lib/scroll"

const SLIDE_MS = 420
const SLIDE_MS_MIN = 320
const SLIDE_MS_MAX = 520
const WHEEL_STEP_THRESHOLD = 42
const TOUCH_STEP_THRESHOLD = 48
/** Match SpecialistServiceRow exit duration so layout is stable before measuring. */
const DETAIL_COLLAPSE_MS = 300

interface UseSpecialistCategorySlideOptions {
  scrollerRef: RefObject<HTMLDivElement | null>
  blockRefs: MutableRefObject<Map<string, HTMLElement>>
  categoryIds: readonly string[]
  activeCategoryId: string
  enabled: boolean
  reducedMotion: boolean
  /** True while a service detail panel is expanded. */
  detailOpen: boolean
  /** Collapse the open detail before measuring / sliding. */
  onCollapseDetail: () => void
  onCategoryChange: (categoryId: string) => void
}

function blockTop(scroller: HTMLElement, block: HTMLElement) {
  return (
    block.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  )
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Controlled category paging: one scroll/swipe gesture → one slide up or down.
 * Open details are collapsed first so expand height cannot desync the snap.
 */
export function useSpecialistCategorySlide({
  scrollerRef,
  blockRefs,
  categoryIds,
  activeCategoryId,
  enabled,
  reducedMotion,
  detailOpen,
  onCollapseDetail,
  onCategoryChange,
}: UseSpecialistCategorySlideOptions) {
  const enabledRef = useRef(enabled)
  const reducedMotionRef = useRef(reducedMotion)
  const activeIdRef = useRef(activeCategoryId)
  const detailOpenRef = useRef(detailOpen)
  const onCollapseRef = useRef(onCollapseDetail)
  const onChangeRef = useRef(onCategoryChange)
  const categoryIdsRef = useRef(categoryIds)
  enabledRef.current = enabled
  reducedMotionRef.current = reducedMotion
  activeIdRef.current = activeCategoryId
  detailOpenRef.current = detailOpen
  onCollapseRef.current = onCollapseDetail
  onChangeRef.current = onCategoryChange
  categoryIdsRef.current = categoryIds

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let disposed = false
    let animating = false
    let busy = false
    let frame = 0
    let wheelAcc = 0
    let touchStartY = 0
    let touchActive = false

    const cancelAnim = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
      animating = false
    }

    const maxScroll = () =>
      Math.max(0, scroller.scrollHeight - scroller.clientHeight)

    const indexOf = (id: string) => {
      const index = categoryIdsRef.current.indexOf(id)
      return index >= 0 ? index : 0
    }

    /** Keep the active category pinned to the top after expand/collapse/layout. */
    const syncActivePosition = () => {
      if (disposed || animating) return
      const block = blockRefs.current.get(activeIdRef.current)
      if (!block) return
      const to = clamp(blockTop(scroller, block), 0, maxScroll())
      if (Math.abs(scroller.scrollTop - to) > 1) scroller.scrollTop = to
    }

    const slideToIndex = (nextIndex: number) => {
      if (disposed || animating) return
      const ids = categoryIdsRef.current
      const clamped = clamp(nextIndex, 0, Math.max(0, ids.length - 1))
      const id = ids[clamped]
      if (!id) return

      const block = blockRefs.current.get(id)
      if (!block) return

      const to = clamp(blockTop(scroller, block), 0, maxScroll())
      const from = scroller.scrollTop
      const distance = to - from

      activeIdRef.current = id
      onChangeRef.current(id)

      if (Math.abs(distance) < 1 || reducedMotionRef.current) {
        scroller.scrollTop = to
        return
      }

      animating = true
      const duration = clamp(
        SLIDE_MS + Math.abs(distance) * 0.12,
        SLIDE_MS_MIN,
        SLIDE_MS_MAX,
      )
      const startedAt = performance.now()

      const step = (now: number) => {
        if (disposed) return
        const progress = Math.min(1, (now - startedAt) / duration)
        scroller.scrollTop = from + distance * easeOutQuint(progress)
        if (progress < 1) {
          frame = window.requestAnimationFrame(step)
          return
        }
        frame = 0
        const liveBlock = blockRefs.current.get(id)
        scroller.scrollTop = liveBlock
          ? clamp(blockTop(scroller, liveBlock), 0, maxScroll())
          : to
        animating = false
        wheelAcc = 0
      }

      frame = window.requestAnimationFrame(step)
    }

    /** Close any open detail and wait until height is back before measuring. */
    const ensureDetailCollapsed = async () => {
      if (!detailOpenRef.current) return
      onCollapseRef.current()
      const settleMs = reducedMotionRef.current ? 0 : DETAIL_COLLAPSE_MS
      if (settleMs > 0) await wait(settleMs)
      if (disposed) return
      // Two frames: React commit + layout after exit animation.
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve())
        })
      })
      if (disposed) return
      syncActivePosition()
    }

    const stepBy = (direction: 1 | -1) => {
      if (!enabledRef.current || animating || busy) return
      const current = indexOf(activeIdRef.current)
      const next = current + direction
      if (next < 0 || next >= categoryIdsRef.current.length) {
        wheelAcc = 0
        return
      }

      busy = true
      void (async () => {
        try {
          await ensureDetailCollapsed()
          if (disposed || !enabledRef.current) return
          slideToIndex(next)
        } finally {
          busy = false
        }
      })()
    }

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return

      // Always lock free scroll so expand/collapse cannot desync paging.
      event.preventDefault()
      if (!enabledRef.current || animating || busy) return

      wheelAcc += normalizeWheelDelta(event, scroller.clientHeight)
      if (Math.abs(wheelAcc) < WHEEL_STEP_THRESHOLD) return

      const direction: 1 | -1 = wheelAcc > 0 ? 1 : -1
      wheelAcc = 0
      stepBy(direction)
    }

    const onTouchStart = (event: TouchEvent) => {
      if (animating || busy) return
      touchActive = true
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (!touchActive) return
      const y = event.touches[0]?.clientY ?? touchStartY
      if (Math.abs(y - touchStartY) > 10) event.preventDefault()
    }

    const onTouchEnd = (event: TouchEvent) => {
      if (!touchActive) return
      touchActive = false
      if (!enabledRef.current || animating || busy) return
      const y = event.changedTouches[0]?.clientY ?? touchStartY
      const dy = touchStartY - y
      if (Math.abs(dy) < TOUCH_STEP_THRESHOLD) return
      stepBy(dy > 0 ? 1 : -1)
    }

    const track = scroller.firstElementChild
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            if (busy) return
            syncActivePosition()
          })
        : null
    resizeObserver?.observe(scroller)
    if (track instanceof HTMLElement) resizeObserver?.observe(track)

    scroller.addEventListener("wheel", onWheel, { passive: false })
    scroller.addEventListener("touchstart", onTouchStart, { passive: true })
    scroller.addEventListener("touchmove", onTouchMove, { passive: false })
    scroller.addEventListener("touchend", onTouchEnd, { passive: true })
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true })
    window.addEventListener("resize", syncActivePosition)

    syncActivePosition()

    return () => {
      disposed = true
      cancelAnim()
      resizeObserver?.disconnect()
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("touchstart", onTouchStart)
      scroller.removeEventListener("touchmove", onTouchMove)
      scroller.removeEventListener("touchend", onTouchEnd)
      scroller.removeEventListener("touchcancel", onTouchEnd)
      window.removeEventListener("resize", syncActivePosition)
    }
  }, [scrollerRef, blockRefs])

  // Re-pin after React state changes (open detail, category id, gate flip).
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    const block = blockRefs.current.get(activeCategoryId)
    if (!block) return
    const to = clamp(
      blockTop(scroller, block),
      0,
      Math.max(0, scroller.scrollHeight - scroller.clientHeight),
    )
    if (Math.abs(scroller.scrollTop - to) > 1) scroller.scrollTop = to
  }, [activeCategoryId, enabled, detailOpen, scrollerRef, blockRefs])
}
