"use client"

import { useState, useEffect } from "react"
import { useBackground } from "@/app/contexts/BackgroundContext"
import { AnimatePresence, motion } from "framer-motion"

export default function BackgroundLayers() {
  const { mode, isSphereDescending } = useBackground()
  const [showStarField, setShowStarField] = useState(false)

  // Synchroniser le StarField avec le mode
  useEffect(() => {
    if (mode === 'night') {
      // StarField apparaît seulement quand le fond specialist est visible
      if (!isSphereDescending) {
        const timer = setTimeout(() => {
          setShowStarField(true)
        }, 600) // Synchronisé avec les autres animations
        return () => clearTimeout(timer)
      } else {
        setShowStarField(false)
      }
    } else {
      // Délayer la disparition du StarField pour éviter le flash
      const timer = setTimeout(() => {
        setShowStarField(false)
      }, 600) // Synchronisé avec les autres animations
      return () => clearTimeout(timer)
    }
  }, [mode, isSphereDescending])

  return (
    <>
      {/* Un seul fond à la fois avec AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0 }}
          animate={{ opacity: mode === 'night' && !isSphereDescending ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background: mode === "night" 
              ? "linear-gradient(to bottom, #1a0a2e, #2d1b4e, #4a1b6a, #000000)" 
              : "white",
            boxShadow: mode === "night" 
              ? "inset 0 0 100px rgba(147, 51, 234, 0.1), inset 0 0 200px rgba(88, 28, 135, 0.05)" 
              : "none"
          }}
        />
      </AnimatePresence>

      {/* StarField rendu dans le Canvas global */}
    </>
  )
} 