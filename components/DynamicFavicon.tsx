"use client"

import { useEffect } from 'react'
import { useBackground } from '@/app/contexts/BackgroundContext'

export default function DynamicFavicon() {
  const { mode } = useBackground() // 'day' | 'night'

  useEffect(() => {
    const el = document.getElementById('app-favicon') as HTMLLinkElement | null
    if (!el) {
      console.warn('DynamicFavicon: app-favicon element not found')
      return
    }

    // Choix des fichiers (ATTENTION: favicon-black.ico = icône blanche, favicon-white.ico = icône noire)
    // Mode day = icône noire = favicon-white.ico, Mode night = icône blanche = favicon-black.ico
    const file = mode === 'day' ? '/favicon-white.ico' : '/favicon-black.ico'
    const nextHref = `${file}?v=${Date.now()}`

    console.log('DynamicFavicon: Mode changed to', mode, 'Setting favicon to', file)

    // Si déjà bon, ne rien faire
    if (el.href.endsWith(file) || el.href.includes(file + '?')) {
      console.log('DynamicFavicon: Favicon already correct, skipping update')
      return
    }

    // Mettre à jour + remonter en fin de <head> (certains moteurs utilisent le dernier <link rel="icon">)
    el.href = nextHref
    document.head.appendChild(el)
    console.log('DynamicFavicon: Updated favicon to', nextHref)

    // (Optionnel) Synchroniser l'apple-touch-icon si tu veux qu'il suive aussi
    const apple = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null
    if (apple) {
      const png = file.replace('.ico', '.png')
      apple.href = `${png}?v=${Date.now()}`
      console.log('DynamicFavicon: Updated apple-touch-icon to', apple.href)
    }

    // Exposer une fonction de test globale pour debug
    if (typeof window !== 'undefined') {
      (window as any).testFavicon = () => {
        console.log('Testing favicon change...')
        const link = document.getElementById('app-favicon')
        if (link) {
          const expectedFile = mode === 'day' ? '/favicon-white.ico' : '/favicon-black.ico'
          link.href = expectedFile + '?v=' + Date.now()
          document.head.appendChild(link)
          console.log('Favicon changed to:', link.href)
        }
      }
    }
  }, [mode])

  return null
}
