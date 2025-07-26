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
     maxVisible = 3,
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

                       // Auto-centrage : l'élément sélectionné glisse toujours au centre
     useEffect(() => {
       const centerIndex = Math.floor(maxVisible / 2) // Index central de la vue (ex: index 1 pour 3 éléments)
       let newFirstVisible = selected - centerIndex
       
       // Contraintes pour éviter de sortir des limites
       newFirstVisible = Math.max(0, Math.min(newFirstVisible, projects.length - maxVisible))
       
       setFirstVisible(newFirstVisible)
     }, [selected, maxVisible, projects.length])

     // Gestion du scroll - change la sélection pour déclencher l'animation de slide
   const handleWheel = (e: WheelEvent) => {
     e.preventDefault()
     e.stopPropagation()

     if (e.deltaY > 0) {
       // Scroll vers le bas = projet suivant (slide down)
       const nextSelected = Math.min(selected + 1, projects.length - 1)
       onSelect(nextSelected)
     } else if (e.deltaY < 0) {
       // Scroll vers le haut = projet précédent (slide up)
       const prevSelected = Math.max(selected - 1, 0)
       onSelect(prevSelected)
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
       const totalArcAngle = Math.PI * 0.25 // 45 degrés pour 3 éléments centrés
    const angleStep = visibleProjects.length > 1 ? totalArcAngle / (visibleProjects.length - 1) : 0
    
    // Angle de départ pour centrer l'arc verticalement
    const startAngle = Math.PI - totalArcAngle / 2 // Commence depuis π - arcTotal/2
    
    return visibleProjects.map((project, index) => {
      const angle = startAngle + index * angleStep
      
      // Position sur l'arc (côté gauche de la sphère)
      const x = centerX + Math.cos(angle) * arcRadius
      const y = centerY + Math.sin(angle) * arcRadius
      
                           // Calcul de l'opacité et du scale basé sur la distance du centre
        const centerIndex = Math.floor(maxVisible / 2) // Index central (ex: 1 pour 3 éléments)
        const distanceFromCenter = Math.abs(index - centerIndex)
        
        let opacity = 1
        let scale = 1
        
        if (distanceFromCenter === 0) {
          // Centre - élément sélectionné
          opacity = 1
          scale = 1.2
        } else {
          // Côtés
          opacity = 0.6
          scale = 0.9
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
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: item.opacity,
              scale: item.scale,
              x: item.x,
              y: item.y,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
                         transition={{
               duration: 0.6,
               ease: [0.25, 0.46, 0.45, 0.94],
               opacity: { duration: 0.4 },
               scale: { duration: 0.5 },
             }}
                                                   className={`
                absolute pointer-events-auto cursor-pointer select-none
                font-jetbrains uppercase tracking-wider text-right
                transition-all duration-300 ease-out
                ${
                  item.isSelected
                    ? "text-white font-bold text-xl drop-shadow-lg"
                    : item.opacity > 0.7
                    ? "text-gray-700 hover:text-orange-600 font-semibold text-lg"
                    : "text-gray-500 hover:text-gray-700 font-medium text-base"
                }
              `}
            style={{
              transformOrigin: "right center",
              transform: "translateX(-100%)", // Alignement à droite du point
              textShadow: item.isSelected ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
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
                className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-lg"
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      
    </div>
  )
} 