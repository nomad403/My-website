"use client"

import { useState, useEffect } from "react"
import StarField from "./StarField"
import { useBackground } from "@/app/contexts/BackgroundContext"
import { AnimatePresence, motion } from "framer-motion"

export default function BackgroundLayers() {
  const { mode, transitioning, isSphereDescending } = useBackground()
  const [showStarField, setShowStarField] = useState(mode === 'night')

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
              ? "linear-gradient(to bottom, #0a0a1a, #1a1a3a, #000000)" 
              : "white"
          }}
        />
      </AnimatePresence>

      {/* StarField synchronisé */}
      {showStarField && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <StarField />
        </div>
      )}
    </>
  )
} 