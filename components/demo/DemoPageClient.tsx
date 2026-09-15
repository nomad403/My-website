"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import HomePageClient, {
  type DemoNavigator,
} from "@/app/HomePageClient"
import DemoOverlay from "@/components/demo/DemoOverlay"
import DemoPointerDriver from "@/components/demo/DemoPointerDriver"
import { useDemoPlayer } from "@/hooks/useDemoPlayer"
import { useLanguage } from "@/contexts/LanguageContext"
import {
  DemoStoryProvider,
  useDemoStory,
} from "@/contexts/DemoStoryContext"
import {
  buildDemoHref,
  demoScopeToInitialPage,
} from "@/lib/demo/parse-params"
import type { DemoLang, DemoScope } from "@/lib/demo/script"

interface DemoPageClientProps {
  initialScope: DemoScope
  initialLang: DemoLang
}

function DemoPageInner({ initialScope, initialLang }: DemoPageClientProps) {
  const router = useRouter()
  const { setLanguage, language } = useLanguage()
  const story = useDemoStory()
  const [scope, setScope] = useState<DemoScope>(initialScope)
  const [lang, setLang] = useState<DemoLang>(initialLang)
  const [navigatorApi, setNavigatorApi] = useState<DemoNavigator | null>(null)

  const initialPage = useMemo(() => demoScopeToInitialPage(scope), [scope])

  useEffect(() => {
    setLanguage(lang)
  }, [lang, setLanguage])

  const syncUrl = useCallback(
    (nextScope: DemoScope, nextLang: DemoLang) => {
      router.replace(buildDemoHref(nextScope, nextLang), { scroll: false })
    },
    [router],
  )

  const handleScopeChange = (next: DemoScope) => {
    setScope(next)
    syncUrl(next, lang)
  }

  const handleLangChange = (next: DemoLang) => {
    setLang(next)
    syncUrl(scope, next)
  }

  const onDemoNavigatorReady = useCallback((nav: DemoNavigator) => {
    setNavigatorApi(nav)
  }, [])

  const { phase, countdownLabel, start } = useDemoPlayer({
    scope,
    lang,
    navigator: navigatorApi,
    story,
    enabled: true,
  })

  return (
    <>
      <DemoPointerDriver active={phase === "playing"} />
      <HomePageClient
        key={`${initialPage}-${lang}`}
        initialPage={initialPage}
        demoMode
        onDemoNavigatorReady={onDemoNavigatorReady}
      />
      <DemoOverlay
        phase={phase}
        countdownLabel={countdownLabel}
        lang={language === "en" ? "en" : "fr"}
        scope={scope}
        canStart={Boolean(navigatorApi && story)}
        onStart={start}
        onScopeChange={handleScopeChange}
        onLangChange={handleLangChange}
      />
    </>
  )
}

export default function DemoPageClient(props: DemoPageClientProps) {
  return (
    <DemoStoryProvider>
      <DemoPageInner {...props} />
    </DemoStoryProvider>
  )
}
