"use client"

import { useEffect, useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { useBackground } from "./contexts/BackgroundContext"
import { usePage } from "./contexts/PageContext"
import ShuffleText from "@/components/ShuffleText"
import ContentPages from "@/components/content-pages"
import MobileHomeSubtitle from "@/components/MobileHomeSubtitle"
import DynamicHead from "@/components/DynamicHead"
import DynamicFavicon from "@/components/DynamicFavicon"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import JsonLdPerson from "@/components/JsonLdPerson"
import { getPageMetadata } from "@/config/metadata"
import { useLanguage } from "./contexts/LanguageContext"
import { usePerformanceProfile } from "@/hooks/usePerformanceProfile"
import { useProgressiveLoad } from "@/hooks/useProgressiveLoad"
import { useSmartPreload } from "@/hooks/useSmartPreload"
import { useMobileViewport } from "@/hooks/useMobileViewport"
import { resolveAsciiSettings } from "@/lib/performance"

const SpheresPacking = dynamic(() => import("@/components/SpheresPacking"), { ssr: false })
const AsciiOverlay = dynamic(() => import("@/components/AsciiOverlay"), { ssr: false })
const ParticleText = dynamic(() => import("@/components/particle-text"), { ssr: false })

const pageConfig = {
  home: {
    sphere: { scale: 1 },
    background: 'day' as const,
    elements: ['particleText', 'homeContent'],
    ascii: {
      visible: true,
      mode: 'sobel' as const,
      invert: false,
      opacity: 0.8, 
      color: '#ff0000',
      fontPx: 7
    }
  },
  projects: {
    sphere: { scale: 3.5 },
    background: 'day' as const,
    elements: ['contentPages'],
    ascii: {
      visible: true,
      mode: 'sobel' as const,
      invert: false,
      opacity: 0.4,
      color: '#ff00f1',
      fontPx: 7
    }
  },
  specialist: {
    sphere: { scale: 1 },
    background: 'day' as const,
    elements: ['contentPages'],
    ascii: {
      visible: true,
      mode: 'sobel' as const,
      invert: false,
      opacity: 0.5,
      color: '#00ffc8',
      fontPx: 7
    }
  },
  decision: {
    sphere: { scale: 1 },
    background: 'day' as const,
    elements: ['contentPages'],
    ascii: {
      visible: true,
      mode: 'sobel' as const,
      invert: false,
      opacity: 0.65,
      color: '#5DD3F0',
      fontPx: 7
    }
  },
  contact: {
    sphere: { scale: 0 },
    background: 'day' as const,
    elements: [],
    ascii: {
      visible: true,
      mode: 'sobel' as const,
      invert: false,
      opacity: 0.7,
      color: '#ffcc00',
      fontPx: 7
    }
  }
}

interface HomePageClientProps {
  initialPage?: string
}

export default function HomePageClient({ initialPage = "home" }: HomePageClientProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { profile } = usePerformanceProfile()
  const isMobileViewport = useMobileViewport()
  const { stage, showSpheres, showAscii, showParticles } = useProgressiveLoad(profile, {
    skipParticles: isMobileViewport,
  })
  
  // Language context
  const { t, language, isLanguageReady } = useLanguage()
  
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
  const isPreloaded = useSmartPreload(profile, stage, bgCanvas, {
    skipParticles: isMobileViewport,
  })

  const showHomeHero = isMobileViewport ? showAscii : showParticles

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

  // Mémoriser la configuration pour éviter les recalculs
  const currentConfig = useMemo(() => {
    return pageConfig[currentPage as keyof typeof pageConfig] || pageConfig.home
  }, [currentPage])

  const asciiSettings = useMemo(() => {
    if (!profile) return null
    return resolveAsciiSettings(currentConfig.ascii, profile)
  }, [currentConfig, profile])

  // Gérer le scroll du body selon la page
  useEffect(() => {
    if (currentPage === "specialist" || currentPage === "decision") {
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
      else if (path === "/decision") pageName = "decision"
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
      
      {/* Background: chargement progressif selon le profil performance */}
      {showSpheres && profile && (
        <SpheresPacking
          count={profile.spheres.count}
          minSize={0.5}
          maxSize={1.0}
          currentPage={currentPage}
          onCanvasReady={setBgCanvas}
          visible={true}
        />
      )}

      {showAscii && asciiSettings && (
        <AsciiOverlay
          source={bgCanvas}
          pageKey={currentPage}
          visible={currentConfig.ascii.visible}
          mode={asciiSettings.mode}
          invert={currentConfig.ascii.invert}
          opacity={currentConfig.ascii.opacity}
          color={currentConfig.ascii.color}
          fontPx={asciiSettings.fontPx}
          fps={asciiSettings.fps}
          domUpdateEvery={asciiSettings.domUpdateEvery}
          cover={true}
        />
      )}
      
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
              aria-label="Accueil - Développeur web mobile freelance Paris NOMAD403"
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
              aria-label="Portfolio projets - Développement web React Next.js mobile Kotlin Swift"
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
              aria-label="Compétences techniques - Expert React Next.js Kotlin Swift IA"
              className={`nav-link transition-all duration-300 ${currentPage === "specialist" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.specialist')}</ShuffleText>
            </Link>
            <Link
              href="/decision"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("decision")
              }}
              aria-label="Couche de décision - Interface de réflexion structurée"
              className={`nav-link transition-all duration-300 ${currentPage === "decision" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.decision')}</ShuffleText>
            </Link>
            <Link
              href="/contact"
              onClick={(e) => {
                e.preventDefault()
                handlePageChange("contact")
              }}
              aria-label="Contact développeur freelance - Devis gratuit projet web mobile"
              className={`nav-link transition-all duration-300 ${currentPage === "contact" ? "active" : ""} ${
                mode === 'night' ? 'text-white hover:text-cyan-400 night-mode' : 'text-black hover:text-cyan-400 day-mode'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.contact')}</ShuffleText>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden p-2 transition-colors duration-300 ${
              mode === 'night'
                ? isMobileMenuOpen ? 'text-cyan-400' : 'text-white'
                : isMobileMenuOpen ? 'text-cyan-500' : 'text-black'
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
              className={`md:hidden mt-4 overflow-visible ${
                mode === 'night' ? 'bg-black/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'
              } rounded-lg border ${
                mode === 'night' ? 'border-white/20' : 'border-black/20'
              }`}
            >
              <div className="p-4 space-y-3 font-jetbrains text-sm font-light flex flex-col pb-6">
                <Link
                  href="/"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("home")
                  }}
                  aria-label="Accueil - Développeur web mobile freelance Paris NOMAD403"
                  className={`block w-full text-left py-2 px-3 rounded transition-all duration-300 ${
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
                  aria-label="Portfolio projets - Développement web React Next.js mobile Kotlin Swift"
                  className={`block w-full text-left py-2 px-3 rounded transition-all duration-300 ${
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
                  aria-label="Compétences techniques - Expert React Next.js Kotlin Swift IA"
                  className={`block w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "specialist" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.specialist')}</ShuffleText>
                </Link>
                <Link
                  href="/decision"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("decision")
                  }}
                  aria-label="Couche de décision - Interface de réflexion structurée"
                  className={`block w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "decision" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.decision')}</ShuffleText>
                </Link>
                <Link
                  href="/contact"
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange("contact")
                  }}
                  aria-label="Contact développeur freelance - Devis gratuit projet web mobile"
                  className={`block w-full text-left py-2 px-3 rounded transition-all duration-300 ${
                    currentPage === "contact" 
                      ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                      : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                  }`}
                >
                  <ShuffleText shuffleDuration={150} letterDelay={12}>{t('nav.contact')}</ShuffleText>
                </Link>
                
                {/* Language Switcher for mobile */}
                <div className="pt-2 pb-2 border-t border-gray-300/20">
                  <div className="w-full relative">
                    <LanguageSwitcher isMobile={true} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Language Switcher - Position fixe en bas à droite (masqué sur mobile) */}
      <div className="hidden md:block fixed bottom-6 right-6 z-[9999] pointer-events-auto" style={{ zIndex: 9999 }}>
        <LanguageSwitcher />
      </div>

      {/* H1 pour le SEO - invisible mais accessible */}
      {currentPage === 'home' && (
        <h1 className="sr-only">
          Nomad403 (Nomad 403) — Web, Mobile & AI Developer — Official site & portfolio
        </h1>
      )}

      {/* Main content - Elements with declarative transitions */}
      <div className="relative w-full h-screen z-20">
        
        {/* Home hero — particules desktop, shuffle mobile */}
        <motion.div 
          className="absolute inset-0 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isPreloaded && homeVisible && showHomeHero ? 1 : 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ pointerEvents: "none" }}
        >
          {showParticles && homeVisible && !isMobileViewport && <ParticleText />}
          {homeVisible && isMobileViewport && isLanguageReady && (
            <div className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-28">
              <MobileHomeSubtitle
                text={t("home.subtitle")}
                triggerShuffle={isPreloaded && showAscii}
                mode={mode}
              />
            </div>
          )}
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

      
      {/* SEO Internal Links - Invisible but accessible to crawlers */}
      <div className="sr-only">
        <nav aria-label="Navigation interne SEO">
          <ul>
            <li><a href="https://www.nomad403.com/">Accueil - Développeur Web Mobile IA</a></li>
            <li><a href="https://www.nomad403.com/projects">Portfolio Projets - Applications Web Mobile</a></li>
            <li><a href="https://www.nomad403.com/specialist">Compétences Techniques - React Next.js Kotlin Swift</a></li>
            <li><a href="https://www.nomad403.com/contact">Contact - Développeur Freelance Paris</a></li>
          </ul>
        </nav>
        
        {/* Liens contextuels pour les mots-clés importants */}
        <div>
          <h2>Services de développement</h2>
          <ul>
            <li><a href="https://www.nomad403.com/projects">Développement d'applications web React Next.js</a></li>
            <li><a href="https://www.nomad403.com/projects">Applications mobiles iOS Android Kotlin Swift</a></li>
            <li><a href="https://www.nomad403.com/specialist">Intégration IA et machine learning Azure OpenAI</a></li>
            <li><a href="https://www.nomad403.com/specialist">Développeur freelance Paris React Next.js</a></li>
            <li><a href="https://www.nomad403.com/specialist">Expert mobile Kotlin Swift iOS Android</a></li>
            <li><a href="https://www.nomad403.com/contact">Consulting technique développeur web mobile</a></li>
          </ul>
        </div>
      </div>

      {/* Social media links */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:items-center max-w-7xl mx-auto">
          {/* Social media links */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-jetbrains text-xs sm:text-sm font-light uppercase tracking-wider">
            <a 
              href="https://x.com/_nomad_403" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="Suivre NOMAD403 sur X (Twitter) - Développeur freelance Paris"
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
              aria-label="Profil LinkedIn de Glenn Richard - Développeur web mobile freelance"
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
              aria-label="Portfolio GitHub de NOMAD403 - Projets React Next.js Kotlin Swift"
              className={`transition-all duration-300 hover:scale-110 ${
                mode === 'night' ? 'text-white hover:text-cyan-400' : 'text-black hover:text-cyan-400'
              }`}
            >
              <ShuffleText shuffleDuration={150} letterDelay={12}>GITHUB</ShuffleText>
            </a>
          </div>
        </div>
      </div>

      {/* Contenu SEO invisible pour la page home */}
      {currentPage === 'home' && (
        <div className="sr-only">
          <p>
            Nomad403, Nomad 403, nomad-403 — développeur web mobile freelance basé à Paris. 
            Spécialisé dans le développement d'applications web React Next.js et mobiles iOS Android Kotlin Swift sur mesure pour startups, 
            studios créatifs, marques de luxe et entreprises tech. Expertise en React, Next.js, 
            TypeScript, Kotlin, Swift, et intégration d'IA avec Azure OpenAI.
          </p>
          <p>
            Développeur freelance Paris expérimenté proposant des solutions digitales innovantes : 
            applications web React Next.js performantes, applications mobiles natives iOS Android Kotlin Swift, 
            intégration d'intelligence artificielle, automatisation de processus métier. 
            Approche centrée sur l'expérience utilisateur, la performance et la scalabilité.
          </p>
          <p>
            Services : développement web full-stack React Next.js, applications mobiles cross-platform Kotlin Swift, 
            intégration IA et machine learning, consulting technique, architecture de solutions, 
            MVP et prototypage rapide. Technologies : Next.js, React, TypeScript, Tailwind CSS, 
            Kotlin, Jetpack Compose, Swift, SwiftUI, Azure OpenAI, Power Automate, Three.js.
          </p>
          <p>
            Portfolio créatif et technique démontrant l'excellence dans le développement 
            d'interfaces utilisateur modernes, d'expériences interactives 3D, et de solutions 
            d'automatisation intelligente. Partenaire de confiance pour les projets ambitieux 
            nécessitant expertise technique et vision créative.
          </p>
          <p>
            Recherches associées : nomad403 développeur, nomad 403 freelance, nomad-403 paris, 
            nomad403 portfolio, nomad 403 web developer, nomad-403 mobile app, nomad403 react, 
            nomad 403 typescript, nomad-403 kotlin, nomad403 swift, nomad 403 ai integration,
            développeur web mobile freelance paris, expert react next.js, développeur kotlin swift,
            intégration ia azure openai, portfolio développeur freelance.
          </p>
          
          {/* Liens internes contextuels pour la page d'accueil */}
          <nav>
            <h3>Navigation interne</h3>
            <ul>
              <li><a href="https://www.nomad403.com/projects">Voir mes projets de développement web React Next.js et mobile Kotlin Swift</a></li>
              <li><a href="https://www.nomad403.com/specialist">Découvrir mes compétences techniques développeur freelance Paris</a></li>
              <li><a href="https://www.nomad403.com/contact">Me contacter pour un projet web mobile IA</a></li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  </>
)
}