/**
 * Tutor speech: Gemini Flash TTS (via /api/tts) with Web Speech fallback.
 */

import { speakOnServer } from './tutorApi'

const ENGINE_KEY = 'radian-tts-engine'
const VOICE_KEY = 'radian-tts-voice'
const BROWSER_VOICE_KEY = 'radian-tts-browser-voice'

export const GEMINI_VOICES = [
  { id: 'Charon', label: 'Charon (informative)' },
  { id: 'Sadaltager', label: 'Sadaltager (knowledgeable)' },
  { id: 'Kore', label: 'Kore (firm)' },
  { id: 'Aoede', label: 'Aoede (breezy)' },
  { id: 'Puck', label: 'Puck (upbeat)' },
  { id: 'Sulafat', label: 'Sulafat (warm)' },
  { id: 'Achird', label: 'Achird (friendly)' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix (gentle)' },
]

/** @deprecated use GEMINI_VOICES — kept so the panel import stays stable */
export const XAI_VOICES = GEMINI_VOICES

let currentAudio = null
let speakToken = 0

export function getTtsEngine() {
  if (typeof window === 'undefined') return 'gemini'
  const v = localStorage.getItem(ENGINE_KEY)
  if (v === 'browser') return 'browser'
  return 'gemini'
}

export function setTtsEngine(engine) {
  if (typeof window === 'undefined') return
  if (engine === 'browser' || engine === 'gemini' || engine === 'xai') {
    localStorage.setItem(ENGINE_KEY, engine === 'xai' ? 'gemini' : engine)
  }
}

export function getGeminiVoice() {
  if (typeof window === 'undefined') return 'Charon'
  const v = localStorage.getItem(VOICE_KEY)
  if (!v || v === 'eve' || v === 'ara' || v === 'rex' || v === 'sal' || v === 'leo' || v === 'mira') {
    return 'Charon'
  }
  return v
}

export function setGeminiVoice(id) {
  if (typeof window === 'undefined') return
  localStorage.setItem(VOICE_KEY, id || 'Charon')
}

export const getXaiVoice = getGeminiVoice
export const setXaiVoice = setGeminiVoice

export function getBrowserVoiceURI() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(BROWSER_VOICE_KEY) || ''
}

export function setBrowserVoiceURI(uri) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BROWSER_VOICE_KEY, uri || '')
}

export function listBrowserVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const voices = window.speechSynthesis.getVoices() || []
  return [...voices].sort((a, b) => {
    const score = (v) => {
      let s = 0
      const n = `${v.name} ${v.lang}`.toLowerCase()
      if (/en(-|_)?us/.test(n)) s += 40
      else if (/^en/.test(v.lang.toLowerCase())) s += 25
      if (/natural|neural|premium|google|siri/.test(n)) s += 20
      if (/espeak|robot/.test(n)) s -= 30
      return s
    }
    return score(b) - score(a)
  })
}

export function warmBrowserVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.getVoices()
}

export function cleanForSpeech(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/θ/g, 'theta')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'infinity')
    .replace(/²/g, ' squared')
    .replace(/°/g, ' degrees')
    .replace(/\s+/g, ' ')
    .trim()
}

export function stopSpeech() {
  speakToken += 1
  speakSession = null
  speakBuf = ''
  spokenRawLen = 0
  audioJobs = []
  playRunning = false
  if (currentAudio) {
    try {
      currentAudio.pause()
      currentAudio.src = ''
    } catch {
      /* */
    }
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* */
    }
  }
}

function speakBrowser(text) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve({ engine: 'none' })
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1
    const voices = listBrowserVoices()
    const pref = getBrowserVoiceURI()
    const pick = voices.find((v) => v.voiceURI === pref) || voices[0]
    if (pick) u.voice = pick
    u.onend = () => resolve({ engine: 'browser' })
    u.onerror = () => resolve({ engine: 'browser', error: 'utterance error' })
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

let speakSession = null
let speakBuf = ''
let spokenRawLen = 0
let audioJobs = []
let playRunning = false

function takeSentences(buffer, final) {
  const chunks = []
  const re = /[\s\S]*?(?:[.!?]|\n\n)(?=\s|$)/g
  let last = 0
  let m
  while ((m = re.exec(buffer))) {
    const piece = m[0].trim()
    if (piece) chunks.push(piece)
    last = re.lastIndex
  }
  let rest = buffer.slice(last)
  if (final && rest.trim()) {
    chunks.push(rest.trim())
    rest = ''
  }
  return { chunks, rest }
}

async function playBlob(blob, token) {
  if (token !== speakToken) return
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  currentAudio = audio
  try {
    await audio.play()
    await new Promise((resolve) => {
      audio.onended = resolve
      audio.onerror = resolve
    })
  } catch {
    /* autoplay / abort */
  }
  URL.revokeObjectURL(url)
  if (currentAudio === audio) currentAudio = null
}

async function pumpSpeakQueue() {
  if (playRunning) return
  playRunning = true
  while (audioJobs.length) {
    const job = audioJobs.shift()
    let item
    try {
      item = await job
    } catch {
      continue
    }
    if (!item || item.token !== speakToken) continue
    if (item.blob) await playBlob(item.blob, item.token)
    else if (item.browser) await speakBrowser(item.browser)
  }
  playRunning = false
}

function enqueueLine(line) {
  const spoken = cleanForSpeech(line)
  if (!spoken || spoken.length < 2) return
  const token = speakToken
  const want = getTtsEngine()
  const job = (async () => {
    if (want === 'browser') return { browser: spoken, token }
    try {
      const blob = await speakOnServer(spoken, getGeminiVoice())
      return { blob, token }
    } catch (err) {
      return { browser: spoken, token, error: err?.message }
    }
  })()
  audioJobs.push(job)
  pumpSpeakQueue()
}

/** Speak complete sentences as they arrive. Skips the canned welcome. */
export function feedAssistantSpeech(msgId, rawText, { final = false, enabled = true } = {}) {
  if (!enabled || !msgId || msgId === 'hello') return
  if (speakSession !== msgId) {
    stopSpeech()
    speakSession = msgId
    speakBuf = ''
    spokenRawLen = 0
  }
  const next = String(rawText || '')
  if (next.length < spokenRawLen) return
  speakBuf += next.slice(spokenRawLen)
  spokenRawLen = next.length
  const { chunks, rest } = takeSentences(speakBuf, final)
  speakBuf = rest
  chunks.forEach(enqueueLine)
}

export async function speakText(text, { enabled = true, engine } = {}) {
  if (!enabled) return null
  const line = cleanForSpeech(text)
  if (!line) return { engine: 'none', reason: 'empty' }

  const token = ++speakToken
  stopSpeech()
  speakToken = token

  const want = engine || getTtsEngine()
  if (want === 'gemini' || want === 'xai') {
    try {
      const blob = await speakOnServer(line, getGeminiVoice())
      if (token !== speakToken) return { engine: 'gemini', reason: 'cancelled' }
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio = audio
      await audio.play()
      await new Promise((resolve) => {
        audio.onended = resolve
        audio.onerror = resolve
      })
      URL.revokeObjectURL(url)
      if (currentAudio === audio) currentAudio = null
      return { engine: 'gemini' }
    } catch (err) {
      if (token !== speakToken) return { engine: 'gemini', reason: 'cancelled' }
      const fallback = await speakBrowser(line)
      return { ...fallback, reason: 'gemini-error', error: err?.message || 'TTS failed' }
    }
  }
  return speakBrowser(line)
}

export function speechSupported() {
  if (typeof window === 'undefined') return { rec: false, tts: false }
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
  return {
    rec: Boolean(Rec),
    tts: Boolean(window.speechSynthesis),
  }
}

export function createRecognizer({ onResult, onInterim, onError, onEnd }) {
  const Rec = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  if (!Rec) return null
  const rec = new Rec()
  rec.lang = 'en-US'
  rec.interimResults = true
  rec.continuous = false
  rec.onresult = (e) => {
    let interim = ''
    let finalText = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const piece = e.results[i][0]?.transcript || ''
      if (e.results[i].isFinal) finalText += piece
      else interim += piece
    }
    if (interim) onInterim?.(interim)
    if (finalText) onResult?.(finalText.trim())
  }
  rec.onerror = (e) => onError?.(e.error || 'recognition error')
  rec.onend = () => onEnd?.()
  return rec
}
