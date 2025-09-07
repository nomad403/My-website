import type React from "react"
import type { Metadata } from "next"
import '../styles/globals.css'
import { JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { BackgroundProvider } from "./contexts/BackgroundContext"
import { PageProvider } from "./contexts/PageContext"
import BackgroundLayers from "@/components/BackgroundLayers"
import CustomCursor from "../components/CustomCursor"

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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${enigma.variable} ${jetBrainsMono.variable} antialiased`}>
        {/* Forcer la présence de la fonte dans le DOM */}
        <span aria-hidden className="invisible absolute -z-50 font-[var(--font-enigma)]">.</span>
        <BackgroundProvider>
          <PageProvider>
            <BackgroundLayers />
            <CustomCursor />
            {children}
          </PageProvider>
        </BackgroundProvider>
      </body>
    </html>
  );
}
