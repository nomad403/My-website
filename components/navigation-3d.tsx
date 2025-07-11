"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import type { Group, Object3D, Box3, Vector3 } from "three"
import { PerspectiveCamera } from "three"
import { motion, AnimatePresence } from "framer-motion"

interface Navigation3DProps {
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  onNavigate: (page: string, direction?: string) => void
  isTransitioning?: boolean
  currentPage: string
}

function RobotModel({ onClick }: { onClick: () => void }) {
  const group = useRef<Group>(null)
  const { scene } = useGLTF("/cyberpunk_head_robot_random_represent.glb")
  const { camera } = useThree()
  const [fitted, setFitted] = useState(false)

  // Centrage et zoom automatique
  useEffect(() => {
    if (!group.current || fitted) return
    // Clone la scène pour ne pas modifier l'original
    const temp = scene.clone() as Object3D
    const box = new (require('three').Box3)().setFromObject(temp)
    const size = new (require('three').Vector3)()
    box.getSize(size)
    const center = new (require('three').Vector3)()
    box.getCenter(center)
    // Centre le modèle
    group.current.position.x = -center.x
    group.current.position.y = -center.y
    group.current.position.z = -center.z
    // Calcule le scale pour que le modèle tienne dans la vue
    const perspectiveCamera = camera as PerspectiveCamera
    const maxDim = Math.max(size.x, size.y, size.z)
    const fitHeightDistance = maxDim / (2 * Math.atan((Math.PI * perspectiveCamera.fov) / 360))
    const fitWidthDistance = fitHeightDistance / perspectiveCamera.aspect
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance)
    perspectiveCamera.position.z = distance
    perspectiveCamera.near = distance / 100
    perspectiveCamera.far = distance * 100
    perspectiveCamera.updateProjectionMatrix()
    setFitted(true)
  }, [scene, camera, fitted])

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.2
      group.current.rotation.y += 0.01
      group.current.position.y += Math.sin(clock.getElapsedTime() * 1.5) * 0.01 // léger flottement
    }
  })

  return <group ref={group} onPointerDown={onClick}><primitive object={scene} /></group>
}

const NAV_BUTTONS = [
  { x: 0, y: 2.5, page: "about", direction: "down", label: "À propos", position: "top" },
  { x: -2.5, y: 0, page: "projects", direction: "right", label: "Projets", position: "left" },
  { x: 2.5, y: 0, page: "contact", direction: "left", label: "Contact", position: "right" },
  { x: 0, y: -2.5, page: "skills", direction: "up", label: "Compétences", position: "bottom" },
]

function getGridPositions(currentPage: string) {
  if (currentPage === "home") return NAV_BUTTONS
  const current = NAV_BUTTONS.find((pos) => pos.page === currentPage)
  if (!current) return NAV_BUTTONS
  const getOpposite = (pos: string) => {
    switch (pos) {
      case "top": return { x: 0, y: -2.5, position: "bottom" }
      case "bottom": return { x: 0, y: 2.5, position: "top" }
      case "left": return { x: 2.5, y: 0, position: "right" }
      case "right": return { x: -2.5, y: 0, position: "left" }
      default: return { x: 0, y: 2.5, position: "top" }
    }
  }
  const getHomeDir = (dir: string) => {
    switch (dir) {
      case "down": return "up"
      case "up": return "down"
      case "left": return "right"
      case "right": return "left"
      default: return "up"
    }
  }
  const opp = getOpposite(current.position)
  return NAV_BUTTONS.map((pos) => {
    if (pos.position === opp.position) {
      return { ...opp, page: "home", direction: getHomeDir(current.direction), label: "Accueil" }
    }
    return pos.page === currentPage ? null : pos
  }).filter(Boolean) as typeof NAV_BUTTONS
}

function getLabelPositionClass(position: string) {
  switch (position) {
    case "top": return "absolute -top-12 left-1/2 transform -translate-x-1/2"
    case "left": return "absolute top-1/2 -left-20 transform -translate-y-1/2"
    case "right": return "absolute top-1/2 -right-20 transform -translate-y-1/2"
    case "bottom": return "absolute -bottom-12 left-1/2 transform -translate-x-1/2"
    default: return "absolute -top-12 left-1/2 transform -translate-x-1/2"
  }
}

export default function Navigation3D({
  isMenuOpen,
  setIsMenuOpen,
  onNavigate,
  isTransitioning,
  currentPage,
}: Navigation3DProps) {
  const handleModelClick = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="relative pointer-events-auto w-full max-w-[500px] aspect-square mx-auto">
        <Canvas
          camera={{ position: [0, 0, 8], fov: 35 }}
          style={{ width: "100%", height: "100%", background: "transparent" }}
          shadows
        >
          <ambientLight intensity={1} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
          <RobotModel onClick={handleModelClick} />
        </Canvas>
        <AnimatePresence>
          {isMenuOpen && (
            <div className="absolute inset-0 pointer-events-none">
              {getGridPositions(currentPage).map((pos, i) => {
                let initial = { opacity: 0, x: 0, y: 0 }
                if (pos.position === "top") initial = { opacity: 0, x: 0, y: 40 }
                if (pos.position === "bottom") initial = { opacity: 0, x: 0, y: -40 }
                if (pos.position === "left") initial = { opacity: 0, x: 40, y: 0 }
                if (pos.position === "right") initial = { opacity: 0, x: -40, y: 0 }
                return (
                  <motion.div
                    key={`${pos.page}-${pos.position}`}
                    initial={initial}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={initial}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.08,
                      type: "spring",
                      stiffness: 400,
                      damping: 30,
                    }}
                    className={`${getLabelPositionClass(pos.position)} liquid-nav-label text-black font-mono text-xs px-3 py-2 pointer-events-auto cursor-pointer ${pos.page === "home" ? "text-indigo-600" : ""}`}
                    onClick={() => onNavigate(pos.page, pos.direction)}
                  >
                    {pos.label}
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Nécessaire pour le chargement GLTF avec @react-three/drei
// (à placer dans un fichier global, ex: app/layout.tsx ou _app.tsx)
// import { useGLTF } from "@react-three/drei"
// useGLTF.preload("/cyberpunk_head_robot_random_represent.glb")
