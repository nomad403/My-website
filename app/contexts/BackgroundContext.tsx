"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface BackgroundContextType {
  mode: 'day' | 'night'
  transitioning: boolean
  isSphereDescending: boolean
  sphereScale: number
  sphereTranslateX: number
  sphereTranslateY: number
  setMode: (mode: 'day' | 'night') => void
  setTransitioning: (transitioning: boolean) => void
  setIsSphereDescending: (descending: boolean) => void
  setSphereScale: (scale: number) => void
  setSphereTranslateX: (x: number) => void
  setSphereTranslateY: (y: number) => void
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined)

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'day' | 'night'>('day')
  const [transitioning, setTransitioning] = useState(false)
  const [isSphereDescending, setIsSphereDescending] = useState(false)
  const [sphereScale, setSphereScale] = useState(1)
  const [sphereTranslateX, setSphereTranslateX] = useState(0)
  const [sphereTranslateY, setSphereTranslateY] = useState(0)

  return (
    <BackgroundContext.Provider value={{
      mode,
      transitioning,
      isSphereDescending,
      sphereScale,
      sphereTranslateX,
      sphereTranslateY,
      setMode,
      setTransitioning,
      setIsSphereDescending,
      setSphereScale,
      setSphereTranslateX,
      setSphereTranslateY
    }}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackground() {
  const context = useContext(BackgroundContext)
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider')
  }
  return context
} 