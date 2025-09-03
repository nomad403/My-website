"use client"
import { useRef, useState, useEffect, type WheelEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useBackground } from "@/app/contexts/BackgroundContext"

interface SphereAlignedProjectListProps {
  projects: { id: number; name: string }[]
  selected: number
  onSelect: (idx: number) => void
  maxVisible?: number
  orientation?: 'vertical' | 'horizontal'
}

export default function SphereAlignedProjectList({
  projects,
  selected,
  onSelect,
  maxVisible = 5, // Réduit à 5 éléments max
  orientation = 'vertical',
}: SphereAlignedProjectListProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const { mode } = useBackground()

  const containerRef = useRef<HTMLDivElement>(null)

  // Fonction pour déterminer la couleur du texte basée sur la position
  const getTextColor = (y: number): string => {
    // Position relative au centre de la liste (200px)
    const centerY = 200
    const distanceFromCenter = Math.abs(y - centerY)
    const maxDistance = 140 // 2 éléments de chaque côté
    
    // Plus proche du centre = plus clair (texte noir)
    // Plus loin du centre = plus sombre (texte blanc)
    const brightness = 1 - (distanceFromCenter / maxDistance)
    
    // Seuil pour déterminer la couleur
    return brightness > 0.3 ? 'black' : 'white'
  }

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

  // Gestion du scroll - carousel infini (vertical et horizontal)
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Gestion du scroll vertical
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      if (e.deltaY > 0) {
        // Scroll vers le bas = projet suivant
        const nextSelected = (selected + 1) % projects.length
        onSelect(nextSelected)
      } else if (e.deltaY < 0) {
        // Scroll vers le haut = projet précédent
        const prevSelected = (selected - 1 + projects.length) % projects.length
        onSelect(prevSelected)
      }
    }
    // Gestion du scroll horizontal
    else if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (e.deltaX > 0) {
        // Scroll vers la droite = projet suivant
        const nextSelected = (selected + 1) % projects.length
        onSelect(nextSelected)
      } else if (e.deltaX < 0) {
        // Scroll vers la gauche = projet précédent
        const prevSelected = (selected - 1 + projects.length) % projects.length
        onSelect(prevSelected)
      }
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

  // Calcul des positions selon l'orientation avec responsivité dynamique
  const createProjectPositions = () => {
    const centerIndex = Math.floor(maxVisible / 2)
    
    if (orientation === 'horizontal') {
      // Layout horizontal responsive pour mobile/tablet
      const itemWidth = Math.max(80, Math.min(140, window.innerWidth / maxVisible - 20)) // Responsive
      const containerWidth = Math.min(400, window.innerWidth * 0.9) // Responsive
      const totalListWidth = maxVisible * itemWidth
      const startX = Math.max(0, (containerWidth - totalListWidth) / 2)

      return visibleProjects.map((project, index) => {
        const x = startX + (index * itemWidth)
        const y = 0

        // Calcul de l'opacité et de l'échelle
        const distanceFromCenter = Math.abs(index - centerIndex)
        const maxDistance = Math.floor(maxVisible / 2)
        const opacity = 1 - (distanceFromCenter / maxDistance) * 0.7
        const scale = 1 - (distanceFromCenter / maxDistance) * 0.3

        const isSelected = project.originalIndex === selected

        return {
          project,
          x,
          y,
          opacity: Math.max(opacity, 0.3),
          scale: Math.max(scale, 0.7),
          isSelected,
          globalIndex: project.originalIndex
        }
      })
    } else {
      // Layout vertical pour desktop (comportement original)
      const itemHeight = 70
      const containerHeight = 400
      const totalListHeight = maxVisible * itemHeight
      const startY = (containerHeight - totalListHeight) / 2

      return visibleProjects.map((project, index) => {
        const y = startY + (index * itemHeight)
        const x = 0

        // Calcul de l'opacité et de l'échelle
        const distanceFromCenter = Math.abs(index - centerIndex)
        const maxDistance = Math.floor(maxVisible / 2)
        const opacity = 1 - (distanceFromCenter / maxDistance) * 0.7
        const scale = 1 - (distanceFromCenter / maxDistance) * 0.3

        const isSelected = project.originalIndex === selected

        return {
          project,
          x,
          y,
          opacity: Math.max(opacity, 0.3),
          scale: Math.max(scale, 0.7),
          isSelected,
          globalIndex: project.originalIndex
        }
      })
    }
  }

  const projectPositions = createProjectPositions()

  // Gestion des touches clavier
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      const nextSelected = (selected + 1) % projects.length
      onSelect(nextSelected)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const prevSelected = (selected - 1 + projects.length) % projects.length
      onSelect(prevSelected)
    }
  }

  // Ajouter les event listeners pour les touches
  useEffect(() => {
    const handleKeyDownWrapper = (e: KeyboardEvent) => handleKeyDown(e)
    window.addEventListener('keydown', handleKeyDownWrapper)
    return () => window.removeEventListener('keydown', handleKeyDownWrapper)
  }, [selected, projects.length])

  // Gestion du redimensionnement pour recalculer les positions
  useEffect(() => {
    const handleResize = () => {
      // Force le recalcul des positions en déclenchant un re-render
      setFirstVisible(prev => prev) // Trigger re-render
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative ${
        orientation === 'horizontal' 
          ? 'w-full max-w-[400px] h-[80px]' 
          : 'min-w-[180px] h-[400px]'
      }`}
      onWheel={handleWheel}
      style={{ 
        pointerEvents: 'auto',
        transform: orientation === 'horizontal' ? 'none' : undefined // Reset des transforms en mode horizontal
      }}
      tabIndex={0} // Pour permettre le focus et les événements clavier
    >
      {projectPositions.map((item, index) => (
        <motion.div
          key={`${item.project.id}-${item.globalIndex}`}
          initial={{
            opacity: 0,
            scale: 0.8,
            x: item.x,
            y: item.y,
          }}
          animate={{
            opacity: item.opacity,
            scale: item.scale,
            x: item.x,
            y: item.y,
          }}
          transition={{
            duration: 0.6,
            ease: [0.25, 0.46, 0.45, 0.94],
            opacity: { duration: 0.4 },
            scale: { duration: 0.5 },
          }}
                    className={`
             absolute pointer-events-auto cursor-pointer select-none
             font-kode uppercase tracking-wider
             transition-all duration-300 ease-out z-10
             ${
               item.isSelected
                 ? "font-bold text-xl"
                 : "font-medium text-base"
             }
             ${orientation === 'horizontal' ? 'text-center' : 'text-left'}
           `}
            title={item.project.name}
            style={{
             transformOrigin: orientation === 'horizontal' ? "center center" : "left center",
             transform: "translateX(0%)",
             whiteSpace: "nowrap",
             maxWidth: orientation === 'horizontal' ? "100px" : "200px",
             overflow: "hidden",
             textOverflow: "ellipsis",
             color: "black", // Texte noir
             textShadow: "0 0 3px rgba(255,255,255,0.8), 0 0 6px rgba(255,255,255,0.6)", // Ombre portée blanche pour la lisibilité
           }}
          onClick={(e) => {
             e.stopPropagation()
             onSelect(item.globalIndex)
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
    </div>
  )
} 