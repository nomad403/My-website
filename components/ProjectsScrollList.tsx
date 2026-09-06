"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { flushSync } from "react-dom"
import { useProjectsScrollPhysics } from "@/hooks/useProjectsScrollPhysics"
import {
  EMPTY_METRICS,
  clamp,
  computeLoopBlocks,
  computeOverscan,
  jumpFactor,
  mod,
  nearestVirtualIndex,
  sameMetrics,
  scrollTopForVirtualIndex,
  type ListMetrics,
} from "@/lib/projects-scroll-math"

export interface ProjectScrollItem {
  id: number
  name: string
  url?: string
  description?: string
}

interface ProjectsScrollListProps {
  items: ProjectScrollItem[]
  onActiveChange?: (item: ProjectScrollItem) => void
}

interface PoolSlot {
  key: number
  virtualIndex: number
  dataIndex: number
  top: number
}

export default function ProjectsScrollList({
  items,
  onActiveChange,
}: ProjectsScrollListProps) {
  const itemCount = items.length

  const scrollerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLLIElement>(null)
  const metricsRef = useRef<ListMetrics>(EMPTY_METRICS)
  const windowStartRef = useRef(0)
  const poolSizeRef = useRef(0)
  const activeIndexRef = useRef(0)
  const lastScrollTopRef = useRef(0)
  const velocityRef = useRef(0)
  const frameRef = useRef(0)
  const supportsViewTimelineRef = useRef(true)
  const onActiveChangeRef = useRef(onActiveChange)
  onActiveChangeRef.current = onActiveChange

  const [metrics, setMetrics] = useState<ListMetrics | null>(null)
  const [windowStart, setWindowStart] = useState(0)
  const [poolSize, setPoolSize] = useState(0)
  const [activeVirtualIndex, setActiveVirtualIndex] = useState(0)

  const longestName = useMemo(
    () =>
      items.reduce(
        (longest, item) =>
          item.name.length > longest.length ? item.name : longest,
        items[0]?.name ?? "",
      ),
    [items],
  )

  useEffect(() => {
    supportsViewTimelineRef.current =
      typeof CSS !== "undefined" && CSS.supports("animation-timeline", "view()")
  }, [])

  useEffect(() => {
    if (itemCount === 0) return
    const item = items[mod(activeVirtualIndex, itemCount)]
    onActiveChangeRef.current?.(item)
  }, [activeVirtualIndex, itemCount, items])

  const paintFallback = useCallback((scrollTop: number) => {
    if (supportsViewTimelineRef.current) return
    const scroller = scrollerRef.current
    const currentMetrics = metricsRef.current
    if (!scroller || currentMetrics.itemHeight <= 0) return

    const { paddingY, itemHeight, viewport } = currentMetrics
    scroller
      .querySelectorAll<HTMLElement>(
        ".projects-scroll-list__item[data-virtual-index]",
      )
      .forEach((node) => {
        const label = node.querySelector<HTMLElement>(
          ".projects-scroll-list__item-label",
        )
        if (!label) return

        const top = paddingY + Number(node.dataset.virtualIndex) * itemHeight
        const start = top - viewport
        const end = top + itemHeight
        const factor = jumpFactor((scrollTop - start) / (end - start))
        label.style.transform =
          factor === 0
            ? "translateX(0)"
            : `translateX(calc(var(--jump-max) * ${factor.toFixed(4)}))`
      })
  }, [])

  const syncWindow = useCallback((scrollTop: number): boolean => {
    const currentMetrics = metricsRef.current
    const { itemHeight, paddingY, viewport } = currentMetrics
    if (itemHeight <= 0) return false

    const overscan = computeOverscan(currentMetrics)
    const lead = clamp(
      Math.round(velocityRef.current / itemHeight),
      -Math.floor(overscan / 2),
      Math.floor(overscan / 2),
    )
    const nextStart =
      Math.floor((scrollTop - paddingY) / itemHeight) - overscan + lead
    const nextPoolSize = Math.ceil(viewport / itemHeight) + overscan * 2 + 2
    const nextActive = nearestVirtualIndex(scrollTop, currentMetrics)

    if (
      nextStart === windowStartRef.current &&
      nextPoolSize === poolSizeRef.current &&
      nextActive === activeIndexRef.current
    ) {
      return false
    }

    windowStartRef.current = nextStart
    poolSizeRef.current = nextPoolSize
    activeIndexRef.current = nextActive
    setWindowStart(nextStart)
    setPoolSize(nextPoolSize)
    setActiveVirtualIndex(nextActive)
    return true
  }, [])

  const applyScrollTop = useCallback(
    (target: number) => {
      const scroller = scrollerRef.current
      if (!scroller) return

      const previousSnap = scroller.style.scrollSnapType
      scroller.style.scrollSnapType = "none"
      scroller.scrollTop = target
      void scroller.offsetHeight
      scroller.style.scrollSnapType = previousSnap

      lastScrollTopRef.current = scroller.scrollTop
      velocityRef.current = 0
      paintFallback(scroller.scrollTop)
    },
    [paintFallback],
  )

  const requestScrollTop = useCallback(
    (target: number) => {
      flushSync(() => {
        syncWindow(target)
      })
      applyScrollTop(target)
    },
    [applyScrollTop, syncWindow],
  )

  const measureLayout = useCallback((): {
    metrics: ListMetrics
    changed: boolean
  } | null => {
    const scroller = scrollerRef.current
    const probe = measureRef.current
    if (!scroller || !probe || itemCount === 0) return null

    const itemHeight = probe.offsetHeight
    const viewport = scroller.clientHeight
    if (itemHeight <= 0 || viewport <= 0) return null

    const cycleHeight = itemCount * itemHeight
    const loopBlocks = computeLoopBlocks(cycleHeight)
    const paddingY = viewport / 2
    const next: ListMetrics = {
      itemHeight,
      paddingY,
      viewport,
      cycleHeight,
      loopBlocks,
      middleBlock: (loopBlocks - 1) / 2,
      trackHeight: paddingY * 2 + cycleHeight * loopBlocks,
    }

    const previous = metricsRef.current
    if (sameMetrics(previous, next)) {
      return { metrics: previous, changed: false }
    }

    metricsRef.current = next
    setMetrics(next)
    return { metrics: next, changed: true }
  }, [itemCount])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || itemCount === 0) return

    let disposed = false

    const remeasure = () => {
      if (disposed) return

      const previous = metricsRef.current
      const centeredData =
        previous.itemHeight > 0
          ? mod(nearestVirtualIndex(scroller.scrollTop, previous), itemCount)
          : 0

      const result = measureLayout()
      if (!result || !result.changed) return

      requestScrollTop(
        scrollTopForVirtualIndex(
          result.metrics.middleBlock * itemCount + centeredData,
          result.metrics,
        ),
      )
    }

    void document.fonts.ready.then(remeasure)

    const ro = new ResizeObserver(remeasure)
    ro.observe(scroller)
    if (measureRef.current) ro.observe(measureRef.current)

    return () => {
      disposed = true
      ro.disconnect()
    }
  }, [itemCount, measureLayout, requestScrollTop])

  useProjectsScrollPhysics({
    scrollerRef,
    metricsRef,
    velocityRef,
    lastScrollTopRef,
    frameRef,
    requestScrollTop,
    syncWindow,
    paintFallback,
  })

  const poolSlots = useMemo<PoolSlot[]>(() => {
    if (!metrics || metrics.itemHeight <= 0 || poolSize <= 0 || itemCount === 0) {
      return []
    }

    const maxVirtual = itemCount * metrics.loopBlocks - 1
    const slots: PoolSlot[] = []
    for (let offset = 0; offset < poolSize; offset += 1) {
      const virtualIndex = windowStart + offset
      if (virtualIndex < 0 || virtualIndex > maxVirtual) continue
      slots.push({
        key: mod(virtualIndex, poolSize),
        virtualIndex,
        dataIndex: mod(virtualIndex, itemCount),
        top: metrics.paddingY + virtualIndex * metrics.itemHeight,
      })
    }
    return slots
  }, [metrics, poolSize, windowStart, itemCount])

  if (itemCount === 0) return null

  const handleItemClick = (item: ProjectScrollItem) => {
    if (item.url) {
      window.open(item.url, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <div className="projects-scroll-list-shell absolute inset-0 w-full">
      <div
        className="projects-scroll-list__scroller h-full overflow-y-auto"
        ref={scrollerRef}
      >
        <div
          className="projects-scroll-list__track relative w-full"
          style={{ height: metrics?.trackHeight ?? 0 }}
        >
          <ul className="projects-scroll-list m-0 list-none p-0">
            <li
              ref={measureRef}
              aria-hidden
              className="projects-scroll-list__item projects-scroll-list__item--measure font-kode uppercase tracking-[0.18em]"
            >
              <span className="projects-scroll-list__item-label">
                {longestName}
              </span>
            </li>

            {poolSlots.map(({ key, virtualIndex, dataIndex, top }) => {
              const item = items[dataIndex]
              const isActive = activeVirtualIndex === virtualIndex

              return (
                <li
                  key={key}
                  data-virtual-index={virtualIndex}
                  className={`projects-scroll-list__item font-kode uppercase tracking-[0.18em] ${
                    isActive ? "projects-scroll-list__item--snapped" : ""
                  } ${item.url ? "cursor-pointer" : "cursor-default"}`}
                  style={{
                    top,
                    height: metrics?.itemHeight,
                  }}
                >
                  <button
                    type="button"
                    className="block h-full w-full max-w-full border-0 bg-transparent p-0 text-left font-inherit uppercase tracking-inherit text-inherit"
                    onClick={() => handleItemClick(item)}
                    aria-label={
                      item.description
                        ? `${item.name} — ${item.description}`
                        : item.name
                    }
                    disabled={!item.url}
                  >
                    <span className="projects-scroll-list__item-label">
                      {item.name}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
