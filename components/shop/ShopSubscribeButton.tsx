"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react"
import gsap from "gsap"
import ShuffleText from "@/components/ascii/ShuffleText"
import { renderButtonAsciiPass } from "@/lib/ascii/button-ascii-pass"
import { getPageConfig } from "@/lib/home/page-config"

const ASCII_BLUE = "#00e8ff"

const FLAME_COUNT = 15
const GOO_FILTER_ID = "shop-subscribe-goo"
/** Complementary cyan to the shop red ASCII field. */
const FLAME_COLOR = "#00e8ff"

type ShopSubscribeButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode
}

/** Shared SVG goo filter — render once per page (same defs as the CodePen). */
export function ShopSubscribeGooDefs() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      aria-hidden
      style={{ width: 0, height: 0, position: "absolute" }}
    >
      <defs>
        <filter id={GOO_FILTER_ID}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
            result="highContrastGraphic"
          />
          <feComposite in="SourceGraphic" in2="highContrastGraphic" operator="atop" />
        </filter>
      </defs>
    </svg>
  )
}

/**
 * CodePen flaming button on hover, covered by the same ASCII filter
 * (glyph ramp + sobel) as the shop background. Label stays outside the goo.
 */
export default function ShopSubscribeButton({
  children,
  className = "",
  disabled,
  type = "button",
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: ShopSubscribeButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLSpanElement>(null)
  const asciiRef = useRef<HTMLCanvasElement>(null)
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const flamesRef = useRef<HTMLSpanElement[]>([])
  const rafRef = useRef(0)
  const [hot, setHot] = useState(false)
  const [shuffleKey, setShuffleKey] = useState(0)
  const wasHotRef = useRef(false)

  useEffect(() => {
    if (hot && !wasHotRef.current) setShuffleKey((key) => key + 1)
    wasHotRef.current = hot
  }, [hot])

  const clearFlames = useCallback(() => {
    tweensRef.current.forEach((tween) => tween.kill())
    tweensRef.current = []
    flamesRef.current.forEach((flame) => flame.remove())
    flamesRef.current = []
  }, [])

  const startFlames = useCallback(() => {
    const body = bodyRef.current
    if (!body) return

    clearFlames()
    const containerHeight = body.getBoundingClientRect().height || 40
    const flames: HTMLSpanElement[] = []
    const tweens: gsap.core.Tween[] = []

    for (let i = 0; i < FLAME_COUNT; i += 1) {
      const size = Math.random() * 0.5 + 0.4
      const left = `${Math.random() * 80 + 5}%`
      const delay = Math.random() * 1.5
      const duration = Math.random() * 1.5 + 1.5
      const offset = Math.random() * 1.2 + 0.7

      const flame = document.createElement("span")
      flame.className = "shop-subscribe__flame"
      Object.assign(flame.style, {
        backgroundColor: "inherit",
        position: "absolute",
        width: `${containerHeight * size * 0.7}px`,
        height: `${containerHeight * size}px`,
        borderRadius: "50%",
        top: "0",
        left,
        zIndex: "-1",
        transformOrigin: "50% 0",
        pointerEvents: "none",
      })

      body.appendChild(flame)
      flames.push(flame)

      tweens.push(
        gsap.to(flame, {
          y: -containerHeight * offset,
          scaleX: 0,
          duration,
          delay,
          ease: "power4.out",
          repeat: -1,
        }),
      )
    }

    flamesRef.current = flames
    tweensRef.current = tweens
  }, [clearFlames])

  useEffect(() => {
    if (disabled) {
      setHot(false)
      clearFlames()
      return
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (!hot) {
      clearFlames()
      return
    }

    if (reduced) return

    startFlames()
    return () => clearFlames()
  }, [hot, disabled, startFlames, clearFlames])

  useEffect(() => {
    const body = bodyRef.current
    const canvas = asciiRef.current
    if (!hot || !body || !canvas || disabled) {
      if (canvas) {
        const ctx = canvas.getContext("2d")
        ctx?.clearRect(0, 0, canvas.width, canvas.height)
      }
      cancelAnimationFrame(rafRef.current)
      return
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) return

    const ascii = getPageConfig("home").ascii
    const tick = () => {
      renderButtonAsciiPass(canvas, body, {
        // Denser than the page field so flame curves stay precise on a small button.
        fontPx: Math.max(3.25, ascii.fontPx * 0.48),
        color: ASCII_BLUE,
        guideColor: FLAME_COLOR,
        invert: ascii.invert,
        mode: ascii.mode,
      })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [hot, disabled])

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      className={`shop-subscribe flaming${hot ? " is-hot" : ""} ${className}`.trim()}
      {...props}
      onMouseEnter={(event) => {
        if (!disabled) setHot(true)
        onMouseEnter?.(event)
      }}
      onMouseLeave={(event) => {
        setHot(false)
        onMouseLeave?.(event)
      }}
      onFocus={(event) => {
        if (!disabled) setHot(true)
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setHot(false)
        onBlur?.(event)
      }}
    >
      <span ref={bodyRef} className="shop-subscribe__body" aria-hidden>
        <canvas ref={asciiRef} className="shop-subscribe__ascii" />
      </span>
      <span className="shop-subscribe__label">
        {typeof children === "string" ? (
          <ShuffleText
            enableHover={false}
            shuffleKey={shuffleKey}
            shuffleDuration={200}
            letterDelay={12}
            totalDuration={900}
          >
            {children}
          </ShuffleText>
        ) : (
          children
        )}
      </span>
    </button>
  )
}
