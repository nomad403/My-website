"use client"

import { useCallback, useMemo, useState } from "react"
import ProjectsScrollList, {
  type ProjectScrollItem,
} from "@/components/ProjectsScrollList"
import ProjectDetailPanel from "@/components/ProjectDetailPanel"
import { useLanguage } from "@/app/contexts/LanguageContext"
import { useMobileViewport } from "@/hooks/useMobileViewport"
import {
  PROJECT_ITEMS,
  projectCopy,
  type ProjectItem,
  type ProjectLang,
} from "@/lib/project-items"

function toScrollItem(item: ProjectItem, lang: ProjectLang): ProjectScrollItem {
  return {
    id: item.id,
    name: item.name,
    url: item.url,
    description: projectCopy(item.description, lang),
    summary: projectCopy(item.summary, lang),
    stack: item.stack,
  }
}

export default function ProjectsPageContent() {
  const { t, language } = useLanguage()
  const isMobile = useMobileViewport()
  const projectLang = (language === "en" ? "en" : "fr") as ProjectLang
  const scrollItems = useMemo(
    () => PROJECT_ITEMS.map((item) => toScrollItem(item, projectLang)),
    [projectLang],
  )
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(
    () => PROJECT_ITEMS[0] ?? null,
  )

  const handleActiveChange = useCallback((item: ProjectScrollItem) => {
    const full = PROJECT_ITEMS.find((entry) => entry.id === item.id) ?? null
    setActiveProject(full)
  }, [])

  return (
    <div className="absolute inset-0 h-full w-full overflow-x-clip overflow-y-hidden">
      <h1 className="sr-only">Projects — Nomad403 (Nomad 403)</h1>

      <ProjectsScrollList
        items={scrollItems}
        isMobile={isMobile}
        viewLabel={t("projects.view")}
        onActiveChange={handleActiveChange}
      />
      {!isMobile ? (
        <ProjectDetailPanel
          item={activeProject}
          lang={projectLang}
          viewLabel={t("projects.view")}
        />
      ) : null}

      <div className="sr-only">
        <p>
          Portfolio de projets développés par Nomad403, Nomad 403, nomad-403,
          développeur freelance spécialisé dans les solutions digitales pour
          startups, studios créatifs et entreprises tech. Découvrez des
          réalisations innovantes : applications mobiles natives, plateformes
          web performantes, intégrations d&apos;intelligence artificielle, et
          solutions d&apos;automatisation.
        </p>
        <p>
          Projets phares : Monday (application mobile avec IA pour
          l&apos;organisation du quotidien), TurnUpSphere (découverte musicale et
          interactions sociales), AutomatIA (automatisation e-mails et documents
          métier par IA), ras-energies (vitrine secteur énergie), Savage (site
          collectif Savage Block Party avec e-commerce), The Message (expérience
          web interactive et creative development). Chaque projet démontre
          l&apos;expertise technique et la créativité dans le développement
          d&apos;expériences utilisateur exceptionnelles.
        </p>
        <p>
          Technologies utilisées : Next.js, React, TypeScript, Tailwind CSS,
          Kotlin, Jetpack Compose, Swift, SwiftUI, Azure OpenAI, Power Automate,
          Three.js, React Three Fiber. Approche méthodologique : conception
          UX/UI, architecture scalable, développement agile, tests automatisés,
          déploiement continu.
        </p>
        <p>
          Services proposés : développement d&apos;applications web et mobiles
          sur mesure, intégration d&apos;intelligence artificielle, consulting
          technique, MVP et prototypage, refactoring et optimisation,
          maintenance et évolution. Partenaire de confiance pour les projets
          ambitieux nécessitant expertise technique et vision créative.
        </p>
        <p>
          Recherches associées : nomad403 portfolio, nomad 403 projets,
          nomad-403 github, nomad403 mobile app, nomad 403 web development,
          nomad-403 react projects, nomad403 kotlin, nomad 403 swift,
          nomad-403 typescript, nomad403 nextjs, nomad 403 ai projects,
          nomad-403 freelance work.
        </p>
      </div>
    </div>
  )
}
