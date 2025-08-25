"use client"
import { useEffect, useRef } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import * as THREE from "three"

interface CyberpunkModelProps {
  isVisible: boolean
}

function Model({ isVisible }: CyberpunkModelProps) {
  const gltf = useLoader(GLTFLoader, "/cyberpunk_head_robot_random_represent.glb")
  const meshRef = useRef<THREE.Group>(null)
  const animationRef = useRef({ 
    isAnimating: false, 
    hasPlayed: false, 
    startTime: 0, 
    targetRotation: 0,
    isExiting: false,
    isInitialized: false
  })
  
  // Reset animation quand isVisible devient false
  useEffect(() => {
    if (!isVisible && animationRef.current.hasPlayed) {
      // Démarrer l'animation de sortie
      animationRef.current.isExiting = true
      animationRef.current.isAnimating = true
      animationRef.current.startTime = 0 // Sera mis à jour dans useFrame
    } else if (!isVisible) {
      // Reset complet quand on quitte la page
      animationRef.current.hasPlayed = false
      animationRef.current.isAnimating = false
      animationRef.current.isExiting = false
      animationRef.current.isInitialized = false
      if (meshRef.current) {
        // Remettre l'objet à sa position initiale
        meshRef.current.position.x = 10
        meshRef.current.position.y = 0
        meshRef.current.rotation.y = 0
        meshRef.current.rotation.z = 0
      }
    }
  }, [isVisible])

  // Animation d'entrée - setup initial
  useEffect(() => {
    if (meshRef.current && !animationRef.current.isInitialized) {
      // Position initiale (hors écran à droite)
      meshRef.current.position.x = 10
      meshRef.current.rotation.y = 0
      meshRef.current.rotation.z = 0
      meshRef.current.position.y = 0
      animationRef.current.isInitialized = true
    }
  }, [])

  useFrame((state) => {
    // Initialisation de la position si nécessaire
    if (meshRef.current && isVisible && !animationRef.current.isInitialized) {
      meshRef.current.position.x = 10
      meshRef.current.position.y = 0
      meshRef.current.rotation.y = 0
      meshRef.current.rotation.z = 0
      animationRef.current.isInitialized = true
    }

    // Animation d'entrée
    if (meshRef.current && isVisible && !animationRef.current.isAnimating && !animationRef.current.hasPlayed) {
      // Démarrer l'animation d'entrée seulement si elle n'a pas encore été jouée
      animationRef.current.isAnimating = true
      animationRef.current.hasPlayed = true
      animationRef.current.isExiting = false
      animationRef.current.startTime = state.clock.elapsedTime
    }

    // Animation de sortie
    if (meshRef.current && !isVisible && animationRef.current.isAnimating && animationRef.current.isExiting && animationRef.current.startTime === 0) {
      // Démarrer l'animation de sortie
      animationRef.current.startTime = state.clock.elapsedTime
    }

    // Animation d'entrée en cours
    if (meshRef.current && isVisible && animationRef.current.isAnimating && !animationRef.current.isExiting) {
      const elapsed = state.clock.elapsedTime - animationRef.current.startTime
      const duration = 3.5 // Durée de l'animation en secondes
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing smooth pour une animation plus douce
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      // Animation de translation de droite à gauche avec easing
      const startX = 10
      const targetX = 0
      meshRef.current.position.x = startX + (targetX - startX) * easeOutCubic

      // Animation de rotation continue pendant la translation
      const targetRotation = 4 * Math.PI // 2 tours complets
      meshRef.current.rotation.y = targetRotation * easeOutCubic

      // Arrêter l'animation une fois terminée
      if (progress >= 1) {
        animationRef.current.isAnimating = false
        meshRef.current.rotation.y = 0
      }
    }

    // Animation de sortie en cours
    if (meshRef.current && !isVisible && animationRef.current.isAnimating && animationRef.current.isExiting) {
      const elapsed = state.clock.elapsedTime - animationRef.current.startTime
      const duration = 3.5 // Durée de l'animation en secondes
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing smooth pour une animation plus douce
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      // Animation de translation de gauche à droite avec easing (inverse)
      const startX = 0
      const targetX = 10
      meshRef.current.position.x = startX + (targetX - startX) * easeOutCubic

      // Animation de rotation continue pendant la translation (inverse)
      const targetRotation = -4 * Math.PI // 2 tours complets dans l'autre sens
      meshRef.current.rotation.y = targetRotation * easeOutCubic

      // Arrêter l'animation une fois terminée
      if (progress >= 1) {
        animationRef.current.isAnimating = false
        animationRef.current.isExiting = false
        animationRef.current.hasPlayed = false
        animationRef.current.isInitialized = false
        // Reset final de la position
        if (meshRef.current) {
          meshRef.current.position.x = 10
          meshRef.current.position.y = 0
          meshRef.current.rotation.y = 0
          meshRef.current.rotation.z = 0
        }
      }
    }
  })

  return (
    <primitive 
      ref={meshRef}
      object={gltf.scene} 
      scale={isVisible ? [0.15, 0.15, 0.15] : [0, 0, 0]}
      position={[0, 0, 0]}
    />
  )
}

export default function CyberpunkModel({ isVisible }: CyberpunkModelProps) {
  // Scene-only: à utiliser à l'intérieur du Canvas global
  return <Model isVisible={isVisible} />
} 