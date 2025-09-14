"use client"

import { useEffect } from 'react'
import { usePage } from '@/app/contexts/PageContext'

export default function JsonLdWebsite() {
  const { currentPage } = usePage()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = 'https://nomad403.com'
      
      // Données structurées par page
      const pageData = {
        home: {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": "NOMAD403",
          "alternateName": ["Nomad 403", "nomad-403"],
          "url": baseUrl,
          "description": "Freelance developer building custom web apps, mobile applications, and AI-powered tools",
          "jobTitle": "Web, Mobile & AI Developer",
          "knowsAbout": [
            "Web Development",
            "Mobile Development", 
            "AI Integration",
            "React",
            "Next.js",
            "TypeScript",
            "Kotlin",
            "Swift",
            "Azure OpenAI"
          ],
          "sameAs": [
            "https://linkedin.com/in/nomad403",
            "https://github.com/nomad403"
          ],
          "email": "nomad403@protonmail.com",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Paris",
            "addressCountry": "FR"
          }
        },
        projects: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "NOMAD403 - Portfolio Projects",
          "description": "Browse selected projects in web development, mobile apps, and AI solutions",
          "url": `${baseUrl}/projects`,
          "mainEntity": {
            "@type": "Person",
            "name": "NOMAD403"
          }
        },
        specialist: {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "name": "NOMAD403 - Skills & Expertise",
          "description": "Expertise in frontend, mobile development and AI integration",
          "url": `${baseUrl}/specialist`,
          "mainEntity": {
            "@type": "Person",
            "name": "NOMAD403"
          }
        },
        contact: {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "NOMAD403 - Contact",
          "description": "Get in touch to discuss your project",
          "url": `${baseUrl}/contact`,
          "mainEntity": {
            "@type": "Person",
            "name": "NOMAD403",
            "email": "nomad403@protonmail.com"
          }
        }
      }

      const currentData = pageData[currentPage as keyof typeof pageData] || pageData.home

      // Supprimer l'ancien JSON-LD s'il existe
      const existingScript = document.querySelector('script[type="application/ld+json"]')
      if (existingScript) {
        existingScript.remove()
      }

      // Créer le nouveau script JSON-LD
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.textContent = JSON.stringify(currentData, null, 2)
      document.head.appendChild(script)

      console.log('JsonLdWebsite: Updated structured data for', currentPage)
    }
  }, [currentPage])

  return null
}
