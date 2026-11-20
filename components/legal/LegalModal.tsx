"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import ShuffleText from "@/components/ascii/ShuffleText"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  LEGAL_EN,
  LEGAL_FR,
  type LegalSectionId,
} from "@/lib/legal/content"
import { playSiteSfx } from "@/lib/ui/site-sfx"

const SECTIONS: LegalSectionId[] = ["mentions", "privacy", "terms"]
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const

const LegalModalContext = createContext({
  open: false,
  openLegal: (_section?: LegalSectionId) => {},
  closeLegal: () => {},
})

export function useLegalModal() {
  return useContext(LegalModalContext)
}

export function LegalModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<LegalSectionId>("mentions")

  const openLegal = useCallback((next: LegalSectionId = "mentions") => {
    setSection(next)
    setOpen(true)
  }, [])

  const closeLegal = useCallback(() => setOpen(false), [])

  return (
    <LegalModalContext.Provider value={{ open, openLegal, closeLegal }}>
      {children}
      <LegalModalShell
        open={open}
        section={section}
        onSection={setSection}
        onClose={closeLegal}
      />
    </LegalModalContext.Provider>
  )
}

function LegalModalShell({
  open,
  section,
  onSection,
  onClose,
}: {
  open: boolean
  section: LegalSectionId
  onSection: (id: LegalSectionId) => void
  onClose: () => void
}) {
  const { language } = useLanguage()
  const copy = language === "en" ? LEGAL_EN : LEGAL_FR
  const [titleShuffleKey, setTitleShuffleKey] = useState(0)
  const [slideDir, setSlideDir] = useState(1)
  const [reducedMotion, setReducedMotion] = useState(false)
  const sectionRef = useRef(section)
  sectionRef.current = section

  const active = useMemo(
    () => copy.sections.find((item) => item.id === section) ?? copy.sections[0],
    [copy.sections, section],
  )

  const hasPending = active.blocks.some((block) =>
    block.fields?.some((field) => field.pending),
  )

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!open) return
    if (!reducedMotion) {
      setTitleShuffleKey((key) => key + 1)
      playSiteSfx("panel.slide", { durationMs: 280 })
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose, reducedMotion])

  const changeSection = useCallback(
    (next: LegalSectionId) => {
      if (next === sectionRef.current) return
      const from = SECTIONS.indexOf(sectionRef.current)
      const to = SECTIONS.indexOf(next)
      setSlideDir(to >= from ? 1 : -1)
      onSection(next)
      if (!reducedMotion) {
        setTitleShuffleKey((key) => key + 1)
        playSiteSfx("panel.slide", { durationMs: 280 })
      }
    },
    [onSection, reducedMotion],
  )

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="legal-overlay"
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/25 p-3 sm:items-center sm:p-6"
          role="presentation"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? undefined : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.22, ease: SLIDE_EASE }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={active.nav}
            className="flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col overflow-hidden border border-black bg-white shadow-[0_20px_48px_rgba(0,0,0,0.12)]"
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: reducedMotion ? 0 : 0.34, ease: SLIDE_EASE }}
          >
            <div className="sticky top-0 z-20 shrink-0 border-b border-black bg-white">
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 md:px-5 md:py-3">
                <h2 className="font-electric-blue text-[1.375rem] font-normal lowercase leading-[0.95] tracking-[0.02em] text-black md:text-[1.625rem]">
                  <ShuffleText
                    shuffleKey={titleShuffleKey}
                    enableHover={false}
                    shuffleDuration={150}
                    letterDelay={12}
                    totalDuration={900}
                  >
                    {active.nav.toLowerCase()}
                  </ShuffleText>
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="font-kode text-[0.625rem] font-medium uppercase tracking-[0.14em] text-black/45 transition-colors hover:text-black"
                  aria-label={copy.close}
                >
                  <ShuffleText
                    shuffleDuration={150}
                    letterDelay={12}
                    enableHover={!reducedMotion}
                    totalDuration={700}
                  >
                    {copy.close}
                  </ShuffleText>
                </button>
              </div>
              <nav aria-label={language === "en" ? "Legal sections" : "Sections légales"}>
                <ul className="flex min-h-10 items-stretch border-t border-black">
                  {SECTIONS.map((id) => {
                    const item = copy.sections.find((entry) => entry.id === id)
                    if (!item) return null
                    const isActive = id === active.id
                    return (
                      <li key={id} className="flex flex-1 border-r border-black last:border-r-0">
                        <button
                          type="button"
                          onClick={() => changeSection(id)}
                          aria-current={isActive ? "page" : undefined}
                          className={[
                            "flex h-full min-h-10 w-full items-center justify-center px-2 font-kode text-[0.5625rem] uppercase tracking-[0.12em] transition-colors md:text-[0.625rem]",
                            isActive
                              ? "bg-cyan-50/80 font-medium text-cyan-700"
                              : "font-normal text-black/50 hover:bg-black/[0.04] hover:text-black",
                          ].join(" ")}
                        >
                          {item.nav}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait" initial={false} custom={slideDir}>
                <motion.div
                  key={active.id}
                  custom={slideDir}
                  variants={{
                    enter: (dir: number) =>
                      reducedMotion
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: dir * 18 },
                    center: { opacity: 1, y: 0 },
                    leave: (dir: number) =>
                      reducedMotion
                        ? { opacity: 0, y: 0 }
                        : { opacity: 0, y: dir * -14 },
                  }}
                  initial="enter"
                  animate="center"
                  exit="leave"
                  transition={{
                    duration: reducedMotion ? 0 : 0.32,
                    ease: SLIDE_EASE,
                  }}
                  className="max-h-[min(calc(88dvh-7.5rem),32.5rem)] overflow-y-auto overscroll-contain px-4 py-5 md:px-5 md:py-6"
                >
                  <div className="space-y-9">
                    {active.blocks.map((block) => (
                      <section key={block.title}>
                        <h3 className="font-kode text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-black md:text-[0.75rem]">
                          {block.title}
                        </h3>

                        {block.fields ? (
                          <dl className="mt-3.5 divide-y divide-black/10 border-y border-black/10">
                            {block.fields.map((field) => (
                              <div
                                key={field.label}
                                className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5 sm:grid-cols-[6.75rem_1fr]"
                              >
                                <dt className="font-kode text-[0.5625rem] font-normal uppercase tracking-[0.12em] text-black/40">
                                  {field.label}
                                </dt>
                                <dd
                                  className={[
                                    "font-home-title text-[0.875rem] font-normal leading-[1.5] md:text-[0.9375rem]",
                                    field.pending ? "font-light text-black/35" : "text-black/85",
                                  ].join(" ")}
                                >
                                  {field.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : null}

                        {block.body ? (
                          <ul className="mt-3.5 space-y-2.5">
                            {block.body.map((line) => (
                              <li
                                key={line}
                                className="font-home-title text-[0.875rem] font-light leading-[1.55] text-black/70 md:text-[0.9375rem]"
                              >
                                {line}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    ))}
                  </div>

                  {hasPending ? (
                    <p className="mt-9 border-t border-black/10 pt-4 font-kode text-[0.5625rem] font-normal uppercase tracking-[0.1em] text-black/35">
                      {copy.pendingNote}
                    </p>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
