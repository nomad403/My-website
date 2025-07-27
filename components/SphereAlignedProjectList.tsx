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

  // Auto-centrage : l'élément sélectionné glisse toujours au centre
  useEffect(() => {
    if (projects.length === 0) return
    
    const centerIndex = Math.floor(maxVisible / 2) // Position centrale de la liste visible
    let newFirstVisible = selected - centerIndex
    
    // Contraintes pour éviter de sortir des limites
    newFirstVisible = Math.max(0, Math.min(newFirstVisible, projects.length - maxVisible))
    
    // Éviter les mises à jour inutiles
    if (newFirstVisible !== firstVisible) {
      setFirstVisible(newFirstVisible)
    }
  }, [selected, maxVisible, projects.length, firstVisible])

  // Gestion du scroll - change la sélection pour déclencher l'animation de centrage
  const handleWheel = (e: WheelEvent) => {
    try {
      e.preventDefault()
      e.stopPropagation()

      if (e.deltaY > 0) {
        // Scroll vers le bas = projet suivant
        const nextSelected = Math.min(selected + 1, projects.length - 1)
        if (nextSelected !== selected) {
          onSelect(nextSelected)
        }
      } else if (e.deltaY < 0) {
        // Scroll vers le haut = projet précédent
        const prevSelected = Math.max(selected - 1, 0)
        if (prevSelected !== selected) {
          onSelect(prevSelected)
        }
      }
    } catch (error) {
      console.error('Erreur dans handleWheel:', error)
    }
  }

  const visibleProjects = projects.slice(firstVisible, firstVisible + maxVisible)

  // Calcul de l'arc tangent à la sphère côté gauche
  const createProjectPositions = () => {
    if (!sphereMetrics.radius || visibleProjects.length === 0) return []

    const { centerX, centerY, radius } = sphereMetrics
    
    // Vérification des valeurs
    if (!centerX || !centerY || !radius || radius <= 0) return []
    
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
      
             // Calcul de l'opacité et du scale basé sur la distance du centre
       const centerIndex = Math.floor(maxVisible / 2) // Position centrale
       const distanceFromCenter = Math.abs(index - centerIndex)
       
       let opacity = 1
       let scale = 1
       
       if (distanceFromCenter === 0) {
         // Centre - élément sélectionné
         opacity = 1
         scale = 1.1
       } else if (distanceFromCenter === 1) {
         // Proche du centre
         opacity = 0.8
         scale = 1
       } else if (distanceFromCenter === 2) {
         // Moyen
         opacity = 0.6
         scale = 0.95
       } else {
         // Loin du centre
         opacity = 0.3
         scale = 0.9
       }
      
             const isSelected = selected === firstVisible + index
       const isClickable = true // Tous les éléments visibles sont cliquables
      
             // Vérifier que les coordonnées sont valides
       if (!isFinite(x) || !isFinite(y) || isNaN(x) || isNaN(y)) {
         console.warn('Coordonnées invalides détectées:', { x, y, angle, index })
         return null
       }

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
                   ? "text-orange-500 font-bold text-xl drop-shadow-lg"
                   : "text-gray-800 hover:text-orange-600 font-medium text-base"
               }
             `}
            style={{
              transformOrigin: "right center",
              transform: "translateX(-100%)", // Alignement à droite du point
              textShadow: item.isSelected ? "0 2px 12px rgba(249,115,22,0.6), 0 0 8px rgba(0,0,0,0.4)" : "none",
            }}
                                                   onClick={(e) => {
                try {
                  e.preventDefault()
                  e.stopPropagation()
                  if (typeof item.globalIndex === 'number' && item.globalIndex >= 0) {
                    onSelect(item.globalIndex)
                  }
                } catch (error) {
                  console.error('Erreur dans onClick:', error)
                }
              }}
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

             {/* Indicateurs de navigation */}
       {projects.length > 1 && (
                 <div 
           className="absolute flex flex-col space-y-2 pointer-events-auto"
           style={{
             left: sphereMetrics.centerX - sphereMetrics.radius - 160,
             top: sphereMetrics.centerY - 20,
           }}
         >
                     {selected > 0 && (
             <motion.button
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.6 }}
               whileHover={{ opacity: 1, scale: 1.1 }}
                               onClick={(e) => {
                  try {
                    e.preventDefault()
                    e.stopPropagation()
                    const newSelected = Math.max(0, selected - 1)
                    if (newSelected !== selected) {
                      onSelect(newSelected)
                    }
                  } catch (error) {
                    console.error('Erreur navigation up:', error)
                  }
                }}
               className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-gray-800 hover:bg-white/30 transition-all"
             >
               ↑
             </motion.button>
           )}

           {selected < projects.length - 1 && (
             <motion.button
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.6 }}
               whileHover={{ opacity: 1, scale: 1.1 }}
                               onClick={(e) => {
                  try {
                    e.preventDefault()
                    e.stopPropagation()
                    const newSelected = Math.min(projects.length - 1, selected + 1)
                    if (newSelected !== selected) {
                      onSelect(newSelected)
                    }
                  } catch (error) {
                    console.error('Erreur navigation down:', error)
                  }
                }}
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