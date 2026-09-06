"use client"

import SpecialistCatalog from "@/components/SpecialistCatalog"
import { useLanguage } from "@/app/contexts/LanguageContext"
import type { SpecialistLang } from "@/lib/specialist-catalog"

export default function SpecialistPageContent() {
  const { language } = useLanguage()
  const lang = (language === "en" ? "en" : "fr") as SpecialistLang

  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <SpecialistCatalog lang={lang} />

      <div className="sr-only">
        <p>
          Catalogue d&apos;offres Nomad403 : développement web, applications
          mobiles, automatisation, intelligence artificielle et conseil
          technique pour startups, studios créatifs et entreprises.
        </p>
        <p>
          Univers WEB : site vitrine, page d&apos;atterrissage, e-commerce,
          application web, outil métier, tableau de bord, refonte, reprise de
          projet, intégration API, maintenance et évolution.
        </p>
        <p>
          Univers MOBILE : applications iOS et Android, application métier,
          MVP, prototype, refonte, reprise, intégration API, fonctionnalités
          natives, publication, maintenance et évolution.
        </p>
        <p>
          Univers AUTOMATISATION : audit de processus, automatisation métier,
          e-mails, documents, extraction de données, synchronisation
          d&apos;outils, orchestration API, supervision, maintenance et
          évolution.
        </p>
        <p>
          Univers IA : cadrage, intégration, assistant métier, analyse,
          classification, extraction, RAG, génération, synthèse, prototype,
          reprise, optimisation et maintenance.
        </p>
        <p>
          Univers CONSEIL : audit technique, architecture, cadrage, choix
          technologique, souveraineté numérique, maîtrise des données,
          confidentialité dès la conception, accompagnement RGPD technique,
          documentation et étude de faisabilité.
        </p>
      </div>
    </div>
  )
}
