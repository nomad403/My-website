"use client"

import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Composant pour les étoiles
function Stars() {
  const starsRef = useRef<THREE.Points>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { size } = useThree()

  // Créer la géométrie des étoiles une seule fois
  const starPositions = useRef<Float32Array>(null)
  const starColors = useRef<Float32Array>(null)
  
  if (!starPositions.current) {
    const starCount = 1000
    starPositions.current = new Float32Array(starCount * 3)
    starColors.current = new Float32Array(starCount * 3)
    
    for (let i = 0; i < starCount * 3; i++) {
      starPositions.current[i] = (Math.random() - 0.5) * 200
    }
    
    // Initialiser les couleurs avec la couleur par défaut (lavande néon)
    for (let i = 0; i < starCount * 3; i += 3) {
      starColors.current[i] = 0.93     // R (lavande néon)
      starColors.current[i + 1] = 0.51 // G
      starColors.current[i + 2] = 1.0  // B
    }
  }

  // Créer une texture circulaire pour les étoiles
  const starTexture = useRef<THREE.Texture>(null)
  
  if (!starTexture.current) {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    
    // Dessiner un cercle lavande néon
    ctx.fillStyle = '#ee82ff'
    ctx.beginPath()
    ctx.arc(16, 16, 12, 0, Math.PI * 2)
    ctx.fill()
    
    // Ajouter un effet de glow lavande néon
    ctx.shadowColor = '#ee82ff'
    ctx.shadowBlur = 12
    ctx.fill()
    
    starTexture.current = new THREE.CanvasTexture(canvas)
  }

  // Animation des étoiles basée sur la position de la souris
  useFrame(() => {
    if (starsRef.current && starColors.current) {
      // Rotation lente continue (réduite)
      starsRef.current.rotation.x += 0.0002
      starsRef.current.rotation.y += 0.0003
      
      // Mouvement basé sur la souris (augmenté pour être plus visible)
      const mouseInfluence = 0.008 // Augmenté de 0.002 à 0.008
      starsRef.current.rotation.x = mousePosition.y * mouseInfluence
      starsRef.current.rotation.y = mousePosition.x * mouseInfluence
      
      // Mise à jour dynamique des couleurs basée sur la position de la souris
      const mouseX = (mousePosition.x + 1) / 2 // Normaliser entre 0 et 1
      
      // Réduire la sensibilité pour des transitions plus douces
      const smoothMouseX = mouseX * 0.7 + 0.3 // Réduire encore plus la plage et centrer
      
      // Gradient de couleurs harmonisé avec la sphère et le fond violet
      const colors = [
        [0.93, 0.51, 1.0],   // #ee82ff - Lavande néon (gauche)
        [0.0, 1.0, 1.0],     // #00ffff - Cyan électrique
        [1.0, 0.2, 0.8],     // #ff33cc - Magenta fluo
        [0.44, 0.22, 0.42],  // #712b6a - Violet foncé
        [0.27, 0.11, 0.42],  // #451b6a - Violet très foncé
        [0.93, 0.51, 1.0]    // #ee82ff - Lavande néon (droite, boucle)
      ]
      
      // Interpolation des couleurs basée sur la position X de la souris
      const totalColors = colors.length - 1 // -1 car on boucle
      const colorIndex = Math.floor(smoothMouseX * totalColors)
      const colorProgress = (smoothMouseX * totalColors) % 1
      
      const currentColor = colors[colorIndex]
      const nextColor = colors[colorIndex + 1]
      
      // Interpolation avec easing pour des transitions plus douces
      const easedProgress = colorProgress * colorProgress * (3 - 2 * colorProgress) // Smoothstep
      
      // Interpolation linéaire entre les couleurs
      const interpolatedColor = [
        currentColor[0] + (nextColor[0] - currentColor[0]) * easedProgress,
        currentColor[1] + (nextColor[1] - currentColor[1]) * easedProgress,
        currentColor[2] + (nextColor[2] - currentColor[2]) * easedProgress
      ]
      
      // Appliquer la couleur à toutes les étoiles
      for (let i = 0; i < starColors.current.length; i += 3) {
        starColors.current[i] = interpolatedColor[0]     // R
        starColors.current[i + 1] = interpolatedColor[1] // G
        starColors.current[i + 2] = interpolatedColor[2] // B
      }
      
      // Mettre à jour les couleurs dans la géométrie
      const geometry = starsRef.current.geometry
      if (geometry.attributes.color) {
        geometry.attributes.color.needsUpdate = true
      }
    }
  })

  // Gérer le mouvement de la souris
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1
      const y = -(event.clientY / window.innerHeight) * 2 + 1
      setMousePosition({ x, y })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={1000}
          array={starPositions.current}
          itemSize={3}
          args={[starPositions.current, 3]}
        />
        {starColors.current && (
          <bufferAttribute
            attach="attributes-color"
            count={1000}
            array={starColors.current}
            itemSize={3}
            args={[starColors.current, 3]}
          />
        )}
      </bufferGeometry>
      <pointsMaterial
        size={0.25}
        sizeAttenuation={true}
        transparent={true}
        opacity={0.9}
        map={starTexture.current}
        vertexColors={true}
      />
    </points>
  )
}

// Composant principal StarField avec chargement progressif
export default function StarField() {
  const [isLoaded, setIsLoaded] = useState(true) // Chargé immédiatement

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        gl={{ 
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
          antialias: true,
          alpha: true
        }}
        onCreated={({ gl }) => {
          // Configuration pour éviter la perte de contexte
          gl.setClearColor(0x000000, 0)
          gl.outputColorSpace = THREE.SRGBColorSpace
        }}
      >
        <Stars />
      </Canvas>
    </div>
  )
}