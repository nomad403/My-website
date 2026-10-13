"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import { requestOrientationPermission, resetOrientationPermission } from "@/lib/ui/interaction"
import {
  activateSiteSfx,
  setAudioGateChoice,
  setSiteSfxMuted,
  startAmbientLoop,
  unlockSiteSfx,
} from "@/lib/ui/site-sfx"

function isMotionDevice() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(max-width: 767px)")?.matches === true ||
    window.matchMedia?.("(pointer: coarse)")?.matches === true
  )
}

const AudioGateContext = createContext({
  visible: true,
  setVisible: (_visible: boolean) => {},
})

export function useAudioGate() {
  return useContext(AudioGateContext)
}

export function AudioGateProvider({
  children,
  disabled = false,
}: {
  children: ReactNode
  /** Capture mode must not place an interaction gate in recorded footage. */
  disabled?: boolean
}) {
  const [visible, setVisible] = useState(!disabled)

  useEffect(() => {
    setVisible(!disabled)
    if (disabled) return

    const resetEntry = () => {
      resetOrientationPermission()
      setSiteSfxMuted(true)
      setVisible(true)
    }
    resetEntry()

    // A restored document also needs a fresh, explicit entry gesture.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetEntry()
    }
    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [disabled])

  return (
    <AudioGateContext.Provider value={{ visible, setVisible }}>
      {children}
    </AudioGateContext.Provider>
  )
}

export default function AudioGate() {
  const { visible, setVisible } = useAudioGate()
  const { language } = useLanguage()
  const [entering, setEntering] = useState(false)

  // Both device variants are present in server HTML; CSS selects the copy.
  if (!visible) return null

  const copy =
    language === "en"
      ? {
          label: "nomad403",
          title: "Enter",
          intro: "Enable sound to enjoy the full experience of the site.",
          motionIntro: "Enable sound and motion sensitivity for the full experience. On compatible devices, your browser may ask for access to motion sensors.",
          yes: "Yes",
          no: "No",
        }
      : {
          label: "nomad403",
          title: "Entrer",
          intro: "Activer le son pour profiter de l’expérience complète du site.",
          motionIntro: "Activer le son et la sensibilité aux mouvements pour profiter de l’expérience complète. Sur les appareils compatibles, le navigateur pourra demander l’accès aux capteurs de mouvement.",
          yes: "Oui",
          no: "Non",
        }

  const handleEnter = async () => {
    if (entering) return
    setEntering(true)
    // Start the system request directly in the click handler, before awaiting
    // audio unlock, so Safari retains the required user activation.
    const motionPermission = isMotionDevice()
      ? requestOrientationPermission()
      : Promise.resolve(false)
    setAudioGateChoice("accepted")
    setSiteSfxMuted(false)
    activateSiteSfx()
    await Promise.all([motionPermission, unlockSiteSfx().catch(() => undefined)])
    startAmbientLoop()
    setVisible(false)
    setEntering(false)
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="experience-gate-title" className="audio-gate fixed inset-0 z-[100] bg-white px-4">
      <div className="absolute bottom-4 right-4 z-10 md:bottom-8 md:right-8">
        <LanguageSwitcher mode="day" />
      </div>

      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm border border-black/10 bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_20px_40px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="font-electric-blue mb-4 text-[0.8125rem] font-normal tracking-[0.08em] text-black">
            {copy.label}
          </div>

          <h2 id="experience-gate-title" className="font-kode text-[1.625rem] font-normal uppercase leading-[1.08] tracking-[0.08em] text-black">
            {copy.title}
          </h2>

          <p className="mt-3 text-[0.8125rem] leading-[1.62] tracking-[0.02em] text-black/65">
            <span className="experience-copy-desktop">{copy.intro}</span>
            <span className="experience-copy-motion">{copy.motionIntro}</span>
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              data-no-sfx
              disabled={entering}
              onClick={() => {
                void handleEnter()
              }}
              aria-label={
                language === "en"
                  ? "Enable the full experience and enter the site"
                  : "Activer l’expérience complète et entrer sur le site"
              }
              className="flex-1 border border-black/10 bg-black px-3 py-2.5 text-[0.625rem] font-normal uppercase tracking-[0.14em] text-white transition-colors duration-300 hover:bg-black/90"
            >
              {copy.yes}
            </button>
            <button
              type="button"
              data-no-sfx
              disabled={entering}
              onClick={() => {
                setAudioGateChoice("declined")
                setSiteSfxMuted(true)
                setVisible(false)
              }}
              aria-label={
                language === "en" ? "Continue without sound or motion sensors" : "Continuer sans son ni capteurs de mouvement"
              }
              className="flex-1 border border-black/10 bg-white px-3 py-2.5 text-[0.625rem] font-normal uppercase tracking-[0.14em] text-black transition-colors duration-300 hover:bg-black/5"
            >
              {copy.no}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
