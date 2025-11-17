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
          {/* Forcer la présence de la fonte dans le DOM */}
          <span aria-hidden className="invisible absolute -z-50 font-[var(--font-enigma)]">
            .
          </span>
          {children}
        </PageProvider>
      </BackgroundProvider>
    </LanguageProvider>
  )
}

