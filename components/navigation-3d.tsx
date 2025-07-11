"use client"

import { useRef, useEffect, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Html, useGLTF } from "@react-three/drei"
import type { Group, Object3D, Box3, Vector3 } from "three"
import { PerspectiveCamera, Vector3 as ThreeVector3 } from "three"
import { motion, AnimatePresence } from "framer-motion"
import { X, Folder, Mail, Cog, Home } from "lucide-react"

interface Navigation3DProps {
  isMenuOpen: boolean
  setIsMenuOpen: (open: boolean) => void
  onNavigate: (page: string, direction?: string) => void
  isTransitioning?: boolean
  currentPage: string
  is3DCentered: boolean
  on3DObjectClick: () => void
}

function RobotModel({ onClick, targetPosition, targetScale }: { onClick: () => void, targetPosition: [number, number, number], targetScale: number }) {
  const group = useRef<Group>(null)
  const { scene } = useGLTF("/cyberpunk_head_robot_random_represent.glb")
  const { camera } = useThree()
  const [fitted, setFitted] = useState(false)

  // Centrage et zoom automatique (une seule fois)
  useEffect(() => {
    if (!group.current || fitted) return
    const temp = scene.clone() as Object3D
    const box = new (require('three').Box3)().setFromObject(temp)
    const size = new (require('three').Vector3)()
    box.getSize(size)
    const center = new (require('three').Vector3)()
    box.getCenter(center)
    group.current.position.x = -center.x
    group.current.position.y = -center.y
    group.current.position.z = -center.z
    // Ajuste la caméra pour voir tout le modèle
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

  // Animation de la position/scale du groupe 3D
  useFrame(() => {
    if (group.current) {
      // Animation fluide vers la cible
      group.current.position.lerp(new ThreeVector3(...targetPosition), 0.1)
      group.current.scale.lerp(new ThreeVector3(targetScale, targetScale, targetScale), 0.1)
      // Animation de rotation/flottement
      group.current.rotation.x = Math.sin(Date.now() * 0.0005) * 0.2
      group.current.rotation.y += 0.01
      group.current.position.y += Math.sin(Date.now() * 0.0015) * 0.01
    }
  })

  // Correction : pointerEvents/cursor sur <primitive> (pas sur <group>)
  return (
    <group ref={group} onPointerDown={onClick}>
      <primitive object={scene} pointerOver={true} />
    </group>
  )
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
  // Taille du diamond = taille du conteneur centré de l'objet 3D (500px)
  const DIAMOND_SIZE = 500
  const DIAMOND_HALF = DIAMOND_SIZE / 2
  const BUTTON_OFFSET = 200 // Plus grand pour espacer le diamond
  const ICONS_OFFSET_Y = 40 // Décalage vertical pour compenser le centre visuel de l'objet 3D
  // Par défaut : about (haut), projects (gauche), skills (bas), contact (droite)
  const base = [
    { key: 'about',    x: DIAMOND_HALF, y: DIAMOND_HALF - BUTTON_OFFSET + ICONS_OFFSET_Y, icon: <X size={32} />,        onClick: () => onNavigate('about', 'down'), direction: 'down', position: 'top' },
    { key: 'projects', x: DIAMOND_HALF - BUTTON_OFFSET, y: DIAMOND_HALF + ICONS_OFFSET_Y, icon: <Folder size={28} />,   onClick: () => onNavigate('projects', 'right'), direction: 'right', position: 'left' },
    { key: 'skills',   x: DIAMOND_HALF, y: DIAMOND_HALF + BUTTON_OFFSET + ICONS_OFFSET_Y, icon: <Cog size={28} />,      onClick: () => onNavigate('skills', 'up'), direction: 'up', position: 'bottom' },
    { key: 'contact',  x: DIAMOND_HALF + BUTTON_OFFSET, y: DIAMOND_HALF + ICONS_OFFSET_Y, icon: <Mail size={28} />,     onClick: () => onNavigate('contact', 'left'), direction: 'left', position: 'right' },
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
  const positionToDir: { [key: string]: string } = {
    top: 'down',
    bottom: 'up',
    left: 'right',
    right: 'left',
  };
  const current = base.find((pos: any) => pos.key === currentPage);
  const opp = current ? base.find((pos) => pos.position === getOppositePosition(current.position)) : undefined;
  function getOppositePosition(pos: string) {
    switch (pos) {
      case 'top': return 'bottom';
      case 'bottom': return 'top';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return 'top';
    }
  }
  return base.map((pos: any) => {
    if (current && pos.position === getOppositePosition(current.position)) {
      // Ajoute la bonne direction au bouton home
      return {
        ...pos,
        key: 'home',
        page: 'home',
        icon: <Home size={28} />, 
        onClick: () => onNavigate('home', positionToDir[pos.position]),
        direction: positionToDir[pos.position],
      };
    }
    return pos.key === currentPage ? null : pos;
  }).filter(Boolean) as Array<{ key: string; x: number; y: number; icon: React.ReactNode; onClick: () => void; direction: string; position: string; }>;
}

export default function Navigation3D({
  isMenuOpen,
  setIsMenuOpen,
  onNavigate,
  isTransitioning,
  currentPage,
  is3DCentered,
  on3DObjectClick,
}: Navigation3DProps) {
  // Cibles de position/scale pour l'objet 3D
  // Centré : (0,0,0), scale 0.45 ; Rangé : ex (-10, 5, 0), scale 0.13 (à ajuster selon la scène)
  const targetPosition: [number, number, number] = is3DCentered ? [0, 0, 0] : [-9, 4.7, 0]
  const targetScale = is3DCentered ? 0.45 : 0.13

  // Taille du diamond = taille du conteneur centré de l'objet 3D (500px)
  const DIAMOND_SIZE = 500
  const DIAMOND_HALF = DIAMOND_SIZE / 2
  const BUTTON_OFFSET = 270 // Plus grand pour éloigner les boutons
  const ICONS_OFFSET_Y = 40 // Décalage vertical pour compenser le centre visuel de l'objet 3D

  // getDiamondButtons doit utiliser ces valeurs pour placer les boutons
  function getDiamondButtons(currentPage: string, onNavigate: (page: string, direction?: string) => void) {
    // Par défaut : about (haut), projects (gauche), skills (bas), contact (droite)
    const base = [
      { key: 'about',    x: DIAMOND_HALF, y: DIAMOND_HALF - BUTTON_OFFSET + ICONS_OFFSET_Y, icon: <X size={32} />,        onClick: () => onNavigate('about', 'down'), direction: 'down', position: 'top' },
      { key: 'projects', x: DIAMOND_HALF - BUTTON_OFFSET, y: DIAMOND_HALF + ICONS_OFFSET_Y, icon: <Folder size={28} />,   onClick: () => onNavigate('projects', 'right'), direction: 'right', position: 'left' },
      { key: 'skills',   x: DIAMOND_HALF, y: DIAMOND_HALF + BUTTON_OFFSET + ICONS_OFFSET_Y, icon: <Cog size={28} />,      onClick: () => onNavigate('skills', 'up'), direction: 'up', position: 'bottom' },
      { key: 'contact',  x: DIAMOND_HALF + BUTTON_OFFSET, y: DIAMOND_HALF + ICONS_OFFSET_Y, icon: <Mail size={28} />,     onClick: () => onNavigate('contact', 'left'), direction: 'left', position: 'right' },
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
    const positionToDir: { [key: string]: string } = {
      top: 'down',
      bottom: 'up',
      left: 'right',
      right: 'left',
    };
    const current = base.find((pos: any) => pos.key === currentPage);
    const opp = current ? base.find((pos) => pos.position === getOppositePosition(current.position)) : undefined;
    function getOppositePosition(pos: string) {
      switch (pos) {
        case 'top': return 'bottom';
        case 'bottom': return 'top';
        case 'left': return 'right';
        case 'right': return 'left';
        default: return 'top';
      }
    }
    return base.map((pos: any) => {
      if (current && pos.position === getOppositePosition(current.position)) {
        // Ajoute la bonne direction au bouton home
        return {
          ...pos,
          key: 'home',
          page: 'home',
          icon: <Home size={28} />, 
          onClick: () => onNavigate('home', positionToDir[pos.position]),
          direction: positionToDir[pos.position],
        };
      }
      return pos.key === currentPage ? null : pos;
    }).filter(Boolean) as Array<{ key: string; x: number; y: number; icon: React.ReactNode; onClick: () => void; direction: string; position: string; }>;
  }

  // Correction du comportement de clic sur l'objet 3D
  const handle3DObjectClick = () => {
    if (currentPage === 'home') {
      // Sur la home, on ouvre/ferme juste le menu
      setIsMenuOpen(!isMenuOpen)
    } else {
      // Sinon, comportement normal (centré/rangé)
      on3DObjectClick()
    }
  }

  return (
    <>
      {/* Canvas 3D plein écran, fixed, pointer-events-none sauf sur l'objet 3D */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 40, pointerEvents: 'none' }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 35 }}
          style={{ width: '100vw', height: '100vh', background: 'transparent' }}
          shadows
        >
          <ambientLight intensity={3} />
          <directionalLight position={[5, 5, 5]} intensity={3.5} castShadow />
          <directionalLight position={[-5, 5, 5]} intensity={2} />
          <directionalLight position={[0, -5, 5]} intensity={1.2} />
          <RobotModel onClick={handle3DObjectClick} targetPosition={targetPosition} targetScale={targetScale} />
        </Canvas>
      </div>
      {/* Menu diamond seulement si centré */}
      {is3DCentered && (
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 180, damping: 22 }}
              className="absolute inset-0 pointer-events-none z-50" // z-50 pour être au-dessus du canvas
            >
              {/* Boutons en formation diamond autour de l'objet 3D, dynamiques selon la page */}
              <div className={`absolute top-0 left-0 w-[500px] h-[500px] mx-auto pointer-events-none`} style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', position: 'absolute' }}>
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
      )}
    </>
  )
}

// Nécessaire pour le chargement GLTF avec @react-three/drei
// (à placer dans un fichier global, ex: app/layout.tsx ou _app.tsx)
// import { useGLTF } from "@react-three/drei"
// useGLTF.preload("/cyberpunk_head_robot_random_represent.glb")
