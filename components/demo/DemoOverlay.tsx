"use client"

import { AnimatePresence, motion } from "framer-motion"
import { DEMO_COPY, type DemoLang, type DemoScope } from "@/lib/demo/script"
import type { DemoPhase } from "@/hooks/useDemoPlayer"
import type { PageId } from "@/lib/home/page-config"
import { buildDemoHref } from "@/lib/demo/parse-params"

const PAGE_OPTIONS: Array<DemoScope> = [
  "all",
  "home",
  "projects",
  "specialist",
  "contact",
]

interface DemoOverlayProps {
  phase: DemoPhase
  countdownLabel: string | null
  lang: DemoLang
  scope: DemoScope
  canStart: boolean
  onStart: () => void
  onScopeChange: (scope: DemoScope) => void
  onLangChange: (lang: DemoLang) => void
}

export default function DemoOverlay({
  phase,
  countdownLabel,
  lang,
  scope,
  canStart,
  onStart,
  onScopeChange,
  onLangChange,
}: DemoOverlayProps) {
  const copy = DEMO_COPY[lang]
  const idle = phase === "idle"

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      <AnimatePresence>
        {idle ? (
          <motion.div
            key="demo-launcher"
            className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-white/55 px-6 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
              <p className="font-kode text-[0.625rem] uppercase tracking-[0.14em] text-black/45">
                /demo
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {PAGE_OPTIONS.map((option) => {
                  const label =
                    option === "all"
                      ? copy.scopeAll
                      : copy.pages[option as PageId]
                  const active = scope === option
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onScopeChange(option)}
                      className={`font-kode rounded-full border px-3 py-1.5 text-[0.625rem] uppercase tracking-[0.12em] transition-colors ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-black/20 bg-white/70 text-black/70 hover:border-black/45"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 font-kode text-[0.625rem] uppercase tracking-[0.14em]">
                {(["fr", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onLangChange(code)}
                    className={`px-2 py-1 transition-colors ${
                      lang === code
                        ? "text-black"
                        : "text-black/35 hover:text-black/70"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!canStart}
                onClick={onStart}
                className="font-kode min-w-[10rem] rounded-full border border-black bg-black px-8 py-3 text-[0.8125rem] uppercase tracking-[0.12em] text-white transition-opacity disabled:cursor-wait disabled:opacity-40"
              >
                {copy.launch}
              </button>

              <p className="max-w-xs font-home-title text-base leading-[1.62] text-black/55">
                {copy.launchHint}
              </p>

              <p className="font-kode text-[0.625rem] uppercase tracking-[0.12em] text-black/30">
                {buildDemoHref(scope, lang)}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {countdownLabel ? (
          <motion.div
            key={`cd-${countdownLabel}`}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="font-kode text-[4.25rem] leading-none text-black/80 md:text-[5.5rem]">
              {countdownLabel}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
