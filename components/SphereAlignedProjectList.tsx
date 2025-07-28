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
  maxVisible = 5,
}: SphereAlignedProjectListProps) {
  const [firstVisible, setFirstVisible] = useState(0)
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-centrage : l'élément sélectionné glisse toujours au centre
  useEffect(() => {
    const centerIndex = Math.floor(maxVisible / 2)
    let newFirstVisible = selected - centerIndex

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
      setSlideDirection('up')
      const nextSelected = (selected + 1) % projects.length
      onSelect(nextSelected)
    } else if (e.deltaY < 0) {
      setSlideDirection('down')
      const prevSelected = (selected - 1 + projects.length) % projects.length
      onSelect(prevSelected)
    }
  }

  // Création d'une liste circulaire simple
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

  return (
    // APPROCHE ULTRA-SIMPLE : Container fixe à gauche avec flex column
    <div
      ref={containerRef}
      className="fixed left-8 top-1/2 -translate-y-1/2 z-[999] w-80"
      onWheel={handleWheel}
      style={{ 
        pointerEvents: 'auto',
        backgroundColor: 'rgba(0, 255, 0, 0.2)' // Zone verte bien visible
      }}
    >
      <div className="flex flex-col space-y-4">
        {visibleProjects.map((project, index) => {
          const centerIndex = Math.floor(maxVisible / 2)
          const distanceFromCenter = Math.abs(index - centerIndex)
          const isSelected = project.originalIndex === selected
          const opacity = isSelected ? 1 : 0.6 - (distanceFromCenter * 0.1)
          
          return (
            <div
              key={`${project.originalIndex}-${index}`}
              className={`
                cursor-pointer select-none font-jetbrains uppercase tracking-wider
                px-6 py-3 rounded-lg transition-all duration-300
                bg-blue-500/90 text-white
                ${isSelected ? 'bg-orange-500/90 font-bold text-lg' : 'hover:bg-blue-400/90'}
              `}
              style={{ opacity }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                alert(`SIMPLE CLIC : ${project.name}!`)
                onSelect(project.originalIndex)
              }}
            >
              <div className="flex items-center justify-between">
                <span>{project.name}</span>
                {isSelected && (
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 