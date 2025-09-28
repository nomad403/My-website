"use client"

import { useEffect } from 'react'
import { usePage } from '@/app/contexts/PageContext'

export default function CanonicalRedirect() {
  const { currentPage } = usePage()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Toujours utiliser la version canonique finale
        const baseUrl = 'https://www.nomad403.com'
        
        // URLs canoniques pour chaque page
        const canonicalUrls = {
          home: baseUrl,
          projects: `${baseUrl}/projects`,
          specialist: `${baseUrl}/specialist`,
          contact: `${baseUrl}/contact`
        }

        const canonicalUrl = canonicalUrls[currentPage as keyof typeof canonicalUrls]
        
        if (canonicalUrl) {
          // Vérifier si l'URL actuelle correspond à l'URL canonique
          const currentUrl = window.location.href
          const expectedPath = new URL(canonicalUrl).pathname + window.location.search + window.location.hash
          const currentPath = window.location.pathname + window.location.search + window.location.hash
          
          // Si on est sur www ou http, rediriger vers la version canonique
          if (window.location.hostname.startsWith('www.') || window.location.protocol === 'http:') {
            window.location.replace(canonicalUrl)
            return
          }
          
          // Si le path ne correspond pas, mettre à jour l'URL sans recharger
          if (expectedPath !== currentPath) {
            window.history.replaceState({}, '', expectedPath)
            console.log('CanonicalRedirect: Updated URL to', expectedPath)
          }
        }
      } catch (error) {
        console.warn('CanonicalRedirect: Error updating URL:', error)
      }
    }
  }, [currentPage])

  return null
}
