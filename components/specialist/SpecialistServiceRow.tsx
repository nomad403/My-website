"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  pickLocalized,
  type SpecialistLang,
  type SpecialistService,
} from "@/lib/specialist/specialist-catalog"
import ShuffleText from "@/components/ascii/ShuffleText"
import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import type { DemoVoice } from "@/lib/demo/script"
import { DEMO_HOLD_MS, DEMO_SHUFFLE_MS } from "@/lib/demo/script"
import { playSiteSfx } from "@/lib/ui/site-sfx"

interface SpecialistServiceRowProps {
  service: SpecialistService
  lang: SpecialistLang
  isOpen: boolean
  onToggle: (id: string) => void
  reducedMotion: boolean
  /** Mode démo : pas de hover. */
  demoMode?: boolean
  /** Sujet narré à la place du titre du service. */
  demoFocusVoice?: DemoVoice | null
  demoFocusVoiceToken?: number
}

export default function SpecialistServiceRow({
  service,
  lang,
  isOpen,
  onToggle,
  reducedMotion,
  demoMode = false,
  demoFocusVoice = null,
  demoFocusVoiceToken = 0,
}: SpecialistServiceRowProps) {
  const title = pickLocalized(service.title, lang)
  const description = pickLocalized(service.description, lang)
  const panelId = `specialist-service-${service.id}`
  const rootRef = useRef<HTMLDivElement>(null)
  const showDemoSubject = Boolean(demoMode && isOpen && demoFocusVoice)

  useEffect(() => {
    if (!isOpen || !demoMode) return
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [isOpen, demoMode])

  return (
    <div
      ref={rootRef}
      className={`specialist-service-row border-t border-black/20 first:border-t-0 ${
        isOpen ? "specialist-service-row--open" : ""
      }`}
    >
      <div
        className={`transition-all duration-300 ${
          isOpen
            ? "specialist-service-glass specialist-service-glass--open"
            : "specialist-service-glass specialist-service-glass--idle"
        }`}
      >
        <button
          type="button"
          className={`group flex w-full items-center justify-between gap-3 px-4 py-1.5 text-left transition-colors duration-200 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent md:gap-4 md:px-5 md:py-2 ${
            isOpen ? "text-cyan-600" : "text-black"
          }`}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => {
            playSiteSfx(isOpen ? "panel.collapse" : "panel.expand")
            onToggle(service.id)
          }}
        >
          {showDemoSubject && demoFocusVoice ? (
            <ShuffleDualLines
              className={`specialist-service-row__title min-w-0 flex-1 font-enigma font-normal uppercase ${
                isOpen ? "text-cyan-600" : "text-black"
              }`}
              lines={[
                {
                  primary: demoFocusVoice.lines[0] ?? title,
                  alternate:
                    demoFocusVoice.alternate[0] ??
                    demoFocusVoice.lines[0] ??
                    title,
                },
              ]}
              playToken={demoFocusVoiceToken}
              enableHover={false}
              holdDurationMs={DEMO_HOLD_MS}
              shuffleDurationMs={DEMO_SHUFFLE_MS}
              lineStaggerMs={0}
              lineClassName="demo-focus-label block whitespace-nowrap overflow-hidden"
            />
          ) : (
            <ShuffleText
              className={`specialist-service-row__title min-w-0 flex-1 font-enigma font-normal uppercase group-hover:text-inherit ${
                isOpen ? "text-cyan-600" : "text-black"
              }`}
              shuffleDuration={150}
              letterDelay={12}
              enableHover={!reducedMotion && !demoMode}
              totalDuration={800}
            >
              {title}
            </ShuffleText>
          )}
          <motion.span
            className={`specialist-service-row__icon font-enigma inline-block shrink-0 origin-center font-normal leading-none ${
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
              <div className="specialist-service-branch px-4 pb-2.5 pt-0 md:px-5 md:pb-3">
                <span className="specialist-service-branch__mark font-kode" aria-hidden="true">
                  └─
                </span>
                <p className="specialist-catalog__service-body specialist-service-branch__text max-w-xl font-home-title text-cyan-700">
                  {description}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
