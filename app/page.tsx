"use client"

import { useState, useEffect } from "react"
import SmokeBackground from "@/components/smoke-background"
import ParticleText from "@/components/particle-text"
import Navigation3D from "@/components/navigation-3d"
import ContentPages from "@/components/content-pages"
import EnergySphereBackground from "@/components/EnergySphereBackground"

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState("home")
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<string | null>(null)
  // Nouvel état pour centrer ou ranger l'objet 3D (rangé par défaut)
  const [is3DCentered, setIs3DCentered] = useState(false)
  // États pour l'animation de la sphère
  const [sphereScale, setSphereScale] = useState(1)
  const [sphereTranslateY, setSphereTranslateY] = useState(0)
  const [isSphereTransitioning, setIsSphereTransitioning] = useState(false)

  // Synchroniser l'état centré/rangé avec la page home
  useEffect(() => {
    // Gérer seulement les changements de menu, pas la sphère
    setIs3DCentered(false)
    setIsMenuOpen(false)
  }, [currentPage])

  const handlePageChange = (newPage: string, direction?: string) => {
    if (newPage === currentPage || isTransitioning) return
    
    setIsTransitioning(true)
    setNextPage(newPage)
    setSlideDirection(direction || null)
    
    // Animation spéciale pour la transition vers "projects"
    if (newPage === "projects" && currentPage === "home") {
      setIsSphereTransitioning(true)
      // La sphère grandit et descend pour créer l'effet horizon planétaire
      setSphereScale(6) // Sphère beaucoup plus étendue pour un horizon large
      setSphereTranslateY(1600) // Descend encore plus pour un horizon très bas
    }
    
    // Animation inverse pour retourner à home depuis projects
    if (newPage === "home" && currentPage === "projects") {
      setIsSphereTransitioning(true)
      setSphereScale(1) // Remet la taille normale
      setSphereTranslateY(0) // Remet en position centrale
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

  // Ajout de la fonction pour retour home via l'objet rangé
  const handleRequestHome = () => {
    handlePageChange("home")
  }

  // Gestion du clic sur l'objet 3D
  const handle3DObjectClick = () => {
    if (!is3DCentered) {
      // Si rangé, on centre et on ouvre le menu
      setIs3DCentered(true)
      setIsMenuOpen(true)
    } else {
      // Si déjà centré, on range et on ferme le menu
      setIs3DCentered(false)
      setIsMenuOpen(false)
    }
  }

  const getOppositeDirection = (direction: string) => {
    switch (direction) {
      case "down":
        return "up"
      case "up":
        return "down"
      case "left":
        return "right"
      case "right":
        return "left"
      default:
        return "up"
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-white">
      
      <EnergySphereBackground 
        scale={sphereScale}
        translateY={sphereTranslateY}
        isTransitioning={isSphereTransitioning}
      />

      {/* Top Navigation - Inspired by reference */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="font-kode text-black text-sm font-medium tracking-wider uppercase">NOMAD403</div>
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
              onClick={() => handlePageChange("about")}
              className={`nav-link transition-all duration-300 ${currentPage === "about" ? "active" : ""}`}
            >
              ABOUT
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

      {/* Main Content Container */}
      <div className="relative w-full min-h-screen">
        {/* Current Page Content */}
        <div
          className={`page-content absolute inset-0 overflow-y-auto max-h-screen pointer-events-none ${
            isTransitioning && slideDirection ? `slide-out-${slideDirection}` : ""
          }`}
        >
          {currentPage === "home" && (
            <div 
              className={`home-page-content w-full h-full`}
              style={{
                transform: nextPage === "projects" && isTransitioning ? "translateY(-100vh)" : "translateY(0)",
                opacity: nextPage === "projects" && isTransitioning ? 0 : 1,
                transition: isTransitioning ? "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s ease-out" : "none"
              }}
            >
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
              className={`page-content w-full h-full pointer-events-auto`}
              style={{
                transform: currentPage === "projects" && isTransitioning ? "translateY(100vh)" : "translateY(0)",
                opacity: currentPage === "projects" && isTransitioning ? 0 : 1,
                transition: isTransitioning ? "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s ease-in" : "none"
              }}
            >
              <ContentPages currentPage={currentPage} onBack={() => handlePageChange("home")} />
            </div>
          )}
        </div>

        {/* Next Page Content (during transition) */}
        {isTransitioning && nextPage && slideDirection && (
          <div className={`page-content absolute inset-0 slide-in-${getOppositeDirection(slideDirection)} pointer-events-none`}>
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
                className={`next-page-content w-full h-full pointer-events-auto`}
                style={{
                  transform: nextPage === "projects" && isTransitioning ? "translateY(0)" : "translateY(100vh)",
                  opacity: nextPage === "projects" && isTransitioning ? 1 : 0,
                  transition: isTransitioning ? "transform 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s ease-in 0.4s" : "none"
                }}
              >
                <ContentPages currentPage={nextPage} onBack={() => handlePageChange("home")} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3D Navigation - Always present on top */}
      <div 
        className={`absolute inset-0 transition-all duration-500 pointer-events-none ${
          currentPage === "home" ? "z-30" : "z-5"
        }`}
        style={{
          opacity: nextPage === "projects" && isTransitioning ? 0 : 1,
          transition: "opacity 0.6s ease-out"
        }}
      >
        <Navigation3D
          isMenuOpen={isMenuOpen}
          setIsMenuOpen={setIsMenuOpen}
          onNavigate={handlePageChange}
          isTransitioning={isTransitioning}
          currentPage={currentPage}
          is3DCentered={is3DCentered}
          on3DObjectClick={handle3DObjectClick}
        />
      </div>
    </div>
  )
}
