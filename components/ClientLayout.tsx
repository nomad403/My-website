"use client"

import type { ReactNode } from "react"
import { BackgroundProvider } from "@/app/contexts/BackgroundContext"
import { PageProvider } from "@/app/contexts/PageContext"
import { LanguageProvider } from "@/app/contexts/LanguageContext"
import BackgroundLayers from "@/components/BackgroundLayers"
import CustomCursor from "@/components/CustomCursor"
import DynamicFavicon from "@/components/DynamicFavicon"
import DynamicSocialTags from "@/components/DynamicSocialTags"
import JsonLdWebsite from "@/components/JsonLdWebsite"
import ButtonSfxListener from "@/components/ButtonSfxListener"

interface ClientLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <LanguageProvider>
      <BackgroundProvider>
        <DynamicFavicon />
        <PageProvider>
          <DynamicSocialTags />
          <JsonLdWebsite />
          <BackgroundLayers />
          <CustomCursor />
          <ButtonSfxListener />
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
      </BackgroundProvider>
    </LanguageProvider>
  )
}
