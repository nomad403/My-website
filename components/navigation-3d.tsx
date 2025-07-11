"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import type { Group, Object3D, Box3, Vector3 } from "three"
import { PerspectiveCamera } from "three"
import { motion, AnimatePresence } from "framer-motion"
import { X, Folder, Mail, Cog, Home } from "lucide-react"

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

// Mapping dynamique des boutons diamond selon la page courante
function getDiamondButtons(currentPage: string, onNavigate: (page: string, direction?: string) => void) {
  const DIAMOND_HALF = 750 / 2;
  const BUTTON_OFFSET = 270;
  // Par défaut : about (haut), projects (gauche), skills (bas), contact (droite)
  const base = [
    { key: 'about',    x: DIAMOND_HALF, y: DIAMOND_HALF - BUTTON_OFFSET, icon: <X size={32} />,        onClick: () => onNavigate('about', 'down'), direction: 'down' },
    { key: 'projects', x: DIAMOND_HALF - BUTTON_OFFSET, y: DIAMOND_HALF, icon: <Folder size={28} />,   onClick: () => onNavigate('projects', 'right'), direction: 'right' },
    { key: 'skills',   x: DIAMOND_HALF, y: DIAMOND_HALF + BUTTON_OFFSET, icon: <Cog size={28} />,      onClick: () => onNavigate('skills', 'up'), direction: 'up' },
    { key: 'contact',  x: DIAMOND_HALF + BUTTON_OFFSET, y: DIAMOND_HALF, icon: <Mail size={28} />,     onClick: () => onNavigate('contact', 'left'), direction: 'left' },
  ];
  if (currentPage === 'home') return base;
  // Trouver le bouton opposé à la direction du slide de la page courante
  const pageToDir = {
    about: 'down',
    projects: 'right',
    skills: 'up',
    contact: 'left',
  };
  const dirToOpposite = {
    down: 'up',
    up: 'down',
    left: 'right',
    right: 'left',
  };
  const homeButton = { icon: <Home size={28} />, onClick: () => onNavigate('home'), key: 'home' };
  const currentDir = pageToDir[currentPage as keyof typeof pageToDir];
  const oppositeDir = dirToOpposite[currentDir as keyof typeof dirToOpposite];
  // Remplacer le bouton opposé par Accueil
  return base
    .map(btn =>
      btn.direction === oppositeDir
        ? { ...btn, icon: homeButton.icon, onClick: homeButton.onClick, key: 'home', page: 'home' }
        : btn
    )
    .filter(btn => btn.key !== currentPage);
}

export default function Navigation3D({
  isMenuOpen,
  setIsMenuOpen,
  onNavigate,
  isTransitioning,
  currentPage,
}: Navigation3DProps) {
  const handleModelClick = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    } else {
      setIsMenuOpen(true);
    }
  }
  // Taille du conteneur principal (doit matcher le Canvas 3D)
  const DIAMOND_SIZE = 750;
  const DIAMOND_HALF = DIAMOND_SIZE / 2;
  const BUTTON_OFFSET = 270; // distance du centre pour chaque bouton
  const DIAMOND_BUTTONS = [
    { key: 'about',    x: DIAMOND_HALF, y: DIAMOND_HALF - BUTTON_OFFSET, icon: <X size={32} />,        onClick: () => onNavigate('about', 'down') },
    { key: 'projects', x: DIAMOND_HALF - BUTTON_OFFSET, y: DIAMOND_HALF, icon: <Folder size={28} />,   onClick: () => onNavigate('projects', 'right') },
    { key: 'skills',   x: DIAMOND_HALF, y: DIAMOND_HALF + BUTTON_OFFSET, icon: <Cog size={28} />,      onClick: () => onNavigate('skills', 'up') },
    { key: 'contact',  x: DIAMOND_HALF + BUTTON_OFFSET, y: DIAMOND_HALF, icon: <Mail size={28} />,     onClick: () => onNavigate('contact', 'left') },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="relative pointer-events-auto w-full max-w-[500px] aspect-square mx-auto">
        {/* Canvas 3D devant (z-40) */}
        <Canvas
          camera={{ position: [0, 0, 8], fov: 35 }}
          style={{ width: "100%", height: "100%", background: "transparent", position: "relative", zIndex: 40 }}
          shadows
        >
          <ambientLight intensity={3} />
          <directionalLight position={[5, 5, 5]} intensity={3.5} castShadow />
          <directionalLight position={[-5, 5, 5]} intensity={2} />
          <directionalLight position={[0, -5, 5]} intensity={1.2} />
          <RobotModel onClick={handleModelClick} />
        </Canvas>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 180, damping: 22 }}
              className="absolute inset-0 pointer-events-auto z-30"
            >
              {/* Boutons en formation diamond autour de l'objet 3D, dynamiques selon la page */}
              <div className={`absolute top-0 left-0 w-[750px] h-[750px] mx-auto pointer-events-none`} style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }}>
                {getDiamondButtons(currentPage, onNavigate).map(({ key, x, y, icon, onClick }) => (
                  <button
                    key={key}
                    className="absolute text-white drop-shadow-lg pointer-events-auto hover:scale-110 transition-transform"
                    style={{ left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
                    onClick={onClick}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </motion.div>
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
