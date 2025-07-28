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
  maxVisible = 5, // Réduit à 5 éléments max
}: SphereAlignedProjectListProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fonction pour tronquer les titres trop longs
  const truncateTitle = (title: string, maxLength: number = 15) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength - 3) + '...'
  }

  // Auto-centrage : l'élément sélectionné glisse toujours au centre
  useEffect(() => {
    const centerIndex = Math.floor(maxVisible / 2) // Position centrale (ex: index 2 pour 5 éléments)
    let newFirstVisible = selected - centerIndex

    // Ajustement pour la boucle infinie
    while (newFirstVisible < 0) {
      newFirstVisible += projects.length
    }
    newFirstVisible = newFirstVisible % projects.length

    setFirstVisible(newFirstVisible)
  }, [selected, maxVisible, projects.length])

  // Gestion du scroll - carousel infini
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.deltaY > 0) {
      // Scroll vers le bas = projet suivant (slide up)
      setSlideDirection('up')
      const nextSelected = (selected + 1) % projects.length
      onSelect(nextSelected)
    } else if (e.deltaY < 0) {
      // Scroll vers le haut = projet précédent (slide down)
      setSlideDirection('down')
      const prevSelected = (selected - 1 + projects.length) % projects.length
      onSelect(prevSelected)
    }
  }

  // Création d'une liste circulaire pour le carousel infini
  const createCircularProjects = () => {
    const result = []
    for (let i = 0; i < maxVisible; i++) {
      const projectIndex = (firstVisible + i) % projects.length
      result.push({
        ...projects[projectIndex],
        originalIndex: projectIndex
      })
    }
    return result
  }

  const visibleProjects = createCircularProjects()

  // Calcul des positions en colonne verticale simple
  const createProjectPositions = () => {
    const centerIndex = Math.floor(maxVisible / 2)
    const itemHeight = 60 // Espacement vertical entre les éléments
    const slideOffset = itemHeight * 0.8 // Décalage pour l'animation

    return visibleProjects.map((project, index) => {
      // Position Y centrée autour du milieu de l'écran
      const yOffset = (index - centerIndex) * itemHeight
      const y = window.innerHeight / 2 + yOffset

             // Position X fixe à gauche
       const x = 180 // Position relative au conteneur plus étroit

      // Positions pour les animations slide
      const slideUpY = y - slideOffset
      const slideDownY = y + slideOffset

      // Calcul de l'opacité et de l'échelle
      const distanceFromCenter = Math.abs(index - centerIndex)
      const maxDistance = Math.floor(maxVisible / 2)
      const opacity = 1 - (distanceFromCenter / maxDistance) * 0.7 // De 1.0 à 0.3
      const scale = 1 - (distanceFromCenter / maxDistance) * 0.3 // De 1.0 à 0.7

      const isSelected = project.originalIndex === selected

      return {
        project,
        x,
        y,
        slideUpY,
        slideDownY,
        opacity: Math.max(opacity, 0.3),
        scale: Math.max(scale, 0.7),
        isSelected,
        globalIndex: project.originalIndex
      }
    })
  }

  const projectPositions = createProjectPositions()

  return (
              <div
       ref={containerRef}
       className="absolute left-16 top-0 w-[240px] h-full z-[200]"
       onWheel={handleWheel}
       style={{ pointerEvents: 'auto' }}
            >        
        <AnimatePresence mode="wait">
        {projectPositions.map((item, index) => (
          <motion.div
            key={index} // Unique key for position in carousel
            initial={{
              opacity: 0,
              scale: 0.8,
              x: item.x,
              y: slideDirection === 'up' ? item.slideDownY : slideDirection === 'down' ? item.slideUpY : item.y,
            }}
            animate={{
              opacity: item.opacity,
              scale: item.scale,
              x: item.x,
              y: item.y,
            }}
            exit={{
              opacity: 0,
              scale: 0.8,
              x: item.x,
              y: slideDirection === 'up' ? item.slideUpY : slideDirection === 'down' ? item.slideDownY : item.y,
            }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
              opacity: { duration: 0.4 },
              scale: { duration: 0.5 },
            }}
            onAnimationComplete={() => setSlideDirection(null)}
                                      className={`
               absolute pointer-events-auto cursor-pointer select-none
               font-jetbrains uppercase tracking-wider text-left
               transition-all duration-300 ease-out z-[110]
               ${
                 item.isSelected
                   ? "text-orange-500 font-bold text-xl drop-shadow-lg"
                   : "text-gray-800 hover:text-orange-600 font-medium text-base"
               }
             `}
            title={item.project.name} // Tooltip avec le titre complet
                         style={{
               transformOrigin: "left center",
               transform: "translateX(0%)", // Align left edge of text
               textShadow: item.isSelected ? "0 2px 12px rgba(249,115,22,0.6), 0 0 8px rgba(0,0,0,0.4)" : "none",
               whiteSpace: "nowrap",
               maxWidth: "200px", // Largeur maximale pour éviter le débordement
               overflow: "hidden",
               textOverflow: "ellipsis",
             }}
                         onClick={(e) => {
               e.stopPropagation()
               const forwardDistance = (item.globalIndex - selected + projects.length) % projects.length
               const backwardDistance = (selected - item.globalIndex + projects.length) % projects.length
               setSlideDirection(forwardDistance <= backwardDistance ? 'up' : 'down')
               onSelect(item.globalIndex)
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
            {truncateTitle(item.project.name)}
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
    </div>
  )
} 