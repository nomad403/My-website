"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function SmokeBackground() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    smokeParticles: THREE.Mesh[]
    clock: THREE.Clock
  } | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Initialize Three.js scene
    const clock = new THREE.Clock()
    const renderer = new THREE.WebGLRenderer({ alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000)
    camera.position.z = 1000
    scene.add(camera)

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 2.2)
    light.position.set(-1, 0, 1)
    scene.add(light)

    // Create smoke texture and material
    const smokeTexture = new THREE.TextureLoader().load(
      "https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png",
    )
    const smokeMaterial = new THREE.MeshLambertMaterial({
      color: 0x666666, // Couleur plus sombre
      map: smokeTexture,
      transparent: true,
      opacity: 0.05, // Opacité augmentée pour assombrir
    })
    const smokeGeo = new THREE.PlaneGeometry(300, 300)
    const smokeParticles: THREE.Mesh[] = []

    // Create smoke particles
    for (let p = 0; p < 250; p++) {
      // Augmenté de 150 à 200
      const particle = new THREE.Mesh(smokeGeo, smokeMaterial)
      particle.position.set(Math.random() * 500 - 250, Math.random() * 500 - 250, Math.random() * 1000 - 100)
      particle.rotation.z = Math.random() * 360
      scene.add(particle)
      smokeParticles.push(particle)
    }

    sceneRef.current = { scene, camera, renderer, smokeParticles, clock }
    mountRef.current.appendChild(renderer.domElement)

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return

      const delta = sceneRef.current.clock.getDelta()
      requestAnimationFrame(animate)

      // Evolve smoke
      sceneRef.current.smokeParticles.forEach((particle) => {
        particle.rotation.z += delta * 0.2
      })

      sceneRef.current.renderer.render(sceneRef.current.scene, sceneRef.current.camera)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      if (!sceneRef.current) return

      sceneRef.current.camera.aspect = window.innerWidth / window.innerHeight
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (mountRef.current && sceneRef.current) {
        mountRef.current.removeChild(sceneRef.current.renderer.domElement)
        sceneRef.current.renderer.dispose()
      }
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />
}
