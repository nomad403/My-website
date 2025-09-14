"use client"

import { useEffect } from 'react'
import { usePage } from '@/app/contexts/PageContext'

export default function DynamicSocialTags() {
  const { currentPage } = usePage()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const baseUrl = 'https://nomad403.com'
      
      // Métadonnées par page (pour les mises à jour dynamiques)
      const pageData = {
        home: {
          title: 'NOMAD403 - Web, Mobile & AI Developer',
          description: 'Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.',
          url: baseUrl,
          image: '/preview.jpg'
        },
        projects: {
          title: 'NOMAD403 - Portfolio Projects | Web, Mobile & AI',
          description: 'Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.',
          url: `${baseUrl}/projects`,
          image: '/preview.jpg'
        },
        specialist: {
          title: 'NOMAD403 - Skills & Expertise | Web, Mobile & AI',
          description: 'Expertise in frontend, mobile development (iOS & Android), and AI integration. Modern, scalable solutions tailored to your needs.',
          url: `${baseUrl}/specialist`,
          image: '/preview.jpg'
        },
        contact: {
          title: 'NOMAD403 - Contact | Hire a Web, Mobile & AI Developer',
          description: 'Get in touch to discuss your project. Available for freelance web, mobile, and AI development collaborations.',
          url: `${baseUrl}/contact`,
          image: '/preview.jpg'
        }
      }

      const currentData = pageData[currentPage as keyof typeof pageData] || pageData.home

      // Mettre à jour seulement le canonical (les autres balises sont statiques)
      const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
      if (canonical) {
        canonical.href = currentData.url
      }

      // Mettre à jour le titre de la page
      document.title = currentData.title

      console.log('DynamicSocialTags: Updated canonical and title for', currentPage, currentData.url)
    }
  }, [currentPage])

  return null
}
