"use client"

import type { ReactNode } from "react"
import { BackgroundProvider } from "@/contexts/BackgroundContext"
import { PageProvider } from "@/contexts/PageContext"
import { LanguageProvider } from "@/contexts/LanguageContext"
import BackgroundLayers from "@/components/chrome/BackgroundLayers"
import CustomCursor from "@/components/chrome/CustomCursor"
import DynamicFavicon from "@/components/seo/DynamicFavicon"
import DynamicSocialTags from "@/components/seo/DynamicSocialTags"
import JsonLdWebsite from "@/components/seo/JsonLdWebsite"
import ButtonSfxListener from "@/components/chrome/ButtonSfxListener"

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
