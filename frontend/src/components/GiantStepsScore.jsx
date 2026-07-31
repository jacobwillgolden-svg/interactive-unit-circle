import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ARP_STEPS_PER_REV,
  COF_RAINBOW,
  GIANT_STEPS,
  KEY_SIG_MAX,
  KEY_SIG_MIN,
  SCORE_BARS_PER_REV,
  SCORE_CHORDS_PER_BAR,
  SCORE_TIME_SIG,
  analyzeChordFromMidis,
  angleToStep,
  buildShellVoicing,
  colorForProgressionRoot,
  detectProgressionHarmony,
  parseChordSymbol,
  parseProgressionString,
  preferFlatsFromKeySig,
  previewShellPitch,
  progressionRootPcs,
  resolveShellVoicing,
} from '../utils/trigMusic'

const MIDI_MIN = 48
const MIDI_MAX = 88

const SHARP_ORDER = [
  { yLines: 1 },
  { yLines: 2.5 },
  { yLines: 0.5 },
  { yLines: 2 },
  { yLines: 3.5 },
  { yLines: 1.5 },
  { yLines: 3 },
]
const FLAT_ORDER = [
  { yLines: 2 },
  { yLines: 0.5 },
  { yLines: 2.5 },
  { yLines: 1 },
  { yLines: 3 },
  { yLines: 1.5 },
  { yLines: 3.5 },
]

function midiToStaffY(midi, staffTop, lineGap) {
  const e4 = 64
  const bottomLineY = staffTop + 4 * lineGap
  return bottomLineY - ((midi - e4) * lineGap) / 2
}

function staffYToMidi(y, staffTop, lineGap) {
  const e4 = 64
  const bottomLineY = staffTop + 4 * lineGap
  const midi = e4 + ((bottomLineY - y) * 2) / lineGap
  return Math.max(MIDI_MIN, Math.min(MIDI_MAX, Math.round(midi)))
}

function ledgerYs(midi, staffTop, lineGap) {
  const y = midiToStaffY(midi, staffTop, lineGap)
  const top = staffTop
  const bot = staffTop + 4 * lineGap
  const ys = []
  if (y < top - 0.5) {
    for (let ly = top - lineGap; ly >= y - 0.5; ly -= lineGap) ys.push(ly)
  } else if (y > bot + 0.5) {
    for (let ly = bot + lineGap; ly <= y + 0.5; ly += lineGap) ys.push(ly)
  }
  return ys
}

function rolesOf(v) {
  return [
    { role: 'root', midi: v.root },
    { role: 'cos', midi: v.cos },
    { role: 'tan', midi: v.tan },
  ]
}

/**
 * Interactive score: typable chord symbols snap notes; drag for inversions;
 * key signature auto-updates; I–IV–V progressions use two colours only.
 */
export default function GiantStepsScore({
  angleDeg = 0,
  active = false,
  voicings = null,
  onVoicingChange,
  keySigFifths = 0,
  onKeySigChange,
}) {
  const current = active ? angleToStep(angleDeg) : -1
  const svgRef = useRef(/** @type {SVGSVGElement | null} */ (null))
  const dragRef = useRef(
    /** @type {null | { step: number, role: 'root'|'cos'|'tan', pointerId: number }} */ (
      null
    )
  )
  const [dragLive, setDragLive] = useState(
    /** @type {null | { step: number, role: string, midi: number }} */ (null)
  )
  /** Local draft text while a chord field is focused */
  const [drafts, setDrafts] = useState(/** @type {Record<number, string>} */ ({}))
  const [focusedStep, setFocusedStep] = useState(/** @type {number | null} */ (null))
  const [fieldError, setFieldError] = useState(/** @type {Record<number, string>} */ ({}))
  const [progDraft, setProgDraft] = useState('')
  const [progError, setProgError] = useState('')

  const lineGap = 8
  const symbolBand = 36
  const staffTop = symbolBand + 14
  const staffH = 4 * lineGap
  const n = GIANT_STEPS.length
  const chordsPerBar = SCORE_CHORDS_PER_BAR

  const fifths = Math.max(KEY_SIG_MIN, Math.min(KEY_SIG_MAX, keySigFifths | 0))
  const preferFlats = preferFlatsFromKeySig(fifths)
  const accCount = Math.abs(fifths)
  const accOrder = fifths >= 0 ? SHARP_ORDER : FLAT_ORDER
  const accGlyph = fifths >= 0 ? '♯' : '♭'

  const harmony = useMemo(
    () => detectProgressionHarmony(progressionRootPcs(voicings)),
    [voicings]
  )

  const clefW = 28
  const accSlot = 11
  const keySigW = Math.max(accCount * accSlot + 4, 8)
  const timeSigW = 22
  const leftPad = 8 + clefW + keySigW + timeSigW + 10
  const slotW = 70
  const width = leftPad + n * slotW + 14
  const height = staffTop + staffH + 40
  const keySigStartX = 8 + clefW
  const timeSigX = keySigStartX + keySigW + 2

  const bars = useMemo(() => {
    return GIANT_STEPS.map((spec, i) => {
      const base = resolveShellVoicing(i, voicings?.[i])
      let v = base
      if (dragLive && dragLive.step === i) {
        v = { ...base, [dragLive.role]: dragLive.midi }
      }
      const analyzed = analyzeChordFromMidis([v.root, v.cos, v.tan], {
        preferFlats,
        colorForRoot: (pc) => colorForProgressionRoot(pc, harmony),
      })
      return {
        i,
        color: analyzed.color,
        symbol: analyzed.symbol,
        quality: analyzed.quality,
        rootPc: analyzed.rootPc,
        voicing: v,
        roles: rolesOf(v),
      }
    })
  }, [voicings, dragLive, preferFlats, harmony])

  const clientToSvgY = useCallback((clientY) => {
    const svg = svgRef.current
    if (!svg) return 0
    const pt = svg.createSVGPoint()
    pt.x = 0
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return 0
    return pt.matrixTransform(ctm.inverse()).y
  }, [])

  const applyChordSymbol = useCallback(
    (step, text) => {
      if (!onVoicingChange) return false
      const trimmed = (text || '').trim()
      if (!trimmed) {
        setFieldError((e) => ({ ...e, [step]: 'Type a chord (e.g. C, Am, F, G7)' }))
        return false
      }
      const parsed = parseChordSymbol(trimmed)
      if (!parsed) {
        setFieldError((e) => ({
          ...e,
          [step]: `Could not parse “${trimmed}” — try C, Am, F, G, D7, Bb…`,
        }))
        return false
      }
      // Always snap to strict root position (root < 3rd/5th < 5th/7th)
      const voicing = buildShellVoicing(parsed.rootPc, parsed.cosInt, parsed.tanInt)
      onVoicingChange(step, voicing)
      // Audible confirm: arpeggiate the snapped triad/7th
      previewShellPitch(voicing.root)
      window.setTimeout(() => previewShellPitch(voicing.cos), 80)
      window.setTimeout(() => previewShellPitch(voicing.tan), 160)

      setFieldError((e) => {
        const n = { ...e }
        delete n[step]
        return n
      })
      setDrafts((d) => {
        const n = { ...d }
        // Keep the canonical symbol in the field
        n[step] = parsed.symbol
        return n
      })
      // Clear draft on next tick so controlled value switches to analyzed symbol
      window.setTimeout(() => {
        setDrafts((d) => {
          const n = { ...d }
          delete n[step]
          return n
        })
      }, 0)
      return true
    },
    [onVoicingChange]
  )

  const applyProgressionLine = useCallback(() => {
    if (!onVoicingChange) return
    const parsed = parseProgressionString(progDraft, ARP_STEPS_PER_REV)
    if (parsed.length === 0) {
      setProgError('Could not parse — try: C Am F G   or   C | Am | F | G')
      return
    }
    setProgError('')
    parsed.forEach((p, i) => {
      const voicing = buildShellVoicing(p.rootPc, p.cosInt, p.tanInt)
      onVoicingChange(i, voicing)
    })
    // Preview first chord
    const v0 = buildShellVoicing(parsed[0].rootPc, parsed[0].cosInt, parsed[0].tanInt)
    previewShellPitch(v0.root)
    window.setTimeout(() => previewShellPitch(v0.cos), 80)
    window.setTimeout(() => previewShellPitch(v0.tan), 160)
  }, [onVoicingChange, progDraft])

  const onPointerDown = (e, step, role) => {
    if (!onVoicingChange) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { step, role, pointerId: e.pointerId }
    const v = resolveShellVoicing(step, voicings?.[step])
    const midi = v[role]
    setDragLive({ step, role, midi })
    previewShellPitch(midi)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    const y = clientToSvgY(e.clientY)
    const midi = staffYToMidi(y, staffTop, lineGap)
    setDragLive((prev) => {
      if (prev && prev.step === d.step && prev.role === d.role && prev.midi === midi) {
        return prev
      }
      previewShellPitch(midi)
      return { step: d.step, role: d.role, midi }
    })
  }

  const endDrag = (e) => {
    const d = dragRef.current
    if (!d || (e && e.pointerId !== d.pointerId)) return
    const live = dragLive
    if (live && live.step === d.step && onVoicingChange) {
      const base = resolveShellVoicing(d.step, voicings?.[d.step])
      const next = { ...base, [d.role]: live.midi }
      onVoicingChange(d.step, next)
    }
    dragRef.current = null
    setDragLive(null)
  }

  const bumpKeySig = (delta) => {
    if (!onKeySigChange) return
    onKeySigChange(Math.max(KEY_SIG_MIN, Math.min(KEY_SIG_MAX, fifths + delta)))
  }

  /** Shift every shell voicing by ±1 octave (12 semitones), clamped to staff range. */
  const bumpOctave = useCallback(
    (dir) => {
      if (!onVoicingChange) return
      const delta = dir * 12
      let lo = Infinity
      let hi = -Infinity
      for (let i = 0; i < ARP_STEPS_PER_REV; i++) {
        const v = resolveShellVoicing(i, voicings?.[i])
        lo = Math.min(lo, v.root, v.cos, v.tan)
        hi = Math.max(hi, v.root, v.cos, v.tan)
      }
      if (delta < 0 && lo + delta < MIDI_MIN) return
      if (delta > 0 && hi + delta > MIDI_MAX) return
      for (let i = 0; i < ARP_STEPS_PER_REV; i++) {
        const v = resolveShellVoicing(i, voicings?.[i])
        onVoicingChange(i, {
          root: v.root + delta,
          cos: v.cos + delta,
          tan: v.tan + delta,
        })
      }
      // Audible feedback: root of current (or first) chord after shift
      const step = current >= 0 ? current : 0
      const v0 = resolveShellVoicing(step, voicings?.[step])
      previewShellPitch(v0.root + delta)
    },
    [onVoicingChange, voicings, current]
  )

  const octaveBounds = useMemo(() => {
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < ARP_STEPS_PER_REV; i++) {
      const v = resolveShellVoicing(i, voicings?.[i])
      lo = Math.min(lo, v.root, v.cos, v.tan)
      hi = Math.max(hi, v.root, v.cos, v.tan)
    }
    return { canDown: lo - 12 >= MIDI_MIN, canUp: hi + 12 <= MIDI_MAX }
  }, [voicings])

  const fifthsClamped = fifths

  return (
    <figure className="gs-score" aria-label="Editable Giant Steps score">
      <figcaption className="gs-score__caption">
        John Coltrane — <em>Giant Steps</em> opening ({SCORE_BARS_PER_REV} bars ·{' '}
        {SCORE_TIME_SIG.beats}/{SCORE_TIME_SIG.unit}). Type a chord name to snap notes to root
        position; drag for inversions. Key signature is <strong>manual only</strong> (modulation ≠
        key change). I–IV–V progressions use two colours; freer roots use the CoF rainbow.
      </figcaption>

      <div className="gs-score__toolbar" role="group" aria-label="Key signature">
        <span className="gs-score__toolbar-label">Key signature</span>
        <button
          type="button"
          className="gs-score__ksig-btn"
          onClick={() => bumpKeySig(-1)}
          disabled={!onKeySigChange || fifthsClamped <= KEY_SIG_MIN}
          title="Add a flat"
        >
          +♭
        </button>
        <button
          type="button"
          className="gs-score__ksig-btn"
          onClick={() => bumpKeySig(1)}
          disabled={!onKeySigChange || fifthsClamped >= KEY_SIG_MAX}
          title="Add a sharp"
        >
          +♯
        </button>
        <button
          type="button"
          className="gs-score__ksig-btn"
          onClick={() => onKeySigChange?.(0)}
          disabled={!onKeySigChange || fifthsClamped === 0}
        >
          C maj
        </button>
        <span className="gs-score__ksig-readout">
          {fifthsClamped === 0
            ? 'C major'
            : fifthsClamped > 0
              ? `${fifthsClamped}♯`
              : `${-fifthsClamped}♭`}
          {harmony.mode === 'IVV' ? ' · I–IV–V (2 colours)' : ' · CoF rainbow'}
        </span>
      </div>

      {/* Whole progression at once — easiest for simple triad progressions */}
      <div className="gs-score__prog-row">
        <label className="gs-score__prog-label" htmlFor="gs-prog-input">
          Progression
        </label>
        <input
          id="gs-prog-input"
          className={`gs-score__prog-input${progError ? ' is-error' : ''}`}
          value={progDraft}
          spellCheck={false}
          placeholder="e.g. C Am F G   or   C | Am | F | G7"
          title="Space- or | -separated chords; fills slots from the left in root position"
          onChange={(e) => {
            setProgDraft(e.target.value)
            setProgError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applyProgressionLine()
            }
          }}
        />
        <button type="button" className="gs-score__ksig-btn" onClick={applyProgressionLine}>
          Apply
        </button>
      </div>
      {progError && <p className="gs-score__field-error">{progError}</p>}

      <div className="gs-score__octave-row" role="group" aria-label="Octave">
        <span className="gs-score__prog-label">Octave</span>
        <button
          type="button"
          className="gs-score__ksig-btn"
          onClick={() => bumpOctave(-1)}
          disabled={!onVoicingChange || !octaveBounds.canDown}
          title="Lower all notes one octave"
          aria-label="Octave down"
        >
          −
        </button>
        <button
          type="button"
          className="gs-score__ksig-btn"
          onClick={() => bumpOctave(1)}
          disabled={!onVoicingChange || !octaveBounds.canUp}
          title="Raise all notes one octave"
          aria-label="Octave up"
        >
          +
        </button>
      </div>

      {/* Per-slot typable chord symbols */}
      <div
        className="gs-score__inputs"
        style={{
          paddingLeft: leftPad,
          gridTemplateColumns: `repeat(${n}, ${slotW}px)`,
        }}
      >
        {bars.map((bar) => {
          const focused = focusedStep === bar.i
          const value =
            focused && drafts[bar.i] != null ? drafts[bar.i] : bar.symbol
          const err = fieldError[bar.i]
          return (
            <div key={bar.i} className="gs-score__chord-field">
              <input
                className={`gs-score__chord-input${bar.i === current ? ' is-current' : ''}${err ? ' is-error' : ''}`}
                style={{ color: bar.color, borderColor: err ? '#e11d48' : bar.color }}
                value={value}
                spellCheck={false}
                aria-label={`Chord ${bar.i + 1}`}
                placeholder="C"
                title="Type a triad (C, Am, F) or seventh (D7, Gmaj7) — snaps to root position"
                onFocus={() => {
                  setFocusedStep(bar.i)
                  setDrafts((d) => ({ ...d, [bar.i]: bar.symbol }))
                  setFieldError((e) => {
                    const n = { ...e }
                    delete n[bar.i]
                    return n
                  })
                }}
                onChange={(e) => {
                  const t = e.target.value
                  setDrafts((d) => ({ ...d, [bar.i]: t }))
                }}
                onBlur={(e) => {
                  setFocusedStep(null)
                  // Only commit if text changed from displayed symbol
                  const t = e.target.value.trim()
                  if (t && t !== bar.symbol) applyChordSymbol(bar.i, t)
                  else {
                    setDrafts((d) => {
                      const n = { ...d }
                      delete n[bar.i]
                      return n
                    })
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const ok = applyChordSymbol(bar.i, e.currentTarget.value)
                    if (ok) {
                      // Focus next chord field
                      const next = e.currentTarget
                        .closest('.gs-score__inputs')
                        ?.querySelectorAll('input')?.[bar.i + 1]
                      if (next) next.focus()
                      else e.currentTarget.blur()
                    }
                  }
                  if (e.key === 'Escape') {
                    setDrafts((d) => {
                      const n = { ...d }
                      delete n[bar.i]
                      return n
                    })
                    setFieldError((er) => {
                      const n = { ...er }
                      delete n[bar.i]
                      return n
                    })
                    e.currentTarget.blur()
                  }
                }}
              />
              {err && <span className="gs-score__field-error">{err}</span>}
            </div>
          )
        })}
      </div>

      <div className="gs-score__scroll">
        <svg
          ref={svgRef}
          className="gs-score__svg"
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <title>Giant Steps excerpt — type chords or drag notes</title>

          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`ln-${i}`}
              x1={leftPad - 8}
              y1={staffTop + i * lineGap}
              x2={width - 6}
              y2={staffTop + i * lineGap}
              className="gs-score__staff-line"
            />
          ))}

          <text x={6} y={staffTop + 3.15 * lineGap} className="gs-score__clef" aria-hidden="true">
            𝄞
          </text>

          {Array.from({ length: accCount }, (_, i) => {
            const acc = accOrder[i]
            const x = keySigStartX + 2 + i * 11
            const y = staffTop + acc.yLines * lineGap
            return (
              <text key={`acc-${i}`} x={x} y={y + 3} className="gs-score__accidental">
                {accGlyph}
              </text>
            )
          })}

          <text
            x={timeSigX}
            y={staffTop + 1.35 * lineGap}
            className="gs-score__timesig"
            textAnchor="middle"
          >
            {SCORE_TIME_SIG.beats}
          </text>
          <text
            x={timeSigX}
            y={staffTop + 3.15 * lineGap}
            className="gs-score__timesig"
            textAnchor="middle"
          >
            {SCORE_TIME_SIG.unit}
          </text>

          <line
            x1={leftPad - 4}
            y1={staffTop}
            x2={leftPad - 4}
            y2={staffTop + staffH}
            className="gs-score__barline gs-score__barline--strong"
          />

          {bars.map((bar, idx) => {
            const cx = leftPad + idx * slotW + slotW / 2
            const isCurrent = idx === current
            const sorted = [...bar.roles].sort((a, b) => a.midi - b.midi)
            const ys = sorted.map((r) => midiToStaffY(r.midi, staffTop, lineGap))
            const yLo = Math.max(...ys)
            const yHi = Math.min(...ys)
            const stemUp = (yLo + yHi) / 2 > staffTop + 2 * lineGap
            const stemX = cx + 6
            const xOff = sorted.map(() => 0)
            for (let i = 1; i < sorted.length; i++) {
              if (Math.abs(ys[i] - ys[i - 1]) < lineGap * 0.55) xOff[i] = 7
            }
            const barStart = idx > 0 && idx % chordsPerBar === 0

            return (
              <g
                key={bar.i}
                className={isCurrent ? 'gs-score__chord is-current' : 'gs-score__chord'}
              >
                {barStart && (
                  <line
                    x1={leftPad + idx * slotW}
                    y1={staffTop - 2}
                    x2={leftPad + idx * slotW}
                    y2={staffTop + staffH + 2}
                    className="gs-score__barline"
                  />
                )}

                <line
                  x1={stemX}
                  y1={stemUp ? yLo : yHi}
                  x2={stemX}
                  y2={stemUp ? yHi - 16 : yLo + 16}
                  stroke={bar.color}
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  pointerEvents="none"
                />

                {sorted.map((note, ni) => {
                  const y = ys[ni]
                  const x = cx + xOff[ni]
                  const ledgers = ledgerYs(note.midi, staffTop, lineGap)
                  const dragging =
                    dragLive && dragLive.step === bar.i && dragLive.role === note.role
                  return (
                    <g key={`${bar.i}-${note.role}`}>
                      {ledgers.map((ly) => (
                        <line
                          key={ly}
                          x1={x - 9}
                          y1={ly}
                          x2={x + 9}
                          y2={ly}
                          stroke={bar.color}
                          strokeWidth="1.15"
                          opacity="0.9"
                          pointerEvents="none"
                        />
                      ))}
                      <ellipse
                        cx={x}
                        cy={y}
                        rx={12}
                        ry={10}
                        fill="transparent"
                        className="gs-score__hit"
                        style={{ cursor: onVoicingChange ? 'ns-resize' : 'default' }}
                        onPointerDown={(e) => onPointerDown(e, bar.i, note.role)}
                      />
                      <ellipse
                        cx={x}
                        cy={y}
                        rx={5.4}
                        ry={3.8}
                        fill={bar.color}
                        stroke={dragging || isCurrent ? 'var(--text)' : 'none'}
                        strokeWidth={dragging ? 2 : isCurrent ? 1.3 : 0}
                        transform={`rotate(-18 ${x} ${y})`}
                        pointerEvents="none"
                        className={dragging ? 'gs-score__head is-dragging' : 'gs-score__head'}
                      />
                    </g>
                  )
                })}

                {isCurrent && (
                  <rect
                    x={leftPad + idx * slotW + 2}
                    y={2}
                    width={slotW - 4}
                    height={height - 6}
                    rx="4"
                    className="gs-score__active-ring"
                    fill="none"
                    pointerEvents="none"
                  />
                )}
              </g>
            )
          })}

          <line
            x1={leftPad + n * slotW}
            y1={staffTop}
            x2={leftPad + n * slotW}
            y2={staffTop + staffH}
            className="gs-score__barline gs-score__barline--strong"
          />
        </svg>
      </div>

      <p className="gs-score__hint">
        Type chords: triads <code>C</code>/<code>Am</code> (root–3rd–5th) or sevenths{' '}
        <code>D7</code>/<code>Gmaj7</code> (root–3rd–7th). Voices: sin=root, cos=3rd|5th, tan=5th|7th.
        Drag for inversions. Key signature is manual. Fixed: 4/4 · {SCORE_BARS_PER_REV} bars ·{' '}
        {ARP_STEPS_PER_REV} chords / θ turn.
        {harmony.mode === 'IVV'
          ? ' This progression is I–IV–V only → two colours (tonic vs IV/V).'
          : ' Free / circle-of-fifths roots → full rainbow colours.'}
      </p>
      <p className="gs-score__legend">
        <span className="gs-score__legend-label">
          {harmony.mode === 'IVV'
            ? 'I–IV–V colouring (tonic vs dominant function):'
            : 'Root → colour (circle of fifths):'}
        </span>
        {harmony.mode === 'IVV' ? (
          <>
            <span className="gs-score__swatch">
              <i
                style={{
                  background: colorForProgressionRoot(harmony.tonic, harmony),
                }}
              />
              I (tonic)
            </span>
            <span className="gs-score__swatch">
              <i
                style={{
                  background: colorForProgressionRoot((harmony.tonic + 7) % 12, harmony),
                }}
              />
              IV / V
            </span>
          </>
        ) : (
          COF_RAINBOW.map((hex, i) => {
            const roots = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'F']
            return (
              <span key={hex} className="gs-score__swatch" title={roots[i]}>
                <i style={{ background: hex }} />
                {roots[i]}
              </span>
            )
          })
        )}
      </p>
    </figure>
  )
}
