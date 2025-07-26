"use client"
import { useRef, useState, useEffect, type WheelEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SphereAlignedArcMenuProps {
  projects: { id: number; name: string }[]
  selected: number
  onSelect: (idx: number) => void
  maxVisible?: number
}

export default function SphereAlignedArcMenu({
  projects,
  selected,
  onSelect,
  maxVisible = 7,
}: SphereAlignedArcMenuProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const [sphereRadius, setSphereRadius] = useState(0)
  const [sphereCenter, setSphereCenter] = useState({ x: 0, y: 0 })
  const [arcRadius, setArcRadius] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calcul dynamique du rayon de la sphère et de l'arc
  useEffect(() => {
    function calculateSphereMetrics() {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Calcul du rayon de la sphère basé sur le shader (baseRadius = 0.9)
      const minSide = Math.min(viewportWidth, viewportHeight)
      const shaderBaseRadius = 0.45 // baseRadius * minSide dans le shader
      const actualSphereRadius = shaderBaseRadius * minSide

             // Centre de la sphère (même calcul que dans le shader)
       const centerX = viewportWidth * 0.5
       const centerY = viewportHeight * 0.5 - 100 // Centre visuel de la sphère

      // Distance de la liste par rapport au centre de la sphère
      // La liste doit être À GAUCHE de la sphère, pas sur sa circonférence
      const listOffset = 240 // Offset encore augmenté pour éloigner franchement la liste de la sphère
      const calculatedArcRadius = actualSphereRadius + listOffset

      setSphereRadius(actualSphereRadius)
      setSphereCenter({ x: centerX, y: centerY })
      setArcRadius(calculatedArcRadius)
    }

    calculateSphereMetrics()
    window.addEventListener("resize", calculateSphereMetrics)
    return () => window.removeEventListener("resize", calculateSphereMetrics)
  }, [])

  // Auto-scroll pour garder l'élément sélectionné visible
  useEffect(() => {
    if (selected < firstVisible) {
      setFirstVisible(selected)
    } else if (selected >= firstVisible + maxVisible) {
      setFirstVisible(selected - maxVisible + 1)
    }
  }, [selected, firstVisible, maxVisible])

  // Gestion du scroll à la molette
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (projects.length <= maxVisible) return

    if (e.deltaY > 0) {
      setFirstVisible((prev) => Math.min(prev + 1, projects.length - maxVisible))
    } else if (e.deltaY < 0) {
      setFirstVisible((prev) => Math.max(prev - 1, 0))
    }
  }

  // Calcul des positions sur l'arc
  const visibleProjects = projects.slice(firstVisible, firstVisible + maxVisible)

  // Arc À GAUCHE de la sphère (pas sur son bord)
  // Arc plus resserré pour réduire l'espacement vertical entre les titres
  const arcAngleSpan = (50 * Math.PI) / 180 // 50° total pour des titres plus rapprochés
  const middleIndex = Math.floor(visibleProjects.length / 2) // Index réel de l'élément du milieu
  // Angle pour positionner la liste FRANCHISEMENT À GAUCHE de la sphère (220°)
  const centerAngle = Math.PI + (40 * Math.PI) / 180 // 180° + 40° = 220°
  const angleStep = visibleProjects.length > 1 ? arcAngleSpan / (visibleProjects.length - 1) : 0

  // Calcul pour centrer parfaitement l'élément du milieu à π
  const startAngle = centerAngle - middleIndex * angleStep

     return (
     <div
       ref={containerRef}
       onWheel={handleWheel}
       className="absolute left-0 top-0 w-full h-full pointer-events-auto"
       style={{
         zIndex: 20,
       }}
     >
       {/* REPÈRES VISUELS POUR DEBUG */}
       {/* Centre de la sphère */}
       <div
         className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white"
         style={{
           left: sphereCenter.x - 8,
           top: sphereCenter.y - 8,
           zIndex: 1000,
         }}
       />
       
       {/* Rayon de la sphère */}
       <div
         className="absolute w-2 h-2 bg-blue-500 rounded-full border border-white"
         style={{
           left: sphereCenter.x + sphereRadius - 4,
           top: sphereCenter.y - 4,
           zIndex: 1000,
         }}
       />
       
                               {/* Arc de référence - Position de la liste à gauche */}
         <div
           className="absolute w-2 h-2 bg-green-500 rounded-full border border-white"
           style={{
             left: sphereCenter.x + Math.cos(centerAngle) * arcRadius - 4,
             top: sphereCenter.y + Math.sin(centerAngle) * arcRadius - 4,
             zIndex: 1000,
           }}
         />
       
       {/* Ligne de référence pour l'arc */}
       <svg
         className="absolute pointer-events-none"
         style={{ zIndex: 999 }}
         width="100%"
         height="100%"
       >
         <circle
           cx={sphereCenter.x}
           cy={sphereCenter.y}
           r={arcRadius}
           fill="none"
           stroke="rgba(255, 0, 255, 0.3)"
           strokeWidth="2"
           strokeDasharray="5,5"
         />
       </svg>
      <AnimatePresence>
        {visibleProjects.map((project, i) => {
          // Calcul de l'angle pour la courbure verticale
          const angle = startAngle + i * angleStep

          // Position dynamique sur l'arc à gauche de la sphère
          const x = sphereCenter.x + Math.cos(angle) * arcRadius
          const y = sphereCenter.y + Math.sin(angle) * arcRadius - 12 // Centrage vertical du texte

          // Calcul du fade basé sur la position dans la liste
          let opacity = 1
          let scale = 1

          if (i === 0 || i === visibleProjects.length - 1) {
            opacity = 0.4
            scale = 0.9
          } else if (i === 1 || i === visibleProjects.length - 2) {
            opacity = 0.7
            scale = 0.95
          }

          // Style pour l'élément sélectionné
          const isSelected = selected === firstVisible + i
          const isClickable = opacity > 0.5

          return (
            <motion.div
              key={`${project.id}-${firstVisible}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity,
                scale,
                x: x, // Position exacte sur l'arc
                y: y, // Courbure verticale sur l'arc
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
                opacity: { duration: 0.3 },
              }}
              className={`
                absolute pointer-events-auto cursor-pointer select-none
                font-jetbrains uppercase tracking-wider text-right
                transition-all duration-300 ease-out
                ${
                  isSelected
                    ? "text-white font-semibold text-lg drop-shadow-lg"
                    : "text-gray-800 hover:text-orange-600 font-medium text-base"
                }
                ${!isClickable ? "pointer-events-none" : ""}
              `}
              style={{
                transformOrigin: "right center",
                transform: "translateX(-100%)",
                textShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
              }}
              onClick={() => isClickable && onSelect(firstVisible + i)}
              whileHover={
                isClickable
                  ? {
                      scale: scale * 1.05,
                      transition: { duration: 0.2 },
                    }
                  : {}
              }
              whileTap={
                isClickable
                  ? {
                      scale: scale * 0.95,
                      transition: { duration: 0.1 },
                    }
                  : {}
              }
            >
              {project.name}

              {/* Indicateur de sélection - petit point à côté */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
                />
              )}
              {/* Repère de position du texte - FIN du texte */}
              <div
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: -1,
                  top: -1,
                  zIndex: 1001,
                }}
              />

              {/* Repère jaune sur le point d'ancrage (fin du texte) */}
              <div
                className="absolute w-2 h-2 bg-yellow-400 rounded-full border border-black"
                style={{
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 2000,
                }}
              />
            </motion.div>
          )
        })}
      </AnimatePresence>

      {/* Indicateurs de scroll si nécessaire */}
      {projects.length > maxVisible && (
        <div className="absolute left-8 top-1/2 transform -translate-y-1/2 flex flex-col space-y-2 pointer-events-auto">
          {firstVisible > 0 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              whileHover={{ opacity: 1, scale: 1.1 }}
              onClick={() => setFirstVisible(Math.max(0, firstVisible - 1))}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-gray-800 hover:bg-white/30 transition-all"
            >
              ↑
            </motion.button>
          )}

          {firstVisible + maxVisible < projects.length && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              whileHover={{ opacity: 1, scale: 1.1 }}
              onClick={() => setFirstVisible(Math.min(projects.length - maxVisible, firstVisible + 1))}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-gray-800 hover:bg-white/30 transition-all"
            >
              ↓
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}
