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
  onActiveChange?: (item: ProjectScrollItem) => void
}

interface ListMetrics {
  itemHeight: number
  paddingY: number
  viewport: number
  cycleHeight: number
  loopBlocks: number
  middleBlock: number
  trackHeight: number
}

interface PoolSlot {
  key: number
  virtualIndex: number
  dataIndex: number
  top: number
}

/**
 * Le rebouclage n'a lieu qu'à l'arrêt du scroll : le faire pendant le geste
 * annulerait l'inertie. Le track doit donc être assez long pour qu'aucun geste,
 * même très rapide, n'atteigne ses extrémités avant l'arrêt.
 */
const MIN_LOOP_SCROLL = 24000
const MIN_LOOP_BLOCKS = 5
/** On laisse dériver plusieurs cycles avant de recentrer, pour recentrer rarement. */
const RECENTER_DRIFT_BLOCKS = 4
const MIN_OVERSCAN = 12
const MAX_OVERSCAN = 40

/**
 * Inertie molette. Le snap CSS natif avance d'un cran par cran de molette, ce
 * qui supprime toute sensation de lancer : on pilote nous-mêmes l'impulsion et
 * la friction, puis on glisse vers l'item le plus proche.
 *
 * Force volontairement basse : un cran doit pouvoir s'arrêter sur un item, pas
 * en enjamber trois. L'inertie reste lisible, le snap reprend dès que le lancer
 * ralentit près d'un point d'ancrage.
 */
const WHEEL_IMMEDIATE = 0.12
const WHEEL_IMPULSE = 0.08
const WHEEL_FRICTION = 0.88
const WHEEL_MIN_VELOCITY = 0.85
const WHEEL_MAX_VELOCITY = 32
/** En dessous de cette vitesse, près d'un item, on bascule en snap anticipé. */
const SNAP_CAPTURE_VELOCITY = 5
const SNAP_CAPTURE_FRACTION = 0.28
const SNAP_GLIDE_MS = 220

function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

/** Même courbe que `@keyframes project-li-jump` : facteur × `--jump-max`. */
const JUMP_FROM = 0.28
const JUMP_TO = 0.72
const JUMP_LUT_SIZE = 64
const JUMP_LUT = (() => {
  const table = new Float32Array(JUMP_LUT_SIZE + 1)
  const span = JUMP_TO - JUMP_FROM
  for (let i = 0; i <= JUMP_LUT_SIZE; i += 1) {
    const progress = i / JUMP_LUT_SIZE
    if (progress <= JUMP_FROM || progress >= JUMP_TO) {
      table[i] = 0
      continue
    }
    table[i] = Math.sin(((progress - JUMP_FROM) / span) * Math.PI)
  }
  return table
})()

function jumpFactor(progress: number): number {
  const x = clamp(progress, 0, 1) * JUMP_LUT_SIZE
  const i = Math.floor(x)
  const t = x - i
  const a = JUMP_LUT[i]
  const b = JUMP_LUT[Math.min(i + 1, JUMP_LUT_SIZE)]
  return a + (b - a) * t
}

const EMPTY_METRICS: ListMetrics = {
  itemHeight: 0,
  paddingY: 0,
  viewport: 0,
  cycleHeight: 0,
  loopBlocks: MIN_LOOP_BLOCKS,
  middleBlock: (MIN_LOOP_BLOCKS - 1) / 2,
  trackHeight: 0,
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function computeLoopBlocks(cycleHeight: number): number {
  if (cycleHeight <= 0) return MIN_LOOP_BLOCKS
  const blocks = Math.max(
    MIN_LOOP_BLOCKS,
    Math.ceil(MIN_LOOP_SCROLL / cycleHeight),
  )
  return blocks % 2 === 0 ? blocks + 1 : blocks
}

/** scrollTop qui centre l'index virtuel dans le scrollport. */
function scrollTopForVirtualIndex(
  virtualIndex: number,
  metrics: ListMetrics,
): number {
  const { itemHeight, paddingY, viewport } = metrics
  return paddingY + virtualIndex * itemHeight + itemHeight / 2 - viewport / 2
}

/**
 * Marge de rendu de part et d'autre du scrollport, en items. Elle ne dépend que
 * des métriques : la taille du pool reste constante pendant tout un geste. Un
 * pool qui change de taille fait réévaluer ses points d'ancrage au scroll-snap,
 * qui repositionne alors brutalement le scroll.
 */
function computeOverscan(metrics: ListMetrics): number {
  if (metrics.itemHeight <= 0) return MIN_OVERSCAN
  return clamp(
    Math.ceil(metrics.viewport / metrics.itemHeight),
    MIN_OVERSCAN,
    MAX_OVERSCAN,
  )
}

/** Inverse exact de scrollTopForVirtualIndex. */
function nearestVirtualIndex(
  scrollTop: number,
  metrics: ListMetrics,
  velocity = 0,
): number {
  const { itemHeight, paddingY, viewport } = metrics
  if (itemHeight <= 0) return 0
  const raw =
    (scrollTop + viewport / 2 - paddingY - itemHeight / 2) / itemHeight
  // Léger biais dans le sens du mouvement : évite de recoller à l'item qu'on
  // vient de quitter quand le lancer est encore près du centre.
  const bias =
    Math.abs(velocity) < 0.5 ? 0 : Math.sign(velocity) * 0.22
  return Math.round(raw + bias)
}

/**
 * Décalage ramenant le scrollTop vers le bloc central. Toujours un multiple
 * exact de cycleHeight : le contenu rendu est identique avant et après, et la
 * position reste alignée sur un point de snap.
 */
function loopShift(
  scrollTop: number,
  metrics: ListMetrics,
  driftBlocks: number,
): number {
  const { cycleHeight, middleBlock, paddingY, itemHeight, viewport } = metrics
  if (cycleHeight <= 0) return 0

  const center =
    paddingY + middleBlock * cycleHeight + itemHeight / 2 - viewport / 2
  const drift = scrollTop - center
  if (Math.abs(drift) <= cycleHeight * driftBlocks) return 0
  return -Math.round(drift / cycleHeight) * cycleHeight
}

/** Tout le reste des métriques dérive de ces deux mesures. */
function sameMetrics(a: ListMetrics, b: ListMetrics): boolean {
  return a.itemHeight === b.itemHeight && a.viewport === b.viewport
}

function supportsScrollEndEvent(): boolean {
  return typeof window !== "undefined" && "onscrollend" in window
}

function normalizeWheelDelta(event: WheelEvent, viewport: number): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * viewport
  return event.deltaY
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

    // Écritures uniquement : la courbe vient de JUMP_LUT, aucune lecture de
    // layout et aucun `sin()` par frame.
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

  /** Renvoie true si un re-rendu a été programmé. */
  const syncWindow = useCallback((scrollTop: number): boolean => {
    const currentMetrics = metricsRef.current
    const { itemHeight, paddingY, viewport } = currentMetrics
    if (itemHeight <= 0) return false

    const overscan = computeOverscan(currentMetrics)
    // Le commit React arrive une frame après le scroll. On décale la marge de
    // rendu vers l'avant du mouvement — sans changer la taille du pool, sous
    // peine de faire réévaluer ses points d'ancrage au scroll-snap.
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

      // Un conteneur en snap `mandatory` réancre toute écriture de scrollTop et
      // atterrit ailleurs que sur la cible. On le neutralise le temps du saut.
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

  /**
   * Repositionne le scroll après avoir commité la fenêtre virtuelle de
   * destination. Sans ce commit préalable le conteneur est momentanément vide à
   * la nouvelle position : le scroll-snap n'y trouve aucun point d'ancrage et
   * part ailleurs. Toujours appelé depuis un timer, un événement ou un callback
   * d'observer, jamais pendant un rendu.
   */
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

    // Ne rien publier quand rien n'a bougé, sinon le ResizeObserver se
    // réalimente en boucle via setState.
    const previous = metricsRef.current
    if (sameMetrics(previous, next)) return { metrics: previous, changed: false }

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

      // Conserver le projet actuellement centré à travers le remesurage.
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

    // Les webfonts changent la hauteur de ligne : mesurer avant leur chargement
    // décalerait toute la grille.
    void document.fonts.ready.then(remeasure)

    const ro = new ResizeObserver(remeasure)
    ro.observe(scroller)
    if (measureRef.current) ro.observe(measureRef.current)

    return () => {
      disposed = true
      ro.disconnect()
    }
  }, [itemCount, measureLayout, requestScrollTop])

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

      // Notre propre inertie est en cours : le recentrage attendra l'arrêt réel.
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
        // Filet de sécurité : inatteignable avec un track de 24 000 px, mais
        // mieux vaut couper l'inertie que buter sur la fin du track.
        const maxScrollTop = currentMetrics.trackHeight - currentMetrics.viewport
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
      // Double `scrollend` : si l'événement n'est pas émis, ou raté après un
      // scrollTop programmatique, le recentrage a quand même lieu.
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(settle, hasScrollEnd ? 320 : 140)
    }

    // Fin de lancer : on rejoint l'item le plus proche par une animation courte
    // plutôt que par le saut sec d'un repositionnement direct.
    const glideToNearest = () => {
      const currentMetrics = metricsRef.current
      if (currentMetrics.itemHeight <= 0) {
        setSnapEnabled(true)
        return
      }

      const from = scroller.scrollTop
      const to = scrollTopForVirtualIndex(
        nearestVirtualIndex(from, currentMetrics, velocityRef.current),
        currentMetrics,
      )
      const distance = to - from
      if (Math.abs(distance) < 0.5) {
        setSnapEnabled(true)
        settle()
        return
      }

      const startedAt = performance.now()
      const step = (now: number) => {
        if (disposed) return
        const progress = Math.min(1, (now - startedAt) / SNAP_GLIDE_MS)
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
        // Capture magnétique : dès que le lancer ralentit près d'un item, on
        // bascule en glide — snap plus ferme sans couper l'inertie rapide.
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
      // Le snap natif réancre chaque écriture de scrollTop : il doit rester
      // désactivé pendant tout le lancer.
      setSnapEnabled(false)

      const currentMetrics = metricsRef.current
      const itemHeight = Math.max(1, currentMetrics.itemHeight || 48)
      const delta = normalizeWheelDelta(event, scroller.clientHeight)
      // Plafond par cran, calé sur la hauteur d'item : un cran reste sélectionnable,
      // un enchaînement garde de l'inertie sans devenir incontrôlable.
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
      scroller.removeEventListener("wheel", onWheel)
      scroller.removeEventListener("scroll", onScroll)
      if (hasScrollEnd) scroller.removeEventListener("scrollend", settle)
      window.clearTimeout(idleTimer)
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current)
    }
  }, [paintFallback, requestScrollTop, syncWindow])

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
        // Clé tournante : l'ensemble des clés est toujours [0, poolSize[, donc
        // aucun item n'est jamais démonté. Avancer d'un cran ne réécrit qu'un
        // seul nœud, et un recentrage n'en réécrit aucun — ce qui préserve les
        // animations de view-timeline au lieu de les faire repartir de zéro.
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
              <span className="projects-scroll-list__item-label">{longestName}</span>
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
