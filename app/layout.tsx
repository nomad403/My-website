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
import DynamicSocialTags from "@/components/DynamicSocialTags"
import JsonLdWebsite from "@/components/JsonLdWebsite"

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

        {/* Open Graph / Facebook - Balises statiques pour les crawlers */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://nomad403.com" />
        <meta property="og:title" content="NOMAD403 - Web, Mobile & AI Developer" />
        <meta property="og:description" content="Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio." />
        <meta property="og:image" content="https://nomad403.com/preview.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:site_name" content="NOMAD403" />
        <meta property="og:locale" content="fr_FR" />

        {/* Twitter Card - Balises statiques pour les crawlers */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@nomad403" />
        <meta name="twitter:creator" content="@nomad403" />
        <meta name="twitter:url" content="https://nomad403.com" />
        <meta name="twitter:title" content="NOMAD403 - Web, Mobile & AI Developer" />
        <meta name="twitter:description" content="Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio." />
        <meta name="twitter:image" content="https://nomad403.com/preview.jpg" />
        <meta name="twitter:image:alt" content="NOMAD403 Portfolio - Interactive 3D Developer Showcase" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="NOMAD403" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://nomad403.com" />
      </head>
      <body className={`${enigma.variable} ${jetBrainsMono.variable} antialiased`}>
        {/* Forcer la présence de la fonte dans le DOM */}
        <span aria-hidden className="invisible absolute -z-50 font-[var(--font-enigma)]">.</span>
        <LanguageProvider>
          <BackgroundProvider>
            <DynamicFavicon />
            <PageProvider>
              <DynamicSocialTags />
              <JsonLdWebsite />
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
