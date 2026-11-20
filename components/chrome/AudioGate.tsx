"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import LanguageSwitcher from "@/components/chrome/LanguageSwitcher"
import {
  enableOrientationWithoutPrompt,
  orientationRequiresUserPrompt,
  readOrientationSessionState,
  requestOrientationPermission,
  resetOrientationPermission,
} from "@/lib/ui/interaction"
import {
  activateSiteSfx,
  readAudioGateChoice,
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

type GateMode = "experience" | "motion"

const AudioGateContext = createContext({
  visible: true,
  setVisible: (_visible: boolean) => {},
})

export function useAudioGate() {
  return useContext(AudioGateContext)
}

function armSilentAudioUnlock() {
  const unlock = () => {
    activateSiteSfx()
    void unlockSiteSfx()
      .catch(() => undefined)
      .finally(() => {
        startAmbientLoop()
      })
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }

  window.addEventListener("pointerdown", unlock, { once: true })
  window.addEventListener("keydown", unlock, { once: true })

  return () => {
    window.removeEventListener("pointerdown", unlock)
    window.removeEventListener("keydown", unlock)
  }
}

export function AudioGateProvider({
  children,
  disabled = false,
}: {
  children: ReactNode
  /** Capture mode must not place an interaction gate in recorded footage. */
  disabled?: boolean
}) {
  // false until hydrated: avoid flashing the gate for returning visitors.
  const [visible, setVisible] = useState(false)
  const [gateMode, setGateMode] = useState<GateMode>("experience")

  useEffect(() => {
    if (disabled) {
      setVisible(false)
      return
    }

    let cancelled = false
    let disarm: (() => void) | undefined

    const run = async () => {
      resetOrientationPermission()

      const choice = readAudioGateChoice()
      const motionDevice = isMotionDevice()

      if (choice === "declined") {
        setSiteSfxMuted(true)
        setVisible(false)
        return
      }

      if (choice === "accepted") {
        setSiteSfxMuted(false)

        if (!motionDevice) {
          setVisible(false)
          disarm = armSilentAudioUnlock()
          return
        }

        const sensorState = await readOrientationSessionState()
        if (cancelled) return

        if (sensorState === "granted" || sensorState === "unsupported") {
          if (sensorState === "granted") enableOrientationWithoutPrompt()
          setVisible(false)
          disarm = armSilentAudioUnlock()
          return
        }

        if (sensorState === "denied") {
          // OS blocked sensors — don't loop the modal; keep audio preference.
          setVisible(false)
          disarm = armSilentAudioUnlock()
          return
        }

        // Indeterminate session (typical iOS): preference is saved, sensors are not.
        if (orientationRequiresUserPrompt()) {
          setGateMode("motion")
          setVisible(true)
          return
        }

        enableOrientationWithoutPrompt()
        setVisible(false)
        disarm = armSilentAudioUnlock()
        return
      }

      // pending / missing / unreadable storage → explicit entry gate.
      setGateMode("experience")
      setSiteSfxMuted(true)
      setVisible(true)
    }

    void run()

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      disarm?.()
      void run()
    }
    window.addEventListener("pageshow", onPageShow)

    return () => {
      cancelled = true
      disarm?.()
      window.removeEventListener("pageshow", onPageShow)
    }
  }, [disabled])

  return (
    <AudioGateContext.Provider value={{ visible, setVisible }}>
      <AudioGateModeContext.Provider value={gateMode}>
        {children}
      </AudioGateModeContext.Provider>
    </AudioGateContext.Provider>
  )
}

const AudioGateModeContext = createContext<GateMode>("experience")

export default function AudioGate() {
  const { visible, setVisible } = useAudioGate()
  const gateMode = useContext(AudioGateModeContext)
  const { language } = useLanguage()
  const [entering, setEntering] = useState(false)

  // Both device variants are present in server HTML; CSS selects the copy.
  if (!visible) return null

  const copy =
    language === "en"
      ? {
          label: "nomad403",
          title: gateMode === "motion" ? "Motion" : "Enter",
          intro: "Enable sound for the full experience.",
          motionIntro:
            gateMode === "motion"
              ? "Motion access is still needed for this session. Your browser may ask for sensor permission."
              : "Enable motion sensitivity for the full experience. Your browser may ask for sensor access.",
          yes: "Yes",
          no: gateMode === "motion" ? "Not now" : "No",
        }
      : {
          label: "nomad403",
          title: gateMode === "motion" ? "Sensibilité" : "Entrer",
          intro: "Activez le son pour l’expérience complète.",
          motionIntro:
            gateMode === "motion"
              ? "L’accès aux mouvements est encore requis pour cette session. Le navigateur pourra demander l’accès aux capteurs."
              : "Activez la sensibilité aux mouvements pour l’expérience complète. Le navigateur pourra demander l’accès aux capteurs.",
          yes: "Oui",
          no: gateMode === "motion" ? "Plus tard" : "Non",
        }

  const handleEnter = async () => {
    if (entering) return
    setEntering(true)
    // Start the system request directly in the click handler, before awaiting
    // audio unlock, so Safari retains the required user activation.
    const motionPermission = isMotionDevice()
      ? requestOrientationPermission()
      : Promise.resolve(false)

    if (gateMode === "experience") {
      setAudioGateChoice("accepted")
    }

    setSiteSfxMuted(false)
    activateSiteSfx()
    await Promise.all([motionPermission, unlockSiteSfx().catch(() => undefined)])
    startAmbientLoop()
    setVisible(false)
    setEntering(false)
  }

  const handleDecline = () => {
    if (gateMode === "motion") {
      // Keep the saved audio/experience preference; skip sensors for this session.
      setVisible(false)
      armSilentAudioUnlock()
      return
    }
    setAudioGateChoice("declined")
    setSiteSfxMuted(true)
    setVisible(false)
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
                  ? gateMode === "motion"
                    ? "Enable motion sensitivity"
                    : "Enable the full experience and enter the site"
                  : gateMode === "motion"
                    ? "Activer la sensibilité aux mouvements"
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
              onClick={handleDecline}
              aria-label={
                language === "en"
                  ? gateMode === "motion"
                    ? "Continue without motion sensitivity"
                    : "Continue without the full experience"
                  : gateMode === "motion"
                    ? "Continuer sans sensibilité aux mouvements"
                    : "Continuer sans l’expérience complète"
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
