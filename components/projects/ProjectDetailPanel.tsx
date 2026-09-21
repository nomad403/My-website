"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { ProjectItem, ProjectLang } from "@/lib/projects/project-items"
import { projectCopy } from "@/lib/projects/project-items"
import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import type { DemoVoice } from "@/lib/demo/script"
import { DEMO_HOLD_MS, DEMO_SHUFFLE_MS } from "@/lib/demo/script"
import { playSiteSfx } from "@/lib/ui/site-sfx"

interface ProjectDetailPanelProps {
  item: ProjectItem | null
  lang: ProjectLang
  viewLabel: string
  demoVoice?: DemoVoice | null
  demoVoiceToken?: number
}

const PANEL_EASE = [0.22, 1, 0.36, 1] as const

export default function ProjectDetailPanel({
  item,
  lang,
  viewLabel,
  demoVoice = null,
  demoVoiceToken = 0,
}: ProjectDetailPanelProps) {
  useEffect(() => {
    if (!demoVoice || !item) return
    playSiteSfx("panel.slide")
  }, [demoVoiceToken, demoVoice, item?.id])

  if (!item) return null

  const isDemo = Boolean(demoVoice)
  const eyebrow = isDemo
    ? (demoVoice?.detailEyebrow ?? projectCopy(item.description, lang))
    : projectCopy(item.description, lang)
  const summary = isDemo
    ? (demoVoice?.detailSummary ?? projectCopy(item.summary, lang))
    : projectCopy(item.summary, lang)

  return (
    <aside
      className={`project-detail-panel pointer-events-none${
        isDemo ? " project-detail-panel--demo" : ""
      }`}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={
            isDemo
              ? `demo-${item.id}-${demoVoiceToken}`
              : `item-${item.id}`
          }
          className="project-detail-panel__inner pointer-events-auto"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{
            opacity: { duration: 0.42, ease: PANEL_EASE },
            y: { duration: 0.38, ease: PANEL_EASE },
          }}
        >
          {eyebrow ? (
            <p className="project-detail-panel__eyebrow font-kode uppercase tracking-[0.12em]">
              {isDemo ? (
                <>
                  <span className="project-detail-panel__name-tag">
                    {item.name}
                  </span>
                  <span aria-hidden="true"> · </span>
                  {eyebrow}
                </>
              ) : (
                eyebrow
              )}
            </p>
          ) : null}

          <h2 className="project-detail-panel__title font-kode uppercase tracking-[0.08em]">
            {isDemo && demoVoice ? (
              <ShuffleDualLines
                lines={[
                  {
                    primary: demoVoice.lines[0] ?? item.name,
                    alternate:
                      demoVoice.alternate[0] ??
                      demoVoice.lines[0] ??
                      item.name,
                  },
                ]}
                playToken={demoVoiceToken}
                enableHover={false}
                holdDurationMs={DEMO_HOLD_MS}
                shuffleDurationMs={DEMO_SHUFFLE_MS}
                lineStaggerMs={0}
                lineClassName="block"
              />
            ) : (
              item.name
            )}
          </h2>

          {summary ? (
            <p className="project-detail-panel__summary font-home-title">
              {summary}
            </p>
          ) : null}

          {item.stack && item.stack.length > 0 ? (
            <ul className="project-detail-panel__stack font-kode">
              {item.stack.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
          ) : null}

          {item.url && !isDemo ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="project-detail-panel__link font-kode uppercase tracking-[0.12em]"
            >
              {viewLabel}
            </a>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </aside>
  )
}
