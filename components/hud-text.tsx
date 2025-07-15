"use client"

import { useEffect, useRef } from "react"

interface HudTextProps {
  children: string
  className?: string
  duration?: number
}

export default function HudText({ children, className = "", duration = 0.05 }: HudTextProps) {
  const textRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

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
      shuffleText(textRef.current, children, duration)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [children, duration])

  return (
    <div 
      ref={textRef}
      className={`font-jetbrains text-white ${className}`}
      style={{
        textShadow: '0 0 10px #D7B8F3',
        color: '#FFF8F0'
      }}
    >
      {children}
    </div>
  )
} 