"use client"

import { useState, useEffect, useRef } from 'react'

interface ShuffleTextProps {
  children: string
  className?: string
  shuffleDuration?: number
  shuffleChars?: string
  letterDelay?: number
  triggerShuffle?: boolean // Nouvelle prop pour déclencher l'effet programmatiquement
  enableHover?: boolean
  totalDuration?: number       // NEW: durée fixe globale
  shuffleKey?: number
}

export default function ShuffleText({ 
  children, 
  className = "", 
  shuffleDuration = 200,
  shuffleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()",
  letterDelay = 15,
  triggerShuffle,
  enableHover = true,
  totalDuration = 900,         // NEW
  shuffleKey = 0,
}: ShuffleTextProps) {
  const [isShuffling, setIsShuffling] = useState(false)
  const [displayText, setDisplayText] = useState(children)
  const rafRef = useRef(0)
  const isShufflingRef = useRef(false)
  const childrenRef = useRef(children)
  childrenRef.current = children

  const shuffleChar = () => shuffleChars[Math.floor(Math.random() * shuffleChars.length)]

  const stopShuffle = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    isShufflingRef.current = false
    setIsShuffling(false)
  }

  const startShuffleAnimation = () => {
    stopShuffle()
    isShufflingRef.current = true
    setIsShuffling(true)

    const original = childrenRef.current
    const arr = original.split("")
    const len = arr.length
    const start = performance.now()

    // 2 phases sur une durée fixe :
    // - phase A: 0 → tA : plein shuffle (ex: 40% du temps)
    // - phase B: tA → 100% : restauration progressive de gauche à droite
    const ratioA = 0.4 // 40% shuffle, 60% restore

    const tick = (t: number) => {
      if (!isShufflingRef.current) return

      const elapsed = t - start
      const p = Math.min(1, elapsed / totalDuration)

      if (p < ratioA) {
        const out = arr.map((ch) => (ch === " " ? " " : shuffleChar()))
        setDisplayText(out.join(""))
      } else {
        const q = (p - ratioA) / (1 - ratioA)
        const cutoff = Math.floor(q * len)
        const out = arr.map((ch, i) => {
          if (ch === " ") return " "
          if (i < cutoff) return ch
          return shuffleChar()
        })
        setDisplayText(out.join(""))
      }

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayText(original)
        stopShuffle()
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (triggerShuffle && !isShufflingRef.current) {
      startShuffleAnimation()
    }
  }, [triggerShuffle])

  useEffect(() => {
    if (shuffleKey > 0) {
      startShuffleAnimation()
    }
  }, [shuffleKey, children])

  useEffect(() => {
    if (!isShuffling) setDisplayText(children)
  }, [children, isShuffling])

  useEffect(() => () => stopShuffle(), [])

  const canHover = enableHover && !isShuffling && !triggerShuffle
  const handleMouseEnter = () => {
    if (canHover) startShuffleAnimation()
  }

  return (
    <span className={className} onMouseEnter={handleMouseEnter}>
      {displayText}
    </span>
  )
}
