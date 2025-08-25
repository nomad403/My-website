"use client"
import { Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei"
import { useBackground } from "@/app/contexts/BackgroundContext"
import { usePage } from "@/app/contexts/PageContext"
import CyberpunkModel from "./CyberpunkModel"
import EnergySphereR3F from "./EnergySphereR3F"
import { StarsR3F } from "./StarField"

export default function GlobalCanvas() {
  const { mode, sphereScale, sphereTranslateX, sphereTranslateY, transitioning } = useBackground()
  const { currentPage } = usePage()

  // Toujours monté; on ne bloque jamais les interactions hors contact
  // Canvas global PERMANENT (ne pas démonter pour éviter context lost)
  const showSphere = !(currentPage === "contact" || mode === "night")
  const showStars = mode === "night"
  const showModel = currentPage === "contact"
  const isVisible = showSphere || showStars || showModel
  
  // Effets de transition spéciaux
  const getTransitionEffect = (): "normal" | "sunrise" | "sunset" => {
    if (currentPage === "projects" && sphereTranslateY > 1000) {
      // Lever de soleil pour PROJECTS (depuis SPECIALIST/CONTACT)
      return "sunrise"
    } else if (currentPage === "home" && sphereTranslateY === 0 && sphereScale < 1) {
      // Coucher de soleil pour HOME (depuis PROJECTS) - seulement si on vient de PROJECTS
      return "sunset"
    }
    return "normal"
  }
  
  const transitionEffect = getTransitionEffect()
  return (
    <div className="fixed inset-0">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: currentPage === "contact" ? 30 : 0, opacity: isVisible ? 1 : 0, transition: "opacity 0.3s ease-in-out" }}
      >
      <Canvas
        dpr={1}
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'transparent', pointerEvents: 'none' }}
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
        gl={{
          powerPreference: "high-performance",
          antialias: false,
          alpha: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
          // Écouteurs robustes pour diagnostiquer
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            console.warn('GlobalCanvas: WebGL context lost')
          })
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('GlobalCanvas: WebGL context restored')
          })
        }}
      >
        {/* Caméras persistantes, on bascule seulement le makeDefault */}
        <OrthographicCamera makeDefault={showSphere && !showModel} position={[0, 0, 10]} near={0.1} far={1000} />
        <PerspectiveCamera makeDefault={showModel || showStars} position={[0, 0, 5]} fov={50} />
        {/* Sphere d'énergie portée dans le Canvas global (visible hors contact et hors night) */}
        <EnergySphereR3F
          visible={showSphere}
          scale={sphereScale}
          translateX={sphereTranslateX}
          translateY={sphereTranslateY}
          isTransitioning={transitioning}
          transitionEffect={transitionEffect}
        />
        {/* Lumières uniquement pour le modèle 3D */}
        {showModel && (
          <>
            <ambientLight intensity={5} />
            <directionalLight position={[10, 10, 5]} intensity={2.5} />
            <pointLight position={[-10, -10, -5]} intensity={1.5} />
            <pointLight position={[0, 10, 0]} intensity={1.0} />
            <spotLight position={[0, 5, 5]} intensity={1.8} angle={0.5} penumbra={0.3} />
          </>
        )}
        
        {/* Stars - visible seulement en mode night */}
        <StarsR3F visible={showStars} />
        
        {/* Cyberpunk Model - visible seulement sur contact */}
        <Suspense fallback={null}>
          <CyberpunkModel isVisible={showModel} />
        </Suspense>
      </Canvas>
      </div>
    </div>
  )
} 