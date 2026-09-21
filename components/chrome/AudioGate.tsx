"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import {
  activateSiteSfx,
  readAudioGateChoice,
  setAudioGateChoice,
  setSiteSfxMuted,
  startAmbientLoop,
  unlockSiteSfx,
} from "@/lib/ui/site-sfx"

function shouldForceGateOnReload() {
  if (typeof window === "undefined") return false

  try {
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[]
    if (navEntries[0]?.type === "reload") return true
  } catch {
    // ignore
  }

  try {
    if ((performance as Performance & { navigation?: { type?: number } }).navigation?.type === 1) {
      return true
    }
  } catch {
    // ignore
  }

  return false
}

const AudioGateContext = createContext({
  visible: true,
  setVisible: (_visible: boolean) => {},
})

export function useAudioGate() {
  return useContext(AudioGateContext)
}

export function AudioGateProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const syncVisibility = () => {
      if (shouldForceGateOnReload()) {
        setVisible(true)
        return
      }

      setVisible(readAudioGateChoice() === "pending")
    }

    syncVisibility()

    const onPageShow = () => {
      if (shouldForceGateOnReload()) {
        setVisible(true)
        return
      }
      syncVisibility()
    }

    window.addEventListener("pageshow", onPageShow)
    return () => window.removeEventListener("pageshow", onPageShow)
  }, [])

  return (
    <AudioGateContext.Provider value={{ visible, setVisible }}>
      {children}
    </AudioGateContext.Provider>
  )
}

export default function AudioGate() {
  const { visible, setVisible } = useAudioGate()
  const { language } = useLanguage()

  if (!visible) return null

  const copy =
    language === "en"
      ? {
          label: "nomad403",
          title: "Enter",
          intro: "Enable sound to enjoy the full experience of the site.",
          yes: "Yes",
          no: "No",
        }
      : {
          label: "nomad403",
          title: "Entrer",
          intro: "Activer le son pour profiter de l’expérience complète du site.",
          yes: "Oui",
          no: "Non",
        }

  const handleEnter = async () => {
    setAudioGateChoice("accepted")
    setSiteSfxMuted(false)
    activateSiteSfx()
    await unlockSiteSfx()
    startAmbientLoop()
    setVisible(false)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-white px-4">
      <div className="absolute bottom-4 right-4 z-10 md:bottom-8 md:right-8">
        <LanguageSwitcher mode="day" />
      </div>

      <div className="flex h-full items-center justify-center">
        <div className="w-full max-w-sm border border-black/10 bg-white p-5 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_20px_40px_rgba(0,0,0,0.08)] sm:p-6">
          <div className="font-electric-blue mb-4 text-[0.8rem] font-normal tracking-[0.12em] text-black">
            {copy.label}
          </div>

          <h2 className="font-kode text-lg uppercase tracking-[0.14em] text-black sm:text-xl">
            {copy.title}
          </h2>

          <p className="mt-3 text-[0.72rem] leading-6 tracking-[0.04em] text-black/65">
            {copy.intro}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              data-no-sfx
              onClick={() => {
                void handleEnter()
              }}
              aria-label={
                language === "en"
                  ? "Enable sound and enter the site"
                  : "Activer le son et entrer sur le site"
              }
              className="flex-1 border border-black/10 bg-black px-3 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-white transition-colors duration-300 hover:bg-black/90"
            >
              {copy.yes}
            </button>
            <button
              type="button"
              data-no-sfx
              onClick={() => {
                setAudioGateChoice("declined")
                setSiteSfxMuted(true)
                setVisible(false)
              }}
              aria-label={
                language === "en" ? "Continue without sound" : "Continuer sans son"
              }
              className="flex-1 border border-black/10 bg-white px-3 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.18em] text-black transition-colors duration-300 hover:bg-black/5"
            >
              {copy.no}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
