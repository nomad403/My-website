"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  pickLocalized,
  type SpecialistLang,
  type SpecialistService,
} from "@/lib/specialist-catalog"
import ShuffleText from "@/components/ShuffleText"

interface SpecialistServiceRowProps {
  service: SpecialistService
  lang: SpecialistLang
  isOpen: boolean
  onToggle: (id: string) => void
  reducedMotion: boolean
}

export default function SpecialistServiceRow({
  service,
  lang,
  isOpen,
  onToggle,
  reducedMotion,
}: SpecialistServiceRowProps) {
  const title = pickLocalized(service.title, lang)
  const description = pickLocalized(service.description, lang)
  const panelId = `specialist-service-${service.id}`

  return (
    <div className="border-t border-black/15 first:border-t-0">
      <div
        className={`px-2 transition-all duration-300 ${
          isOpen
            ? "specialist-service-glass"
            : "specialist-service-glass specialist-service-glass--idle"
        }`}
      >
        <button
          type="button"
          className={`group flex w-full items-center justify-between gap-4 py-3.5 text-left transition-colors duration-200 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:py-4 ${
            isOpen ? "text-cyan-600" : ""
          }`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(service.id)}
        >
          <ShuffleText
            className={`font-kode text-sm font-normal group-hover:text-inherit md:text-base ${
              isOpen ? "text-cyan-600" : "text-black/90"
            }`}
            shuffleDuration={150}
            letterDelay={12}
            enableHover={!reducedMotion}
          >
            {title}
          </ShuffleText>
          <span
            className={`font-kode shrink-0 text-base font-light leading-none transition-colors duration-200 md:text-lg ${
              isOpen
                ? "text-cyan-600"
                : "text-black/70 group-hover:text-cyan-600"
            }`}
            aria-hidden="true"
          >
            {isOpen ? "×" : "+"}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={panelId}
              role="region"
              aria-label={title}
              initial={reducedMotion ? false : { height: 0, opacity: 0, y: -4 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={
                reducedMotion
                  ? { height: 0, opacity: 0 }
                  : { height: 0, opacity: 0, y: -4 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden"
            >
              <p className="specialist-catalog__service-body max-w-xl pb-4 pr-10 font-home-title text-black/70">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
