"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { AnimatePresence, motion } from "framer-motion"
import { useBackground } from "@/contexts/BackgroundContext"
import { usePage } from "@/contexts/PageContext"
import { useLanguage } from "@/contexts/LanguageContext"
import ContentPages from "@/components/seo/content-pages"
import HomeTitle from "@/components/home/HomeTitle"
import HeaderLogo from "@/components/chrome/HeaderLogo"
import DynamicHead from "@/components/seo/DynamicHead"
import { useAudioGate } from "@/components/chrome/AudioGate"
import JsonLdPerson from "@/components/seo/JsonLdPerson"
import SiteChromeNav, {
  SiteChromeMobileMenu,
} from "@/components/chrome/SiteChromeNav"
import SiteSocialFooter from "@/components/chrome/SiteSocialFooter"
import HomeSeoBlock from "@/components/home/HomeSeoBlock"
import { getPageMetadata } from "@/lib/seo/metadata"
import { usePerformanceProfile } from "@/hooks/usePerformanceProfile"
import { useProgressiveLoad } from "@/hooks/useProgressiveLoad"
import { useSmartPreload } from "@/hooks/useSmartPreload"
import { useMobileViewport } from "@/hooks/useMobileViewport"
import { useGyroRotateHint } from "@/hooks/useGyroRotateHint"
import { resolveAsciiSettings } from "@/lib/ui/performance"
import {
  getPageConfig,
  pageIdToPath,
  pathToPageId,
} from "@/lib/home/page-config"
import { useDemoStoryOptional } from "@/contexts/DemoStoryContext"
import { playSiteSfx } from "@/lib/ui/site-sfx"

const SpheresPacking = dynamic(() => import("@/components/ascii/SpheresPacking"), {
  ssr: false,
})
const AsciiOverlay = dynamic(() => import("@/components/ascii/AsciiOverlay"), {
  ssr: false,
})

interface HomePageClientProps {
  initialPage?: string
  /** Mode /demo : pas de pushState hors /demo, expose le navigateur. */
  demoMode?: boolean
  onDemoNavigatorReady?: (nav: DemoNavigator) => void
}

export type DemoNavigator = {
  goTo: (page: string) => void
}

export default function HomePageClient({
  initialPage = "home",
  demoMode = false,
  onDemoNavigatorReady,
}: HomePageClientProps) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [homeVisible, setHomeVisible] = useState(initialPage === "home")
  const [contentVisible, setContentVisible] = useState(initialPage !== "home")
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null)

  const { profile } = usePerformanceProfile()
  const isMobileViewport = useMobileViewport()
  const { visible: isAudioGateVisible } = useAudioGate()
  const shouldRenderSiteChrome = isMobileViewport || !isAudioGateVisible
  const shouldRenderSiteFooter = shouldRenderSiteChrome
  const { stage, showSpheres, showAscii } = useProgressiveLoad(profile, {
    skipParticles: true,
  })
  const { t, language, isLanguageReady } = useLanguage()
  const {
    mode,
    setMode,
    setTransitioning,
    setIsSphereDescending,
    setSphereScale,
  } = useBackground()
  const { setCurrentPage: setRoutedPage } = usePage()
  const demoStory = useDemoStoryOptional()

  const sphereCountRef = useRef<number | null>(null)
  if (profile && sphereCountRef.current === null) {
    sphereCountRef.current = profile.spheres.count
  }
  const sphereCount = sphereCountRef.current ?? profile?.spheres.count ?? 80
  const isPreloaded = useSmartPreload(profile, stage, bgCanvas, {
    skipParticles: true,
  })

  const showHomeTitle =
    isPreloaded && homeVisible && showAscii && isLanguageReady
  const demoPlaying = Boolean(demoMode && demoStory?.playing)
  const demoVoice = demoPlaying ? demoStory?.voice : null

  const homeTitleLines = useMemo(() => {
    if (demoVoice?.lines?.length) return [...demoVoice.lines]
    return [t("home.titleLine1"), t("home.titleLine2")]
  }, [demoVoice, t, language])
  const homeTitleAltLines = useMemo(() => {
    if (demoVoice?.alternate?.length) return [...demoVoice.alternate]
    return [t("home.titleAltLine1"), t("home.titleAltLine2")]
  }, [demoVoice, t, language])
  const homeBrandAltWords = useMemo(
    () => [t("home.brandAlt")],
    [t, language],
  )
  const rotateHintLines = useMemo(
    () => [t("home.rotateHintFr"), t("home.rotateHintEn")],
    [t, language],
  )
  const rotateHintActiveRaw = useGyroRotateHint(currentPage, showHomeTitle)
  const rotateHintActive = rotateHintActiveRaw && !demoPlaying
  const displayedHomeLines = rotateHintActive
    ? rotateHintLines
    : homeTitleLines
  const displayedHomeAltLines = rotateHintActive
    ? rotateHintLines
    : homeTitleAltLines

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isMobileViewport && isMobileMenuOpen) setIsMobileMenuOpen(false)
  }, [isMobileViewport, isMobileMenuOpen])

  useEffect(() => {
    setRoutedPage(currentPage)
  }, [currentPage, setRoutedPage])

  useEffect(() => {
    const initialConfig = getPageConfig(initialPage)
    setSphereScale(initialConfig.sphere.scale)
    setMode(initialConfig.background)
  }, [initialPage, setSphereScale, setMode])

  useEffect(() => {
    document.body.classList.add("no-scroll")
  }, [])

  const handlePageChange = (newPage: string) => {
    if (newPage === currentPage) return

    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }

    setTransitioning(true)
    setIsMobileMenuOpen(false)
    playSiteSfx("nav.page")

    if (typeof window !== "undefined" && !demoMode) {
      window.history.pushState({}, "", pageIdToPath(newPage))
    }

    const newConfig = getPageConfig(newPage)

    if (newPage === "specialist" && currentPage !== "specialist") {
      setIsSphereDescending(true)
      setSphereScale(newConfig.sphere.scale)
      setTimeout(() => {
        setIsSphereDescending(false)
        setCurrentPage(newPage)
        setHomeVisible(false)
        setContentVisible(true)
      }, 300)
    } else if (currentPage === "specialist" && newPage !== "specialist") {
      setIsSphereDescending(true)
      setSphereScale(newConfig.sphere.scale)
      setCurrentPage(newPage)
      if (newPage === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
      setTimeout(() => setIsSphereDescending(false), 300)
    } else {
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

    if (newConfig.background !== mode) {
      setMode(newConfig.background)
    }

    transitionTimerRef.current = setTimeout(() => {
      setTransitioning(false)
      transitionTimerRef.current = null
    }, 700)
  }

  const handlePageChangeRef = useRef(handlePageChange)
  handlePageChangeRef.current = handlePageChange

  useEffect(() => {
    if (!demoMode || !onDemoNavigatorReady) return
    onDemoNavigatorReady({
      goTo: (page: string) => {
        handlePageChangeRef.current(page)
      },
    })
  }, [demoMode, onDemoNavigatorReady])

  const currentConfig = useMemo(
    () => getPageConfig(currentPage),
    [currentPage],
  )

  const asciiSettings = useMemo(() => {
    if (!profile) return null
    return resolveAsciiSettings(currentConfig.ascii, profile)
  }, [currentConfig, profile])

  useEffect(() => {
    if (typeof window === "undefined") return

    const handlePopState = () => {
      const pageName = pathToPageId(window.location.pathname)
      if (pageName === currentPage) return

      setCurrentPage(pageName)
      if (pageName === "home") {
        setHomeVisible(true)
        setContentVisible(false)
      } else {
        setHomeVisible(false)
        setContentVisible(true)
      }
      const newConfig = getPageConfig(pageName)
      setSphereScale(newConfig.sphere.scale)
      setMode(newConfig.background)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [currentPage, setSphereScale, setMode])

  const currentMetadata = getPageMetadata(currentPage, language)
  const hidePageBody = isMobileMenuOpen && isMobileViewport

  return (
    <>
      <DynamicHead
        title={
          typeof currentMetadata.title === "string"
            ? currentMetadata.title
            : "NOMAD403 - Web, Mobile & AI Developer"
        }
        description={
          typeof currentMetadata.description === "string"
            ? currentMetadata.description
            : "Freelance developer building custom web apps, mobile applications, and AI-powered tools."
        }
      />
      <JsonLdPerson />

      {showSpheres && profile && (
        <SpheresPacking
          count={sphereCount}
          minSize={0.5}
          maxSize={1.0}
          currentPage={currentPage}
          onCanvasReady={setBgCanvas}
          visible={true}
          simulateTilt={demoPlaying}
        />
      )}

      {showAscii && asciiSettings && (
        <AsciiOverlay
          source={bgCanvas}
          pageKey={currentPage}
          visible={currentConfig.ascii.visible}
          mode={asciiSettings.mode}
          invert={currentConfig.ascii.invert}
          opacity={
            isMobileViewport
              ? Math.max(0.28, currentConfig.ascii.opacity * 0.7)
              : currentConfig.ascii.opacity
          }
          color={currentConfig.ascii.color}
          fontPx={asciiSettings.fontPx}
          fps={asciiSettings.fps}
          domUpdateEvery={asciiSettings.domUpdateEvery}
          cover={true}
        />
      )}

      <div
        className={`relative h-dvh min-h-0 w-full overflow-hidden${
          demoPlaying ? " pointer-events-none select-none" : ""
        }`}
        aria-hidden={demoPlaying ? true : undefined}
      >
        {!isPreloaded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
            <div className="text-center">
              <HeaderLogo mode="day" variant="loader" className="mb-4" />
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
            </div>
          </div>
        )}

        {shouldRenderSiteChrome && (
          <SiteChromeNav
            mode={mode}
            currentPage={currentPage}
            isMobileMenuOpen={isMobileMenuOpen}
            onToggleMobileMenu={() => setIsMobileMenuOpen((open) => !open)}
            onPageChange={handlePageChange}
          />
        )}

        <div className="relative z-20 h-dvh min-h-0 w-full">
          {shouldRenderSiteChrome && (
            <SiteChromeMobileMenu
              mode={mode}
              currentPage={currentPage}
              isOpen={isMobileMenuOpen}
              onPageChange={handlePageChange}
            />
          )}

          <div
            className={`absolute inset-0 ${hidePageBody ? "pointer-events-none" : ""}`}
            aria-hidden={hidePageBody ? true : undefined}
            style={{
              opacity: hidePageBody ? 0 : 1,
              transition: "opacity 0.28s ease",
            }}
          >
            <motion.div
              className="absolute inset-0 z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: showHomeTitle ? 1 : 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              style={{ pointerEvents: "none" }}
            >
              {showHomeTitle && (
                <div className="absolute inset-0 flex w-full items-end pb-[calc(9rem+env(safe-area-inset-bottom,0px))] sm:pb-32 md:pb-32">
                  <HomeTitle
                    lines={displayedHomeLines}
                    alternateLines={displayedHomeAltLines}
                    alternateBrandTexts={homeBrandAltWords}
                    ready={showHomeTitle}
                    mode={mode}
                    isMobile={isMobileViewport}
                    enableHover={!rotateHintActive && !demoMode}
                    playToken={demoStory?.voiceToken ?? 0}
                  />
                </div>
              )}
            </motion.div>

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
                    pointerEvents: contentVisible ? "auto" : "none",
                  }}
                >
                  <div className="relative h-full w-full">
                    <ContentPages currentPage={currentPage} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <HomeSeoBlock currentPage={currentPage} />
        {shouldRenderSiteFooter && <SiteSocialFooter mode={mode} />}
      </div>
    </>
  )
}
