import { useMemo } from 'react'
import {
  ARP_ROOT_BASE,
  COF_RAINBOW,
  GIANT_STEPS,
  angleToStep,
  pitchClassToFifthsIndex,
} from '../utils/trigMusic'

/** Jazz-friendly root spellings (match common Giant Steps charts) */
const ROOT_SPELL = {
  0: 'C',
  1: 'C♯',
  2: 'D',
  3: 'E♭',
  4: 'E',
  5: 'F',
  6: 'F♯',
  7: 'G',
  8: 'A♭',
  9: 'A',
  10: 'B♭',
  11: 'B',
}

/** Bottom line of treble staff = E4 (MIDI 64) */
function midiToStaffY(midi, staffTop, lineGap) {
  const e4 = 64
  const bottomLineY = staffTop + 4 * lineGap
  return bottomLineY - ((midi - e4) * lineGap) / 2
}

function shellOpenMidis(spec) {
  const root = ARP_ROOT_BASE + (((spec.pc % 12) + 12) % 12)
  return [root, root + spec.third, root + spec.seventh]
}

function shellInversions(open) {
  const [r, t, s7] = open
  const sets = [
    [r, t, s7],
    [r + 12, t + 12, s7 + 12],
    [r + 24, t + 24, s7 + 24],
    [r - 12, t - 12, s7 - 12],
    [t, s7, r + 12],
    [t + 12, s7 + 12, r + 24],
    [t - 12, s7 - 12, r],
    [s7, r + 12, t + 12],
    [s7 + 12, r + 24, t + 24],
    [s7 - 12, r, t],
  ]
  return sets.map((m) => [...m].sort((a, b) => a - b))
}

/**
 * Prefer voicings that sit ON the staff and stay clear of the chord-symbol band.
 * Chord labels live above y ≈ symbolClearY — keep noteheads below that.
 */
function rangeScore(midis, staffTop, lineGap) {
  const lo = midis[0]
  const hi = midis[midis.length - 1]
  const mid = (lo + hi) / 2
  const yHi = midiToStaffY(hi, staffTop, lineGap)
  let score = 0
  // Keep tops of chords under the symbol row (staffTop - 10)
  if (yHi >= staffTop - 6) score += 20
  else score -= (staffTop - 6 - yHi) * 2.5
  // Comfortable treble band
  if (lo >= 57 && lo <= 71) score += 10
  if (hi >= 62 && hi <= 79) score += 10
  if (hi > 81) score -= (hi - 81) * 4
  if (lo < 53) score -= (53 - lo) * 2
  const span = hi - lo
  score -= Math.max(0, span - 14) * 3
  score -= Math.abs(mid - 69) * 0.4
  return score
}

function pickVoicing(open, prev, staffTop, lineGap) {
  const cands = shellInversions(open)
  let best = cands[0]
  let bestScore = -Infinity
  for (const c of cands) {
    let s = rangeScore(c, staffTop, lineGap)
    if (prev && prev.length === 3) {
      let motion = 0
      for (let i = 0; i < 3; i++) motion += Math.abs(c[i] - prev[i])
      s -= motion * 0.5
    }
    if (s > bestScore) {
      bestScore = s
      best = c
    }
  }
  return best
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

function headOffsets(midis, staffTop, lineGap) {
  const ys = midis.map((m) => midiToStaffY(m, staffTop, lineGap))
  const off = midis.map(() => 0)
  for (let i = 1; i < midis.length; i++) {
    if (Math.abs(ys[i] - ys[i - 1]) < lineGap * 0.55) {
      off[i] = 6.5
    }
  }
  return off
}

/**
 * Treble-clef Giant Steps chart: full shell chords (root–3rd–7th) in staff
 * inversions; colours = CoF rainbow by root (same as audio).
 */
export default function GiantStepsScore({ angleDeg = 0, active = false }) {
  const current = active ? angleToStep(angleDeg) : -1

  const lineGap = 6.5
  // Extra headroom so chord symbols never collide with noteheads / ledgers
  const symbolBand = 28
  const staffTop = symbolBand + 18
  const staffH = 4 * lineGap
  const leftPad = 36
  const slotW = 44

  const bars = useMemo(() => {
    /** @type {{ i: number, color: string, symbol: string, midis: number[] }[]} */
    const out = []
    let prev = null
    for (let i = 0; i < GIANT_STEPS.length; i++) {
      const spec = GIANT_STEPS[i]
      const pc = ((spec.pc % 12) + 12) % 12
      const color = COF_RAINBOW[pitchClassToFifthsIndex(pc)]
      const root = ROOT_SPELL[pc] ?? 'C'
      const symbol = `${root}${spec.suffix}`
      const open = shellOpenMidis(spec)
      const midis = pickVoicing(open, prev, staffTop, lineGap)
      prev = midis
      out.push({ i, color, symbol, midis })
    }
    return out
  }, [staffTop, lineGap])

  const n = bars.length
  const width = leftPad + n * slotW + 12
  const height = staffTop + staffH + 28

  return (
    <figure className="gs-score" aria-label="Giant Steps chord progression on treble staff">
      <figcaption className="gs-score__caption">
        John Coltrane — <em>Giant Steps</em> (standard 16-bar form). Each change is a shell (root +
        3rd + 7th) in a staff-friendly inversion. <strong>Colour = circle-of-fifths rainbow for the
        chord’s root</strong> (same map as the sounding music).
      </figcaption>
      <div className="gs-score__scroll">
        <svg
          className="gs-score__svg"
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
        >
          <title>Giant Steps — treble staff, coloured by circle of fifths</title>

          {/* Reserved band for chord symbols (no notes drawn here) */}
          <rect
            x={0}
            y={0}
            width={width}
            height={symbolBand + 4}
            className="gs-score__symbol-band"
          />

          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={`ln-${i}`}
              x1={leftPad - 6}
              y1={staffTop + i * lineGap}
              x2={width - 6}
              y2={staffTop + i * lineGap}
              className="gs-score__staff-line"
            />
          ))}

          <text x={2} y={staffTop + 3.1 * lineGap} className="gs-score__clef" aria-hidden="true">
            𝄞
          </text>

          {bars.map((bar, idx) => {
            const cx = leftPad + idx * slotW + slotW / 2
            const isCurrent = idx === current
            const ys = bar.midis.map((m) => midiToStaffY(m, staffTop, lineGap))
            const yLo = Math.max(...ys)
            const yHi = Math.min(...ys)
            const offsets = headOffsets(bar.midis, staffTop, lineGap)
            const stemUp = (yLo + yHi) / 2 > staffTop + 2 * lineGap
            const stemX = cx + 5.5

            return (
              <g
                key={bar.i}
                className={isCurrent ? 'gs-score__chord is-current' : 'gs-score__chord'}
              >
                {idx > 0 && idx % 2 === 0 && (
                  <line
                    x1={leftPad + idx * slotW}
                    y1={staffTop - 2}
                    x2={leftPad + idx * slotW}
                    y2={staffTop + staffH + 2}
                    className="gs-score__barline"
                  />
                )}

                {/* Chord symbol — always in the reserved band above the staff */}
                <text
                  x={cx}
                  y={symbolBand - 8}
                  textAnchor="middle"
                  fill={bar.color}
                  className="gs-score__symbol"
                >
                  {bar.symbol}
                </text>

                <line
                  x1={stemX}
                  y1={stemUp ? yLo : yHi}
                  x2={stemX}
                  y2={stemUp ? yHi - 14 : yLo + 14}
                  stroke={bar.color}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />

                {bar.midis.map((midi, ni) => {
                  const y = ys[ni]
                  const x = cx + offsets[ni]
                  const ledgers = ledgerYs(midi, staffTop, lineGap)
                  return (
                    <g key={`${bar.i}-${midi}-${ni}`}>
                      {ledgers.map((ly) => (
                        <line
                          key={ly}
                          x1={x - 8}
                          y1={ly}
                          x2={x + 8}
                          y2={ly}
                          stroke={bar.color}
                          strokeWidth="1.1"
                          opacity="0.9"
                        />
                      ))}
                      <ellipse
                        cx={x}
                        cy={y}
                        rx={4.8}
                        ry={3.4}
                        fill={bar.color}
                        stroke={isCurrent ? 'var(--text)' : 'none'}
                        strokeWidth={isCurrent ? 1.25 : 0}
                        transform={`rotate(-18 ${x} ${y})`}
                      />
                    </g>
                  )
                })}

                {isCurrent && (
                  <rect
                    x={leftPad + idx * slotW + 1}
                    y={2}
                    width={slotW - 2}
                    height={height - 6}
                    rx="3"
                    className="gs-score__active-ring"
                    fill="none"
                  />
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="gs-score__legend">
        <span className="gs-score__legend-label">Root → colour (circle of fifths):</span>
        {COF_RAINBOW.map((hex, i) => {
          const roots = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'F']
          return (
            <span key={hex} className="gs-score__swatch" title={roots[i]}>
              <i style={{ background: hex }} />
              {roots[i]}
            </span>
          )
        })}
      </p>
    </figure>
  )
}
