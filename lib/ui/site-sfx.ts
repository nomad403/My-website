/**
 * Sound design site — ticks de touche numérique, discrets / aigus / minimalistes.
 */

export type SiteSfxId =
  | "ui.tap"
  | "text.shuffle"
  | "text.resolve"
  | "panel.slide"
  | "panel.expand"
  | "panel.collapse"
  | "nav.page"
  | "demo.tick"
  | "demo.start"

export type SiteSfxOptions = {
  /** Durée du roulement (ms), alignée sur l’animation. */
  durationMs?: number
}

const STORAGE_KEY = "nomad403:sfx-muted"
const AUDIO_GATE_KEY = "nomad403:audio-gate-choice"
const MASTER = 0.8

export type AudioGateChoice = "pending" | "accepted" | "declined"

type MuteListener = (muted: boolean) => void

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
let backgroundMuted = false
let storageRead = false
let userGestureActivated = false
const muteListeners = new Set<MuteListener>()
const lastPlayedAt = new Map<SiteSfxId, number>()
let activeShuffleStop: (() => void) | null = null

function isMobileSfxDisabled() {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia?.("(max-width: 767px)")?.matches === true ||
    window.matchMedia?.("(pointer: coarse)")?.matches === true
  )
}

export function canUseSiteSfxOnThisDevice() {
  return !isMobileSfxDisabled()
}

export function activateSiteSfx() {
  if (!canUseSiteSfxOnThisDevice()) return
  userGestureActivated = true
  if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) {
    void ctx.resume().catch(() => undefined)
  }
}

function ensureMuteFromStorage() {
  if (storageRead || typeof window === "undefined") return
  storageRead = true
  try {
    muted = window.localStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    muted = false
  }
}

function ensureContext() {
  if (typeof window === "undefined") return null
  ensureMuteFromStorage()
  if (!canUseSiteSfxOnThisDevice()) return null
  if (!userGestureActivated) return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    masterGain = ctx.createGain()
    masterGain.gain.value = muted ? 0 : MASTER
    masterGain.connect(ctx.destination)
  }
  return ctx
}

/** Débloque réellement l’AudioContext (Chrome / Safari) uniquement après un vrai geste utilisateur. */
export async function unlockSiteSfx(): Promise<void> {
  if (!userGestureActivated) return
  const audio = ensureContext()
  if (!audio) return

  try {
    if (audio.state === "suspended" || audio.state === "interrupted") {
      await audio.resume()
    }
    const buffer = audio.createBuffer(1, 1, audio.sampleRate)
    const src = audio.createBufferSource()
    src.buffer = buffer
    src.connect(audio.destination)
    src.start(0)
  } catch {
    /* ignore */
  }
}

export function isSiteSfxMuted() {
  ensureMuteFromStorage()
  return muted
}

export function readAudioGateChoice(): AudioGateChoice {
  if (typeof window === "undefined") return "pending"

  try {
    const value = window.localStorage.getItem(AUDIO_GATE_KEY)
    if (value === "accepted" || value === "declined") return value
  } catch {
    // ignore
  }

  return "pending"
}

export function setAudioGateChoice(choice: AudioGateChoice) {
  if (typeof window === "undefined") return

  try {
    if (choice === "pending") {
      window.localStorage.removeItem(AUDIO_GATE_KEY)
      return
    }
    window.localStorage.setItem(AUDIO_GATE_KEY, choice)
  } catch {
    // ignore
  }
}

export function hasSiteSfxPermission() {
  ensureMuteFromStorage()
  return canUseSiteSfxOnThisDevice() && userGestureActivated && !muted
}

export function setSiteSfxMuted(next: boolean) {
  ensureMuteFromStorage()
  muted = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
  } catch {
    /* ignore */
  }

  if (masterGain && ctx) {
    const now = ctx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setValueAtTime(next || backgroundMuted ? 0 : MASTER, now)
  }

  if (next) {
    stopAmbientMix()
  } else {
    if (!canUseSiteSfxOnThisDevice()) {
      muted = true
      try {
        window.localStorage.setItem(STORAGE_KEY, "1")
      } catch {
        /* ignore */
      }
      muteListeners.forEach((listener) => listener(muted))
      return
    }

    activateSiteSfx()
    bindAmbientInteraction()

    if (backgroundMuted) {
      if (masterGain && ctx) {
        const now = ctx.currentTime
        masterGain.gain.cancelScheduledValues(now)
        masterGain.gain.setValueAtTime(0, now)
      }
      return
    }

    if (!ambientRuntime) {
      startAmbientMix()
    } else {
      resumeAmbientMix()
      if (!ambientLoopFrame) {
        animateAmbientMix()
      }
    }

    if (ctx && ctx.state === "suspended") {
      void unlockSiteSfx()
    }
  }

  muteListeners.forEach((listener) => listener(muted))
}

function applyBackgroundMuteState() {
  if (typeof document === "undefined") return

  const isHidden = document.visibilityState !== "visible"
  backgroundMuted = isHidden

  if (isHidden) {
    if (masterGain && ctx) {
      const now = ctx.currentTime
      masterGain.gain.cancelScheduledValues(now)
      masterGain.gain.setValueAtTime(0, now)
    }
    stopAmbientMix()
    return
  }

  if (!muted && userGestureActivated && masterGain && ctx) {
    const now = ctx.currentTime
    masterGain.gain.cancelScheduledValues(now)
    masterGain.gain.setValueAtTime(MASTER, now)
  }

  if (!muted && userGestureActivated) {
    bindAmbientInteraction()
    if (!ambientRuntime) {
      startAmbientMix()
    } else {
      resumeAmbientMix()
      if (!ambientLoopFrame) {
        animateAmbientMix()
      }
    }
  }
}

export function subscribeSiteSfxMute(listener: MuteListener) {
  muteListeners.add(listener)
  return () => {
    muteListeners.delete(listener)
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    applyBackgroundMuteState()
    if (document.visibilityState === "visible" && !muted && userGestureActivated) {
      bindAmbientInteraction()
      if (!ambientRuntime) {
        startAmbientMix()
      } else {
        resumeAmbientMix()
        if (!ambientLoopFrame) {
          animateAmbientMix()
        }
      }
    }
  })
}

function canPlay() {
  if (typeof window === "undefined") return false
  ensureMuteFromStorage()
  if (muted || !userGestureActivated || !canUseSiteSfxOnThisDevice()) return false
  return true
}

function throttle(id: SiteSfxId, minGapMs: number) {
  const now = performance.now()
  const prev = lastPlayedAt.get(id) ?? 0
  if (now - prev < minGapMs) return false
  lastPlayedAt.set(id, now)
  return true
}

function envGain(
  audio: AudioContext,
  destination: AudioNode,
  start: number,
  attack: number,
  sustain: number,
  release: number,
  peak: number,
) {
  const g = audio.createGain()
  const safePeak = Math.max(0.0002, peak)
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(safePeak, start + Math.max(0.001, attack))
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0002, safePeak * 0.45),
    start + attack + sustain,
  )
  g.gain.exponentialRampToValueAtTime(
    0.0001,
    start + attack + sustain + Math.max(0.006, release),
  )
  g.connect(destination)
  return g
}

/** Hauteurs discrètes type pad numérique / calculatrice. */
const DIGITAL_KEY_FREQS = [
  880, 988, 1047, 1175, 1319, 1397, 1568, 1760, 1976,
]

/** Micro-tick touche numérique — square quantifié, sec, chip. */
function digitalKey(
  audio: AudioContext,
  dest: AudioNode,
  start: number,
  peak = 0.016,
) {
  const freq =
    DIGITAL_KEY_FREQS[Math.floor(Math.random() * DIGITAL_KEY_FREQS.length)]!

  // Square = signature digitale ; lowpass léger pour rester agréable.
  const osc = audio.createOscillator()
  osc.type = "square"
  osc.frequency.setValueAtTime(freq, start)

  const toneFilter = audio.createBiquadFilter()
  toneFilter.type = "lowpass"
  toneFilter.frequency.setValueAtTime(3200, start)
  toneFilter.Q.setValueAtTime(0.7, start)

  const g = envGain(audio, dest, start, 0.0008, 0.003, 0.01, peak)
  osc.connect(toneFilter)
  toneFilter.connect(g)
  osc.start(start)
  osc.stop(start + 0.022)

  // Micro clic digital (impulsion haute, très courte).
  const click = audio.createOscillator()
  click.type = "square"
  click.frequency.setValueAtTime(freq * 2.5, start)
  const clickG = envGain(audio, dest, start, 0.0004, 0.0015, 0.006, peak * 0.35)
  click.connect(clickG)
  click.start(start)
  click.stop(start + 0.012)
}

/**
 * Roulement de ticks numériques — discret, syncé sur la durée visuelle.
 * Phase scramble denser, restore plus aéré, fade bus doux.
 */
function playDigitalKeyRoll(
  audio: AudioContext,
  dest: AudioNode,
  durationMs: number,
  gain = 1,
) {
  activeShuffleStop?.()

  const start = audio.currentTime + 0.01
  const dur = Math.max(0.28, durationMs / 1000)
  const ratioA = 0.4
  const peakBus = Math.max(0.035, Math.min(0.7, gain * 0.7))

  const bus = audio.createGain()
  bus.gain.setValueAtTime(0.0001, start)
  bus.gain.exponentialRampToValueAtTime(
    peakBus,
    start + Math.min(0.08, dur * 0.12),
  )
  bus.gain.setValueAtTime(peakBus, start + dur * 0.7)
  bus.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.96)

  // Bande « chip » : médium clair, sans sibilance.
  const hipass = audio.createBiquadFilter()
  hipass.type = "highpass"
  hipass.frequency.setValueAtTime(500, start)
  hipass.Q.setValueAtTime(0.5, start)
  const lowpass = audio.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.setValueAtTime(4800, start)
  lowpass.Q.setValueAtTime(0.5, start)
  bus.connect(hipass)
  hipass.connect(lowpass)
  lowpass.connect(dest)

  let stopped = false
  activeShuffleStop = () => {
    if (stopped) return
    stopped = true
    const now = audio.currentTime
    try {
      bus.gain.cancelScheduledValues(now)
      bus.gain.setTargetAtTime(0.0001, now, 0.035)
    } catch {
      /* ignore */
    }
  }

  let t = start
  const end = start + dur * 0.9
  while (t < end) {
    const p = (t - start) / dur
    const inScramble = p < ratioA
    // Aligné sur le visuel : dense pendant le scramble, plus lent en restore.
    const dens = inScramble ? 0.042 : 0.062 + (p - ratioA) * 0.07
    const jitter = (Math.random() - 0.5) * dens * 0.5
    digitalKey(audio, bus, t + jitter, 0.009 + Math.random() * 0.0045)
    t += dens * (0.9 + Math.random() * 0.25)
  }
}

function playPatch(id: SiteSfxId, options?: SiteSfxOptions) {
  const audio = ensureContext()
  if (!audio || !masterGain) return

  const t = audio.currentTime + 0.012
  const bus = masterGain

  switch (id) {
    case "ui.tap":
      digitalKey(audio, bus, t, 0.023)
      break
    case "text.shuffle":
      // Désactivé — à remplacer plus tard.
      break
    case "text.resolve":
      break
    case "panel.slide":
      playDigitalKeyRoll(audio, bus, options?.durationMs ?? 240)
      break
    case "panel.expand":
      playDigitalKeyRoll(audio, bus, options?.durationMs ?? 200)
      break
    case "panel.collapse":
      playDigitalKeyRoll(audio, bus, options?.durationMs ?? 180)
      break
    case "nav.page":
      playDigitalKeyRoll(audio, bus, options?.durationMs ?? 300)
      break
    case "demo.tick":
      digitalKey(audio, bus, t, 0.02)
      break
    case "demo.start":
      playDigitalKeyRoll(audio, bus, options?.durationMs ?? 450)
      break
  }
}

const THROTTLE_MS: Partial<Record<SiteSfxId, number>> = {
  "ui.tap": 40,
  "text.shuffle": 100,
  "text.resolve": 140,
  "panel.slide": 200,
  "panel.expand": 100,
  "panel.collapse": 100,
  "nav.page": 300,
  "demo.tick": 70,
  "demo.start": 400,
}

const AMBIENT_TRACKS = [
  {
    id: "zen",
    src: "/sfx/leberch-zen-587818.mp3",
    baseVolume: 0.12,
    baseRate: 1,
    basePan: 0,
  },
  {
    id: "garden",
    src: "/sfx/leberch-zen-garden-587946.mp3",
    baseVolume: 0.09,
    baseRate: 0.96,
    basePan: 0.18,
  },
] as const

type AmbientTrackRuntime = {
  id: (typeof AMBIENT_TRACKS)[number]["id"]
  audio: HTMLAudioElement
  baseVolume: number
  baseRate: number
  basePan: number
  targetVolume: number
  targetRate: number
}

let ambientRuntime: AmbientTrackRuntime[] | null = null
let ambientLoopFrame = 0
let ambientInteractionsBound = false
let ambientActivationBound = false
let ambientRetryTimer: number | null = null
let lastPointerPosition = { x: 0, y: 0 }
let pointerEnergy = 0
let pointerPitchBias = 0

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t
}

function updateAmbientTargets() {
  if (!ambientRuntime) return

  const pitchEnergy = clamp(pointerEnergy, 0, 1)
  const pointerPitch = clamp(pointerPitchBias, -0.42, 0.48)

  ambientRuntime.forEach((track) => {
    const isZen = track.id === "zen"
    const pitchBoost =
      1 + pointerPitch * pitchEnergy + pitchEnergy * (isZen ? 0.5 : 0.38)
    const nextRate = clamp(track.baseRate * pitchBoost, 0.55, 1.72)
    const volumeBoost = pitchEnergy * (isZen ? 0.14 : 0.1)

    track.targetRate = nextRate
    track.targetVolume = clamp(track.baseVolume + volumeBoost, 0.06, 0.24)
  })
}

function animateAmbientMix() {
  if (!ambientRuntime) return

  ambientRuntime.forEach((track) => {
    const nextRate = lerp(track.audio.playbackRate, track.targetRate, 0.1)
    const nextVolume = lerp(track.audio.volume, track.targetVolume, 0.1)
    track.audio.playbackRate = nextRate
    track.audio.volume = nextVolume

    if (track.basePan !== 0) {
      track.audio.style.transform = `translateX(${(track.basePan * 8).toFixed(2)}px)`
    }
  })

  pointerEnergy = Math.max(0, pointerEnergy * 0.9)
  pointerPitchBias *= 0.92

  if (pointerEnergy < 0.01) {
    ambientRuntime.forEach((track) => {
      track.targetRate = track.baseRate
      track.targetVolume = track.baseVolume
      track.audio.playbackRate = lerp(track.audio.playbackRate, track.baseRate, 0.05)
      track.audio.volume = lerp(track.audio.volume, track.baseVolume, 0.05)
    })
  }

  ambientLoopFrame = window.requestAnimationFrame(animateAmbientMix)
}

function stopAmbientMix() {
  if (!ambientRuntime) return

  if (ambientLoopFrame) {
    window.cancelAnimationFrame(ambientLoopFrame)
    ambientLoopFrame = 0
  }

  ambientRuntime.forEach(({ audio }) => {
    try {
      if (!audio.paused) audio.pause()
      audio.volume = 0
    } catch {
      /* ignore */
    }
  })
}

function resumeAmbientMix() {
  if (!ambientRuntime || muted || typeof window === "undefined" || !userGestureActivated) return

  ambientRuntime.forEach(({ audio }) => {
    if (audio.paused) {
      void audio.play().catch(() => undefined)
    }
    audio.volume = Math.max(audio.volume, 0.0001)
  })
}

function startAmbientMix() {
  if (
    typeof window === "undefined" ||
    ambientRuntime ||
    muted ||
    !userGestureActivated ||
    !canUseSiteSfxOnThisDevice()
  ) {
    return
  }

  const audio = ensureContext()
  if (!audio) return

  ambientRuntime = AMBIENT_TRACKS.map((track) => {
    const element = new Audio(track.src)
    element.loop = true
    element.preload = "auto"
    element.volume = 0
    element.playbackRate = track.baseRate
    element.style.opacity = "0.96"
    element.style.filter = "saturate(1.12)"
    element.muted = false

    void element.play().catch(() => undefined)

    return {
      ...track,
      audio: element,
      targetVolume: track.baseVolume,
      targetRate: track.baseRate,
    }
  })

  updateAmbientTargets()
  animateAmbientMix()
}

function bindAmbientInteraction() {
  if (typeof window === "undefined" || ambientInteractionsBound) return
  ambientInteractionsBound = true

  const handlePointerMove = (event: PointerEvent) => {
    if (muted) return
    const dx = event.clientX - lastPointerPosition.x
    const dy = event.clientY - lastPointerPosition.y
    const speed = Math.hypot(dx, dy)
    const viewportHeight = Math.max(window.innerHeight, 1)
    const verticalPitch = 0.5 - event.clientY / viewportHeight
    const verticalMotion = clamp(-dy / 46, -1, 1)
    const intensity = clamp(speed / 46, 0, 1)
    pointerEnergy = clamp(pointerEnergy * 0.55 + intensity * 2.15, 0, 1)
    pointerPitchBias = clamp(
      pointerPitchBias * 0.58 + verticalPitch * 0.92 + verticalMotion * 0.28,
      -0.5,
      0.58,
    )
    lastPointerPosition = { x: event.clientX, y: event.clientY }

    if (!ambientRuntime) startAmbientMix()
    updateAmbientTargets()
  }

  const handleResume = () => {
    if (muted) return
    if (!ambientRuntime) {
      startAmbientMix()
      return
    }
    resumeAmbientMix()
  }

  window.addEventListener("pointermove", handlePointerMove, { passive: true })
  window.addEventListener("pageshow", handleResume, { passive: true })
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") handleResume()
  })
}

function scheduleAmbientRetry() {
  if (
    typeof window === "undefined" ||
    muted ||
    ambientRetryTimer !== null ||
    !canUseSiteSfxOnThisDevice()
  ) {
    return
  }

  const delays = [240, 700, 1500]
  let index = 0

  const run = () => {
    if (muted) return
    if (!ambientRuntime) {
      attemptAmbientStart()
    } else {
      resumeAmbientMix()
    }

    index += 1
    if (index < delays.length) {
      ambientRetryTimer = window.setTimeout(run, delays[index])
    } else {
      ambientRetryTimer = null
    }
  }

  ambientRetryTimer = window.setTimeout(run, delays[0])
}

function attemptAmbientStart() {
  if (
    typeof window === "undefined" ||
    muted ||
    !userGestureActivated ||
    !canUseSiteSfxOnThisDevice()
  ) {
    return
  }

  bindAmbientInteraction()

  void unlockSiteSfx().then(() => {
    if (muted) return
    if (!ambientRuntime) {
      startAmbientMix()
    } else {
      resumeAmbientMix()
    }
    scheduleAmbientRetry()
  })
}

export function startAmbientLoop() {
  if (
    typeof window === "undefined" ||
    muted ||
    ambientActivationBound ||
    !canUseSiteSfxOnThisDevice()
  ) {
    return
  }
  ambientActivationBound = true

  const startOnGesture = () => {
    activateSiteSfx()
    attemptAmbientStart()
  }

  window.addEventListener("pointerdown", startOnGesture, { passive: true })
  window.addEventListener("keydown", startOnGesture, { passive: true })
  window.addEventListener("touchstart", startOnGesture, { passive: true })
  window.addEventListener("click", startOnGesture, { passive: true })
  window.addEventListener("mousedown", startOnGesture, { passive: true })
}

export function playSiteSfx(id: SiteSfxId, options?: SiteSfxOptions) {
  if (!canPlay()) return
  const gap = THROTTLE_MS[id] ?? 80
  if (!throttle(id, gap)) return

  const audio = ensureContext()
  if (!audio) return

  const run = () => {
    if (!canPlay()) return
    if (audio.state !== "running") return
    playPatch(id, options)
  }

  if (audio.state === "suspended") {
    if (!userGestureActivated) return
    void audio
      .resume()
      .then(() => {
        run()
        bindAmbientInteraction()
        startAmbientMix()
        resumeAmbientMix()
      })
      .catch(() => undefined)
    return
  }

  bindAmbientInteraction()
  if (userGestureActivated) {
    startAmbientMix()
    resumeAmbientMix()
  }
  run()
}
