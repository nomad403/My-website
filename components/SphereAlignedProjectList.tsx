"use client"
import { useRef, useState, useEffect, type WheelEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SphereAlignedProjectListProps {
  projects: { id: number; name: string }[]
  selected: number
  onSelect: (idx: number) => void
  maxVisible?: number
}

export default function SphereAlignedProjectList({
  projects,
  selected,
  onSelect,
  maxVisible = 7,
}: SphereAlignedProjectListProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const [sphereMetrics, setSphereMetrics] = useState({
    centerX: 0,
    centerY: 0,
    radius: 0
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Calcul synchronisé avec le composant EnergySphereBackground
  useEffect(() => {
    function calculateSphereMetrics() {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Utilisation exacte des mêmes métriques que le shader
      // vec2 screenP = (FC.xy * 2.0 - r) / min(r.x, r.y);
      // baseRadius = 0.9 en coordonnées normalisées
      const baseRadius = 0.9
      
      // Calcul identique au shader avec dimensions réelles du conteneur
      const minSide = Math.min(viewportWidth, viewportHeight)
      const sphereRadiusPixels = baseRadius * minSide / 2
      
      // Centre parfait synchronisé avec le flexbox CSS
      const sphereCenterX = viewportWidth / 2
      const sphereCenterY = viewportHeight / 2

      setSphereMetrics({
        centerX: sphereCenterX,
        centerY: sphereCenterY,
        radius: sphereRadiusPixels
      })
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

  // Gestion du scroll
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

  const visibleProjects = projects.slice(firstVisible, firstVisible + maxVisible)

  // Calcul de l'arc tangent à la sphère côté gauche
  const createProjectPositions = () => {
    if (!sphereMetrics.radius) return []

    const { centerX, centerY, radius } = sphereMetrics
    
         // Distance de la liste par rapport à la surface de la sphère
     const listOffset = 100 // Distance depuis la surface de la sphère (augmentée pour éviter la superposition)
    const arcRadius = radius + listOffset
    
         // Arc vertical centré sur la sphère (côté gauche)
     // Angle total pour distribuer les projets
     const totalArcAngle = Math.PI * 0.35 // 63 degrés pour un espacement vertical réduit
    const angleStep = visibleProjects.length > 1 ? totalArcAngle / (visibleProjects.length - 1) : 0
    
    // Angle de départ pour centrer l'arc verticalement
    const startAngle = Math.PI - totalArcAngle / 2 // Commence depuis π - arcTotal/2
    
    return visibleProjects.map((project, index) => {
      const angle = startAngle + index * angleStep
      
      // Position sur l'arc (côté gauche de la sphère)
      const x = centerX + Math.cos(angle) * arcRadius
      const y = centerY + Math.sin(angle) * arcRadius
      
      // Calcul de l'opacité et du scale basé sur la position
      let opacity = 1
      let scale = 1
      
      if (index === 0 || index === visibleProjects.length - 1) {
        opacity = 0.4
        scale = 0.9
      } else if (index === 1 || index === visibleProjects.length - 2) {
        opacity = 0.7
        scale = 0.95
      }
      
             const isSelected = selected === firstVisible + index
       const isClickable = true // Tous les éléments visibles sont cliquables
      
      return {
        project,
        x,
        y,
        opacity,
        scale,
        isSelected,
        isClickable,
        globalIndex: firstVisible + index
      }
    })
  }

  const projectPositions = createProjectPositions()

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
             className="absolute left-0 top-0 w-full h-full pointer-events-none"
       style={{ zIndex: 30 }}
    >
      

             <AnimatePresence>
         {projectPositions.map((item, index) => (
           <motion.div
             key={`${item.project.id}-${firstVisible}`}
             title={`${item.project.name} - Index: ${item.globalIndex} - Clickable: ${item.isClickable}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: item.opacity,
              scale: item.scale,
              x: item.x,
              y: item.y,
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
                 item.isSelected
                   ? "text-orange-500 font-bold text-xl drop-shadow-lg"
                   : "text-gray-800 hover:text-orange-600 font-medium text-base"
               }
             `}
            style={{
              transformOrigin: "right center",
              transform: "translateX(-100%)", // Alignement à droite du point
              textShadow: item.isSelected ? "0 2px 12px rgba(249,115,22,0.6), 0 0 8px rgba(0,0,0,0.4)" : "none",
            }}
                         onClick={() => onSelect(item.globalIndex)}
                         whileHover={{
               scale: item.scale * 1.05,
               transition: { duration: 0.2 },
             }}
             whileTap={{
               scale: item.scale * 0.95,
               transition: { duration: 0.1 },
             }}
          >
            {item.project.name}

            {/* Indicateur de sélection */}
            {item.isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-orange-500 rounded-full shadow-lg border-2 border-orange-300"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Indicateurs de scroll */}
      {projects.length > maxVisible && (
                 <div 
           className="absolute flex flex-col space-y-2 pointer-events-auto"
           style={{
             left: sphereMetrics.centerX - sphereMetrics.radius - 160,
             top: sphereMetrics.centerY - 20,
           }}
         >
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