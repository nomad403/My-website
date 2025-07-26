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
  const [labelWidths, setLabelWidths] = useState<number[]>([])
  const labelRefs = useRef<(HTMLDivElement | null)[]>([])

  // Calcul dynamique du rayon de la sphère et de l'arc
  useEffect(() => {
    function calculateSphereMetrics() {
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      // Décalage vertical pour compenser l'asymétrie visuelle du halo lumineux
      const visualOffsetY = -350 // Ajuste cette valeur pour un centrage parfait visuel

      // Calcul du rayon de la sphère basé sur le shader (baseRadius = 0.9)
      const minSide = Math.min(viewportWidth, viewportHeight)
      const shaderBaseRadius = 0.45 // baseRadius * minSide dans le shader
      const actualSphereRadius = shaderBaseRadius * minSide

      // Centre de la sphère (corrigé pour le centre visuel)
      const centerX = viewportWidth * 0.5
      const centerY = viewportHeight * 0.5 + visualOffsetY

      const padding = 260
      // Nouveau centre de l’arc : à gauche de la sphère
      const arcCenterX = centerX - actualSphereRadius - padding
      const arcCenterY = centerY

      // Rayon de l'arc : identique à la sphère pour épouser la courbure
      const calculatedArcRadius = actualSphereRadius

      setSphereRadius(actualSphereRadius)
      setSphereCenter({ x: arcCenterX, y: arcCenterY })
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

  // Arc sur le côté gauche de la sphère
  // Arc plus large pour mieux épouser la courbure de la sphère
  const arcAngleSpan = (80 * Math.PI) / 180 // 80° total pour une courbure plus fidèle
  const centerAngle = Math.PI // 180° (côté gauche, centre vertical parfait)
  const angleStep = visibleProjects.length > 1 ? arcAngleSpan / (visibleProjects.length - 1) : 0
  const middleIndex = Math.floor(visibleProjects.length / 2);
  const startAngle = centerAngle - middleIndex * angleStep;

  // Mesure dynamique des largeurs de titres
  useEffect(() => {
    if (!visibleProjects.length) return;
    const widths = visibleProjects.map((_, i) => {
      const el = labelRefs.current[i];
      return el ? el.getBoundingClientRect().width : 0;
    });
    // Ne met à jour le state que si les largeurs ont changé
    if (
      widths.length !== labelWidths.length ||
      widths.some((w, i) => w !== labelWidths[i])
    ) {
      setLabelWidths(widths);
    }
    // eslint-disable-next-line
  }, [visibleProjects]);

  // Calcul du décalage vertical pour que le projet du milieu (ou la moyenne des deux du milieu si pair)
  // soit parfaitement aligné avec le centre vertical de la sphère
  let middleArcY = 0;
  if (visibleProjects.length % 2 === 1) {
    // Nombre impair : projet du milieu
    const middleAngle = startAngle + middleIndex * angleStep;
    middleArcY = sphereCenter.y + Math.sin(middleAngle) * arcRadius;
  } else {
    // Nombre pair : moyenne des deux du milieu
    const angle1 = startAngle + (middleIndex - 0.5) * angleStep;
    const angle2 = startAngle + (middleIndex + 0.5) * angleStep;
    const y1 = sphereCenter.y + Math.sin(angle1) * arcRadius;
    const y2 = sphereCenter.y + Math.sin(angle2) * arcRadius;
    middleArcY = (y1 + y2) / 2;
  }
  // Décalage pour centrer sur le centre de la sphère (arcCenterY)
  const verticalOffset = middleArcY - sphereCenter.y;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="absolute left-0 top-0 w-full h-full pointer-events-none"
      style={{
        zIndex: 20,
        transform: `translateY(${-verticalOffset}px)`,
      }}
    >
      <AnimatePresence>
        {visibleProjects.map((project, i) => {
          const angle = startAngle + i * angleStep;
          const arcX = sphereCenter.x + Math.cos(angle) * arcRadius;
          const arcY = sphereCenter.y + Math.sin(angle) * arcRadius;
          const labelWidth = labelWidths[i] || 0;
          const x = arcX - labelWidth + 8;
          const y = arcY;

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

          return (
            <motion.div
              key={`${project.id}-${firstVisible}`}
              ref={el => { labelRefs.current[i] = el }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity,
                scale,
                x,
                y,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                duration: 0.4,
                ease: [0.25, 0.46, 0.45, 0.94],
                opacity: { duration: 0.3 },
              }}
              className={`
                absolute pointer-events-auto cursor-pointer select-none
                font-jetbrains uppercase tracking-wider
                transition-all duration-300 ease-out
                ${
                  isSelected
                    ? "text-white font-semibold text-lg drop-shadow-lg"
                    : "text-gray-800 hover:text-orange-600 font-medium text-base"
                }
              `}
              style={{
                transformOrigin: "center center",
                textShadow: isSelected ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
              }}
              onClick={() => onSelect(firstVisible + i)}
              whileHover={{
                scale: scale * 1.05,
                transition: { duration: 0.2 },
              }}
              whileTap={{
                scale: scale * 0.95,
                transition: { duration: 0.1 },
              }}
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