"use client"

import { useEffect, useState } from "react"
import { useBackground } from "@/contexts/BackgroundContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { ORIENTATION_GRANTED_EVENT } from "@/lib/ui/interaction"
import {
  activateSiteSfx,
  canUseSiteSfxOnThisDevice,
  isSiteSfxMuted,
  setSiteSfxMuted,
  subscribeSiteSfxMute,
  unlockSiteSfx,
} from "@/lib/ui/site-sfx"

export default function SoundToggle() {
  const { mode } = useBackground()
  const { language } = useLanguage()
  const [muted, setMuted] = useState(false)
  const [available, setAvailable] = useState(() =>
    canUseSiteSfxOnThisDevice(),
  )

  useEffect(() => {
    setMuted(isSiteSfxMuted())
    setAvailable(canUseSiteSfxOnThisDevice())

    const syncAvailability = () => {
      setAvailable(canUseSiteSfxOnThisDevice())
    }

    window.addEventListener(ORIENTATION_GRANTED_EVENT, syncAvailability)
    window.addEventListener("pageshow", syncAvailability)
    const unsubscribeMute = subscribeSiteSfxMute(setMuted)

    return () => {
      window.removeEventListener(ORIENTATION_GRANTED_EVENT, syncAvailability)
      window.removeEventListener("pageshow", syncAvailability)
      unsubscribeMute()
    }
  }, [])

  if (!available) return null

  const tone = mode === "night" ? "text-white" : "text-black"
  const inactive =
    mode === "night"
      ? "text-white/35 hover:text-white/70"
      : "text-black/35 hover:text-black/70"

  const label =
    language === "en"
      ? muted
        ? "Enable sounds"
        : "Mute sounds"
      : muted
        ? "Activer le son"
        : "Couper le son"

  return (
    <button
      type="button"
      data-no-sfx
      onClick={() => {
        const nextMuted = !isSiteSfxMuted()
        activateSiteSfx()
        void unlockSiteSfx().then(() => {
          setSiteSfxMuted(nextMuted)
        })
      }}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className={`font-kode text-[0.7rem] font-normal uppercase tracking-[0.12em] transition-colors duration-300 ${
        muted ? inactive : tone
      }`}
    >
      {muted ? "SFX OFF" : "SFX"}
    </button>
  )
}
