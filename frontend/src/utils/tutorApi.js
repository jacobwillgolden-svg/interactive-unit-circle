/**
 * Client for the Radiant FastAPI tutor (Gemini brain + TTS).
 * In production the frontend and API are different Railway services,
 * so every call must go to the backend origin — not the static host.
 */

const SESSION_KEY = 'radian-tutor-session'
const API_BASE_KEY = 'radian-api-base'

export function getApiBase() {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(API_BASE_KEY)
      if (stored) return String(stored).replace(/\/$/, '')
    } catch {
      /* */
    }
  }
  const env = String(import.meta.env.VITE_API_BASE || '').trim()
  if (env) return env.replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // Common Railway names: frontend-… / backend-…
    if (/\.up\.railway\.app$/i.test(host) && /frontend/i.test(host)) {
      return `${window.location.protocol}//${host.replace(/frontend/gi, 'backend')}`
    }
  }
  return ''
}

export function setApiBase(url) {
  if (typeof window === 'undefined') return
  const clean = String(url || '').trim().replace(/\/$/, '')
  if (clean) localStorage.setItem(API_BASE_KEY, clean)
  else localStorage.removeItem(API_BASE_KEY)
}

export function apiUrl(path) {
  const base = getApiBase()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function getSessionId() {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `radian-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

async function readStatus(base) {
  const root = String(base || '').replace(/\/$/, '')
  const res = await fetch(`${root}/api/status`)
  const ctype = res.headers.get('content-type') || ''
  if (!res.ok || !ctype.includes('json')) {
    return { configured: false, error: `status ${res.status}`, model: 'gemini-2.5-flash' }
  }
  return await res.json()
}

export async function fetchStatus() {
  try {
    const first = await readStatus(getApiBase())
    if (first.provider || first.configured) return first

    if (typeof window !== 'undefined') {
      const host = window.location.hostname
      if (/\.up\.railway\.app$/i.test(host) && /frontend/i.test(host)) {
        const guessed = `${window.location.protocol}//${host.replace(/frontend/gi, 'backend')}`
        const second = await readStatus(guessed)
        if (second.provider || second.configured) {
          setApiBase(guessed)
          return second
        }
      }
    }
    return first
  } catch (err) {
    return {
      configured: false,
      error: err?.message || 'backend unreachable',
      model: 'gemini-2.5-flash',
    }
  }
}

/**
 * Stream one Responses-API turn. Calls onEvent for each {type, ...} object.
 * Resolves with { responseId, toolCalls, text, error }.
 */
export async function streamTutor(body, { onEvent, signal } = {}) {
  const res = await fetch(apiUrl('/api/tutor'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    let detail = `Tutor request failed (${res.status})`
    try {
      const j = await res.json()
      detail = j.detail || detail
    } catch {
      /* */
    }
    const error = typeof detail === 'string' ? detail : JSON.stringify(detail)
    onEvent?.({ type: 'error', message: error })
    return { responseId: null, toolCalls: [], text: '', error }
  }

  const reader = res.body?.getReader()
  if (!reader) {
    return { responseId: null, toolCalls: [], text: '', error: 'No stream body' }
  }

  const decoder = new TextDecoder()
  let buf = ''
  let responseId = null
  let text = ''
  let error = null
  const toolCalls = []

  const consume = (raw) => {
    const line = raw.trim()
    if (!line.startsWith('data:')) return
    const payload = line.slice(5).trim()
    if (!payload || payload === '[DONE]') return
    let ev
    try {
      ev = JSON.parse(payload)
    } catch {
      return
    }
    if (ev.type === 'text') text += ev.text || ''
    if (ev.type === 'tool_call') toolCalls.push(ev)
    if (ev.type === 'done' && ev.response_id) responseId = ev.response_id
    if (ev.type === 'error') error = ev.message || 'Tutor error'
    onEvent?.(ev)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() || ''
    for (const part of parts) consume(part)
  }
  if (buf.trim()) consume(buf)

  return { responseId, toolCalls, text, error }
}

export async function speakOnServer(text, voice = 'Charon') {
  const res = await fetch(apiUrl('/api/tts'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t.slice(0, 240) || `TTS ${res.status}`)
  }
  return res.blob()
}

export async function generatePortrait({ figure, prompt, aspect_ratio = '3:4' }) {
  const res = await fetch(apiUrl('/api/imagine'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ figure, prompt, aspect_ratio }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 400))
  return res.json()
}

export async function startVideo({ prompt, duration = 6, image, aspect_ratio = '16:9' }) {
  const res = await fetch(apiUrl('/api/video'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration, image, aspect_ratio }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 400))
  return res.json()
}

export async function pollVideo(requestId) {
  const res = await fetch(apiUrl(`/api/video/${encodeURIComponent(requestId)}`))
  if (!res.ok) throw new Error((await res.text()).slice(0, 400))
  return res.json()
}

export async function waitForVideo(requestId, { onTick, signal, intervalMs = 4000 } = {}) {
  while (!signal?.aborted) {
    const data = await pollVideo(requestId)
    onTick?.(data)
    if (data.status === 'done') return data
    if (data.status === 'failed' || data.status === 'expired') {
      throw new Error(data.error?.message || `Video ${data.status}`)
    }
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  throw new Error('Video poll cancelled')
}
