"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface BackgroundContextType {
  mode: 'day' | 'night'
  transitioning: boolean
  isSphereDescending: boolean
  setMode: (mode: 'day' | 'night') => void
  setTransitioning: (transitioning: boolean) => void
  setIsSphereDescending: (descending: boolean) => void
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined)

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'day' | 'night'>('day')
  const [transitioning, setTransitioning] = useState(false)
  const [isSphereDescending, setIsSphereDescending] = useState(false)

  return (
    <BackgroundContext.Provider value={{
      mode,
      transitioning,
      isSphereDescending,
      setMode,
      setTransitioning,
      setIsSphereDescending
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