"use client"
import { useRef, useState, useEffect, type WheelEvent } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useBackground } from "@/app/contexts/BackgroundContext"

interface ProjectNavigationProps {
  projects: { id: number; name: string }[]
  selected: number
  onSelect: (idx: number) => void
  maxVisible?: number
  orientation?: 'vertical' | 'horizontal'
}

export default function ProjectNavigation({
  projects,
  selected,
  onSelect,
  maxVisible = 5, // Réduit à 5 éléments max
  orientation = 'vertical',
}: ProjectNavigationProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
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

  // État pour les positions des projets
  const [projectPositions, setProjectPositions] = useState<Array<{
    project: any
    x: number
    y: number
    width: number
    fontSize: number
    opacity: number
    scale: number
    isSelected: boolean
    globalIndex: number
  }>>([])

  // Calcul des positions selon l'orientation avec responsivité dynamique
  const createProjectPositions = () => {
    const centerIndex = Math.floor(maxVisible / 2)
    
    if (orientation === 'horizontal') {
      // Largeur réelle du conteneur (fallback fenêtre)
      const cw = containerSize.width || (typeof window !== 'undefined' ? window.innerWidth : 0);

      // Calcul de l'espacement responsive basé sur la largeur disponible
      const minItemWidth = 80; // Largeur minimale pour un item
      const maxItemWidth = 180; // Largeur maximale pour un item
      
      // Calculer la largeur disponible par item en laissant plus d'espace
      const availableWidthPerItem = cw / maxVisible;
      const itemWidth = Math.max(minItemWidth, Math.min(maxItemWidth, availableWidthPerItem * 0.7));
      
      // Calculer l'espacement restant avec une marge plus généreuse
      const totalItemsWidth = maxVisible * itemWidth;
      const remainingSpace = cw - totalItemsWidth;
      const spacing = Math.max(12, remainingSpace / (maxVisible - 1));

      const totalListWidth = (maxVisible * itemWidth) + ((maxVisible - 1) * spacing);
      const startX = (cw - totalListWidth) / 2;

      const centerIndex = Math.floor(maxVisible / 2);
      const maxDistance = Math.floor(maxVisible / 2);

      return visibleProjects.map((project, index) => {
        const x = startX + index * (itemWidth + spacing);
        const y = 0;

        const distanceFromCenter = Math.abs(index - centerIndex);
        const opacity = 1 - (distanceFromCenter / maxDistance) * 0.7;
        const scale = 1 - (distanceFromCenter / maxDistance) * 0.3;

        const isSelected = project.originalIndex === selected;

        return {
          project,
          x,
          y,
          width: itemWidth, // Utiliser la largeur calculée pour éviter la superposition
          fontSize: 16, // Valeur par défaut, la taille sera gérée par Tailwind
          opacity: Math.max(opacity, 0.3),
          scale: Math.max(scale, 0.7),
          isSelected,
          globalIndex: project.originalIndex,
        };
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
          width: 200, // Largeur fixe pour le menu vertical
          fontSize: isSelected ? 16 : 14, // Taille fixe pour le menu vertical
          opacity: Math.max(opacity, 0.3),
          scale: Math.max(scale, 0.7),
          isSelected,
          globalIndex: project.originalIndex
        }
      })
    }
  }

  // Mettre à jour les positions quand nécessaire
  useEffect(() => {
    setProjectPositions(createProjectPositions())
  }, [selected, firstVisible, orientation, maxVisible, projects.length, containerSize.width])

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
    if (typeof window === 'undefined') return;
    const handleKeyDownWrapper = (e: KeyboardEvent) => handleKeyDown(e)
    window.addEventListener('keydown', handleKeyDownWrapper)
    return () => window.removeEventListener('keydown', handleKeyDownWrapper)
  }, [selected, projects.length])

  // Mesure de la taille réelle du conteneur avec ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const ro = new ResizeObserver(entries => {
      const rect = entries[0].contentRect
      setContainerSize({ width: rect.width, height: rect.height })
    })
    ro.observe(el)
    // première mesure
    const rect = el.getBoundingClientRect()
    setContainerSize({ width: rect.width, height: rect.height })

    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative ${
        orientation === 'horizontal' 
          ? 'w-full h-[80px]' 
          : 'w-[200px] h-[400px]'
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
            ${orientation === 'horizontal' ? 'text-center' : 'text-left'}
            ${orientation === 'horizontal' 
              ? 'text-[clamp(12px,2.3vw,18px)]' 
              : 'text-sm sm:text-base'
            }
            ${item.isSelected ? 'text-black-500 font-bold' : 'text-gray-800 hover:text-gray-600 font-medium'}
          `}
          title={item.project.name}
          style={{
            transformOrigin: orientation === 'horizontal' ? "center center" : "left center",
            transform: "translateX(0%)",
            width: `${item.width}px`,
            maxWidth: `${item.width}px`,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textShadow: item.isSelected ? '0 0 8px rgba(6, 182, 212, 0.3)' : '0 0 3px rgba(255,255,255,0.8), 0 0 6px rgba(255,255,255,0.6)',
          }}
          onClick={(e) => {
             e.stopPropagation()
             onSelect(item.globalIndex)
           }}
        >
          {item.project.name}
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
