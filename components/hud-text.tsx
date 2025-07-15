"use client"

import { useEffect, useRef } from "react"

interface HudTextProps {
  children: string
  className?: string
  duration?: number
  delay?: number // délai en ms avant de lancer l’animation shuffle
  scanlines?: boolean // active les scanlines HUD
}

export default function HudText({ children, className = "", duration = 0.05, delay = 0, scanlines = false, ...props }: HudTextProps & React.HTMLAttributes<HTMLDivElement>) {
  const textRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const timeoutRef = useRef<number>()

  const SHUFFLING_VALUES = [
    '!', '§', '$', '%', '&', '/', '(', ')', '=', '?', '_', '<', '>', '^', '°', '*', '#', '-', ':', ';', '~',
  ]

  const shuffleText = (element: HTMLElement, targetText: string, duration: number = 0.05) => {
    const originalText = element.textContent || ""
    const frames = duration * 60
    let frame = 0

    const animate = () => {
      frame++
      
      if (frame < frames) {
        // Shuffle effect
        const shuffled = targetText.split('').map(() => 
          SHUFFLING_VALUES[Math.floor(Math.random() * SHUFFLING_VALUES.length)]
        ).join('')
        element.textContent = shuffled
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Show final text
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