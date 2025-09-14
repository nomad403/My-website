import type React from "react"
import type { Metadata } from "next"
import '../styles/globals.css'
import { JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { BackgroundProvider } from "./contexts/BackgroundContext"
import { PageProvider } from "./contexts/PageContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import BackgroundLayers from "@/components/BackgroundLayers"
import CustomCursor from "../components/CustomCursor"
import DynamicFavicon from "@/components/DynamicFavicon"

const enigma = localFont({
  src: "../fonts/EnigmaRegular.woff2",
  variable: "--font-enigma",
  display: "swap",
  preload: true,
  weight: "400",
  style: "normal",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jetbrains",
})

export const metadata: Metadata = {
  title: "NOMAD403 - Web, Mobile & AI Developer",
  description: "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.",
  // icons: { ... }  // ⟵ Désactivé pour éviter les conflits avec DynamicFavicon
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* 1) Un favicon "pilotable" par JS (mode jour = icône noire = favicon-white.ico) */}
        <link id="app-favicon" rel="icon" href="/favicon-white.ico" />

        {/* 2) Fallback auto : OS clair / sombre */}
        <link rel="icon" media="(prefers-color-scheme: light)" href="/favicon-white.ico" />
        <link rel="icon" media="(prefers-color-scheme: dark)" href="/favicon-black.ico" />

        {/* Apple */}
        <link rel="apple-touch-icon" href="/favicon-white.png" />
      </head>
      <body className={`${enigma.variable} ${jetBrainsMono.variable} antialiased`}>
        {/* Forcer la présence de la fonte dans le DOM */}
        <span aria-hidden className="invisible absolute -z-50 font-[var(--font-enigma)]">.</span>
        <LanguageProvider>
          <BackgroundProvider>
            <DynamicFavicon />
            <PageProvider>
              <BackgroundLayers />
              <CustomCursor />
              {children}
            </PageProvider>
          </BackgroundProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
