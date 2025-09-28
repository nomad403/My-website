"use client"

import { useEffect } from "react"

interface DynamicHeadProps {
  title: string
  description: string
}

// Fonction pour obtenir l'URL canonique finale
function getCanonicalUrl(pathname: string): string {
  const baseUrl = 'https://www.nomad403.com'
  
  // Normaliser le pathname
  const normalizedPath = pathname === '/' ? '' : pathname
  
  return `${baseUrl}${normalizedPath}`
}

export default function DynamicHead({ title, description }: DynamicHeadProps) {
  useEffect(() => {
    // Mettre à jour le titre de la page
    document.title = title
    
    // Mettre à jour la meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', description)
    } else {
      // Créer la meta description si elle n'existe pas
      const meta = document.createElement('meta')
      meta.name = 'description'
      meta.content = description
      document.head.appendChild(meta)
    }
    
    // Mettre à jour l'attribut lang de l'élément html
    document.documentElement.lang = title.includes('Développeur') || title.includes('Projets') || title.includes('Compétences') ? 'fr' : 'en'
    
    // Ajouter la balise canonical - toujours pointer vers la version finale
    const canonical = document.querySelector('link[rel="canonical"]')
    const canonicalUrl = getCanonicalUrl(window.location.pathname)
    if (canonical) {
      canonical.setAttribute('href', canonicalUrl)
    } else {
      const link = document.createElement('link')
      link.rel = 'canonical'
      link.href = canonicalUrl
      document.head.appendChild(link)
    }
  }, [title, description])

  return null
}
