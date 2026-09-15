"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { DemoVoice, DemoVoiceTarget } from "@/lib/demo/script"

export type DemoStoryState = {
  playing: boolean
  /** Narration page (titres home / specialist / contact). */
  voice: DemoVoice | null
  voiceToken: number
  voiceTarget: DemoVoiceTarget
  /** Narration focus : remplace le nom projet / service. */
  focusVoice: DemoVoice | null
  focusVoiceToken: number
  projectFocusIndex: number | null
  specialistServiceId: string | null
}

type DemoStoryApi = DemoStoryState & {
  setPlaying: (playing: boolean) => void
  speak: (voice: DemoVoice, target?: DemoVoiceTarget) => void
  focusProject: (index: number | null, voice?: DemoVoice | null) => void
  openSpecialistService: (
    serviceId: string | null,
    voice?: DemoVoice | null,
  ) => void
  resetStory: () => void
}

export type { DemoStoryApi }

const INITIAL: DemoStoryState = {
  playing: false,
  voice: null,
  voiceToken: 0,
  voiceTarget: "page",
  focusVoice: null,
  focusVoiceToken: 0,
  projectFocusIndex: null,
  specialistServiceId: null,
}

const DemoStoryContext = createContext<DemoStoryApi | null>(null)

export function DemoStoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoStoryState>(INITIAL)

  const setPlaying = useCallback((playing: boolean) => {
    setState((prev) => ({ ...prev, playing }))
  }, [])

  const speak = useCallback((voice: DemoVoice, target: DemoVoiceTarget = "page") => {
    setState((prev) => {
      if (target === "focus") {
        return {
          ...prev,
          voiceTarget: "focus",
          focusVoice: voice,
          focusVoiceToken: prev.focusVoiceToken + 1,
        }
      }
      return {
        ...prev,
        voiceTarget: "page",
        voice,
        voiceToken: prev.voiceToken + 1,
      }
    })
  }, [])

  const focusProject = useCallback(
    (index: number | null, voice: DemoVoice | null = null) => {
      setState((prev) => ({
        ...prev,
        projectFocusIndex: index,
        ...(voice
          ? {
              voiceTarget: "focus" as const,
              focusVoice: voice,
              focusVoiceToken: prev.focusVoiceToken + 1,
            }
          : index == null
            ? { focusVoice: null }
            : {}),
      }))
    },
    [],
  )

  const openSpecialistService = useCallback(
    (serviceId: string | null, voice: DemoVoice | null = null) => {
      setState((prev) => ({
        ...prev,
        specialistServiceId: serviceId,
        ...(voice
          ? {
              voiceTarget: "focus" as const,
              focusVoice: voice,
              focusVoiceToken: prev.focusVoiceToken + 1,
            }
          : serviceId == null
            ? { focusVoice: null }
            : {}),
      }))
    },
    [],
  )

  const resetStory = useCallback(() => {
    setState((prev) => ({
      ...INITIAL,
      playing: prev.playing,
    }))
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      setPlaying,
      speak,
      focusProject,
      openSpecialistService,
      resetStory,
    }),
    [state, setPlaying, speak, focusProject, openSpecialistService, resetStory],
  )

  return (
    <DemoStoryContext.Provider value={value}>
      {children}
    </DemoStoryContext.Provider>
  )
}

export function useDemoStory() {
  return useContext(DemoStoryContext)
}

export function useDemoStoryOptional() {
  return useContext(DemoStoryContext)
}
