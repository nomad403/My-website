"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  DEMO_COUNTDOWN_STEP_MS,
  DEMO_PAGE_SETTLE_MS,
  getDemoBeats,
  type DemoBeat,
  type DemoLang,
  type DemoScope,
} from "@/lib/demo/script"
import type { DemoNavigator } from "@/app/HomePageClient"
import type { DemoStoryApi } from "@/contexts/DemoStoryContext"
import { playSiteSfx } from "@/lib/ui/site-sfx"

export type DemoPhase = "idle" | "countdown" | "playing"

type Options = {
  scope: DemoScope
  lang: DemoLang
  navigator: DemoNavigator | null
  story: DemoStoryApi | null
  enabled: boolean
}

export function useDemoPlayer({
  scope,
  lang,
  navigator,
  story,
  enabled,
}: Options) {
  const [phase, setPhase] = useState<DemoPhase>("idle")
  const [countdownLabel, setCountdownLabel] = useState<string | null>(null)

  const cancelledRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const navigatorRef = useRef(navigator)
  const storyRef = useRef(story)
  navigatorRef.current = navigator
  storyRef.current = story

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const wait = useCallback((ms: number) => {
    return new Promise<void>((resolve) => {
      const id = setTimeout(() => resolve(), ms)
      timersRef.current.push(id)
    })
  }, [])

  const runBeat = useCallback(
    async (beat: DemoBeat) => {
      const nav = navigatorRef.current
      const storyApi = storyRef.current
      if (cancelledRef.current) return

      switch (beat.type) {
        case "goto": {
          storyApi?.resetStory()
          nav?.goTo(beat.page)
          await wait(DEMO_PAGE_SETTLE_MS)
          break
        }
        case "wait": {
          await wait(beat.ms)
          break
        }
        case "speak": {
          storyApi?.speak(beat.voice, beat.target ?? "page")
          break
        }
        case "projects.focus": {
          storyApi?.focusProject(beat.index, beat.voice ?? null)
          break
        }
        case "specialist.open": {
          storyApi?.openSpecialistService(beat.serviceId, beat.voice ?? null)
          break
        }
        case "specialist.close": {
          storyApi?.openSpecialistService(null)
          break
        }
      }
    },
    [wait],
  )

  const playLoop = useCallback(
    async (beats: DemoBeat[]) => {
      if (!beats.length) return
      setPhase("playing")

      while (!cancelledRef.current) {
        storyRef.current?.resetStory()
        for (const beat of beats) {
          if (cancelledRef.current) return
          await runBeat(beat)
        }
      }
    },
    [runBeat],
  )

  const stop = useCallback(() => {
    cancelledRef.current = true
    clearTimers()
    storyRef.current?.setPlaying(false)
    storyRef.current?.resetStory()
    setPhase("idle")
    setCountdownLabel(null)
  }, [clearTimers])

  const start = useCallback(async () => {
    if (!enabled || !navigatorRef.current || !storyRef.current) return

    cancelledRef.current = false
    clearTimers()
    storyRef.current.resetStory()
    storyRef.current.setPlaying(true)
    setPhase("countdown")

    for (const step of ["3", "2", "1"]) {
      if (cancelledRef.current) return
      setCountdownLabel(step)
      playSiteSfx("demo.tick")
      await wait(DEMO_COUNTDOWN_STEP_MS)
    }
    setCountdownLabel(null)
    if (cancelledRef.current) return
    playSiteSfx("demo.start")

    await playLoop(getDemoBeats(scope, lang))
  }, [clearTimers, enabled, lang, playLoop, scope, wait])

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      clearTimers()
      storyRef.current?.setPlaying(false)
    }
  }, [clearTimers])

  return {
    phase,
    countdownLabel,
    start,
    stop,
  }
}
