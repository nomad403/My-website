"use client"

import { useEffect } from 'react'
import { usePage } from '@/app/contexts/PageContext'

export default function CanonicalRedirect() {
  const { currentPage } = usePage()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Utiliser l'origin actuel pour éviter les erreurs cross-origin
        const currentOrigin = window.location.origin
        const baseUrl = currentOrigin // Utiliser l'origin actuel (www ou non-www)
        
        // URLs canoniques pour chaque page (même origin)
        const canonicalUrls = {
          home: baseUrl,
          projects: `${baseUrl}/projects`,
          specialist: `${baseUrl}/specialist`,
          contact: `${baseUrl}/contact`
        }

        const canonicalUrl = canonicalUrls[currentPage as keyof typeof canonicalUrls]
        
        if (canonicalUrl) {
          const targetUrl = new URL(canonicalUrl)
          
          // Vérifier que l'origin est identique
          if (targetUrl.origin === window.location.origin) {
            const expectedPath = targetUrl.pathname + targetUrl.search + targetUrl.hash
            const currentPath = window.location.pathname + window.location.search + window.location.hash
            
            if (expectedPath !== currentPath) {
              // Mettre à jour l'URL sans recharger (même origin uniquement)
              window.history.replaceState({}, '', expectedPath)
              console.log('CanonicalRedirect: Updated URL to', expectedPath)
            }
          } else {
            console.log('CanonicalRedirect: Skipping cross-origin redirect from', window.location.origin, 'to', targetUrl.origin)
          }
        }
      } catch (error) {
        console.warn('CanonicalRedirect: Error updating URL:', error)
      }
    }
  }, [currentPage])

  return null
}
