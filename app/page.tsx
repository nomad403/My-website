"use client"

import { useState, useEffect } from "react"
import SmokeBackground from "@/components/smoke-background"
import ParticleText from "@/components/particle-text"
import Navigation3D from "@/components/navigation-3d"
import ContentPages from "@/components/content-pages"

export default function HomePage() {
  const [currentPage, setCurrentPage] = useState("home")
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<string | null>(null)
  // Nouvel état pour centrer ou ranger l'objet 3D
  const [is3DCentered, setIs3DCentered] = useState(currentPage === "home")

  // Synchroniser l'état centré/rangé avec la page home
  useEffect(() => {
    if (currentPage === "home") {
      setIs3DCentered(true)
      setIsMenuOpen(false)
    } else {
      setIs3DCentered(false)
      setIsMenuOpen(false)
    }
  }, [currentPage])

  const handlePageChange = (newPage: string, direction?: string) => {
    if (newPage === currentPage || isTransitioning) return
    setIsTransitioning(true)
    setNextPage(newPage)
    setSlideDirection(direction || null)
    setTimeout(() => {
      setCurrentPage(newPage)
      setNextPage(null)
      setSlideDirection(null)
      setIsTransitioning(false)
    }, 300)
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
      {/* Smoke Background - ALWAYS PRESENT */}
      <SmokeBackground />

      {/* Top Navigation - Inspired by reference */}
      <nav className="absolute top-0 left-0 right-0 z-20 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="font-jetbrains text-black text-sm font-medium tracking-wider uppercase">NOMAD403</div>
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
      <div className="relative w-full h-full overflow-hidden">
        {/* Current Page Content */}
        <div
          className={`page-content absolute inset-0 ${
            isTransitioning && slideDirection ? `slide-out-${slideDirection}` : ""
          }`}
        >
          {currentPage === "home" && (
            <>
              {/* Particle Text - Large central text like reference */}
              <div className="absolute inset-0 z-10">
                <ParticleText />
              </div>

              {/* Minimal content positioning - inspired by reference layout */}
              <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 max-w-7xl mx-auto">
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
            </>
          )}

          {currentPage !== "home" && <ContentPages currentPage={currentPage} onBack={() => handlePageChange("home")} />}
        </div>

        {/* Next Page Content (during transition) */}
        {isTransitioning && nextPage && slideDirection && (
          <div className={`page-content absolute inset-0 slide-in-${getOppositeDirection(slideDirection)}`}>
            {nextPage === "home" && (
              <>
                {/* Particle Text - Large central text like reference */}
                <div className="absolute inset-0 z-10">
                  <ParticleText />
                </div>

                {/* Minimal content positioning - inspired by reference layout */}
                <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 max-w-7xl mx-auto">
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

            {nextPage !== "home" && <ContentPages currentPage={nextPage} onBack={() => handlePageChange("home")} />}
          </div>
        )}
      </div>

      {/* 3D Navigation - Always present on top */}
      <div className="absolute inset-0 z-30">
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
