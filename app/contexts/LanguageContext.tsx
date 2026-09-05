"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Language = 'fr' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isLanguageReady: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('fr')
  const [isLanguageReady, setIsLanguageReady] = useState(false)

  // Charger la langue sauvegardée ou détecter la langue du navigateur au démarrage
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const savedLang = localStorage.getItem('nomad403-language') as Language
    if (savedLang && ['fr', 'en'].includes(savedLang)) {
      // Utiliser la langue sauvegardée
      setLanguage(savedLang)
    } else {
      // Détecter la langue du navigateur
      const browserLang = navigator.language.split('-')[0] // 'en-US' -> 'en'
      const supportedLangs: Language[] = ['fr', 'en']
      
      if (supportedLangs.includes(browserLang as Language)) {
        setLanguage(browserLang as Language)
      } else {
        // Fallback vers français par défaut
        setLanguage('fr')
      }
    }
    
    // Marquer la langue comme prête après la détection
    setIsLanguageReady(true)
  }, [])

  // Sauvegarder la langue dans localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('nomad403-language', language)
  }, [language])

  // Fonction de traduction
  const t = (key: string): string => {
    const translations = {
      fr: {
        // Navigation
        'nav.home': 'ACCUEIL',
        'nav.projects': 'PROJETS',
        'nav.specialist': 'EXPERTISE',
        'nav.contact': 'CONTACT',
        
        // Home page
        'home.title': 'NOMAD403',
        'home.subtitle': "Bienvenue dans mon espace de création d'expérience, je suis Glenn, développeur et créateur d'expérience",
        'home.titleLine1': 'Développeur,',
        'home.titleLine2': " créateur d'expérience.",
        'home.titleAltLine1': 'Des idées,',
        'home.titleAltLine2': 'sans limites.',
        'home.brandAlt': 'bienvenu',
        'home.rotateHint': 'Inclinez votre téléphone',
        'home.description': 'Développeur freelance créant des applications web personnalisées, des applications mobiles et des outils alimentés par l\'IA. Explorez mon portfolio 3D interactif.',
        
        // Projects page
        'projects.title': 'Projets Portfolio',
        'projects.subtitle': 'Web, Mobile & IA',
        'projects.description': 'Parcourez les projets sélectionnés en développement web, applications mobiles et solutions IA. De qualité, évolutifs et conçus pour l\'impact.',
        'projects.view': 'Voir le projet',
        
        // Specialist page
        'specialist.title': 'Offres & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automation, AI, Consulting',
        'specialist.description': 'Catalogue des prestations Nomad403 : web, mobile, automatisation, intelligence artificielle et consulting technique.',
        'specialist.intro': 'Chaque projet est pour moi une exploration. L’esprit Nomad403 repose sur la curiosité, l’expérimentation et l’adaptation continue, avec une mission claire : créer des outils numériques modernes, rapides et alignés sur vos enjeux.',
        'specialist.text1': 'Je conçois des sites web sur mesure optimisés pour la performance et le SEO, des applications mobiles fiables et évolutives, ainsi que des solutions d’automatisation et d’IA capables de réduire les tâches répétitives.',
        'specialist.text2': 'Comprendre votre métier me permet de simplifier votre quotidien, d’améliorer vos processus et de transformer chaque défi en solution tangible et durable.',
        
        // Contact page
        'contact.title': "Lançons un projet ensemble.",
        'contact.success': "Message envoyé, je vous recontacte bientôt.",
        'contact.fields.name': 'VOTRE NOM',
        'contact.fields.firstname': 'VOTRE PRÉNOM',
        'contact.fields.contact': 'EMAIL OU TÉLÉPHONE',
        'contact.fields.message': 'VOTRE MESSAGE',
        'contact.placeholders.name': 'Entrez votre nom',
        'contact.placeholders.firstname': 'Entrez votre prénom',
        'contact.placeholders.contact': 'votre@email.com ou +1 234 567 8900',
        'contact.placeholders.message': 'Décrivez votre projet, vos besoins, budget et délais...',
        'contact.error': '❌ Erreur lors de l\'envoi du message. Veuillez réessayer.',
        
        // Social
        'social.email': 'nomad403@protonmail.com',
        
        // Language switcher
        'lang.switch': 'Changer de langue',
        'lang.fr': 'Français',
        'lang.en': 'English',
      },
      en: {
        // Navigation
        'nav.home': 'HOME',
        'nav.projects': 'PROJECTS',
        'nav.specialist': 'SPECIALIST',
        'nav.contact': 'CONTACT',
        
        // Home page
        'home.title': 'NOMAD403',
        'home.subtitle': "Welcome to my experience creation space, I'm Glenn, developer and experience creator",
        'home.titleLine1': 'Developer,',
        'home.titleLine2': ' experience creator.',
        'home.titleAltLine1': 'Ideas,',
        'home.titleAltLine2': 'without limits.',
        'home.brandAlt': 'welcome',
        'home.rotateHint': 'Rotate your phone',
        'home.description': 'Freelance developer building custom web apps, mobile applications, and AI-powered tools. Explore my interactive 3D portfolio.',
        
        // Projects page
        'projects.title': 'Portfolio Projects',
        'projects.subtitle': 'Web, Mobile & AI',
        'projects.description': 'Browse selected projects in web development, mobile apps, and AI solutions. High-quality, scalable, and designed for impact.',
        'projects.view': 'View project',
        
        // Specialist page
        'specialist.title': 'Services & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automation, AI, Consulting',
        'specialist.description': 'Nomad403 service catalog: web, mobile, automation, artificial intelligence, and technical consulting.',
        'specialist.intro': 'Every project is an exploration. The Nomad403 mindset blends curiosity, experimentation, and constant adaptation to build fast, modern tools that genuinely match your needs.',
        'specialist.text1': 'I craft custom websites optimized for performance and SEO, reliable and scalable mobile apps, plus automation and AI workflows that eliminate repetitive tasks.',
        'specialist.text2': 'By understanding your business, I simplify day-to-day operations, smooth out processes, and turn each challenge into something practical and lasting.',
        
        // Contact page
        'contact.title': "Let's kick off a project.",
        'contact.success': "Message sent, I'll get back to you soon.",
        'contact.fields.name': 'YOUR NAME',
        'contact.fields.firstname': 'YOUR FIRST NAME',
        'contact.fields.contact': 'EMAIL OR PHONE',
        'contact.fields.message': 'YOUR MESSAGE',
        'contact.placeholders.name': 'Enter your name',
        'contact.placeholders.firstname': 'Enter your first name',
        'contact.placeholders.contact': 'your@email.com or +1 234 567 8900',
        'contact.placeholders.message': 'Describe your project, needs, budget and timeline...',
        'contact.error': '❌ Error sending message. Please try again.',
        
        // Social
        'social.email': 'nomad403@protonmail.com',
        
        // Language switcher
        'lang.switch': 'Switch language',
        'lang.fr': 'Français',
        'lang.en': 'English',
      }
    }

    return translations[language][key as keyof typeof translations[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLanguageReady }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
