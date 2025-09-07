"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useBackground } from "./contexts/BackgroundContext"
import { usePage } from "./contexts/PageContext"
import ParticleText from "@/components/particle-text"
import SpheresPacking from "@/components/SpheresPacking"
import AsciiOverlay from "@/components/AsciiOverlay"
import ShuffleText from "@/components/ShuffleText"
import ContentPages from "@/components/content-pages"
import DynamicHead from "@/components/DynamicHead"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import JsonLdPerson from "@/components/JsonLdPerson"
import { getPageMetadata } from "@/config/metadata"
import { useLanguage } from "./contexts/LanguageContext"

const pageConfig = {
  home: {
    sphere: { scale: 1 },
    background: 'day' as const,
    elements: ['particleText', 'homeContent']
  },
  projects: {
    sphere: { scale: 3.5 },
    background: 'day' as const,
    elements: ['contentPages']
  },
  specialist: {
    sphere: { scale: 1 },
    background: 'day' as const,
    elements: ['contentPages']
  },
  contact: {
    sphere: { scale: 0 },
    background: 'day' as const,
    elements: []
  }
}

interface HomePageProps {
  initialPage?: string
}

export default function HomePage({ initialPage = "home" }: HomePageProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isPreloaded, setIsPreloaded] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Language context
  const { t, language } = useLanguage()
  
  // SPA visibility states - initialiser selon la page de départ
  const [homeVisible, setHomeVisible] = useState(initialPage === "home")
  const [contentVisible, setContentVisible] = useState(initialPage !== "home")
  
  // Global background context
  const { mode, transitioning, isSphereDescending, setMode, setTransitioning, setIsSphereDescending,
    setSphereScale } = useBackground()
  // Global internal router (Canvas reads this source of truth)
  const { setCurrentPage: setRoutedPage } = usePage()

  // Background canvas reference (spheres packing)
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null)

  // Simple preloading
  useEffect(() => {
    const timer = setTimeout(() => setIsPreloaded(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Sync local page with global router
  useEffect(() => {
    setRoutedPage(currentPage)
  }, [currentPage, setRoutedPage])

  // Initialize sphere values on startup based on initial page
  useEffect(() => {
    const initialConfig = pageConfig[initialPage as keyof typeof pageConfig] || pageConfig.home
    setSphereScale(initialConfig.sphere.scale)
    setMode(initialConfig.background)
  }, [initialPage, setSphereScale, setMode])

  const handlePageChange = (newPage: string) => {
    if (newPage === currentPage || transitioning) return
    
    setTransitioning(true)
    setIsMobileMenuOpen(false)
    
    // Mettre à jour l'URL sans recharger la page
    if (typeof window !== 'undefined') {
      const newUrl = newPage === "home" ? "/" : `/${newPage}`
      window.history.pushState({}, "", newUrl)
    }
    
    const newConfig = pageConfig[newPage as keyof typeof pageConfig]
    
    // Special logic for transitions to specialist page (downward)
    if (newPage === "specialist" && currentPage !== "specialist") {
      setIsSphereDescending(true)
      
      setSphereScale(newConfig.sphere.scale)
      
      // Reveal specialist background after sphere descends
      setTimeout(() => {
        setIsSphereDescending(false)
        setCurrentPage(newPage)
        setHomeVisible(false)
        setContentVisible(true)
      }, 300)
    } else if (currentPage === "specialist" && newPage !== "specialist") {
      // Special logic for transitions from specialist page
      setIsSphereDescending(true)
      
      setSphereScale(newConfig.sphere.scale)
      
      // Change page immediately to allow AnimatePresence fade
      setCurrentPage(newPage)
      
      if (newPage === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
      
      setTimeout(() => {
        setIsSphereDescending(false)
      }, 300)
    } else {
      // Normal transitions for other pages
      setIsSphereDescending(false)
      setSphereScale(newConfig.sphere.scale)
      
      setCurrentPage(newPage)
      
      if (newPage === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
    }
    
    // Background transition if needed
    if (newConfig.background !== mode) {
      setMode(newConfig.background)
    }
    
    // Finish transition after sphere animations
    setTimeout(() => {
      setTransitioning(false)
    }, 2500)
  }

  const currentConfig = pageConfig[currentPage as keyof typeof pageConfig]

  // Gérer le scroll du body selon la page
  useEffect(() => {
    if (currentPage === "specialist") {
      document.body.classList.remove("no-scroll")
    } else {
      document.body.classList.add("no-scroll")
    }
  }, [currentPage])

  // Gérer la navigation avec les boutons précédent/suivant du navigateur
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handlePopState = () => {
      const path = window.location.pathname
      let pageName = "home"
      
      if (path === "/projects") pageName = "projects"
      else if (path === "/specialist") pageName = "specialist"
      else if (path === "/contact") pageName = "contact"
      
      // Éviter les boucles infinies
      if (pageName !== currentPage) {
        setCurrentPage(pageName)
        
        // Mettre à jour la visibilité des éléments
        if (pageName === "home") {
          setHomeVisible(true)
          setContentVisible(false)
        } else {
          setHomeVisible(false)
          setContentVisible(true)
        }
        
        // Mettre à jour la configuration de la sphère
        const newConfig = pageConfig[pageName as keyof typeof pageConfig]
        if (newConfig) {
          setSphereScale(newConfig.sphere.scale)
          setMode(newConfig.background)
        }
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentPage, setSphereScale, setMode])

  // Obtenir les métadonnées pour la page courante
  const currentMetadata = getPageMetadata(currentPage, language)

  return (
    <>
      {/* Métadonnées dynamiques */}
      <DynamicHead 
        title={typeof currentMetadata.title === 'string' ? currentMetadata.title : "NOMAD403 - Web, Mobile & AI Developer"}
        description={typeof currentMetadata.description === 'string' ? currentMetadata.description : "Freelance developer building custom web apps, mobile applications, and AI-powered tools."}
      />
      <JsonLdPerson />
      
      {/* Background: Sphere packing outside R3F */}
      <SpheresPacking
        count={200}
        minSize={0.5}
        maxSize={1.0}
        currentPage={currentPage}
        onCanvasReady={setBgCanvas}
        visible={currentPage !== "specialist" && currentPage !== "contact"}
      />

      {/* Real-time ASCII overlay */}
      <AsciiOverlay
        source={bgCanvas}
        visible={currentPage === "specialist" || currentPage === "contact"}
        mode={currentPage === "specialist" ? "sobel" : "sobel"}
        invert={false}
        opacity={currentPage === "specialist" ? 0.35 : 0.4}
        color={currentPage === "specialist" ? "#00ffc8" : "#ffcc00"}
        fontPx={7}
        cover={true}
      />
      
      <div className="relative w-full h-screen overflow-hidden">
        {/* Loading screen */}
      {!isPreloaded && (
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="font-kode text-black text-2xl mb-4 font-semibold">NOMAD403</div>
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 p-4 md:p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <button 
          onClick={() => handlePageChange("home")}
          className={`font-kode text-sm md:text-base font-bold tracking-[0.15em] uppercase transition-colors duration-300 ${
            mode === 'night' ? 'text-white' : 'text-black'
          }`}>
            NOMAD403
          </button>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8 font-jetbrains text-sm font-light">
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("home")
              }}
              className={`nav-link transition-all duration-300 ${currentPage === "home" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
                <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.home')}</ShuffleText>
            </Link>
            <Link
              href="/projects"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("projects")
              }}
              className={`nav-link transition-all duration-300 ${currentPage === "projects" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.projects')}</ShuffleText>
            </Link>
            <Link
              href="/specialist"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("specialist")
              }}
              className={`nav-link transition-all duration-300 ${currentPage === "specialist" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.specialist')}</ShuffleText>
            </Link>
            <Link
              href="/contact"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("contact")
              }}
              className={`nav-link transition-all duration-300 ${currentPage === "contact" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.contact')}</ShuffleText>
            </Link>
            
            {/* Language Switcher */}
            <LanguageSwitcher />
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 transition-colors duration-300 ${
              mode === 'night' ? 'text-white hover:text-cyan-400' : 'text-black hover:text-cyan-400'
            }`}
          >
            <div className="relative w-6 h-6">
              {/* barre haute */}
              <motion.span
                className={`absolute left-0 right-0 top-1/2 block h-[2px] w-6 bg-current rounded-full will-change-transform`}
                style={{ transformOrigin: '50% 50%' }}
                animate={isMobileMenuOpen ? { rotate: 45, y: 0 } : { rotate: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
              />
              {/* barre milieu */}
              <motion.span
                className={`absolute left-0 right-0 top-1/2 block h-[2px] w-6 bg-current rounded-full will-change-transform`}
                style={{ transformOrigin: '50% 50%' }}
                animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                transition={{ duration: 0.12, ease: 'easeInOut' }}
              />
              {/* barre basse */}
              <motion.span
                className={`absolute left-0 right-0 top-1/2 block h-[2px] w-6 bg-current rounded-full will-change-transform`}
                style={{ transformOrigin: '50% 50%' }}
                animate={isMobileMenuOpen ? { rotate: -45, y: 0 } : { rotate: 0, y: 6 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
              />
            </div>
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className={`md:hidden mt-4 overflow-hidden ${
                mode === 'night' ? 'bg-black/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
              } rounded-lg border ${
                mode === 'night' ? 'border-white/20' : 'border-black/20'
              }`}
            >
              <div className="p-4 space-y-3 font-jetbrains text-sm font-light">
                <Link
                  href="/"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("home")
                  }}
                  className={`w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "home" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.home')}</ShuffleText>
                </Link>
                <Link
                  href="/projects"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("projects")
                  }}
                  className={`w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "projects" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.projects')}</ShuffleText>
                </Link>
                <Link
                  href="/specialist"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("specialist")
                  }}
                  className={`w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "specialist" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.specialist')}</ShuffleText>
                </Link>
                <Link
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("contact")
                  }}
                  className={`w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "contact" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.contact')}</ShuffleText>
                </Link>
                
                {/* Language Switcher for mobile */}
                <div className="pt-2 border-t border-gray-300/20">
                  <LanguageSwitcher />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main content - Elements with declarative transitions */}
      <div className="relative w-full min-h-screen z-20">
        
        {/* Particle Text - visible only on home */}
        <motion.div 
          className="absolute inset-0 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isPreloaded && homeVisible ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ pointerEvents: homeVisible ? "auto" : "none" }}
        >
          <ParticleText />
        </motion.div>

        {/* Content Pages - visible on projects, specialist, contact */}
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

      
      {/* Social media links */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-8">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          {/* Social media links on the left */}
          <div className="flex space-x-6 font-jetbrains text-sm font-light uppercase tracking-wider">
            <a 
              href="https://x.com/_nomad_403" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-cyan-400' : 'text-black hover:text-cyan-400'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>X</ShuffleText>
            </a>
            <a 
              href="https://www.linkedin.com/in/glenn-richard/" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-cyan-400' : 'text-black hover:text-cyan-400'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>LINKEDIN</ShuffleText>
            </a>
            <a 
              href="https://github.com/nomad403" 
              target="_blank" 
              rel="noopener noreferrer"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-cyan-400' : 'text-black hover:text-cyan-400'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>GITHUB</ShuffleText>
            </a>
          </div>
          
          {/* Email on the right */}
          <div className={`font-jetbrains text-sm ${
            mode === 'night' ? 'text-white' : 'text-black'
          }`}>
            {t('social.email')}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}