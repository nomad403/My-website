"use client"

import { useEffect } from "react"

interface DynamicHeadProps {
  title: string
  description: string
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
  }, [title, description])

  return null
}
