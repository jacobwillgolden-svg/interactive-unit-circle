import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { captureFirst, captureNode } from '../utils/frameCapture'
import {
  fetchStatus,
  generatePortrait,
  getSessionId,
  startVideo,
  streamTutor,
  waitForVideo,
} from '../utils/tutorApi'

const TutorContext = createContext(null)

const WAVE_KEYS = [
  'sin',
  'cos',
  'tan',
  'csc',
  'sec',
  'cot',
  'asin',
  'acos',
  'atan',
  'acsc',
  'asec',
  'acot',
]

const HISTORY_FIGURES = [
  'Thales',
  'Pythagoras',
  'Euclid',
  'Eratosthenes',
  'Archimedes',
  'Kepler',
  'Descartes',
  'Fermat',
  'Newton',
  'Leibniz',
  'Bernoulli',
  'Euler',
]

export function TutorProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const pageRef = useRef(null)
  const mediaHandlersRef = useRef({})
  const responseIdRef = useRef(null)
  const abortRef = useRef(null)
  const busyRef = useRef(false)

  const [status, setStatus] = useState({ configured: null, model: 'gemini-3.5-flash' })
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState(() => [
    {
      id: 'hello',
      role: 'assistant',
      text: 'I can move the live figures. Ask me to set θ, rebuild a ramp problem, or walk an identity — or snap a worksheet photo.',
    },
  ])

  const refreshStatus = useCallback(async () => {
    const s = await fetchStatus()
    setStatus(s)
    return s
  }, [])

  const registerPage = useCallback((api) => {
    pageRef.current = api
    return () => {
      if (pageRef.current === api) pageRef.current = null
    }
  }, [])

  const registerMedia = useCallback((handlers) => {
    mediaHandlersRef.current = handlers || {}
    return () => {
      mediaHandlersRef.current = {}
    }
  }, [])

  const collectState = useCallback(() => {
    const page = pageRef.current
    return {
      route: location.pathname,
      ...(page?.getState?.() || {}),
    }
  }, [location.pathname])

  const captureFrame = useCallback(async () => {
    const page = pageRef.current
    if (page?.capture) {
      const fromPage = await page.capture()
      if (fromPage) return fromPage
    }
    if (page?.el) {
      const fromEl = await captureNode(page.el)
      if (fromEl) return fromEl
    }
    return captureFirst([
      '[data-tutor-stage]',
      '.circle-stage svg',
      '.pendulum-svg',
      '.helix-canvas',
      '.phys-svg',
      'main svg',
      'main canvas',
    ])
  }, [])

  const applyTool = useCallback(
    async (name, args = {}) => {
      if (name === 'navigate' && args.path) {
        navigate(args.path)
        return { ok: true, path: args.path }
      }
      if (name === 'highlight_identity' && args.id) {
        const hash = `#${args.id}`
        if (location.pathname !== '/cheat-sheet') {
          navigate(`/cheat-sheet${hash}`)
        } else {
          try {
            history.replaceState(null, '', hash)
          } catch {
            /* */
          }
          window.dispatchEvent(new Event('hashchange'))
        }
        return { ok: true, id: args.id }
      }
      if (name === 'generate_portrait') {
        const figure = args.figure || 'historical mathematician'
        const style =
          args.style ||
          'oil portrait, historically grounded likeness, academic atelier light, no text'
        const result = await generatePortrait({ figure, prompt: style })
        mediaHandlersRef.current.onPortrait?.(result, args)
        return { ok: true, figure, url: result.url, hasB64: Boolean(result.b64_json) }
      }
      if (name === 'generate_explainer_video') {
        const frame = args.useFrame === false ? null : await captureFrame()
        const started = await startVideo({
          prompt: args.prompt,
          duration: args.duration || 6,
          image: frame || undefined,
        })
        mediaHandlersRef.current.onVideoStart?.(started, args)
        if (started.request_id) {
          const done = await waitForVideo(started.request_id, {
            onTick: (d) => mediaHandlersRef.current.onVideoTick?.(d),
          })
          mediaHandlersRef.current.onVideoDone?.(done)
          return { ok: true, url: done.video?.url, status: done.status }
        }
        return { ok: false, error: 'No request_id' }
      }

      const page = pageRef.current
      if (page?.apply) {
        const result = page.apply(name, args)
        return result === undefined ? { ok: true } : result
      }
      return { ok: false, error: `No handler for ${name} on ${location.pathname}` }
    },
    [captureFrame, location.pathname, navigate],
  )

  const pushMessage = useCallback((msg) => {
    const id = msg.id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setMessages((prev) => [...prev, { ...msg, id }])
    return id
  }, [])

  const patchMessage = useCallback((id, patch) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)))
  }, [])

  const send = useCallback(
    async ({ text = '', image = null, intent = 'chat', effort = 'auto' } = {}) => {
      if (busyRef.current) return
      const trimmed = (text || '').trim()
      if (!trimmed && !image) return

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      busyRef.current = true
      setBusy(true)

      pushMessage({
        role: 'user',
        text: trimmed || (intent === 'explain_frame' ? 'Explain this frame.' : 'Look at this image.'),
        image: image && intent === 'photo' ? image : null,
        intent,
      })

      const asstId = pushMessage({
        role: 'assistant',
        text: '',
        reasoning: '',
        tools: [],
        streaming: true,
      })

      const session_id = getSessionId()

      const runTurn = async ({ message, tool_outputs, image: img, intent: turnIntent }) => {
        let localText = ''
        let localReason = ''
        const seen = new Set()

        const { responseId, toolCalls, error } = await streamTutor(
          {
            session_id,
            previous_response_id: responseIdRef.current,
            message,
            tool_outputs,
            state: collectState(),
            effort,
            image: img || undefined,
            intent: turnIntent,
          },
          {
            signal: ac.signal,
            onEvent: (ev) => {
              if (ev.type === 'meta') {
                patchMessage(asstId, (m) => ({ ...m, effort: ev.effort, model: ev.model }))
              }
              if (ev.type === 'reasoning') {
                localReason += ev.text || ''
                patchMessage(asstId, (m) => ({ ...m, reasoning: localReason }))
              }
              if (ev.type === 'text') {
                localText += ev.text || ''
                patchMessage(asstId, (m) => ({ ...m, text: localText }))
              }
              if (ev.type === 'status') {
                patchMessage(asstId, (m) => ({ ...m, status: ev.message }))
              }
              if (ev.type === 'tool_call') {
                const key = ev.call_id || `${ev.name}-${JSON.stringify(ev.arguments)}`
                if (seen.has(key)) return
                seen.add(key)
                patchMessage(asstId, (m) => ({
                  ...m,
                  tools: [...(m.tools || []), { ...ev, status: 'running' }],
                }))
              }
              if (ev.type === 'error') {
                patchMessage(asstId, (m) => ({ ...m, error: ev.message, streaming: false }))
              }
            },
          },
        )

        if (responseId) responseIdRef.current = responseId
        if (error && !localText) {
          return { toolCalls: [], error }
        }
        return { toolCalls, error: null }
      }

      try {
        let turn = await runTurn({
          message: trimmed || undefined,
          image,
          intent,
        })

        let guard = 0
        while (turn.toolCalls?.length && guard < 8) {
          guard += 1
          const outputs = []
          for (const tc of turn.toolCalls) {
            let result
            try {
              result = await applyTool(tc.name, tc.arguments || {})
            } catch (err) {
              result = { ok: false, error: err?.message || String(err) }
            }
            patchMessage(asstId, (m) => ({
              ...m,
              tools: (m.tools || []).map((t) =>
                t.call_id === tc.call_id ? { ...t, status: 'done', result } : t,
              ),
            }))
            outputs.push({
              call_id: tc.call_id,
              output: JSON.stringify(result ?? { ok: true }),
            })
          }
          // Give route changes a frame to remount page handlers
          await new Promise((r) => setTimeout(r, 40))
          turn = await runTurn({ tool_outputs: outputs })
        }

        patchMessage(asstId, (m) => ({ ...m, streaming: false, status: '' }))
      } catch (err) {
        if (err?.name !== 'AbortError') {
          patchMessage(asstId, (m) => ({
            ...m,
            streaming: false,
            error: err?.message || 'Tutor failed',
          }))
        }
      } finally {
        busyRef.current = false
        setBusy(false)
      }
    },
    [applyTool, collectState, patchMessage, pushMessage],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    busyRef.current = false
    setBusy(false)
  }, [])

  const value = useMemo(
    () => ({
      status,
      refreshStatus,
      busy,
      messages,
      send,
      stop,
      registerPage,
      registerMedia,
      collectState,
      captureFrame,
      applyTool,
      WAVE_KEYS,
      HISTORY_FIGURES,
    }),
    [
      applyTool,
      busy,
      captureFrame,
      collectState,
      messages,
      refreshStatus,
      registerMedia,
      registerPage,
      send,
      status,
      stop,
    ],
  )

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>
}

export function useTutor() {
  const ctx = useContext(TutorContext)
  if (!ctx) throw new Error('useTutor must be used inside TutorProvider')
  return ctx
}

export function useTutorOptional() {
  return useContext(TutorContext)
}
