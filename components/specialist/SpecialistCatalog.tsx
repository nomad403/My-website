"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  pickLocalized,
  SPECIALIST_CATALOG,
  type SpecialistLang,
} from "@/lib/specialist/specialist-catalog"
import SpecialistServiceRow from "@/components/specialist/SpecialistServiceRow"
import ShuffleText from "@/components/ascii/ShuffleText"
import ShuffleDualLines from "@/components/ascii/ShuffleDualLines"
import { useDemoStoryOptional } from "@/contexts/DemoStoryContext"
import { DEMO_HOLD_MS, DEMO_SHUFFLE_MS } from "@/lib/demo/script"

interface SpecialistCatalogProps {
  lang: SpecialistLang
}

export default function SpecialistCatalog({ lang }: SpecialistCatalogProps) {
  const { t } = useLanguage()
  const demoStory = useDemoStoryOptional()
  const [activeService, setActiveService] = useState<string | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (!demoStory) return
    setActiveService(demoStory.specialistServiceId)
  }, [demoStory, demoStory?.specialistServiceId])

  const handleToggle = (serviceId: string) => {
    setActiveService((current) => (current === serviceId ? null : serviceId))
  }

  return (
    <div className="specialist-catalog absolute inset-0 z-10 w-full overflow-y-auto overscroll-contain lg:overflow-hidden">
      <div className="h-full min-h-full px-4 md:px-8">
        <div className="mx-auto grid min-h-full w-full max-w-7xl grid-cols-1 lg:h-full lg:grid-cols-12 lg:gap-x-10">
          <section className="min-w-0 text-black lg:col-span-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-8 xl:col-span-5 xl:pr-12">
            <div className="specialist-catalog__intro-inner pb-6 md:pb-8 lg:pb-28">
              <h1 className="font-kode text-[1.625rem] font-normal uppercase leading-[1.08] tracking-[0.08em] text-black md:text-[2.125rem] lg:text-[2.625rem]">
                {demoStory?.playing && demoStory.voice ? (
                  <ShuffleDualLines
                    lines={demoStory.voice.lines.map((primary, index) => ({
                      primary,
                      alternate:
                        demoStory.voice!.alternate[index] ?? primary,
                    }))}
                    playToken={demoStory.voiceToken}
                    enableHover={false}
                    holdDurationMs={DEMO_HOLD_MS}
                    shuffleDurationMs={DEMO_SHUFFLE_MS}
                    lineStaggerMs={0}
                    lineClassName="block overflow-hidden text-ellipsis whitespace-nowrap"
                  />
                ) : (
                  <ShuffleText
                    shuffleDuration={150}
                    letterDelay={12}
                    enableHover={!reducedMotion && !demoStory?.playing}
                  >
                    {t("specialist.title")}
                  </ShuffleText>
                )}
              </h1>
              <p className="mt-2 font-kode text-[0.625rem] uppercase tracking-[0.12em] text-black/45 md:text-[0.8125rem]">
                {t("specialist.subtitle")}
              </p>
              <div className="mt-6 flex w-full max-w-[34rem] flex-col gap-5 text-left md:mt-8 md:gap-6">
                <p className="specialist-catalog__body specialist-catalog__lead font-home-title">
                  {t("specialist.intro")}
                </p>
                <p className="specialist-catalog__body font-home-title opacity-90">
                  {t("specialist.text1")}
                </p>
                <p className="specialist-catalog__body font-home-title opacity-90">
                  {t("specialist.text2")}
                </p>
              </div>
            </div>
          </section>

          <section className="specialist-catalog__list-pane relative min-h-0 min-w-0 lg:col-span-8 xl:col-span-7">
            <div className="specialist-catalog__scroller relative lg:absolute lg:inset-0 lg:overflow-y-auto lg:overscroll-contain">
              <div className="specialist-catalog__track space-y-14 pb-[max(7rem,18vh)] md:space-y-16 md:pb-[max(8rem,20vh)]">
                {SPECIALIST_CATALOG.map((category) => (
                  <div
                    key={category.id}
                    aria-labelledby={`specialist-cat-${category.id}`}
                  >
                    <div className="mb-5 md:mb-6">
                      <h2
                        id={`specialist-cat-${category.id}`}
                        className="font-kode text-[1rem] font-normal uppercase leading-[1.16] tracking-[0.1em] text-black md:text-[1.3125rem] lg:text-[1.625rem]"
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

                    <div className="border-y-2 border-black/30">
                      {category.services.map((service) => (
                        <SpecialistServiceRow
                          key={service.id}
                          service={service}
                          lang={lang}
                          isOpen={activeService === service.id}
                          onToggle={handleToggle}
                          reducedMotion={reducedMotion}
                          demoMode={Boolean(demoStory?.playing)}
                          demoFocusVoice={
                            demoStory?.playing &&
                            activeService === service.id
                              ? demoStory.focusVoice
                              : null
                          }
                          demoFocusVoiceToken={
                            demoStory?.focusVoiceToken ?? 0
                          }
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
