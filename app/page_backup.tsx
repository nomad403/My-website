"use client"

import { useState, useEffect } from "react"

import ParticleText from "@/components/particle-text"

import ContentPages from "@/components/content-pages"
import EnergySphereBackground from "@/components/EnergySphereBackground"

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState("home")
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<string | null>(null)

  // États pour l'animation de la sphère
  const [sphereScale, setSphereScale] = useState(1)
  const [sphereTranslateY, setSphereTranslateY] = useState(0)
  const [isSphereTransitioning, setIsSphereTransitioning] = useState(false)
  // État pour le fond (nuit sur specialist)
  const [backgroundMode, setBackgroundMode] = useState<'day' | 'night'>('day')



  const handlePageChange = (newPage: string, direction?: string) => {
    if (newPage === currentPage || isTransitioning) return
    
    setIsTransitioning(true)
    setNextPage(newPage)
    
    // Slides SEULEMENT pour home ↔ projects
    const isOrganicTransition = (currentPage === "projects" && newPage === "skills") || 
                               (currentPage === "skills" && newPage === "projects")
    
    // Déterminer direction slide pour home ↔ projects
    let slideDir = null
    if (currentPage === "home" && newPage === "projects") slideDir = "up"
    if (currentPage === "projects" && newPage === "home") slideDir = "down"
    
    setSlideDirection(isOrganicTransition ? null : slideDir)
    
    // === TRANSITIONS VERS PROJECTS ===
    if (newPage === "projects" && (currentPage === "home" || currentPage === "skills")) {
      setIsSphereTransitioning(true)
      setBackgroundMode('day')
      // La sphère grandit et descend pour créer l'effet horizon planétaire
      setSphereScale(6) // Sphère beaucoup plus étendue pour un horizon large
      setSphereTranslateY(1600) // Descend encore plus pour un horizon très bas
    }
    
    // === TRANSITIONS VERS HOME ===
    if (newPage === "home" && (currentPage === "projects" || currentPage === "skills")) {
      setIsSphereTransitioning(true)
      setBackgroundMode('day')
      setSphereScale(1) // Remet la taille normale
      setSphereTranslateY(0) // Remet en position centrale
    }
    
    // === TRANSITIONS VERS SPECIALIST (NUIT) ===
    if (newPage === "skills" && (currentPage === "home" || currentPage === "projects")) {
      setIsSphereTransitioning(true)
      setBackgroundMode('night')
      // La sphère "se couche" - disparaît vers le bas
      setSphereScale(1) // Taille normale
      setSphereTranslateY(2500) // Descend beaucoup plus bas (coucher de soleil)
    }
    
    setTimeout(() => {
      setCurrentPage(newPage)
      setNextPage(null)
      setSlideDirection(null)
  
      setIsTransitioning(false)
      // Reset de la transition sphère après l'animation
      setTimeout(() => {
        setIsSphereTransitioning(false)
      }, 200)
    }, 1200) // Augmenté pour laisser le temps aux animations de se terminer
  }





  const getOppositeDirection = (direction: string) => {
    switch (direction) {
      case "down":
        return "up"
      case "up":
        return "down"
      default:
        return "up"
    }
  }

  return (
    <div 
      className={`relative w-full h-screen overflow-hidden transition-all duration-1200 ease-out ${
        backgroundMode === 'night' ? 'bg-gradient-to-b from-indigo-900 via-purple-900 to-black' : 'bg-white'
      }`}
    >
      
      {/* Sphère isolée - container étendu pour éviter les limites visibles */}
      <div 
        className="absolute z-0"
        style={{
          // Container 3x plus grand pour que la sphère agrandie ne touche jamais les bords
          top: '-200vh',
          left: '-200vw', 
          width: '500vw',
          height: '500vh',
          background: 'transparent' // CRUCIAL: fond transparent
        }}
      >
        <EnergySphereBackground 
          scale={sphereScale}
          translateY={sphereTranslateY}
          isTransitioning={isSphereTransitioning}
        />
      </div>

      {/* Top Navigation - Inspired by reference */}
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

      {/* Main Content Container - isolé du flux de la sphère */}
      <div className="relative w-full min-h-screen z-20">
        {/* Current Page Content */}
        <div
          className={`page-content fixed inset-0 overflow-hidden z-30 ${
            isTransitioning && slideDirection ? `slide-out-${slideDirection}` : ""
          }`}
          style={{
            // Fade SEULEMENT pour projects ↔ specialist
            opacity: isTransitioning && !slideDirection ? 0 : 1,
            pointerEvents: isTransitioning ? 'none' : 'auto',
            transition: isTransitioning && !slideDirection ? 'opacity 0.5s ease-out' : 'none',
            transform: 'translate3d(0,0,0)', // Force GPU acceleration
            willChange: isTransitioning ? 'opacity' : 'auto'
          }}
        >
          {currentPage === "home" && (
            <div className="home-page-content w-full h-full">
              {/* Particle Text - Large central text like reference */}
              <div className="absolute inset-0 z-10 pointer-events-none">
                <ParticleText />
              </div>

              {/* Minimal content positioning - inspired by reference layout */}
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 max-w-7xl mx-auto pointer-events-none">
                {/* Top tagline */}
                <div className="flex justify-center pt-20">
                  <p className="font-jetbrains text-black text-xs font-light tracking-widest uppercase">
                    I DON'T WANT TO BE THAT DEVELOPER ANYMORE
                  </p>
                </div>

                {/* Bottom content area */}
                <div className="pb-20">
                  <div className="grid grid-cols-12 gap-8 items-end">
                    {/* Left side - minimal info */}
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
          )}

                    {currentPage !== "home" && (
            <div 
              className="relative z-10 w-full h-full pointer-events-auto"
              style={{
                // Position fixe SEULEMENT pour fade (projects ↔ specialist)
                position: isTransitioning && !slideDirection ? 'fixed' : 'relative',
                top: isTransitioning && !slideDirection ? 0 : 'auto',
                left: isTransitioning && !slideDirection ? 0 : 'auto',
                width: isTransitioning && !slideDirection ? '100vw' : '100%',
                height: isTransitioning && !slideDirection ? '100vh' : '100%'
              }}
            >
              <ContentPages currentPage={currentPage} onBack={() => handlePageChange("home")} />
            </div>
          )}
        </div>

        {/* Next Page Content (during transition) */}
        {isTransitioning && nextPage && (
          <div 
            className={`page-content fixed inset-0 overflow-hidden z-30 ${slideDirection ? `slide-in-${getOppositeDirection(slideDirection)}` : ''}`}
            style={{
              // FADE IN pour projects ↔ specialist, SLIDE IN pour home ↔ projects
              opacity: slideDirection ? 1 : 0,
              animation: !slideDirection ? "fadeInDelayed 0.8s ease-in 0.6s forwards" : "none",
              pointerEvents: "none",
              transform: 'translate3d(0,0,0)', // Force GPU acceleration
              willChange: slideDirection ? 'transform' : 'opacity'
            }}
          >
            {nextPage === "home" && (
              <>
                {/* Particle Text - Large central text like reference */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                  <ParticleText />
                </div>

                {/* Minimal content positioning - inspired by reference layout */}
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 max-w-7xl mx-auto pointer-events-none">
                  {/* Top tagline */}
                  <div className="flex justify-center pt-20">
                    <p className="font-jetbrains text-black text-xs font-light tracking-widest uppercase">
                      I DON'T WANT TO BE THAT DEVELOPER ANYMORE
                    </p>
                  </div>

                  {/* Bottom content area */}
                  <div className="pb-20">
                    <div className="grid grid-cols-12 gap-8 items-end">
                      {/* Left side - minimal info */}
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

                      {/* Center - navigation hint */}
                      <div className="col-span-6 flex justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mb-2 mx-auto">
                            <div className="text-white text-xs">↓</div>
                          </div>
                          <p className="font-jetbrains text-black text-xs font-light uppercase tracking-wide">
                            DISCOVER MORE
                          </p>
                        </div>
                      </div>

                      {/* Right side - description */}
                      <div className="col-span-3">
                        <div className="space-y-4">
                          <p className="font-jetbrains text-black text-xs font-light leading-relaxed">
                            We don't always have a choice in feeling depressed; sometimes it can be due to circumstances
                            as we might be experiencing grief and loss, other times, it comes from a chemical imbalance.
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-kode text-black text-xs">01</span>
                            <div className="flex space-x-1">
                              <div className="w-1 h-1 bg-black rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                              <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                            </div>
                            <span className="font-kode text-black text-xs">04</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {nextPage !== "home" && (
              <div 
                className="relative z-10 w-full h-full pointer-events-auto"
                style={{
                  // Position fixe SEULEMENT pour fade
                  position: !slideDirection ? 'fixed' : 'relative',
                  top: !slideDirection ? 0 : 'auto',
                  left: !slideDirection ? 0 : 'auto',
                  width: !slideDirection ? '100vw' : '100%',
                  height: !slideDirection ? '100vh' : '100%'
                }}
              >
                <ContentPages currentPage={nextPage} onBack={() => handlePageChange("home")} />
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
