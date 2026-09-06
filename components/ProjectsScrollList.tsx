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
import { AnimatePresence, motion } from "framer-motion"
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
  summary?: string
  stack?: string[]
}

interface ProjectsScrollListProps {
  items: ProjectScrollItem[]
  /** Mobile : true = viewport mobile (clic sélectionne / ouvre détail). */
  isMobile?: boolean
  viewLabel: string
  onActiveChange?: (item: ProjectScrollItem) => void
}

interface PoolSlot {
  key: number
  virtualIndex: number
  dataIndex: number
  top: number
  height: number
}

const DETAIL_EASE = [0.22, 1, 0.36, 1] as const
const DETAIL_DURATION = 0.5

export default function ProjectsScrollList({
  items,
  isMobile = false,
  viewLabel,
  onActiveChange,
}: ProjectsScrollListProps) {
  const itemCount = items.length

  const scrollerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLLIElement>(null)
  const detailMeasureRef = useRef<HTMLDivElement>(null)
  const metricsRef = useRef<ListMetrics>(EMPTY_METRICS)
  const windowStartRef = useRef(0)
  const poolSizeRef = useRef(0)
  const activeIndexRef = useRef(0)
  const expandExtraRef = useRef(0)
  const lastScrollTopRef = useRef(0)
  const velocityRef = useRef(0)
  const frameRef = useRef(0)
  const animateToVirtualIndexRef = useRef<
    ((virtualIndex: number) => void) | null
  >(null)
  const supportsViewTimelineRef = useRef(true)
  const onActiveChangeRef = useRef(onActiveChange)
  onActiveChangeRef.current = onActiveChange

  const [metrics, setMetrics] = useState<ListMetrics | null>(null)
  const [windowStart, setWindowStart] = useState(0)
  const [poolSize, setPoolSize] = useState(0)
  const [activeVirtualIndex, setActiveVirtualIndex] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)
  const [expandExtra, setExpandExtra] = useState(0)

  const longestName = useMemo(
    () =>
      items.reduce(
        (longest, item) =>
          item.name.length > longest.length ? item.name : longest,
        items[0]?.name ?? "",
      ),
    [items],
  )

  /** Slide-down in-list : mobile uniquement. Desktop = panneau à droite. */
  const showInlineDetail = isMobile && detailOpen

  useEffect(() => {
    supportsViewTimelineRef.current =
      typeof CSS !== "undefined" && CSS.supports("animation-timeline", "view()")
  }, [])

  useEffect(() => {
    if (itemCount === 0) return
    const item = items[mod(activeVirtualIndex, itemCount)]
    onActiveChangeRef.current?.(item)
  }, [activeVirtualIndex, itemCount, items])

  useEffect(() => {
    if (!isMobile) {
      setDetailOpen(false)
      return
    }
    setDetailOpen(false)
  }, [isMobile, activeVirtualIndex])

  useEffect(() => {
    expandExtraRef.current = expandExtra
  }, [expandExtra])

  useLayoutEffect(() => {
    let cancelled = false
    let raf = 0
    let ro: ResizeObserver | null = null

    const attach = () => {
      const node = detailMeasureRef.current
      if (!node) {
        if (!showInlineDetail) {
          expandExtraRef.current = 0
          setExpandExtra(0)
        } else {
          raf = requestAnimationFrame(attach)
        }
        return
      }

      const sync = () => {
        if (cancelled) return
        const next = Math.max(0, Math.ceil(node.getBoundingClientRect().height))
        expandExtraRef.current = next
        setExpandExtra((prev) => (prev === next ? prev : next))
      }

      sync()
      ro = new ResizeObserver(sync)
      ro.observe(node)
    }

    attach()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [showInlineDetail, activeVirtualIndex, items])

  const paintFallback = useCallback((scrollTop: number) => {
    if (supportsViewTimelineRef.current) return
    const scroller = scrollerRef.current
    const currentMetrics = metricsRef.current
    if (!scroller || currentMetrics.itemHeight <= 0) return

    const { paddingY, itemHeight, viewport } = currentMetrics
    const active = activeIndexRef.current
    const extra = expandExtraRef.current

    scroller
      .querySelectorAll<HTMLElement>(
        ".projects-scroll-list__item[data-virtual-index]",
      )
      .forEach((node) => {
        const label = node.querySelector<HTMLElement>(
          ".projects-scroll-list__item-label",
        )
        if (!label) return

        const virtualIndex = Number(node.dataset.virtualIndex)
        const shift = virtualIndex > active ? extra : 0
        const top = paddingY + virtualIndex * itemHeight + shift
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
    const nextActive = nearestVirtualIndex(
      scrollTop,
      currentMetrics,
      velocityRef.current,
      activeIndexRef.current,
      expandExtraRef.current,
    )

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
          ? mod(
              nearestVirtualIndex(
                scroller.scrollTop,
                previous,
                0,
                activeIndexRef.current,
                expandExtraRef.current,
              ),
              itemCount,
            )
          : 0

      const result = measureLayout()
      if (!result || !result.changed) return

      const centeredVirtual =
        result.metrics.middleBlock * itemCount + centeredData
      requestScrollTop(
        scrollTopForVirtualIndex(
          centeredVirtual,
          result.metrics,
          centeredVirtual,
          expandExtraRef.current,
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
    activeIndexRef,
    expandExtraRef,
    requestScrollTop,
    syncWindow,
    paintFallback,
    animateToVirtualIndexRef,
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
      const shift = virtualIndex > activeVirtualIndex ? expandExtra : 0
      const height =
        metrics.itemHeight +
        (virtualIndex === activeVirtualIndex ? expandExtra : 0)
      slots.push({
        key: mod(virtualIndex, poolSize),
        virtualIndex,
        dataIndex: mod(virtualIndex, itemCount),
        top: metrics.paddingY + virtualIndex * metrics.itemHeight + shift,
        height,
      })
    }
    return slots
  }, [
    metrics,
    poolSize,
    windowStart,
    itemCount,
    activeVirtualIndex,
    expandExtra,
  ])

  if (itemCount === 0) return null

  const handleItemClick = (
    _item: ProjectScrollItem,
    virtualIndex: number,
    isActive: boolean,
  ) => {
    if (isMobile) {
      if (isActive) {
        setDetailOpen((open) => !open)
        return
      }
      animateToVirtualIndexRef.current?.(virtualIndex)
      return
    }

    if (!isActive) {
      animateToVirtualIndexRef.current?.(virtualIndex)
    }
  }

  const trackHeight = (metrics?.trackHeight ?? 0) + expandExtra
  const titleHeight = metrics?.itemHeight

  return (
    <div
      className={`projects-scroll-list-shell absolute inset-0 w-full${
        isMobile && detailOpen
          ? " projects-scroll-list-shell--detail-open"
          : ""
      }`}
    >
      <div
        className="projects-scroll-list__scroller h-full overflow-y-auto"
        ref={scrollerRef}
      >
        <div
          className="projects-scroll-list__track relative w-full"
          style={{ height: trackHeight }}
        >
          <ul className="projects-scroll-list m-0 list-none p-0">
            <li
              ref={measureRef}
              aria-hidden
              className="projects-scroll-list__item projects-scroll-list__item--measure font-kode uppercase tracking-[0.18em]"
            >
              <div className="projects-scroll-list__title-row">
                <span className="projects-scroll-list__item-label">
                  {longestName}
                </span>
              </div>
            </li>

            {poolSlots.map(
              ({ key, virtualIndex, dataIndex, top, height }) => {
                const item = items[dataIndex]
                const isActive = activeVirtualIndex === virtualIndex
                const detailVisible = isActive && showInlineDetail

                return (
                  <li
                    key={key}
                    data-virtual-index={virtualIndex}
                    className={`projects-scroll-list__item font-kode uppercase tracking-[0.18em] cursor-pointer ${
                      isActive ? "projects-scroll-list__item--snapped" : ""
                    } ${
                      detailVisible
                        ? "projects-scroll-list__item--detail-open"
                        : ""
                    }`}
                    style={{
                      top,
                      height,
                    }}
                  >
                    <div
                      className="projects-scroll-list__title-row"
                      style={
                        titleHeight ? { height: titleHeight, flex: "0 0 auto" } : undefined
                      }
                    >
                      <button
                        type="button"
                        className="projects-scroll-list__item-trigger block max-w-full border-0 bg-transparent p-0 text-left font-inherit uppercase tracking-inherit text-inherit"
                        onClick={() =>
                          handleItemClick(item, virtualIndex, isActive)
                        }
                        aria-label={
                          item.description
                            ? `${item.name} — ${item.description}`
                            : item.name
                        }
                        aria-expanded={
                          isMobile && isActive ? detailOpen : undefined
                        }
                      >
                        <span className="projects-scroll-list__item-label">
                          {item.name}
                        </span>
                      </button>
                    </div>

                    <AnimatePresence
                      initial={false}
                      onExitComplete={() => {
                        if (!showInlineDetail) {
                          expandExtraRef.current = 0
                          setExpandExtra(0)
                        }
                      }}
                    >
                      {detailVisible ? (
                        <motion.div
                          key={item.id}
                          ref={detailMeasureRef}
                          className="projects-scroll-list__detail"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{
                            duration: DETAIL_DURATION,
                            ease: DETAIL_EASE,
                          }}
                        >
                          <div className="projects-scroll-list__detail-inner">
                            {item.description ? (
                              <p className="projects-scroll-list__detail-eyebrow font-kode uppercase tracking-[0.18em]">
                                {item.description}
                              </p>
                            ) : null}
                            {item.summary ? (
                              <p className="projects-scroll-list__detail-summary font-home-title">
                                {item.summary}
                              </p>
                            ) : null}
                            {item.stack && item.stack.length > 0 ? (
                              <ul className="projects-scroll-list__detail-stack font-kode">
                                {item.stack.map((tech) => (
                                  <li key={tech}>{tech}</li>
                                ))}
                              </ul>
                            ) : null}
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="projects-scroll-list__detail-link font-kode uppercase tracking-[0.16em]"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {viewLabel}
                              </a>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </li>
                )
              },
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
