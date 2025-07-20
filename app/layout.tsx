import type React from "react"
import type { Metadata } from "next"
import '../styles/globals.css'
import { Kode_Mono, JetBrains_Mono } from "next/font/google"
import ClientRoot from "@/components/ClientRoot";

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

export const metadata: Metadata = {
  title: "NOMAD403 - Développeur Frontend & IA",
  description: "Portfolio interactif avec navigation 3D - Développement Frontend, Mobile et Intelligence Artificielle",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${kodeMono.variable} ${jetBrainsMono.variable} antialiased`}>
        <ClientRoot>
          {children}
        </ClientRoot>
        <script dangerouslySetInnerHTML={{__html:`
          (function() {
            let t = 0;
            function animateLiquidGlass() {
              t += 0.008;
              var turb = document.querySelector('#lg-dist feTurbulence');
              if (turb) {
                var freq = 0.008 + Math.sin(t) * 0.0025;
                turb.setAttribute('baseFrequency', freq + ' ' + freq);
              }
              requestAnimationFrame(animateLiquidGlass);
            }
            animateLiquidGlass();
          })();
        `}} />
      </body>
    </html>
  )
}
