"use client"

import { useEffect, useState, type ReactNode } from "react"
import { BackgroundProvider } from "@/contexts/BackgroundContext"
import { PageProvider } from "@/contexts/PageContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import BackgroundLayers from "@/components/chrome/BackgroundLayers"
import CustomCursor from "@/components/chrome/CustomCursor"
import DynamicFavicon from "@/components/seo/DynamicFavicon"
import DynamicSocialTags from "@/components/seo/DynamicSocialTags"
import JsonLdWebsite from "@/components/seo/JsonLdWebsite"
import ButtonSfxListener from "@/components/chrome/ButtonSfxListener"
import DvdScreensaver from "@/components/chrome/DvdScreensaver"
import AudioGate, { AudioGateProvider } from "@/components/chrome/AudioGate"
import { useLockMobileDocumentScroll } from "@/hooks/useLockMobileDocumentScroll"
import CaptureViewport from "@/components/capture/CaptureViewport"
import CaptureDocument from "@/components/capture/CaptureDocument"
import { getCaptureMode } from "@/lib/capture/config"

interface ClientLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  // Start in the SSR-safe state, then read the query string after hydration.
  const [captureMode, setCaptureMode] = useState<"off" | "host" | "frame">("off")

  useEffect(() => {
    setCaptureMode(getCaptureMode(window.location.search))
  }, [])

  useLockMobileDocumentScroll(captureMode === "off")

  if (captureMode === "host") return <CaptureViewport />

  return (
    <LanguageProvider>
      <BackgroundProvider>
        {captureMode === "frame" && <CaptureDocument />}
        <DynamicFavicon />
        <AudioGateProvider disabled={captureMode === "frame"}>
          <PageProvider>
            <DynamicSocialTags />
            <JsonLdWebsite />
            <BackgroundLayers />
            <CustomCursor />
            <ButtonSfxListener />
            {captureMode !== "frame" && <AudioGate />}
            <DvdScreensaver />
            {/* Forcer la présence de la fonte dans le DOM */}
            <span aria-hidden className="invisible absolute -z-50 font-[var(--font-enigma)]">
              .
            </span>
            <span aria-hidden className="invisible absolute -z-50 font-home-title">
              .
            </span>
            <span aria-hidden className="invisible absolute -z-50 font-electric-blue">
              .
            </span>
            {children}
          </PageProvider>
        </AudioGateProvider>
      </BackgroundProvider>
    </LanguageProvider>
  )
}
