/**
 * Graph-tied kit using Cymatics Terror samples (public/samples/).
 *
 *   sec → kick oneshot     (valleys at sec = ±1)
 *   csc → snare oneshot    (valleys at csc = ±1)
 *   tan → closed-hat roll  (rate rises with |tan| → ∞)
 *   cot → riser            (gain/speed climb with |cot| → ∞; cut at asymptote)
 *   sin / cos → soft synth pad
 */

export const COLOR_BASE_FREQ = {
  sin: 98.0,
  cos: 246.94,
}

const SAMPLE_URLS = {
  kick: '/samples/kick.wav',
  snare: '/samples/snare.wav',
  hat: '/samples/hat.wav',
  riser: '/samples/riser.wav',
}

const PERC_KEYS = ['sec', 'csc']
const PERC = {
  sec: { sample: 'kick', gain: 0.95 },
  csc: { sample: 'snare', gain: 0.85 },
}
const COOLDOWN = { sec: 0.12, csc: 0.12 }

const ROLL_MIN_HZ = 3
const ROLL_MAX_HZ = 32
const ROLL_ABS_FOR_MAX = 8

const VOICE_GAIN = { sin: 0.07, cos: 0.045 }

let ctx = null
let sinVoice = null
let cosVoice = null

/** @type {Record<string, AudioBuffer | null>} */
const buffers = { kick: null, snare: null, hat: null, riser: null }
let loadPromise = null
let samplesReady = false

const valleyArmed = { sec: true, csc: true }
const coolUntil = { sec: 0, csc: 0 }
const rollNextAt = { tan: 0 }

/** Active cot riser voice */
let riserSrc = null
let riserGain = null
let riserPlaying = false

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

function loadSamples() {
  if (samplesReady) return Promise.resolve()
  if (loadPromise) return loadPromise
  const audio = ensureCtx()
  if (!audio) return Promise.resolve()

  loadPromise = (async () => {
    await Promise.all(
      Object.entries(SAMPLE_URLS).map(async ([key, url]) => {
        try {
          const res = await fetch(url)
          if (!res.ok) throw new Error(`${url} ${res.status}`)
          const raw = await res.arrayBuffer()
          // copy: decodeAudioData may detach the buffer
          buffers[key] = await audio.decodeAudioData(raw.slice(0))
        } catch (err) {
          console.warn('[trigMusic] failed to load', url, err)
          buffers[key] = null
        }
      })
    )
    samplesReady = true
  })()
  return loadPromise
}

/**
 * Fire a one-shot sample.
 * @param {string} name
 * @param {number} [vel]
 * @param {number} [rate]
 */
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

function valueToToneGain(key, value) {
  if (value == null || !Number.isFinite(value)) return 0
  return (VOICE_GAIN[key] ?? 0.05) * Math.pow(Math.min(1, Math.abs(value)), 0.85)
}

function ensureTimbrePair() {
  const audio = ensureCtx()
  if (!audio || (sinVoice && cosVoice)) return
  const now = audio.currentTime

  const make = (freq, type, modFreq) => {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    const mod = audio.createOscillator()
    const modGain = audio.createGain()
    osc.type = type
    mod.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    mod.frequency.setValueAtTime(modFreq, now)
    modGain.gain.setValueAtTime(0, now)
    gain.gain.setValueAtTime(0.0001, now)
    mod.connect(modGain)
    modGain.connect(osc.frequency)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start()
    mod.start()
    return { osc, gain, mod, modGain }
  }

  sinVoice = make(COLOR_BASE_FREQ.sin, 'sine', COLOR_BASE_FREQ.cos)
  cosVoice = make(COLOR_BASE_FREQ.cos, 'triangle', COLOR_BASE_FREQ.sin)
}

function setGain(voice, target, now, ramp = 0.04) {
  if (!voice) return
  voice.gain.gain.cancelScheduledValues(now)
  voice.gain.gain.setTargetAtTime(Math.max(0.0001, target), now, ramp)
}

function setMod(voice, depth, now) {
  if (!voice?.modGain) return
  voice.modGain.gain.cancelScheduledValues(now)
  voice.modGain.gain.setTargetAtTime(Math.max(0, depth), now, 0.05)
}

function fadeVoice(voice, now) {
  setGain(voice, 0.0001, now, 0.03)
  setMod(voice, 0, now)
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

// ——— Tan: closed-hat roll ———

function rollHz(absVal) {
  const t = Math.min(1, absVal / ROLL_ABS_FOR_MAX)
  const shaped = t * t
  return ROLL_MIN_HZ + (ROLL_MAX_HZ - ROLL_MIN_HZ) * shaped
}

function processHatRoll(entry, now) {
  if (!entry?.show) {
    rollNextAt.tan = 0
    return
  }
  const value = entry.value
  if (value == null || !Number.isFinite(value)) {
    rollNextAt.tan = 0
    return
  }

  const a = Math.abs(value)
  if (a < 0.12) {
    rollNextAt.tan = Math.max(rollNextAt.tan, now + 0.2)
    return
  }

  const hz = rollHz(a)
  const interval = 1 / hz
  const vel = 0.3 + 0.5 * Math.min(1, a / ROLL_ABS_FOR_MAX)
  // Slight pitch climb as |tan| grows
  const rate = 0.95 + 0.2 * Math.min(1, a / ROLL_ABS_FOR_MAX)

  if (rollNextAt.tan === 0) rollNextAt.tan = now

  let guard = 0
  while (now >= rollNextAt.tan && guard < 4) {
    playSample('hat', vel, rate)
    rollNextAt.tan += interval
    guard++
  }
  if (now >= rollNextAt.tan) {
    rollNextAt.tan = now + interval
  }
}

// ——— Cot: riser (builds with |cot| → ∞) ———

function stopRiser(now, fade = 0.04) {
  if (!riserPlaying || !riserGain) {
    riserPlaying = false
    riserSrc = null
    riserGain = null
    return
  }
  try {
    riserGain.gain.cancelScheduledValues(now)
    riserGain.gain.setTargetAtTime(0.0001, now, fade)
    const src = riserSrc
    const g = riserGain
    riserPlaying = false
    riserSrc = null
    riserGain = null
    // stop after fade
    window.setTimeout(() => {
      try {
        src?.stop()
        src?.disconnect()
        g?.disconnect()
      } catch {
        /* already stopped */
      }
    }, 120)
  } catch {
    riserPlaying = false
    riserSrc = null
    riserGain = null
  }
}

function startRiser(now) {
  const audio = ensureCtx()
  const buf = buffers.riser
  if (!audio || !buf) return

  stopRiser(now, 0.01)

  const src = audio.createBufferSource()
  const g = audio.createGain()
  src.buffer = buf
  src.playbackRate.value = 0.9
  g.gain.setValueAtTime(0.0001, now)
  src.connect(g)
  g.connect(audio.destination)
  src.onended = () => {
    if (riserSrc === src) {
      riserPlaying = false
      riserSrc = null
      riserGain = null
    }
  }
  src.start(now)
  riserSrc = src
  riserGain = g
  riserPlaying = true
}

function processRiser(entry, now) {
  if (!entry?.show) {
    stopRiser(now)
    return
  }
  const value = entry.value
  // Asymptote or near cot zero → silence
  if (value == null || !Number.isFinite(value)) {
    stopRiser(now, 0.02)
    return
  }
  const a = Math.abs(value)
  if (a < 0.35) {
    stopRiser(now, 0.06)
    return
  }

  if (!riserPlaying) {
    startRiser(now)
  }
  if (!riserPlaying || !riserGain || !riserSrc) return

  // Intensity tracks climb toward ±∞
  const t = Math.min(1, a / ROLL_ABS_FOR_MAX)
  const shaped = t * t
  const gain = 0.08 + 0.72 * shaped
  const rate = 0.85 + 0.55 * shaped

  riserGain.gain.cancelScheduledValues(now)
  riserGain.gain.setTargetAtTime(gain, now, 0.05)
  try {
    riserSrc.playbackRate.cancelScheduledValues(now)
    riserSrc.playbackRate.setTargetAtTime(rate, now, 0.08)
  } catch {
    /* playbackRate automation not available */
  }
}

// ——— Public API ———

/**
 * @param {boolean} enabled
 * @param {Record<string, { show: boolean, value: number | null }>} state
 */
export function updateTrigMusic(enabled, state) {
  if (!enabled) {
    muteAll()
    return
  }
  const audio = ensureCtx()
  if (!audio) return

  // Kick off sample load on first enable (user gesture already happened)
  if (!samplesReady) {
    loadSamples()
  }

  const now = audio.currentTime

  // --- soft pad ---
  const sin = state.sin
  const cos = state.cos
  const wantSin = sin?.show && sin.value != null && Number.isFinite(sin.value)
  const wantCos = cos?.show && cos.value != null && Number.isFinite(cos.value)

  if (wantSin || wantCos) {
    ensureTimbrePair()
    if (wantSin) {
      setGain(sinVoice, valueToToneGain('sin', sin.value), now)
      const cosMod =
        wantCos && cos.value != null ? Math.min(1, Math.abs(cos.value)) : 0
      setMod(sinVoice, cosMod * 22, now)
    } else fadeVoice(sinVoice, now)

    if (wantCos) {
      setGain(cosVoice, valueToToneGain('cos', cos.value), now)
      const sinMod =
        wantSin && sin.value != null ? Math.min(1, Math.abs(sin.value)) : 0
      setMod(cosVoice, sinMod * 14, now)
    } else fadeVoice(cosVoice, now)
  } else {
    fadeVoice(sinVoice, now)
    fadeVoice(cosVoice, now)
  }

  // Samples not ready yet — pad only
  if (!samplesReady) return

  for (const key of PERC_KEYS) {
    processPerc(key, state[key], now)
  }
  processHatRoll(state.tan, now)
  processRiser(state.cot, now)
}

export function muteAll() {
  if (!ctx) return
  const now = ctx.currentTime
  fadeVoice(sinVoice, now)
  fadeVoice(cosVoice, now)
  stopRiser(now, 0.02)
  for (const key of PERC_KEYS) {
    valleyArmed[key] = true
  }
  rollNextAt.tan = 0
}

function stopTone(v) {
  if (!v) return
  try {
    v.gain.gain.setValueAtTime(0, ctx?.currentTime ?? 0)
    v.osc.stop()
    v.mod.stop()
    v.osc.disconnect()
    v.mod.disconnect()
    v.modGain.disconnect()
    v.gain.disconnect()
  } catch {
    /* already stopped */
  }
}

export function disposeTrigMusic() {
  stopTone(sinVoice)
  stopTone(cosVoice)
  sinVoice = null
  cosVoice = null
  stopRiser(ctx?.currentTime ?? 0, 0.01)
  for (const key of PERC_KEYS) {
    valleyArmed[key] = true
    coolUntil[key] = 0
  }
  rollNextAt.tan = 0
}
