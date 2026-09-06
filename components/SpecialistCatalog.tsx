"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/app/contexts/LanguageContext"
import {
  pickLocalized,
  SPECIALIST_CATALOG,
  type SpecialistLang,
} from "@/lib/specialist-catalog"
import SpecialistServiceRow from "@/components/SpecialistServiceRow"
import ShuffleText from "@/components/ShuffleText"

interface SpecialistCatalogProps {
  lang: SpecialistLang
}

export default function SpecialistCatalog({ lang }: SpecialistCatalogProps) {
  const { t } = useLanguage()
  const [activeService, setActiveService] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  const handleToggle = (serviceId: string) => {
    setActiveService((current) => (current === serviceId ? null : serviceId))
  }

  return (
    <div className="specialist-catalog absolute inset-0 z-10 w-full overflow-y-auto overscroll-contain lg:overflow-hidden">
      {/* Même axe que le header : padding externe puis max-w-7xl (sans px sur le shell) */}
      <div className="h-full min-h-full px-4 md:px-8">
        <div className="specialist-catalog__shell mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 lg:h-full lg:grid-cols-12 lg:gap-x-10">
          <section className="specialist-catalog__intro min-w-0 text-black lg:col-span-4 xl:col-span-5 lg:pr-8 xl:pr-12 lg:overflow-y-auto lg:overscroll-contain">
            <div className="specialist-catalog__intro-inner pb-6 md:pb-8 lg:pb-28">
              <h1 className="font-kode text-2xl font-medium uppercase leading-tight text-black md:text-3xl lg:text-4xl">
                <ShuffleText
                  shuffleDuration={150}
                  letterDelay={12}
                  enableHover={!reducedMotion}
                >
                  {t("specialist.title")}
                </ShuffleText>
              </h1>
              <p className="mt-2 font-kode text-xs uppercase text-black/45 md:text-sm">
                {t("specialist.subtitle")}
              </p>
              <p className="specialist-catalog__body mt-6 w-full max-w-[36rem] text-left font-home-title opacity-90 md:mt-8">
                {t("specialist.intro")}
                <br />
                <br />
                {t("specialist.text1")}
                <br />
                <br />
                {t("specialist.text2")}
              </p>
            </div>
          </section>

          <section className="specialist-catalog__list-pane relative min-h-0 min-w-0 lg:col-span-8 xl:col-span-7">
            <div className="specialist-catalog__scroller relative lg:absolute lg:inset-0 lg:overflow-y-auto lg:overscroll-contain custom-scrollbar">
              <div className="specialist-catalog__track space-y-14 pb-[max(7rem,18vh)] md:space-y-16 md:pb-[max(8rem,20vh)]">
                {SPECIALIST_CATALOG.map((category) => (
                  <div
                    key={category.id}
                    aria-labelledby={`specialist-cat-${category.id}`}
                  >
                    <div className="mb-5 md:mb-6">
                      <h2
                        id={`specialist-cat-${category.id}`}
                        className="font-kode text-xl font-medium uppercase tracking-[0.12em] text-black md:text-2xl lg:text-3xl"
                      >
                        <ShuffleText
                          shuffleDuration={150}
                          letterDelay={12}
                          enableHover={!reducedMotion}
                        >
                          {pickLocalized(category.title, lang)}
                        </ShuffleText>
                      </h2>
                    </div>

                    <div className="border-y border-black/15">
                      {category.services.map((service) => (
                        <SpecialistServiceRow
                          key={service.id}
                          service={service}
                          lang={lang}
                          isOpen={activeService === service.id}
                          onToggle={handleToggle}
                          reducedMotion={reducedMotion}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
