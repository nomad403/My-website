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
        'home.titleLine1': 'Développez vos idées sans limites.',
        'home.titleAltLine1': 'Web, mobile, IA, automatisation.',
        'home.brandAlt': 'explorez',
        'home.rotateHintFr': 'Inclinez votre téléphone',
        'home.rotateHintEn': 'Rotate your phone',
        
        // Projects page
        'projects.view': 'Voir le projet',
        
        // Specialist page
        'specialist.title': 'Offres & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automatisation, IA, Conseil',
        'specialist.intro': 'Un projet ne devrait jamais être limité par une manière de faire.',
        'specialist.text1': 'J’accompagne les entreprises sur des projets numériques aux périmètres variés, du web et du mobile à l’automatisation, l’intelligence artificielle et la conception d’outils métier.',
        'specialist.text2': 'Mon approche est nomade. Je croise les disciplines et les expertises pour m’adapter au contexte, considérer le projet dans sa globalité et construire une réponse en phase avec ses enjeux.',
        
        // Contact page
        'contact.title': 'Une question ? Un projet ?',
        'contact.titleAlt': 'Donnons vie à vos idées.',
        'contact.success': 'Message envoyé.',
        'contact.fields.name': 'NOM / STRUCTURE',
        'contact.fields.contact': 'EMAIL OU TÉLÉPHONE',
        'contact.fields.message': 'VOTRE MESSAGE',
        'contact.placeholders.name': 'Nom ou structure',
        'contact.placeholders.contact': 'email@exemple.com ou +33 6 00 00 00 00',
        'contact.placeholders.message': 'Décrivez votre projet, vos besoins, budget et délais...',
        'contact.error': "Échec de l'envoi. Veuillez réessayer.",
        'contact.actions.back': 'Retour',
        'contact.actions.next': 'Suivant',
        'contact.actions.send': 'Envoyer',
        'contact.actions.sending': 'Envoi…',
        
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
        'home.titleLine1': 'Develop your ideas without limits.',
        'home.titleAltLine1': 'Web, mobile, AI, automation.',
        'home.brandAlt': 'explore',
        'home.rotateHintFr': 'Inclinez votre téléphone',
        'home.rotateHintEn': 'Rotate your phone',
        
        // Projects page
        'projects.view': 'View project',
        
        // Specialist page
        'specialist.title': 'Services & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automation, AI, Consulting',
        'specialist.intro': 'A project should never be limited by a single way of doing things.',
        'specialist.text1': 'I support companies on digital projects with varied scopes — from web and mobile to automation, artificial intelligence, and custom business tools.',
        'specialist.text2': 'My approach is nomadic. I cross disciplines and expertise to adapt to the context, consider the project as a whole, and build a response aligned with its stakes.',
        
        // Contact page
        'contact.title': 'A question? A project?',
        'contact.titleAlt': "Let's bring your ideas to life.",
        'contact.success': 'Message sent.',
        'contact.fields.name': 'NAME / COMPANY',
        'contact.fields.contact': 'EMAIL OR PHONE',
        'contact.fields.message': 'YOUR MESSAGE',
        'contact.placeholders.name': 'Name or company',
        'contact.placeholders.contact': 'email@example.com or +33 6 00 00 00 00',
        'contact.placeholders.message': 'Describe your project, needs, budget and timeline...',
        'contact.error': 'Sending failed. Please try again.',
        'contact.actions.back': 'Back',
        'contact.actions.next': 'Next',
        'contact.actions.send': 'Send',
        'contact.actions.sending': 'Sending…',
        
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
