/**
 * Client for the Radiant FastAPI tutor proxy (Grok 4.6 / Imagine / TTS).
 */

const SESSION_KEY = 'radian-tutor-session'

export function getSessionId() {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `radian-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export async function fetchStatus() {
  try {
    const res = await fetch('/api/status')
    if (!res.ok) return { configured: false, error: `status ${res.status}` }
    return await res.json()
  } catch (err) {
    return { configured: false, error: err?.message || 'backend unreachable' }
  }
}

/**
 * Stream one Responses-API turn. Calls onEvent for each {type, ...} object.
 * Resolves with { responseId, toolCalls, text, error }.
 */
export async function streamTutor(body, { onEvent, signal } = {}) {
  const res = await fetch('/api/tutor', {
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
  const res = await fetch('/api/tts', {
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
  const res = await fetch('/api/imagine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ figure, prompt, aspect_ratio }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 400))
  return res.json()
}

export async function startVideo({ prompt, duration = 6, image, aspect_ratio = '16:9' }) {
  const res = await fetch('/api/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, duration, image, aspect_ratio }),
  })
  if (!res.ok) throw new Error((await res.text()).slice(0, 400))
  return res.json()
}

export async function pollVideo(requestId) {
  const res = await fetch(`/api/video/${encodeURIComponent(requestId)}`)
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
