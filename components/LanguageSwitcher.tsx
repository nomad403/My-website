"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { useBackground } from "@/app/contexts/BackgroundContext"

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  const { mode } = useBackground()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'fr', name: t('lang.fr'), flag: '🇫🇷' },
    { code: 'en', name: t('lang.en'), flag: '🇺🇸' }
  ]

  const currentLang = languages.find(lang => lang.code === language)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
          mode === 'night' 
            ? 'text-white hover:text-cyan-400 hover:bg-white/10' 
            : 'text-black hover:text-cyan-400 hover:bg-black/10'
        }`}
        title={t('lang.switch')}
      >
        <span className="text-sm font-jetbrains uppercase tracking-wider">
          {currentLang?.code}
        </span>
        <motion.svg
          className="w-4 h-4"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-full right-0 mt-2 py-2 rounded-lg shadow-lg border ${
              mode === 'night' 
                ? 'bg-black/90 backdrop-blur-sm border-white/20' 
                : 'bg-white/90 backdrop-blur-sm border-black/20'
            }`}
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as 'fr' | 'en')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left transition-all duration-200 ${
                  language === lang.code
                    ? (mode === 'night' ? 'text-cyan-400 bg-white/10' : 'text-cyan-400 bg-black/10')
                    : (mode === 'night' ? 'text-white hover:text-cyan-400 hover:bg-white/5' : 'text-black hover:text-cyan-400 hover:bg-black/5')
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-jetbrains">{lang.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
