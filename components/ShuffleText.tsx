"use client"

import { useState, useEffect } from 'react'

interface ShuffleTextProps {
  children: string
  className?: string
  shuffleDuration?: number
  shuffleChars?: string
  letterDelay?: number
  triggerShuffle?: boolean // Nouvelle prop pour déclencher l'effet programmatiquement
  enableHover?: boolean
  totalDuration?: number       // NEW: durée fixe globale
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
}: ShuffleTextProps) {
  const [isShuffling, setIsShuffling] = useState(false)
  const [displayText, setDisplayText] = useState(children)
  const shuffleChar = () => shuffleChars[Math.floor(Math.random() * shuffleChars.length)]

  useEffect(() => {
    if (triggerShuffle && !isShuffling) {
      startShuffleAnimation()
    }
  }, [triggerShuffle])

  useEffect(() => {
    if (!isShuffling) setDisplayText(children)
  }, [children, isShuffling])

  const startShuffleAnimation = () => {
    if (isShuffling) return
    setIsShuffling(true)

    const original = children
    const arr = original.split("")
    const len = arr.length
    const start = performance.now()
    let raf = 0

    // 2 phases sur une durée fixe :
    // - phase A: 0 → tA : plein shuffle (ex: 40% du temps)
    // - phase B: tA → 100% : restauration progressive de gauche à droite
    const ratioA = 0.4 // 40% shuffle, 60% restore

    const tick = (t: number) => {
      const elapsed = t - start
      const p = Math.min(1, elapsed / totalDuration)

      if (p < ratioA) {
        // Phase A: toutes les lettres en version aléatoire
        const out = arr.map((ch) => (ch === " " ? " " : shuffleChar()))
        setDisplayText(out.join(""))
      } else {
        // Phase B: on restaure progressivement en fonction du progrès
        const q = (p - ratioA) / (1 - ratioA) // 0..1
        const cutoff = Math.floor(q * len)
        const out = arr.map((ch, i) => {
          if (ch === " ") return " "
          // lettres déjà "restaurées"
          if (i < cutoff) return ch
          // lettres pas encore restaurées -> bruit
          return shuffleChar()
        })
        setDisplayText(out.join(""))
      }

      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setDisplayText(original)
        setIsShuffling(false)
        cancelAnimationFrame(raf)
      }
    }

    raf = requestAnimationFrame(tick)
  }

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