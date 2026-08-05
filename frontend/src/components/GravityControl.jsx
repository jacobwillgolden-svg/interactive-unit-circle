import { useEffect, useState } from 'react'
import { G_PRESETS } from '../utils/constants'

/**
 * Gravity control: typable number field + slider + Earth / 10 / Moon presets.
 * Typing 10 or 1.62 is easy; scrubbing alone is not.
 */
export default function GravityControl({
  g,
  onChange,
  min = 0.1,
  max = 25,
  id = 'g-input',
}) {
  const [text, setText] = useState(() => formatG(g))

  useEffect(() => {
    setText(formatG(g))
  }, [g])

  const commit = (raw) => {
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'))
    if (!Number.isFinite(n)) {
      setText(formatG(g))
      return
    }
    const clamped = Math.min(max, Math.max(min, n))
    onChange(clamped)
    setText(formatG(clamped))
  }

  return (
    <div className="gravity-control">
      <div className="gravity-control-head">
        <label className="gravity-control-label" htmlFor={id}>
          g <span className="gravity-control-unit">m/s²</span>
        </label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          className="gravity-control-input"
          value={text}
          aria-label="Gravity g in meters per second squared"
          title="Type any value (e.g. 10, 1.62 moon, 9.80665 earth)"
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            const n = parseFloat(v.replace(',', '.'))
            if (Number.isFinite(n) && n >= min && n <= max) {
              onChange(n)
            }
          }}
          onBlur={() => commit(text)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(text)
              e.currentTarget.blur()
            }
          }}
        />
      </div>

      <input
        type="range"
        className="gravity-control-range"
        min={min}
        max={max}
        step="any"
        value={clamp(g, min, max)}
        aria-label="Gravity g slider"
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <div className="gravity-presets" role="group" aria-label="Common g values">
        {G_PRESETS.map((p) => {
          const active = Math.abs(g - p.value) < 1e-6
          return (
            <button
              key={p.id}
              type="button"
              className={`gravity-preset${active ? ' is-active' : ''}`}
              title={p.title}
              onClick={() => onChange(p.value)}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatG(n) {
  if (!Number.isFinite(n)) return ''
  // Enough digits for gₙ = 9.80665; drop trailing zeros
  const s = n.toFixed(5).replace(/\.?0+$/, '')
  return s === '-0' ? '0' : s
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}
