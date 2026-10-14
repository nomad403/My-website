import type React from "react"
import type { Metadata } from "next"
import "../styles/globals.css"
import localFont from "next/font/local"
import ClientLayout from "@/components/chrome/ClientLayout"

const displayFont = localFont({
  src: "../public/fonts/ProFont.woff2",
  variable: "--font-enigma",
  display: "swap",
  preload: true,
  weight: "400",
  style: "normal",
})

export const metadata: Metadata = {
  title: "NOMAD403 - Web, Mobile & AI Developer",
  description: "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.",
  openGraph: {
    type: "website", url: "https://www.nomad403.com", siteName: "NOMAD403", locale: "fr_FR",
    title: "NOMAD403 - Web, Mobile & AI Developer",
    description: "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.",
    images: [{ url: "https://www.nomad403.com/preview.jpg", width: 1200, height: 630, type: "image/jpeg" }],
  },
  twitter: {
    card: "summary_large_image", site: "@nomad403", creator: "@nomad403",
    title: "NOMAD403 - Web, Mobile & AI Developer",
    description: "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.",
    images: [{ url: "https://www.nomad403.com/preview.jpg", alt: "NOMAD403 Portfolio - Interactive 3D Developer Showcase" }],
  },
  // icons: { ... }  // ⟵ Désactivé pour éviter les conflits avec DynamicFavicon
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Favicon statique pour Google (toujours présent) */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Variantes auto jour/nuit (sans conflit) */}
        <link rel="icon" href="/favicon-white.ico" type="image/x-icon" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon-black.ico" type="image/x-icon" media="(prefers-color-scheme: dark)" />

        {/* Apple & PWA */}
        <link rel="apple-touch-icon" href="/favicon-white.ico" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0b0b0f" />

        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="NOMAD403" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preload" href="/fonts/Geist/GeistMono-ExtraLight.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Electric_blue/ElectricBlueTrial-STAT-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Prevent duplicate content issues */}
        <meta name="googlebot" content="index, follow" />
        <meta name="bingbot" content="index, follow" />
      </head>
      <body className={`${displayFont.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
