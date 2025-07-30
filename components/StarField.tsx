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

  // Animation des étoiles basée sur la position de la souris
  useFrame(() => {
    if (starsRef.current) {
      // Rotation lente continue (réduite)
      starsRef.current.rotation.x += 0.0002
      starsRef.current.rotation.y += 0.0003
      
      // Mouvement basé sur la souris (augmenté pour être plus visible)
      const mouseInfluence = 0.002
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
      />
    </points>
  )
}

// Composant principal StarField avec chargement progressif
export default function StarField() {
  const [isLoaded, setIsLoaded] = useState(true) // Chargé immédiatement

  return (
    <div className="absolute inset-0 w-full h-full z-[-3]">
      {isLoaded && (
        <Canvas
          camera={{ 
            position: [0, 0, 5], 
            fov: 45,
            near: 0.1,
            far: 1000
          }}
          style={{ 
            background: 'transparent',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 1s ease-in'
          }}
        >
          {/* Lumière ambiante */}
          <ambientLight intensity={0.1} />
          
          {/* Lumière ponctuelle */}
          <pointLight position={[5, 5, 5]} intensity={0.5} />
          
          {/* Ciel étoilé */}
          <Stars />
        </Canvas>
      )}
    </div>
  )
}