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
        'nav.shop': 'SHOP',
        'nav.contact': 'CONTACT',
        
        // Home page
        'home.titleLine1': 'Développeur,',
        'home.titleLine2': "créateur d'expérience.",
        'home.titleAltLine1': 'Web, mobile,',
        'home.titleAltLine2': 'IA, automatisation.',
        'home.brandAlt': 'explorez',
        'home.rotateHintFr': 'Tournez votre téléphone',
        'home.rotateHintEn': 'Rotate your phone',
        
        // Projects page
        'projects.view': 'Voir le projet',
        
        // Specialist page
        'specialist.title': 'Offres & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automatisation, IA, Conseil, Sécurité',
        'specialist.intro': 'Un projet ne devrait jamais être limité par une manière de faire.',
        'specialist.text1': 'J’accompagne les entreprises sur des projets numériques aux périmètres variés, du web et du mobile à l’automatisation, l’intelligence artificielle, le conseil technique et la sécurité applicative.',
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
        'contact.placeholders.message': 'Parlez-moi de votre projet…',
        'contact.error': "Échec de l'envoi. Veuillez réessayer.",
        'contact.rateLimited': 'Trop de demandes. Réessayez plus tard.',
        'contact.validation.required': 'Ce champ est requis.',
        'contact.validation.nom_invalid': 'Utilisez un nom ou une structure valide.',
        'contact.validation.nom_too_short': 'Le nom est trop court.',
        'contact.validation.nom_too_long': 'Le nom est trop long.',
        'contact.validation.contact_invalid': 'Indiquez un e-mail ou un téléphone valide.',
        'contact.validation.contact_too_long': 'Le contact est trop long.',
        'contact.validation.message_too_short': 'Le message est trop court.',
        'contact.validation.message_too_long': 'Le message est trop long.',
        'contact.validation.message_invalid': 'Le message contient des éléments non autorisés.',
        'contact.actions.back': 'Retour',
        'contact.actions.next': 'Suivant',
        'contact.actions.send': 'Envoyer',
        'contact.actions.sending': 'Envoi…',

        'auth.verifyTitle': 'Connexion',
        'auth.verifyBody': 'Confirmez l’ouverture de votre session Nomad403. Le lien expire en 15 minutes.',
        'auth.verifyContinue': 'Continuer',
        'auth.verifyMissing': 'Ouvrez le lien reçu par e-mail.',
        'auth.verifyInvalid': 'Ce lien est invalide ou a déjà été utilisé.',
        'auth.verifyLimited': 'Trop de tentatives. Réessayez plus tard.',
        'auth.verifyUnavailable': 'La connexion est temporairement indisponible.',
        'auth.mfaTitle': 'Administration',
        'auth.mfaBody': 'Le second facteur applicatif est désactivé. L’accès admin est protégé par Cloudflare Zero Trust (Access), puis le lien magique ADMIN_EMAILS. Redirection vers /admin…',
        'auth.mfaContinue': 'Ouvrir l’administration',
        'auth.mfaStart': 'Générer le secret',
        'auth.mfaCode': 'Code à 6 chiffres ou code de secours',
        'auth.mfaConfirm': 'Vérifier',
        'auth.mfaRecovery': 'Codes de secours, à conserver hors ligne',
        'auth.mfaSecret': 'Clé à enregistrer',
        'auth.admin.title': 'Administration',
        'auth.admin.accounts': 'Comptes',
        'auth.admin.mrr': 'Récurrent mensuel théorique',
        'auth.admin.arr': 'Récurrent annuel théorique',
        'auth.admin.issued': 'Factures émises',
        'auth.admin.collected': 'Encaissements',
        'auth.admin.refunded': 'Remboursements',
        'auth.admin.unpaid': 'Impayés',
        'auth.error.auth_required': 'Authentification requise.',
        'auth.error.forbidden': 'Accès administrateur requis.',
        'auth.error.mfa_required': 'Second facteur requis.',
        'auth.error.mfa_enrollment_required': 'Activez le second facteur.',
        'auth.error.unavailable': 'Service temporairement indisponible.',
        
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
        'nav.shop': 'SHOP',
        'nav.contact': 'CONTACT',
        
        // Home page
        'home.titleLine1': 'Developer,',
        'home.titleLine2': 'experience creator.',
        'home.titleAltLine1': 'Web, mobile,',
        'home.titleAltLine2': 'AI, automation.',
        'home.brandAlt': 'explore',
        'home.rotateHintFr': 'Tournez votre téléphone',
        'home.rotateHintEn': 'Rotate your phone',
        
        // Projects page
        'projects.view': 'View project',
        
        // Specialist page
        'specialist.title': 'Services & Expertise',
        'specialist.subtitle': 'Web, Mobile, Automation, AI, Consulting, Security',
        'specialist.intro': 'A project should never be limited by a single way of doing things.',
        'specialist.text1': 'I support companies on digital projects with varied scopes — from web and mobile to automation, artificial intelligence, technical consulting, and application security.',
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
        'contact.placeholders.message': 'Tell me about your project…',
        'contact.error': 'Sending failed. Please try again.',
        'contact.rateLimited': 'Too many requests. Please try again later.',
        'contact.validation.required': 'This field is required.',
        'contact.validation.nom_invalid': 'Enter a valid name or company.',
        'contact.validation.nom_too_short': 'The name is too short.',
        'contact.validation.nom_too_long': 'The name is too long.',
        'contact.validation.contact_invalid': 'Enter a valid email or phone number.',
        'contact.validation.contact_too_long': 'The contact is too long.',
        'contact.validation.message_too_short': 'The message is too short.',
        'contact.validation.message_too_long': 'The message is too long.',
        'contact.validation.message_invalid': 'The message contains disallowed content.',
        'contact.actions.back': 'Back',
        'contact.actions.next': 'Next',
        'contact.actions.send': 'Send',
        'contact.actions.sending': 'Sending…',

        'auth.verifyTitle': 'Sign in',
        'auth.verifyBody': 'Confirm opening your Nomad403 session. The link expires in 15 minutes.',
        'auth.verifyContinue': 'Continue',
        'auth.verifyMissing': 'Open the link you received by email.',
        'auth.verifyInvalid': 'This link is invalid or has already been used.',
        'auth.verifyLimited': 'Too many attempts. Try again later.',
        'auth.verifyUnavailable': 'Sign-in is temporarily unavailable.',
        'auth.mfaTitle': 'Administration',
        'auth.mfaBody': 'App MFA is disabled. Admin access is protected by Cloudflare Zero Trust (Access), then the ADMIN_EMAILS magic link. Redirecting to /admin…',
        'auth.mfaContinue': 'Open administration',
        'auth.mfaStart': 'Generate secret',
        'auth.mfaCode': '6-digit code or recovery code',
        'auth.mfaConfirm': 'Verify',
        'auth.mfaRecovery': 'Recovery codes, to be stored offline',
        'auth.mfaSecret': 'Key to save',
        'auth.admin.title': 'Administration',
        'auth.admin.accounts': 'Accounts',
        'auth.admin.mrr': 'Theoretical monthly recurring',
        'auth.admin.arr': 'Theoretical annual recurring',
        'auth.admin.issued': 'Issued invoices',
        'auth.admin.collected': 'Cash collected',
        'auth.admin.refunded': 'Refunds',
        'auth.admin.unpaid': 'Unpaid',
        'auth.error.auth_required': 'Authentication required.',
        'auth.error.forbidden': 'Administrator access required.',
        'auth.error.mfa_required': 'Second factor required.',
        'auth.error.mfa_enrollment_required': 'Enable the second factor.',
        'auth.error.unavailable': 'Service temporarily unavailable.',
        
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
