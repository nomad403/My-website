"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
  const [activeCategoryId, setActiveCategoryId] = useState(SPECIALIST_CATALOG[0]?.id ?? "web")
  const [titleShuffleKey, setTitleShuffleKey] = useState(0)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map())
  const snapLockRef = useRef(false)
  const activeCategoryRef = useRef(activeCategoryId)

  activeCategoryRef.current = activeCategoryId

  const activeCategory =
    SPECIALIST_CATALOG.find((category) => category.id === activeCategoryId) ??
    SPECIALIST_CATALOG[0]
  const activeTitle = activeCategory
    ? pickLocalized(activeCategory.title, lang)
    : ""

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

  const setCategory = useCallback((categoryId: string, shuffle = true) => {
    if (!categoryId || categoryId === activeCategoryRef.current) return
    activeCategoryRef.current = categoryId
    setActiveCategoryId(categoryId)
    if (shuffle) setTitleShuffleKey((key) => key + 1)
  }, [])

  const scrollToCategory = useCallback(
    (categoryId: string) => {
      const block = blockRefs.current.get(categoryId)
      const scroller = scrollerRef.current
      if (!block || !scroller) return
      snapLockRef.current = true
      setCategory(categoryId)
      scroller.scrollTo({
        top: block.offsetTop,
        behavior: reducedMotion ? "auto" : "smooth",
      })
      window.setTimeout(() => {
        snapLockRef.current = false
      }, reducedMotion ? 50 : 520)
    },
    [reducedMotion, setCategory],
  )

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (snapLockRef.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const categoryId = (visible?.target as HTMLElement | undefined)?.dataset
          .categoryId
        if (categoryId) setCategory(categoryId)
      },
      {
        root: scroller,
        threshold: [0.35, 0.55, 0.75],
      },
    )

    blockRefs.current.forEach((block) => observer.observe(block))
    return () => observer.disconnect()
  }, [setCategory])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller || reducedMotion) return

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 8) return
      if (snapLockRef.current) {
        event.preventDefault()
        return
      }

      const categoryId = activeCategoryRef.current
      const block = blockRefs.current.get(categoryId)
      if (!block) return

      const viewTop = scroller.scrollTop
      const viewBottom = viewTop + scroller.clientHeight
      const blockTop = block.offsetTop
      const blockBottom = blockTop + block.offsetHeight
      const atStart = viewTop <= blockTop + 4
      const atEnd = viewBottom >= blockBottom - 4
      const direction = event.deltaY > 0 ? 1 : -1

      // Inside a tall block: keep native scroll until the edge.
      if (direction > 0 && !atEnd) return
      if (direction < 0 && !atStart) return

      const index = SPECIALIST_CATALOG.findIndex((category) => category.id === categoryId)
      if (index < 0) return
      const next = SPECIALIST_CATALOG[index + direction]
      if (!next) return

      event.preventDefault()
      scrollToCategory(next.id)
    }

    scroller.addEventListener("wheel", onWheel, { passive: false })
    return () => scroller.removeEventListener("wheel", onWheel)
  }, [reducedMotion, scrollToCategory])

  const handleToggle = (serviceId: string) => {
    setActiveService((current) => (current === serviceId ? null : serviceId))
  }

  const registerBlock = (categoryId: string, node: HTMLDivElement | null) => {
    if (node) blockRefs.current.set(categoryId, node)
    else blockRefs.current.delete(categoryId)
  }

  return (
    <div className="specialist-catalog absolute inset-0 z-10 w-full overflow-y-auto overscroll-contain lg:overflow-hidden">
      <div className="site-grid h-full min-h-full">
        <div className="site-grid-inner grid min-h-full grid-cols-1 lg:h-full lg:grid-cols-12 lg:gap-x-10">
          <section className="specialist-catalog__intro min-w-0 text-black lg:col-span-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-8 xl:col-span-5 xl:pr-12">
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

          <section className="specialist-catalog__list-pane relative min-h-0 min-w-0 pb-[max(5rem,12vh)] lg:col-span-8 xl:col-span-7">
            <div className="specialist-catalog__frame relative flex h-[min(62dvh,32rem)] min-h-[20rem] w-full flex-col overflow-hidden border border-black bg-white/88 lg:h-full lg:min-h-0 lg:max-h-full">
              <div className="specialist-catalog__frame-header relative z-20 shrink-0 border-b border-black bg-white px-4 py-2.5 md:px-5 md:py-3">
                <h2 className="font-electric-blue text-[1.375rem] font-normal lowercase leading-[0.95] tracking-[0.02em] text-black md:text-[1.625rem] lg:text-[1.875rem]">
                  <ShuffleText
                    key={`${activeCategoryId}-${lang}`}
                    shuffleKey={titleShuffleKey}
                    enableHover={false}
                    shuffleDuration={150}
                    letterDelay={12}
                    totalDuration={900}
                  >
                    {activeTitle.toLowerCase()}
                  </ShuffleText>
                </h2>
              </div>

              <div
                ref={scrollerRef}
                className="specialist-catalog__scroller specialist-catalog__frame-body relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
              >
                <div className="specialist-catalog__track">
                  {SPECIALIST_CATALOG.map((category) => (
                    <div
                      key={category.id}
                      ref={(node) => registerBlock(category.id, node)}
                      data-category-id={category.id}
                      aria-labelledby={`specialist-cat-${category.id}`}
                      className="specialist-catalog__block"
                    >
                      <h3
                        id={`specialist-cat-${category.id}`}
                        className="sr-only"
                      >
                        {pickLocalized(category.title, lang)}
                      </h3>

                      <div className="specialist-catalog__block-services">
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
                      <div className="specialist-catalog__block-gap" aria-hidden />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
