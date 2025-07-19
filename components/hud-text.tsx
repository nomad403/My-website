"use client"

import { useEffect, useRef } from "react"

interface HudTextProps {
  children: string
  className?: string
  duration?: number
  delay?: number // délai en ms avant de lancer l’animation shuffle
  scanlines?: boolean // active les scanlines HUD
}

export default function HudText({ children, className = "", duration = 1.5, delay = 0, scanlines = false, ...props }: HudTextProps & React.HTMLAttributes<HTMLDivElement>) {
  const textRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>(null)
  const timeoutRef = useRef<number>(null)

  const SHUFFLING_VALUES = [
    '!', '§', '$', '%', '&', '/', '(', ')', '=', '?', '_', '<', '>', '^', '°', '*', '#', '-', ':', ';', '~',
  ]

  // Nouvelle version : révélation progressive des lettres
  const shuffleText = (element: HTMLElement, targetText: string, duration: number = 0.8) => {
    const totalFrames = Math.max(1, Math.floor(duration * 60))
    let frame = 0
    const textLength = targetText.length
    // Pour chaque lettre, on choisit un moment aléatoire où elle sera révélée
    const revealFrames = Array.from({ length: textLength }, (_, i) => {
      // Distribution progressive + un peu de random
      const base = Math.floor((i / textLength) * totalFrames)
      return Math.min(totalFrames - 1, base + Math.floor(Math.random() * (totalFrames / 6)))
    })

    const animate = () => {
      frame++
      let displayed = ''
      for (let i = 0; i < textLength; i++) {
        if (frame >= revealFrames[i]) {
          displayed += targetText[i]
        } else {
          displayed += SHUFFLING_VALUES[Math.floor(Math.random() * SHUFFLING_VALUES.length)]
        }
      }
      element.textContent = displayed
      if (frame < totalFrames) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        element.textContent = targetText
      }
    }
    animate()
  }

  useEffect(() => {
    if (textRef.current) {
      if (delay > 0) {
        timeoutRef.current = window.setTimeout(() => {
          shuffleText(textRef.current!, children, duration)
        }, delay)
      } else {
        shuffleText(textRef.current, children, duration)
      }
    }

    return () => {
      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current)
      }
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [children, duration, delay])

  return (
    <div 
      ref={textRef}
      className={`hud-minimal${scanlines ? ' scanlines' : ''} ${className}`}
      style={{ color: '#111', ...(props.style || {}) }}
      {...props}
    >
      {children}
    </div>
  )
} 