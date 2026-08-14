import { useEffect, useRef, useState } from 'react'
import { useTutor } from '../context/TutorContext'
import { fileToDataUrl } from '../utils/frameCapture'
import { tutorToHtml } from '../utils/tutorFormat'
import {
  GEMINI_VOICES,
  createRecognizer,
  getTtsEngine,
  getGeminiVoice,
  setTtsEngine,
  setGeminiVoice,
  feedAssistantSpeech,
  speechSupported,
  stopSpeech,
  warmBrowserVoices,
} from '../utils/tts'

const EFFORTS = [
  { id: 'auto', label: 'Auto — low to move, high to explain' },
  { id: 'low', label: 'Low — fast, just move the figure' },
  { id: 'high', label: 'High — slower, fuller explanation' },
  { id: 'xhigh', label: 'xHigh — deepest (proofs)' },
]

function toolLabel(t) {
  const a = t.arguments || {}
  if (t.name === 'set_angle') return `θ → ${a.degrees}°`
  if (t.name === 'navigate') return `open ${a.path}`
  if (t.name === 'highlight_identity') return `card ${a.id}`
  if (t.name === 'set_history_era') return `era ${a.figure || a.index}`
  if (t.name === 'set_physics') return `physics ${a.mode || ''}`.trim()
  if (t.name === 'set_pendulum') return `pendulum ${a.nLinks ? `${a.nLinks}-link` : ''}`.trim()
  if (t.name === 'set_waves') return 'waves'
  if (t.name === 'set_overlays') return 'overlays'
  if (t.name === 'generate_portrait') return `portrait ${a.figure || ''}`.trim()
  if (t.name === 'generate_explainer_video') return 'explainer clip'
  return t.name
}

export default function TutorPanel() {
  const { status, refreshStatus, busy, messages, send, stop, captureFrame } = useTutor()
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [effort, setEffort] = useState('auto')
  const [speakOn, setSpeakOn] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('radian-tutor-speak') === 'on'
  })
  const [engine, setEngine] = useState(() => getTtsEngine())
  const [voice, setVoice] = useState(() => getGeminiVoice())
  const [listening, setListening] = useState(false)
  const [ttsNote, setTtsNote] = useState('')
  const listRef = useRef(null)
  const recRef = useRef(null)
  const fileRef = useRef(null)
  const support = speechSupported()

  useEffect(() => {
    refreshStatus()
    warmBrowserVoices()
  }, [refreshStatus])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, open])

  useEffect(() => {
    try {
      localStorage.setItem('radian-tutor-speak', speakOn ? 'on' : 'off')
    } catch {
      /* */
    }
  }, [speakOn])

  useEffect(() => {
    if (!speakOn) {
      stopSpeech()
      return
    }
    const last = [...messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.text && m.id !== 'hello')
    if (!last) return
    feedAssistantSpeech(last.id, last.text, {
      final: !last.streaming,
      enabled: true,
    })
  }, [messages, speakOn])

  const submit = (text, extra = {}) => {
    const line = (text ?? draft).trim()
    if (!line && !extra.image) return
    setDraft('')
    send({ text: line, effort, ...extra })
  }

  const onExplainFrame = async () => {
    const image = await captureFrame()
    if (!image) {
      setTtsNote('Could not capture this view.')
      return
    }
    send({
      text: 'Explain this frame — what am I looking at, and what should I notice?',
      image,
      intent: 'explain_frame',
      effort: effort === 'auto' ? 'high' : effort,
    })
  }

  const onPhoto = async (file) => {
    if (!file) return
    const image = await fileToDataUrl(file)
    send({
      text: 'Reconstruct this problem on the live diagram and tutor me through it.',
      image,
      intent: 'photo',
      effort: effort === 'low' ? 'high' : effort,
    })
  }

  const toggleListen = () => {
    if (listening) {
      try {
        recRef.current?.stop()
      } catch {
        /* */
      }
      setListening(false)
      return
    }
    if (!recRef.current) {
      recRef.current = createRecognizer({
        onResult: (text) => {
          setDraft(text)
          submit(text)
        },
        onInterim: (t) => setDraft(t),
        onError: (e) => setTtsNote(String(e)),
        onEnd: () => setListening(false),
      })
    }
    if (!recRef.current) {
      setTtsNote('Speech recognition is not available in this browser.')
      return
    }
    setListening(true)
    recRef.current.start()
  }

  return (
    <div className={`tutor${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="tutor-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Collapse tutor' : 'Open studio tutor'}
      >
        <span className="tutor-fab-mark">β</span>
        <span className="tutor-fab-label">Tutor</span>
      </button>

      {open && (
        <section className="tutor-panel" aria-label="Studio tutor">
          <header className="tutor-head">
            <div>
              <p className="tutor-kicker">Beta · Tutor</p>
              <h2>Studio tutor</h2>
            </div>
            <div className="tutor-head-meta">
              <span className={`tutor-dot${status.configured ? ' is-on' : ''}`} />
              {status.model || 'gemini-3.5-flash'}
            </div>
          </header>

          <div className="tutor-toolbar">
            <label className="tutor-field">
              Effort
              <select value={effort} onChange={(e) => setEffort(e.target.value)}>
                {EFFORTS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={`tutor-speak${speakOn ? ' is-on' : ''}`}
              aria-pressed={speakOn}
              title={speakOn ? 'Narration on' : 'Narration off'}
              onClick={() => {
                setSpeakOn((on) => {
                  if (on) stopSpeech()
                  return !on
                })
              }}
            >
              <span>Speak</span>
              <span className="switch" aria-hidden="true" />
            </button>
            <label className="tutor-field tutor-field--grow">
              Voice
              <select
                value={engine === 'browser' ? 'browser' : `gemini:${voice}`}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === 'browser') {
                    setTtsEngine('browser')
                    setEngine('browser')
                  } else {
                    const id = v.replace('gemini:', '')
                    setTtsEngine('gemini')
                    setGeminiVoice(id)
                    setEngine('gemini')
                    setVoice(id)
                  }
                }}
              >
                {GEMINI_VOICES.map((v) => (
                  <option key={v.id} value={`gemini:${v.id}`}>
                    Gemini · {v.label}
                  </option>
                ))}
                <option value="browser">Browser voice</option>
              </select>
            </label>
          </div>

          <div className="tutor-log" ref={listRef}>
            {messages.map((m) => (
              <article key={m.id} className={`tutor-msg tutor-msg--${m.role}`}>
                {m.reasoning && (
                  <details className="tutor-reason">
                    <summary>Working it out</summary>
                    <pre>{m.reasoning}</pre>
                  </details>
                )}
                {m.tools?.length > 0 && (
                  <ul className="tutor-tools">
                    {m.tools.map((t) => (
                      <li key={t.call_id || t.name} className={t.status}>
                        {toolLabel(t)}
                      </li>
                    ))}
                  </ul>
                )}
                {m.image && (
                  <img className="tutor-thumb" src={m.image} alt="" />
                )}
                {m.text && m.role === 'assistant' ? (
                  <div
                    className="tutor-rich"
                    dangerouslySetInnerHTML={{ __html: tutorToHtml(m.text) }}
                  />
                ) : (
                  m.text && <p>{m.text}</p>
                )}
                {m.status && <p className="tutor-status">{m.status}</p>}
                {m.error && <p className="tutor-error">{m.error}</p>}
                {m.streaming && !m.text && !m.error && (
                  <p className="tutor-status">Thinking…</p>
                )}
              </article>
            ))}
          </div>

          {ttsNote && <p className="tutor-note">{ttsNote}</p>}

          <form
            className="tutor-compose"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <textarea
              rows={2}
              value={draft}
              placeholder="Set θ to 90° and explain tan…  or snap a worksheet"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <div className="tutor-actions">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  onPhoto(f)
                }}
              />
              <button type="button" className="tutor-btn" onClick={onExplainFrame} disabled={busy}>
                Frame
              </button>
              <button
                type="button"
                className="tutor-btn"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                Photo
              </button>
              {support.rec && (
                <button
                  type="button"
                  className={`tutor-btn${listening ? ' is-live' : ''}`}
                  onClick={toggleListen}
                >
                  {listening ? 'Stop' : 'Voice'}
                </button>
              )}
              {busy ? (
                <button type="button" className="tutor-btn tutor-btn--primary" onClick={stop}>
                  Stop
                </button>
              ) : (
                <button type="submit" className="tutor-btn tutor-btn--primary">
                  Send
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
