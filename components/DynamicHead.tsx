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
  }, [title, description])

  return null
}
