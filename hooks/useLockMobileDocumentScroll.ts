"use client"

import { useEffect } from "react"

const MOBILE_QUERY = "(max-width: 767px)"

function isVerticallyScrollable(el: Element) {
  const style = window.getComputedStyle(el)
  const overflowY = style.overflowY
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false
  }
  return (el as HTMLElement).scrollHeight > (el as HTMLElement).clientHeight + 1
}

function findScrollableAncestor(target: EventTarget | null): HTMLElement | null {
  let el = target instanceof Element ? target : null
  while (el && el !== document.body && el !== document.documentElement) {
    if (isVerticallyScrollable(el)) return el as HTMLElement
    el = el.parentElement
  }
  return null
}

/**
 * Bloque le scroll de la fenêtre navigateur sur mobile.
 * Les zones overflow internes (projets, specialist, etc.) restent scrollables.
 */
export function useLockMobileDocumentScroll(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const mq = window.matchMedia(MOBILE_QUERY)
    let attached = false
    let activeScroller: HTMLElement | null = null
    let touchStartY = 0

    const lockWindowScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    const onTouchStart = (event: TouchEvent) => {
      activeScroller = findScrollableAncestor(event.target)
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) return

      if (!activeScroller) {
        event.preventDefault()
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = activeScroller
      const atTop = scrollTop <= 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1
      const currentY = event.touches[0]?.clientY ?? touchStartY
      const deltaY = currentY - touchStartY

      // En butée : empêche le rubber-band de remonter jusqu’à la fenêtre.
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault()
      }
    }

    const attach = () => {
      if (attached) return
      attached = true
      document.documentElement.classList.add("mobile-viewport-lock")
      document.body.classList.add("mobile-viewport-lock")
      lockWindowScroll()
      window.addEventListener("scroll", lockWindowScroll, { passive: true })
      document.addEventListener("touchstart", onTouchStart, {
        passive: true,
        capture: true,
      })
      document.addEventListener("touchmove", onTouchMove, {
        passive: false,
        capture: true,
      })
    }

    const detach = () => {
      if (!attached) return
      attached = false
      activeScroller = null
      document.documentElement.classList.remove("mobile-viewport-lock")
      document.body.classList.remove("mobile-viewport-lock")
      window.removeEventListener("scroll", lockWindowScroll)
      document.removeEventListener("touchstart", onTouchStart, true)
      document.removeEventListener("touchmove", onTouchMove, true)
    }

    const sync = () => {
      if (mq.matches) attach()
      else detach()
    }

    sync()
    mq.addEventListener("change", sync)

    return () => {
      mq.removeEventListener("change", sync)
      detach()
    }
  }, [enabled])
}
