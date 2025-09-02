"use client"

import { useState, useEffect } from 'react'

interface ShuffleTextProps {
  children: string
  className?: string
  shuffleDuration?: number
  shuffleChars?: string
  letterDelay?: number
}

export default function ShuffleText({ 
  children, 
  className = "", 
  shuffleDuration = 200,
  shuffleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()",
  letterDelay = 18
}: ShuffleTextProps) {
  const [isShuffling, setIsShuffling] = useState(false)
  const [displayText, setDisplayText] = useState(children)

  const shuffleChar = () => shuffleChars[Math.floor(Math.random() * shuffleChars.length)]

  const handleMouseEnter = () => {
    if (isShuffling) return
    
    setIsShuffling(true)
    const originalText = children
    const textLength = originalText.length
    
    // Créer un tableau pour suivre l'état de chaque lettre
    let currentText = originalText.split('')
    
    // Phase 1: Shuffle lettre par lettre de gauche à droite
    const startShuffle = (index: number) => {
      if (index >= textLength) {
        // Toutes les lettres sont mélangées, commencer la restauration
        setTimeout(() => startRestore(0), 80)
        return
      }
      
      // Mélanger cette lettre spécifique
      currentText[index] = shuffleChar()
      setDisplayText(currentText.join(''))
      
      // Passer à la lettre suivante après un délai
      setTimeout(() => {
        startShuffle(index + 1)
      }, letterDelay)
    }
    
    // Phase 2: Restaurer lettre par lettre de gauche à droite
    const startRestore = (index: number) => {
      if (index >= textLength) {
        // Toutes les lettres sont restaurées
        setIsShuffling(false)
        return
      }
      
      // Restaurer cette lettre spécifique
      currentText[index] = originalText[index]
      setDisplayText(currentText.join(''))
      
      // Passer à la lettre suivante après un délai
      setTimeout(() => {
        startRestore(index + 1)
      }, letterDelay)
    }
    
    // Commencer par la première lettre
    startShuffle(0)
  }

  return (
    <span 
      className={className}
      onMouseEnter={handleMouseEnter}
    >
      {displayText}
    </span>
  )
}