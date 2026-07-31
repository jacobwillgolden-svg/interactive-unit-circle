/**
 * Graph-tied kit:
 *   perc  — Cymatics Terror samples (public/samples/)
 *   sin / cos / tan — Giant Steps shells on Analog_BD_Sin
 *
 *   Why Giant Steps (not a full 12-key CoF lap):
 *     Coltrane’s standard 16-bar form (Real Book) is the jazz-education gold
 *     standard for *partial* circle-of-fifths motion: each V7 → I is a fifth,
 *     while the three major key centres (B, G, E♭) sit a major third apart.
 *     One θ turn walks one chorus of chord changes.
 *
 *   Shell voicing (no 5th):
 *     sin → root · tan → 3rd · cos → 7th
 *
 *   Colour = CoF rainbow by chord root (reference wheel).
 *   Perc: sec=kick, csc=snare, cot=closed-hat
 *
 * Analog_BD_Sin: public/samples/wt/analog-bd-sin.wav
 */

// ——— Musical map: Giant Steps (partial CoF) ———

/** CoF generator (for rainbow index only): +7 semitones mod 12 */
export const FIFTH_GEN = 7

/**
 * Root near C3 so 3rd and 7th stack above cleanly.
 */
export const ARP_ROOT_BASE = 48 // C3
export const ARP_MIDI_MIN = ARP_ROOT_BASE
export const ARP_MIDI_MAX = ARP_ROOT_BASE + 11 + 11

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']

/**
 * Circle-of-fifths rainbow (outer major ring of the reference wheel).
 * Index = fifths index: C=0, G=1, D=2, A=3, E=4, B=5, F♯=6, C♯=7, G♯=8, D♯=9, A♯=10, F=11.
 */
export const COF_RAINBOW = [
  '#E53935', // 0  C   red
  '#FF7043', // 1  G   coral / orange-red
  '#FB8C00', // 2  D   orange
  '#FFB300', // 3  A   amber / gold
  '#FDD835', // 4  E   yellow
  '#9CCC65', // 5  B   lime
  '#43A047', // 6  F♯  green
  '#26A69A', // 7  C♯  teal
  '#1E88E5', // 8  G♯  blue
  '#3949AB', // 9  D♯  indigo
  '#8E24AA', // 10 A♯  purple
  '#EC407A', // 11 F   magenta / pink
]

/**
 * Giant Steps — standard 16-bar form (Real Book / Coltrane), expanded to one
 * entry per chord change. Matches common charts (e.g. solo piano arrangements
 * that label majors as “B / G / E♭” = maj7).
 *
 *   ||: Bmaj7  D7 | Gmaj7  B♭7 | E♭maj7     | Am7   D7  |
 *   |  Gmaj7  B♭7 | E♭maj7 F♯7 | Bmaj7      | Fm7   B♭7 |
 *   |  E♭maj7     | Am7   D7  | Gmaj7      | C♯m7  F♯7 |
 *   |  Bmaj7      | Fm7   B♭7 | E♭maj7     | C♯m7  F♯7 :||
 *
 * Key centres B · G · E♭ (major thirds). Each V7→I is a fifth.
 * One full θ revolution walks this chorus once.
 *
 * suffix '' for maj7 matches chart shorthand (B, G, E♭); audio still maj7 shell.
 */
export const GIANT_STEPS = [
  // bars 1–4
  { pc: 11, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // B
  { pc: 2, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // G
  { pc: 10, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // B♭7
  { pc: 3, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // E♭
  { pc: 9, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // Am7
  { pc: 2, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // D7
  // bars 5–8
  { pc: 7, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // G
  { pc: 10, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // B♭7
  { pc: 3, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // E♭
  { pc: 6, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // F♯7
  { pc: 11, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // B
  { pc: 5, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // Fm7
  { pc: 10, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // B♭7
  // bars 9–12
  { pc: 3, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // E♭
  { pc: 9, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // Am7
  { pc: 2, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // G
  { pc: 1, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // C♯m7
  { pc: 6, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // F♯7
  // bars 13–16
  { pc: 11, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // B
  { pc: 5, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // Fm7
  { pc: 10, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // B♭7
  { pc: 3, quality: 'maj7', third: 4, seventh: 11, suffix: '' }, // E♭
  { pc: 1, quality: 'm7', third: 3, seventh: 10, suffix: 'm7' }, // C♯m7
  { pc: 6, quality: 'dom7', third: 4, seventh: 10, suffix: '7' }, // F♯7
]

/** Stations per θ revolution (= length of active progression) */
export const ARP_STEPS_PER_REV = GIANT_STEPS.length

/** @deprecated alias — older Spectrum Cycle name */
export const SPECTRUM_CYCLE = GIANT_STEPS

/**
 * Index 0–11 on the circle of fifths for a pitch class (C=0, G=1, D=2, …).
 * @param {number} pc
 */
export function pitchClassToFifthsIndex(pc) {
  const p = ((Math.round(pc) % 12) + 12) % 12
  for (let i = 0; i < 12; i++) {
    if ((i * FIFTH_GEN) % 12 === p) return i
  }
  return 0
}

/** CoF / unit-circle sector angle (fifths index × 30°). */
export function fifthsUnitAngle(midiOrPc) {
  const pc = ((Math.round(midiOrPc) % 12) + 12) % 12
  return pitchClassToFifthsIndex(pc) * 30
}

export function chordToneUnitAngle(midi) {
  return fifthsUnitAngle(midi)
}

/**
 * Colour from the CoF rainbow wheel (by pitch class → fifths index).
 * @param {number} midi
 */
export function pitchToColor(midi) {
  if (midi == null || !Number.isFinite(midi)) return '#94a3b8'
  const pc = ((Math.round(midi) % 12) + 12) % 12
  const idx = pitchClassToFifthsIndex(pc)
  return COF_RAINBOW[idx] ?? '#94a3b8'
}

/**
 * Colour for the *root* of the chord at θ (whole shell shares key colour).
 * @param {number} angleDeg
 */
export function rootColorAtAngle(angleDeg) {
  return chordAtAngle(angleDeg).color
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

export function midiToName(midi) {
  if (midi == null || !Number.isFinite(midi)) return '—'
  const m = Math.round(midi)
  const pc = ((m % 12) + 12) % 12
  const oct = Math.floor(m / 12) - 1
  return `${NOTE_NAMES[pc]}${oct}`
}

export function midiToOctave(midi) {
  if (midi == null || !Number.isFinite(midi)) return null
  return Math.floor(Math.round(midi) / 12) - 1
}

/** θ → progression step (Giant Steps form) */
export function angleToStep(angleDeg) {
  const n = ARP_STEPS_PER_REV
  const t = ((angleDeg % 360) + 360) % 360
  return Math.floor((t / 360) * n) % n
}

/**
 * Giant Steps shell at θ (no perfect fifth in the voicing).
 *
 *   root / 3rd / 7th from GIANT_STEPS[step]
 *
 * @param {number} angleDeg
 */
export function chordAtAngle(angleDeg) {
  const step = angleToStep(angleDeg)
  const spec = GIANT_STEPS[step] ?? GIANT_STEPS[0]
  const rootPc = ((spec.pc % 12) + 12) % 12
  const rad = (angleDeg * Math.PI) / 180
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const thirdInt = spec.third
  const seventhInt = spec.seventh
  const root = ARP_ROOT_BASE + rootPc
  const third = root + thirdInt
  const seventh = root + seventhInt
  const fifthsIndex = pitchClassToFifthsIndex(rootPc)
  const rootName = NOTE_NAMES[rootPc]
  const chordSymbol = `${rootName}${spec.suffix}`

  return {
    step,
    rootPc,
    root,
    third,
    seventh,
    thirdInt,
    seventhInt,
    quality: spec.quality,
    suffix: spec.suffix,
    chordSymbol,
    fifthsIndex,
    unitDeg: fifthsIndex * 30,
    color: COF_RAINBOW[fifthsIndex],
    sin: s,
    cos: c,
  }
}

/**
 * @param {number} angleDeg
 * @param {'sin' | 'cos' | 'tan'} voice
 */
export function arpInfo(angleDeg, voice = 'sin') {
  const ch = chordAtAngle(angleDeg)
  const role =
    voice === 'tan' ? 'third' : voice === 'cos' ? 'seventh' : 'root'
  const midi =
    voice === 'tan' ? ch.third : voice === 'cos' ? ch.seventh : ch.root
  const pc = ((midi % 12) + 12) % 12
  // Whole shell paints with the *root* CoF rainbow colour (key colour of the station)
  const color = ch.color
  return {
    step: ch.step,
    midi,
    freq: midiToFreq(midi),
    name: midiToName(midi),
    color,
    role,
    quality: ch.quality,
    chordSymbol: ch.chordSymbol,
    root: ch.root,
    third: ch.third,
    seventh: ch.seventh,
    pitchClass: pc,
    fifthsIndex: ch.fifthsIndex,
    unitDeg: ch.unitDeg,
    rootUnitDeg: ch.unitDeg,
    octave: midiToOctave(midi),
  }
}

/** Root MIDI at progression step (for legacy helpers). */
export function stepToMidi(step) {
  const k = ((Math.floor(step) % ARP_STEPS_PER_REV) + ARP_STEPS_PER_REV) % ARP_STEPS_PER_REV
  const pc = ((GIANT_STEPS[k]?.pc ?? 0) % 12 + 12) % 12
  return ARP_ROOT_BASE + pc
}

// ——— Percussion samples ———

const SAMPLE_URLS = {
  kick: '/samples/kick.wav',
  snare: '/samples/snare.wav',
  /** Closed hat — cot roll (tan’s former drum) */
  hat: '/samples/hat.wav',
}

const WT_URL = '/samples/wt/analog-bd-sin.wav'
const SERUM_FRAME = 2048
const WT_MAX_HARMONICS = 48

const PERC_KEYS = ['sec', 'csc']
const PERC = {
  sec: { sample: 'kick', gain: 0.95 },
  csc: { sample: 'snare', gain: 0.85 },
}
const COOLDOWN = { sec: 0.12, csc: 0.12 }

// Cot closed-hat roll (former tan mapping)
const ROLL_MIN_HZ = 3
const ROLL_MAX_HZ = 32
const ROLL_ABS_FOR_MAX = 8

const ARP_GAIN = { sin: 0.24, tan: 0.18, cos: 0.16 }
const ARP_ATTACK = 0.01
const ARP_DECAY = 1.05
const ARP_MAX_VOICES = 12
/** Root → 3rd → 7th stagger so the shell reads as an arpeggio */
const SHELL_STAGGER = { sin: 0, tan: 0.045, cos: 0.09 }

let ctx = null

/** @type {Record<string, AudioBuffer | null>} */
const buffers = { kick: null, snare: null, hat: null }

/** @type {PeriodicWave | null} */
let bdSinWave = null
let bdSinWaves = /** @type {PeriodicWave[]} */ ([])

let loadPromise = null
let samplesReady = false
let tableReady = false

const valleyArmed = { sec: true, csc: true }
const coolUntil = { sec: 0, csc: 0 }
const rollNextAt = { cot: 0 }

/** Shared CoF step so the shell fires as one chord */
let lastChordStep = -1
/** @type {Record<'sin'|'cos'|'tan', ReturnType<typeof arpInfo> | null>} */
const lastArpNote = { sin: null, cos: null, tan: null }

let activeVoices = 0

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

// ——— Wavetable: Analog_BD_Sin → PeriodicWave ———

function frameToPeriodicWave(audio, samples) {
  const n = samples.length
  const maxH = Math.min(WT_MAX_HARMONICS, Math.floor(n / 2))
  const real = new Float32Array(maxH + 1)
  const imag = new Float32Array(maxH + 1)
  for (let k = 1; k <= maxH; k++) {
    let re = 0
    let im = 0
    const w = (2 * Math.PI * k) / n
    for (let t = 0; t < n; t++) {
      const a = w * t
      const s = samples[t]
      re += s * Math.cos(a)
      im -= s * Math.sin(a)
    }
    real[k] = re / n
    imag[k] = im / n
  }
  return audio.createPeriodicWave(real, imag, { disableNormalization: false })
}

function buildBdSinWaves(audio, buffer) {
  const ch = buffer.getChannelData(0)
  const frameCount = Math.max(1, Math.floor(ch.length / SERUM_FRAME))
  const waves = []
  for (let i = 0; i < frameCount; i++) {
    const samples = new Float32Array(SERUM_FRAME)
    samples.set(ch.subarray(i * SERUM_FRAME, (i + 1) * SERUM_FRAME))
    waves.push(frameToPeriodicWave(audio, samples))
  }
  return waves
}

async function decodeUrl(audio, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  const raw = await res.arrayBuffer()
  return audio.decodeAudioData(raw.slice(0))
}

function loadSamples() {
  if (samplesReady && tableReady) return Promise.resolve()
  if (loadPromise) return loadPromise
  const audio = ensureCtx()
  if (!audio) return Promise.resolve()

  loadPromise = (async () => {
    await Promise.all([
      ...Object.entries(SAMPLE_URLS).map(async ([key, url]) => {
        try {
          buffers[key] = await decodeUrl(audio, url)
        } catch (err) {
          console.warn('[trigMusic] failed to load', url, err)
          buffers[key] = null
        }
      }),
      (async () => {
        try {
          const buf = await decodeUrl(audio, WT_URL)
          bdSinWaves = buildBdSinWaves(audio, buf)
          bdSinWave = bdSinWaves[0] ?? null
          tableReady = !!bdSinWave
        } catch (err) {
          console.warn('[trigMusic] Analog_BD_Sin failed', err)
          bdSinWave = null
          bdSinWaves = []
          tableReady = false
        }
      })(),
    ])
    samplesReady = true
  })()
  return loadPromise
}

// ——— One-shot percussion ———

function playSample(name, vel = 1, rate = 1) {
  const audio = ensureCtx()
  const buf = buffers[name]
  if (!audio || !buf || vel < 0.02) return

  const src = audio.createBufferSource()
  const g = audio.createGain()
  src.buffer = buf
  src.playbackRate.value = Math.max(0.5, Math.min(2, rate))
  g.gain.value = Math.min(1.2, Math.max(0, vel))
  src.connect(g)
  g.connect(audio.destination)
  src.start()
}

// ——— Shell-chord note (Analog_BD_Sin) ———

/**
 * @param {'sin' | 'cos' | 'tan'} voice
 * @param {number} midi
 * @param {number} vel 0..1
 * @param {number} brightness 0..1
 * @param {number} [delay] seconds
 */
function playArpNote(voice, midi, vel, brightness = 0, delay = 0) {
  const audio = ensureCtx()
  if (!audio || vel < 0.03 || activeVoices >= ARP_MAX_VOICES) return

  const freq = midiToFreq(midi)
  if (freq < 55 || freq > 4200) return

  const now = audio.currentTime + Math.max(0, delay)
  const osc = audio.createOscillator()
  const g = audio.createGain()
  const filter = audio.createBiquadFilter()

  if (bdSinWaves.length > 0) {
    const idx = Math.min(
      bdSinWaves.length - 1,
      Math.floor(Math.max(0, Math.min(1, brightness)) * (bdSinWaves.length - 1))
    )
    osc.setPeriodicWave(bdSinWaves[idx])
  } else if (bdSinWave) {
    osc.setPeriodicWave(bdSinWave)
  } else {
    osc.type = 'sine'
  }

  osc.frequency.setValueAtTime(freq, now)

  const lowLift = freq < 150 ? 400 : 0
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(
    1400 + lowLift + brightness * 3200 + Math.max(0, freq - 200) * 1.1,
    now
  )
  filter.Q.setValueAtTime(0.55, now)

  const regBoost = freq < 120 ? 1.35 : freq < 200 ? 1.15 : 1
  const peak =
    (ARP_GAIN[voice] ?? 0.18) * Math.min(1, Math.max(0, vel)) * regBoost
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + ARP_ATTACK)
  g.gain.exponentialRampToValueAtTime(0.0001, now + ARP_ATTACK + ARP_DECAY)

  osc.connect(filter)
  filter.connect(g)
  g.connect(audio.destination)

  activeVoices++
  osc.start(now)
  osc.stop(now + ARP_ATTACK + ARP_DECAY + 0.05)
  osc.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1)
    try {
      osc.disconnect()
      filter.disconnect()
      g.disconnect()
    } catch {
      /* already gone */
    }
  }
}

/**
 * Fire shell chord when θ crosses a CoF station.
 * @param {number} angleDeg
 * @param {{ sin?: boolean, cos?: boolean, tan?: boolean }} enabled
 * @param {{ sin?: number|null, cos?: number|null, tan?: number|null }} values
 */
function processShellChord(angleDeg, enabled, values) {
  const any = enabled.sin || enabled.cos || enabled.tan
  if (!any) {
    lastChordStep = -1
    lastArpNote.sin = null
    lastArpNote.cos = null
    lastArpNote.tan = null
    return
  }

  const step = angleToStep(angleDeg)
  const sinInfo = enabled.sin ? arpInfo(angleDeg, 'sin') : null
  const tanInfo = enabled.tan ? arpInfo(angleDeg, 'tan') : null
  const cosInfo = enabled.cos ? arpInfo(angleDeg, 'cos') : null
  lastArpNote.sin = sinInfo
  lastArpNote.tan = tanInfo
  lastArpNote.cos = cosInfo

  if (step === lastChordStep) return
  lastChordStep = step

  const velOf = (v) => {
    if (v == null || !Number.isFinite(v)) return 0.55
    return 0.32 + 0.68 * Math.pow(Math.min(1, Math.abs(v)), 0.7)
  }

  if (sinInfo) {
    playArpNote(
      'sin',
      sinInfo.midi,
      velOf(values.sin),
      Math.min(1, Math.abs(values.sin ?? 0.5)),
      SHELL_STAGGER.sin
    )
  }
  if (tanInfo) {
    playArpNote(
      'tan',
      tanInfo.midi,
      velOf(values.tan),
      Math.min(1, Math.abs(values.tan ?? 0.5)),
      SHELL_STAGGER.tan
    )
  }
  if (cosInfo) {
    playArpNote(
      'cos',
      cosInfo.midi,
      velOf(values.cos),
      Math.min(1, Math.abs(values.cos ?? 0.5)),
      SHELL_STAGGER.cos
    )
  }
}

// ——— Kick / snare valleys ———

function shouldValleyStrike(key, value, thresh = 1) {
  if (value == null || !Number.isFinite(value)) {
    valleyArmed[key] = true
    return false
  }
  const abs = Math.abs(value)
  const floor = thresh * 1.12
  const rearm = thresh * 1.55
  if (abs >= rearm) valleyArmed[key] = true
  if (valleyArmed[key] && abs <= floor) {
    valleyArmed[key] = false
    return true
  }
  return false
}

function processPerc(key, entry, now) {
  const cfg = PERC[key]
  if (!cfg) return
  if (!entry?.show) {
    valleyArmed[key] = true
    return
  }
  const value =
    entry.value != null && Number.isFinite(entry.value) ? entry.value : null
  if (shouldValleyStrike(key, value) && now >= coolUntil[key]) {
    playSample(cfg.sample, cfg.gain)
    coolUntil[key] = now + (COOLDOWN[key] ?? 0.12)
  }
}

// ——— Cot: closed-hat roll (tan’s former sample / role) ———

function rollHz(absVal) {
  const t = Math.min(1, absVal / ROLL_ABS_FOR_MAX)
  const shaped = t * t
  return ROLL_MIN_HZ + (ROLL_MAX_HZ - ROLL_MIN_HZ) * shaped
}

function processCotHatRoll(entry, now) {
  if (!entry?.show) {
    rollNextAt.cot = 0
    return
  }
  const value = entry.value
  if (value == null || !Number.isFinite(value)) {
    rollNextAt.cot = 0
    return
  }

  const a = Math.abs(value)
  if (a < 0.12) {
    rollNextAt.cot = Math.max(rollNextAt.cot, now + 0.2)
    return
  }

  const hz = rollHz(a)
  const interval = 1 / hz
  const vel = 0.3 + 0.5 * Math.min(1, a / ROLL_ABS_FOR_MAX)
  const rate = 0.95 + 0.2 * Math.min(1, a / ROLL_ABS_FOR_MAX)

  if (rollNextAt.cot === 0) rollNextAt.cot = now

  let guard = 0
  while (now >= rollNextAt.cot && guard < 4) {
    playSample('hat', vel, rate)
    rollNextAt.cot += interval
    guard++
  }
  if (now >= rollNextAt.cot) {
    rollNextAt.cot = now + interval
  }
}

// ——— Public API ———

export function getLastArpNotes() {
  return { sin: lastArpNote.sin, cos: lastArpNote.cos, tan: lastArpNote.tan }
}

/**
 * @param {boolean} enabled
 * @param {{
 *   angleDeg?: number,
 *   sin?: { show: boolean, value: number | null },
 *   cos?: { show: boolean, value: number | null },
 *   sec?: { show: boolean, value: number | null },
 *   csc?: { show: boolean, value: number | null },
 *   tan?: { show: boolean, value: number | null },
 *   cot?: { show: boolean, value: number | null },
 * }} state
 */
export function updateTrigMusic(enabled, state) {
  if (!enabled) {
    muteAll()
    return
  }
  const audio = ensureCtx()
  if (!audio) return

  if (!samplesReady || !tableReady) {
    loadSamples()
  }

  const now = audio.currentTime
  const angleDeg =
    state.angleDeg != null && Number.isFinite(state.angleDeg) ? state.angleDeg : 0

  const sin = state.sin
  const cos = state.cos
  const tan = state.tan

  // Pitch roles need only the toggle — θ supplies CoF root; asymptotes mute velocity only
  const wantSin = !!sin?.show
  const wantCos = !!cos?.show
  const wantTan = !!tan?.show

  // CoF shell: sin=root, tan=3rd, cos=7th
  processShellChord(
    angleDeg,
    { sin: wantSin, cos: wantCos, tan: wantTan },
    {
      sin: sin?.value != null && Number.isFinite(sin.value) ? sin.value : 0.55,
      cos: cos?.value != null && Number.isFinite(cos.value) ? cos.value : 0.55,
      tan: tan?.value != null && Number.isFinite(tan.value) ? tan.value : 0.55,
    }
  )

  if (!samplesReady) return

  for (const key of PERC_KEYS) {
    processPerc(key, state[key], now)
  }
  processCotHatRoll(state.cot, now)
}

export function muteAll() {
  lastChordStep = -1
  lastArpNote.sin = null
  lastArpNote.cos = null
  lastArpNote.tan = null
  for (const key of PERC_KEYS) {
    valleyArmed[key] = true
  }
  rollNextAt.cot = 0
}

export function disposeTrigMusic() {
  muteAll()
  for (const key of PERC_KEYS) {
    coolUntil[key] = 0
  }
  activeVoices = 0
}

export const COLOR_BASE_FREQ = {
  sin: midiToFreq(stepToMidi(0)),
  cos: midiToFreq(stepToMidi(0) + 11),
}
