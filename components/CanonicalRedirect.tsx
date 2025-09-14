"use client"

import { useEffect } from 'react'
import { usePage } from '@/app/contexts/PageContext'

export default function CanonicalRedirect() {
  const { currentPage } = usePage()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = 'https://nomad403.com'
      
      // URLs canoniques pour chaque page
      const canonicalUrls = {
        home: baseUrl,
        projects: `${baseUrl}/projects`,
        specialist: `${baseUrl}/specialist`,
        contact: `${baseUrl}/contact`
      }

      const canonicalUrl = canonicalUrls[currentPage as keyof typeof canonicalUrls]
      
      if (canonicalUrl) {
        // Mettre à jour l'URL dans l'historique sans recharger la page
        const currentUrl = window.location.href
        const expectedUrl = canonicalUrl + (window.location.search || '') + (window.location.hash || '')
        
        if (currentUrl !== expectedUrl) {
          // Mettre à jour l'URL sans recharger
          window.history.replaceState({}, '', expectedUrl)
          console.log('CanonicalRedirect: Updated URL to', expectedUrl)
        }
      }
    }
  }, [currentPage])

  return null
}
