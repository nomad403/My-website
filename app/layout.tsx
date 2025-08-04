import type React from "react"
import type { Metadata } from "next"
import '../styles/globals.css'
import { Kode_Mono, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { BackgroundProvider } from "./contexts/BackgroundContext"
import BackgroundLayers from "@/components/BackgroundLayers"
import CustomCursor from "@/components/CustomCursor"

const kodeMono = Kode_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kode-mono",
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
})

const enigmaDisplay = localFont({
  src: "../public/fonts/EnigmaRegular.woff2",
  variable: "--font-enigma-display",
})

export const metadata: Metadata = {
  title: "NOMAD403 - Développeur Frontend & IA",
  description: "Portfolio interactif avec navigation 3D - Développement Frontend, Mobile et Intelligence Artificielle",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${kodeMono.variable} ${jetBrainsMono.variable} ${enigmaDisplay.variable} antialiased`}>
        <BackgroundProvider>
          <BackgroundLayers />
          <CustomCursor />
          {children}
        </BackgroundProvider>
      </body>
    </html>
  );
}
