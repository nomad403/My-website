"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  pickLocalized,
  type SpecialistLang,
  type SpecialistService,
} from "@/lib/specialist/specialist-catalog"
import ShuffleText from "@/components/ascii/ShuffleText"

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
    <div className="border-t-2 border-black/30 first:border-t-0">
      <div
        className={`px-2 transition-all duration-300 ${
          isOpen
            ? "specialist-service-glass"
            : "specialist-service-glass specialist-service-glass--idle"
        }`}
      >
        <button
          type="button"
          className={`group flex w-full items-center justify-between gap-4 pt-3.5 pb-2 text-left transition-colors duration-200 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:pt-4 md:pb-2 ${
            isOpen ? "text-cyan-600" : ""
          }`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(service.id)}
        >
          <ShuffleText
            className={`font-enigma text-[0.9375rem] font-normal uppercase tracking-[0.06em] group-hover:text-inherit md:text-[1.0625rem] ${
              isOpen ? "text-cyan-600" : "text-black"
            }`}
            shuffleDuration={150}
            letterDelay={12}
            enableHover={!reducedMotion}
          >
            {title}
          </ShuffleText>
          <motion.span
            className={`font-enigma inline-block shrink-0 origin-center text-xl font-normal leading-none md:text-2xl ${
              isOpen
                ? "text-cyan-600"
                : "text-black/55 group-hover:text-cyan-600"
            }`}
            aria-hidden="true"
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
            }
          >
            +
          </motion.span>
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
              <p className="specialist-catalog__service-body max-w-xl pb-3.5 pr-10 pt-0 font-home-title text-black/70">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
