"use client"

import { useState, useEffect } from "react"
import ParticleText from "@/components/particle-text"
import ContentPages from "@/components/content-pages"
import EnergySphereBackground from "@/components/EnergySphereBackground"
import { useBackground } from "./contexts/BackgroundContext"

// Configuration déclarative des états par page
const pageConfig = {
  home: {
    sphere: { scale: 1, translateY: 0 },
    background: 'day' as const,
    elements: ['particleText', 'homeContent']
  },
  projects: {
    sphere: { scale: 6, translateY: 1500 },
    background: 'day' as const,
    elements: ['contentPages']
  },
  skills: {
    sphere: { scale: 1, translateY: 2500 },
    background: 'night' as const,
    elements: ['contentPages']
  },
  contact: {
    sphere: { scale: 1, translateY: 0 },
    background: 'day' as const,
    elements: ['contentPages']
  }
}

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [sphereScale, setSphereScale] = useState(1)
  const [sphereTranslateY, setSphereTranslateY] = useState(0)
  
  // États de visibilité pour une vraie SPA
  const [homeVisible, setHomeVisible] = useState(true)
  const [contentVisible, setContentVisible] = useState(false)
  
  // Contexte global pour les backgrounds
  const { mode, transitioning, isSphereDescending, setMode, setTransitioning, setIsSphereDescending } = useBackground()

  // Préchargement simple
  useEffect(() => {
    const timer = setTimeout(() => setIsPreloaded(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handlePageChange = (newPage: string) => {
    if (newPage === currentPage || transitioning) return
    
    setTransitioning(true)
    
    // Récupérer la configuration de la nouvelle page
    const newConfig = pageConfig[newPage as keyof typeof pageConfig]
    
    // Logique spéciale pour les transitions vers le bas (skills)
    if (newPage === "skills" && currentPage !== "skills") {
      // Masquer le fond blanc pendant la descente
      setIsSphereDescending(true)
      
      // D'abord réduire la taille pour éviter les artefacts
      setSphereScale(0.5)
      setTimeout(() => {
        // Puis déplacer vers le bas
        setSphereTranslateY(newConfig.sphere.translateY)
        setSphereScale(newConfig.sphere.scale)
        
        // Une fois la sphère descendue, révéler le fond de specialist
        setTimeout(() => {
          setIsSphereDescending(false)
          // Changer de page APRÈS le fade
          setCurrentPage(newPage)
          setHomeVisible(false)
          setContentVisible(true)
        }, 800) // Délai pour laisser la sphère descendre complètement
      }, 300)
    } else {
      // Transitions normales pour les autres pages
      setIsSphereDescending(false)
      setSphereScale(newConfig.sphere.scale)
      setSphereTranslateY(newConfig.sphere.translateY)
      
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
    }, 1200)
  }

  const currentConfig = pageConfig[currentPage as keyof typeof pageConfig]

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Écran de chargement */}
      {!isPreloaded && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="font-kode text-black text-2xl mb-4">NOMAD403</div>
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}
      
      {/* Sphère avec transitions smooth */}
      <div 
        className="absolute z-0"
        style={{
          // Container 3x plus grand pour que la sphère agrandie ne touche jamais les bords
          top: '-200vh',
          left: '-200vw', 
          width: '500vw',
          height: '500vh',
          background: isSphereDescending ? 'transparent' : 'transparent'
        }}
      >
        <EnergySphereBackground 
          scale={sphereScale}
          translateY={sphereTranslateY}
          isTransitioning={transitioning}
        />
      </div>

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="font-kode text-black text-base font-medium tracking-[0.15em] uppercase">NOMAD403</div>
          <div className="hidden md:flex space-x-8 font-jetbrains text-black text-sm font-light">
            <button
              onClick={() => handlePageChange("home")}
              className={`nav-link transition-all duration-300 ${currentPage === "home" ? "active" : ""}`}
            >
              HOME
            </button>
            <button
              onClick={() => handlePageChange("projects")}
              className={`nav-link transition-all duration-300 ${currentPage === "projects" ? "active" : ""}`}
            >
              PROJECTS
            </button>
            <button
              onClick={() => handlePageChange("skills")}
              className={`nav-link transition-all duration-300 ${currentPage === "skills" ? "active" : ""}`}
            >
              SPECIALIST
            </button>
            <button
              onClick={() => handlePageChange("contact")}
              className={`nav-link transition-all duration-300 ${currentPage === "contact" ? "active" : ""}`}
            >
              CONTACT
            </button>
          </div>
        </div>
      </nav>

      {/* Contenu principal - Éléments avec transitions déclaratives */}
      <div className="relative w-full min-h-screen z-20">
        
        {/* Particle Text - visible seulement sur home */}
        <div 
          className={`absolute inset-0 z-10 transition-opacity duration-1000 ease-in-out ${
            isPreloaded && homeVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ pointerEvents: homeVisible ? "auto" : "none" }}
        >
          <ParticleText />
        </div>

        {/* Home Content - visible seulement sur home */}
        <div 
          className={`absolute inset-0 z-20 transition-opacity duration-1000 ease-in-out ${
            isPreloaded && homeVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ pointerEvents: homeVisible ? "auto" : "none" }}
        >
          <div className="flex flex-col justify-between p-8 max-w-7xl mx-auto h-full pointer-events-none">
            <div className="flex justify-center pt-20">
              <p className="font-jetbrains text-black text-xs font-light tracking-widest uppercase">
                I DON'T WANT TO BE THAT DEVELOPER ANYMORE
              </p>
            </div>

            <div className="pb-20">
              <div className="grid grid-cols-12 gap-8 items-end">
                <div className="col-span-3">
                  <div className="space-y-4">
                    <div>
                      <p className="font-jetbrains text-black text-xs font-light uppercase tracking-wide mb-1">
                        CHANGE YOUR LIFE
                      </p>
                    </div>
                    <div>
                      <p className="font-jetbrains text-black text-xs font-light uppercase tracking-wide">
                        CONTACT WITH US
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Pages - visible sur projects, skills, contact */}
        <div 
          className={`absolute inset-0 z-10 transition-opacity duration-1000 ease-in-out ${
            isPreloaded && contentVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ pointerEvents: contentVisible ? "auto" : "none" }}
        >
          <div className="relative w-full h-full">
            <ContentPages currentPage={currentPage} onBack={() => handlePageChange("home")} />
          </div>
        </div>
      </div>
    </div>
  )
}
