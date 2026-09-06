"use client"

import { AnimatePresence, motion } from "framer-motion"
import type { ProjectItem, ProjectLang } from "@/lib/project-items"
import { projectCopy } from "@/lib/project-items"

interface ProjectDetailPanelProps {
  item: ProjectItem | null
  lang: ProjectLang
  viewLabel: string
}

const PANEL_EASE = [0.22, 1, 0.36, 1] as const

export default function ProjectDetailPanel({
  item,
  lang,
  viewLabel,
}: ProjectDetailPanelProps) {
  if (!item) return null

  const description = projectCopy(item.description, lang)
  const summary = projectCopy(item.summary, lang)

  return (
    <aside className="project-detail-panel pointer-events-none" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          className="project-detail-panel__inner pointer-events-auto"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{
            opacity: { duration: 0.42, ease: PANEL_EASE },
            y: { duration: 0.38, ease: PANEL_EASE },
          }}
        >
          {description ? (
            <p className="project-detail-panel__eyebrow font-kode uppercase tracking-[0.18em]">
              {description}
            </p>
          ) : null}
          <h2 className="project-detail-panel__title font-kode uppercase tracking-[0.12em]">
            {item.name}
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
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="project-detail-panel__link font-kode uppercase tracking-[0.16em]"
            >
              {viewLabel}
            </a>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </aside>
  )
}
