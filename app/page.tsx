"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useBackground } from "./contexts/BackgroundContext"
import { usePage } from "./contexts/PageContext"
import GlobalCanvas from "@/components/GlobalCanvas"
import BackgroundLayers from "@/components/BackgroundLayers"
import ParticleText from "@/components/particle-text"
import SpheresPacking from "@/components/SpheresPacking"
import AsciiOverlay from "@/components/AsciiOverlay"
import ShuffleText from "@/components/ShuffleText"
import ContentPages from "@/components/content-pages"

// Configuration déclarative des états par page
const pageConfig = {
  home: {
    sphere: { scale: 1, translateX: 0, translateY: 0 }, // Sphère plus petite et centrée
    background: 'day' as const,
    elements: ['particleText', 'homeContent']
  },
  projects: {
    sphere: { scale: 3.5, translateX: 0, translateY: 800 }, // Sphère plus grande pour un vrai effet halo
    background: 'day' as const,
    elements: ['contentPages']
  },
  skills: {
    sphere: { scale: 1, translateX: 0, translateY: 2500 },
    background: 'day' as const,
    elements: ['contentPages']
  },
  contact: {
    sphere: { scale: 0, translateX: -2000, translateY: 0 },
    background: 'day' as const,
    elements: []
  }
}

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isPreloaded, setIsPreloaded] = useState(false)
  // pilotage via contexte
  
  // États de visibilité pour une vraie SPA
  const [homeVisible, setHomeVisible] = useState(true)
  const [contentVisible, setContentVisible] = useState(false)
  
  // Contexte global pour les backgrounds
  const { mode, transitioning, isSphereDescending, setMode, setTransitioning, setIsSphereDescending,
    setSphereScale, setSphereTranslateX, setSphereTranslateY } = useBackground()
  // Router interne global (Canvas lit cette source de vérité)
  const { setCurrentPage: setRoutedPage } = usePage()

  // Référence au canvas de fond (spheres packing)
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null)

  // Préchargement simple
  useEffect(() => {
    const timer = setTimeout(() => setIsPreloaded(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Synchroniser la page locale avec le routeur global
  useEffect(() => {
    setRoutedPage(currentPage)
  }, [currentPage, setRoutedPage])

  // Initialiser les valeurs de la sphère HOME au démarrage
  useEffect(() => {
    const homeConfig = pageConfig.home
    console.log('🏠 Initialisation HOME:', homeConfig.sphere)
    setSphereScale(homeConfig.sphere.scale)
    setSphereTranslateX(homeConfig.sphere.translateX)
    setSphereTranslateY(homeConfig.sphere.translateY)
    setMode(homeConfig.background)
  }, [setSphereScale, setSphereTranslateX, setSphereTranslateY, setMode])

  const handlePageChange = (newPage: string) => {
    if (newPage === currentPage || transitioning) return
    
    setTransitioning(true)
    
    // Récupérer la configuration de la nouvelle page
    const newConfig = pageConfig[newPage as keyof typeof pageConfig]
    
    // Logique spéciale pour les transitions vers le bas (skills)
    if (newPage === "skills" && currentPage !== "skills") {
      // Masquer le fond blanc pendant la descente
      setIsSphereDescending(true)
      
      // Animation fluide : taille et position simultanément
      setSphereScale(newConfig.sphere.scale)
      setSphereTranslateY(newConfig.sphere.translateY)
      setSphereTranslateX(newConfig.sphere.translateX || 0)
      
      // Une fois la sphère descendue, révéler le fond de specialist
      setTimeout(() => {
        setIsSphereDescending(false)
        // Changer de page APRÈS le fade
        setCurrentPage(newPage)
        setHomeVisible(false)
        setContentVisible(true)
      }, 1800) // Délai pour laisser la sphère descendre complètement
    } else if (currentPage === "skills" && newPage !== "skills") {
      // Logique spéciale pour les transitions depuis specialist
      setIsSphereDescending(true)
      
      // Animation fluide : taille et position simultanément
      setSphereTranslateY(newConfig.sphere.translateY)
      setSphereScale(newConfig.sphere.scale)
      setSphereTranslateX(newConfig.sphere.translateX)
      
      // Changer de page IMMÉDIATEMENT pour permettre le fade AnimatePresence
      setCurrentPage(newPage)
      
      // Gérer la visibilité selon la page
      if (newPage === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
      
      // Une fois la sphère montée, finir la transition
      setTimeout(() => {
        setIsSphereDescending(false)
      }, 1800) // Délai pour laisser la sphère monter complètement
    } else {
      // Transitions normales pour les autres pages
      setIsSphereDescending(false)
      setSphereScale(newConfig.sphere.scale)
      setSphereTranslateY(newConfig.sphere.translateY)
      setSphereTranslateX(newConfig.sphere.translateX)
      
      // Changer de page immédiatement pour les autres pages
      setCurrentPage(newPage)
      
      // Gérer la visibilité selon la page
      if (newPage === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
    }
    
    // Transition de fond si nécessaire
    if (newConfig.background !== mode) {
      setMode(newConfig.background)
    }
    
    // Finir la transition après les animations de sphère
    setTimeout(() => {
      setTransitioning(false)
    }, 2500)
  }

  const currentConfig = pageConfig[currentPage as keyof typeof pageConfig]

  // Configuration ASCII gérée directement dans le composant AsciiOverlay

  return (
    <>
      {/* FOND : Packing de sphères en dehors de R3F */}
      <SpheresPacking
        count={200}
        minSize={0.5}
        maxSize={1.0}
        currentPage={currentPage}
        onCanvasReady={setBgCanvas}
        visible={currentPage !== "skills" && currentPage !== "contact"}   // <<< cache l'original sur SPECIALIST et CONTACT
      />

      {/* OVERLAY ASCII en temps réel */}
      <AsciiOverlay
        source={bgCanvas}
        visible={currentPage === "skills" || currentPage === "contact"}
        mode={currentPage === "skills" ? "sobel" : "sobel"}
        invert={false}
        opacity={currentPage === "skills" ? 0.35 : 0.4}
        color={currentPage === "skills" ? "#00ffc8" : "#ffcc00"}
        fontPx={7}    // taille du "pixel"
        cover={true}  // <<< auto-fit plein écran
      />
      
      <div className="relative w-full h-screen overflow-hidden">
        {/* Écran de chargement */}
      {!isPreloaded && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="font-kode text-black text-2xl mb-4 font-semibold">NOMAD403</div>
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* La sphère est rendue par GlobalCanvas */}

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className={`font-kode text-base font-bold tracking-[0.15em] uppercase transition-colors duration-300 ${
            mode === 'night' ? 'text-white' : 'text-black'
          }`}>
            NOMAD403
          </div>
          <div className="hidden md:flex space-x-8 font-jetbrains text-sm font-light">
            <button
              onClick={() => handlePageChange("home")}
              className={`nav-link transition-all duration-300 ${currentPage === "home" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-orange-400 night-mode' : 'text-black hover:text-orange-600 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>HOME</ShuffleText>
            </button>
            <button
              onClick={() => handlePageChange("projects")}
              className={`nav-link transition-all duration-300 ${currentPage === "projects" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-orange-400 night-mode' : 'text-black hover:text-orange-600 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>PROJECTS</ShuffleText>
            </button>
            <button
              onClick={() => handlePageChange("skills")}
              className={`nav-link transition-all duration-300 ${currentPage === "skills" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-orange-400 night-mode' : 'text-black hover:text-orange-600 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>SPECIALIST</ShuffleText>
            </button>
            <button
              onClick={() => handlePageChange("contact")}
              className={`nav-link transition-all duration-300 ${currentPage === "contact" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-orange-400 night-mode' : 'text-black hover:text-orange-600 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>CONTACT</ShuffleText>
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu principal - Éléments avec transitions déclaratives */}
      <div className="relative w-full min-h-screen z-20">
        
        {/* Particle Text - visible seulement sur home */}
        <motion.div 
          className="absolute inset-0 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isPreloaded && homeVisible ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ pointerEvents: homeVisible ? "auto" : "none" }}
        >
          <ParticleText />
        </motion.div>

       
        {/* Content Pages - visible sur projects, skills, contact */}
        <AnimatePresence mode="wait">
          {contentVisible && (
            <motion.div 
              key={currentPage}
              className="absolute inset-0 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ 
                pointerEvents: contentVisible ? "auto" : "none"
              }}
            >
              <div className="relative w-full h-full">
                <ContentPages 
                  currentPage={currentPage} 
                  onBack={() => handlePageChange("home")} 
                  isVisible={contentVisible}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Le modèle 3D est rendu par GlobalCanvas */}
      
      {/* Réseaux sociaux intégrés */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          {/* Réseaux sociaux à gauche */}
          <div className="flex space-x-6 font-jetbrains text-sm font-light uppercase tracking-wider">
            <a 
              href="https://x.com/_nomad_403" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-orange-400' : 'text-black hover:text-orange-600'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>X</ShuffleText>
            </a>
            <a 
              href="https://www.linkedin.com/in/glenn-richard/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-orange-400' : 'text-black hover:text-orange-600'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>LINKEDIN</ShuffleText>
            </a>
            <a 
              href="https://github.com/nomad403" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-orange-400' : 'text-black hover:text-orange-600'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>GITHUB</ShuffleText>
            </a>
          </div>
          
          {/* Email à droite */}
          <div className={`font-jetbrains text-sm ${
            mode === 'night' ? 'text-white' : 'text-black'
          }`}>
            nomad403@protonmail.com
          </div>
        </div>
      </div>
    </div>
    </>
  )
}