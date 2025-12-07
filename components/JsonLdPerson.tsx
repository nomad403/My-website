"use client"

import { useEffect } from "react"

export default function JsonLdPerson() {
  useEffect(() => {
    // Vérifier si le JSON-LD existe déjà
    const existingScript = document.querySelector('script[type="application/ld+json"]')
    if (existingScript) {
      existingScript.remove()
    }

    // Créer le JSON-LD pour Person
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": "NOMAD403",
      "jobTitle": "Web, Mobile & AI Developer",
      "description": "Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.",
      "url": "https://www.nomad403.com",
      "sameAs": [
        "https://www.linkedin.com/in/glenn-richard/",
        "https://github.com/nomad403",
        "https://x.com/_nomad_403"
      ],
      "knowsAbout": [
        "Web Development",
        "Mobile Development", 
        "AI Integration",
        "React",
        "Next.js",
        "TypeScript",
        "iOS Development",
        "Android Development"
      ],
      "hasOccupation": {
        "@type": "Occupation",
        "name": "Freelance Developer",
        "description": "Specialized in web, mobile and AI development"
      }
    }

    // Créer et ajouter le script
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(jsonLd)
    document.head.appendChild(script)

    // Cleanup
    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [])

  return null
}
