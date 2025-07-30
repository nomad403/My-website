"use client"

import { useState, useEffect } from "react"
import StarField from "./StarField"
import { useBackground } from "@/app/contexts/BackgroundContext"
import { AnimatePresence, motion } from "framer-motion"

export default function BackgroundLayers() {
  const { mode, transitioning, isSphereDescending } = useBackground()
  const [showStarField, setShowStarField] = useState(mode === 'night')
  const [specialistBackgroundOpacity, setSpecialistBackgroundOpacity] = useState(0)

  // Gérer l'opacité du fond specialist
  useEffect(() => {
    if (mode === 'night' && isSphereDescending) {
      // Pendant la descente : fond invisible
      setSpecialistBackgroundOpacity(0)
    } else if (mode === 'night' && !isSphereDescending) {
      // Une fois la sphère descendue : fond visible progressivement
      const timer = setTimeout(() => {
        setSpecialistBackgroundOpacity(1)
      }, 200) // Même timing que le fond specialist
      return () => clearTimeout(timer)
    } else {
      // Pour les autres pages : fond normal
      setSpecialistBackgroundOpacity(1)
    }
  }, [mode, isSphereDescending])

  // Synchroniser le StarField avec le mode
  useEffect(() => {
    if (mode === 'night') {
      // StarField apparaît seulement quand le fond specialist est visible
      if (!isSphereDescending) {
        const timer = setTimeout(() => {
          setShowStarField(true)
        }, 200) // Même timing que le fond specialist
        return () => clearTimeout(timer)
      } else {
        setShowStarField(false)
      }
    } else {
      // Délayer la disparition du StarField pour éviter le flash
      const timer = setTimeout(() => {
        setShowStarField(false)
      }, 1200) // Même durée que la transition
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
          animate={{ opacity: specialistBackgroundOpacity }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            pointerEvents: "none",
            background: mode === "night" 
              ? "linear-gradient(to bottom, #1e1b4b, #581c87, #000000)" 
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