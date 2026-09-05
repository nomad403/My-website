"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  pickLocalized,
  type SpecialistLang,
  type SpecialistService,
} from "@/lib/specialist-catalog"

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
        className={`transition-colors duration-200 ${isOpen ? "bg-gray-100 px-2" : ""}`}
      >
        <button
          type="button"
          className={`group flex w-full items-center justify-between gap-4 py-3.5 md:py-4 text-left transition-colors duration-200 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
            isOpen ? "" : "px-2 hover:bg-gray-100"
          }`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(service.id)}
        >
        <span className="font-kode text-sm md:text-base font-normal text-black/90 group-hover:text-inherit">
          {title}
        </span>
        <span
          className="font-kode shrink-0 text-base md:text-lg font-light leading-none text-black/70 transition-transform duration-200 group-hover:text-inherit"
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
              animate={
                reducedMotion
                  ? { height: "auto", opacity: 1, y: 0 }
                  : { height: "auto", opacity: 1, y: 0 }
              }
              exit={
                reducedMotion
                  ? { height: 0, opacity: 0 }
                  : { height: 0, opacity: 0, y: -4 }
              }
              transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <p className="max-w-xl pb-4 pr-10 font-home-title text-sm md:text-[0.95rem] leading-relaxed text-black/70">
                {description}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
