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
  
  if (!starPositions.current) {
    const starCount = 1000
    starPositions.current = new Float32Array(starCount * 3)
    
    for (let i = 0; i < starCount * 3; i++) {
      starPositions.current[i] = (Math.random() - 0.5) * 200
    }
  }

  // Créer une texture circulaire pour les étoiles
  const starTexture = useRef<THREE.Texture>(null)
  
  if (!starTexture.current) {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    
    // Dessiner un cercle blanc
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(16, 16, 12, 0, Math.PI * 2)
    ctx.fill()
    
    // Ajouter un effet de glow
    ctx.shadowColor = 'white'
    ctx.shadowBlur = 8
    ctx.fill()
    
    starTexture.current = new THREE.CanvasTexture(canvas)
  }

  // Animation des étoiles basée sur la position de la souris
  useFrame(() => {
    if (starsRef.current) {
      // Rotation lente continue (réduite)
      starsRef.current.rotation.x += 0.0002
      starsRef.current.rotation.y += 0.0003
      
      // Mouvement basé sur la souris (augmenté pour être plus visible)
      const mouseInfluence = 0.008 // Augmenté de 0.002 à 0.008
      starsRef.current.rotation.x = mousePosition.y * mouseInfluence
      starsRef.current.rotation.y = mousePosition.x * mouseInfluence
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
      </bufferGeometry>
      <pointsMaterial
        color={0xffffff}
        size={0.2}
        sizeAttenuation={true}
        transparent={true}
        opacity={1.0}
        map={starTexture.current}
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