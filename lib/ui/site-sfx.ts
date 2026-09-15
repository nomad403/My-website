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
const MASTER = 1

type MuteListener = (muted: boolean) => void

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let muted = false
let storageRead = false
const muteListeners = new Set<MuteListener>()
const lastPlayedAt = new Map<SiteSfxId, number>()
let activeShuffleStop: (() => void) | null = null

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

/** Débloque réellement l’AudioContext (Chrome / Safari). */
export async function unlockSiteSfx(): Promise<void> {
  const audio = ensureContext()
  if (!audio) return
  try {
    if (audio.state === "suspended") await audio.resume()
    // Buffer silencieux : certains navigateurs exigent un start() dans le geste.
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
    masterGain.gain.setValueAtTime(next ? 0 : MASTER, now)
  }
  muteListeners.forEach((listener) => listener(muted))
  if (!next) {
    void unlockSiteSfx().then(() => {
      lastPlayedAt.delete("ui.tap")
      playSiteSfx("ui.tap")
    })
  }
}

export function subscribeSiteSfxMute(listener: MuteListener) {
  muteListeners.add(listener)
  return () => {
    muteListeners.delete(listener)
  }
}

function canPlay() {
  if (typeof window === "undefined") return false
  ensureMuteFromStorage()
  if (muted) return false
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
  const peakBus = Math.max(0.05, Math.min(1, gain))

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
    digitalKey(audio, bus, t + jitter, 0.014 + Math.random() * 0.006)
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
      digitalKey(audio, bus, t, 0.022)
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
    void audio
      .resume()
      .then(() => {
        run()
      })
      .catch(() => undefined)
    return
  }

  run()
}
