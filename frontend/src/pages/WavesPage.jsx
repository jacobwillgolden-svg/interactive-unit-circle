import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { formatCoords, formatRadLabel, snapCommonAngle } from '../utils/angles'

/**
 * Classic derivation view: unit circle with sine & cosine waves
 * “unwrapped” and superimposed as the angle advances.
 */
export default function WavesPage() {
  const { theme } = useOutletContext()
  const [angle, setAngle] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [showSin, setShowSin] = useState(true)
  const [showCos, setShowCos] = useState(true)
  const [showCoords, setShowCoords] = useState(true)
  const [coordsInRadians, setCoordsInRadians] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState(false)
  const svgRef = useRef(null)

  useEffect(() => {
    if (!playing || dragging) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      setAngle((a) => (a + dt * 40 * speed) % 360)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, dragging])

  const isLight = theme === 'light'
  const ink = isLight ? '#0f172a' : '#e8eaf0'
  const muted = isLight ? '#64748b' : '#8b92a5'
  const grid = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'
  const panelFill = isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.02)'

  // Layout: circle left (with side buffer for coord labels), waves right
  const circlePad = 110
  const W = 920 + circlePad
  const H = 420
  const cx = 150 + circlePad
  const cy = H / 2
  const R = 100
  const waveX0 = 290 + circlePad
  const waveW = 560
  const amp = R

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const px = cx + cos * R
  const py = cy - sin * R

  // Wider snap so exact √ forms show while scrubbing near common angles
  const nearCommon = snapCommonAngle(angle, 1.5)
  const coordsLabel = (() => {
    if (coordsInRadians && nearCommon !== null) {
      return formatCoords(nearCommon, cos, sin, true, 2)
    }
    if (coordsInRadians) {
      // Always distinct from degrees: show values as cos/sin of θ with rad emphasis
      return `(${cos.toFixed(2)}, ${sin.toFixed(2)})`
    }
    return `(${cos.toFixed(2)}, ${sin.toFixed(2)})`
  })()
  const radLabel = formatRadLabel(nearCommon !== null ? nearCommon : angle)
  // Degrees mode: θ in ° · Radians mode: θ as π fraction or decimal rad
  const angleLabel = coordsInRadians
    ? nearCommon !== null
      ? `θ = ${radLabel}`
      : `θ = ${rad.toFixed(3)}`
    : `θ = ${angle.toFixed(1)}°`

  const coordFill = isLight ? '#b45309' : '#f0d9a8'
  const labelAnchor = cos >= 0 ? 'start' : 'end'
  const labelX = px + (cos >= 0 ? 12 : -12)
  const labelY = py + (sin >= 0 ? -10 : 16)

  const getAngleFromEvent = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current
      if (!svg) return angle
      const rect = svg.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const sx = (clientX - rect.left) * scaleX
      const sy = (clientY - rect.top) * scaleY
      const dx = sx - cx
      const dy = cy - sy
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI
      if (deg < 0) deg += 360
      return deg
    },
    [angle]
  )

  const canDrag = !playing || dragging

  const handlePointerDown = (e) => {
    // Only allow circle dragging when paused
    if (playing) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const sx = (e.clientX - rect.left) * scaleX
    const sy = (e.clientY - rect.top) * scaleY
    const dist = Math.hypot(sx - cx, sy - cy)
    // Hit-test near the circle (or anywhere in circle region)
    if (dist > R + 40) return
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    setAngle(getAngleFromEvent(e.clientX, e.clientY))
  }

  const handlePointerMove = (e) => {
    if (!dragging) return
    setAngle(getAngleFromEvent(e.clientX, e.clientY))
  }

  const handlePointerUp = (e) => {
    if (!dragging) return
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
  }

  // Wave history: θ from 0 → current
  const history = useMemo(() => {
    const pts = []
    const steps = 360
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.min(angle, 360)
      const tr = (t * Math.PI) / 180
      pts.push({
        t,
        x: waveX0 + (t / 360) * waveW,
        sinY: cy - Math.sin(tr) * amp,
        cosY: cy - Math.cos(tr) * amp,
      })
    }
    return pts
  }, [angle, amp, cy, waveW, waveX0])

  const sinPath = history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.sinY}`).join(' ')
  const cosPath = history.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.cosY}`).join(' ')

  const scanX = waveX0 + (angle / 360) * waveW
  const sinScanY = cy - sin * amp
  const cosScanY = cy - cos * amp

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Derivation</p>
          <h1>
            Sine & cosine <em>from the circle</em>
          </h1>
          <p className="hero-copy">
            As the point travels around the unit circle, its height unrolls into a sine wave
            and its x-coordinate into a cosine wave — same θ, two projections.
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">θ</span>
            {coordsInRadians ? (
              <>
                <div className="value">{nearCommon !== null ? radLabel : rad.toFixed(3)}</div>
                <div className="sub">{angle.toFixed(1)}° · {rad.toFixed(4)} rad</div>
              </>
            ) : (
              <>
                <div className="value">{angle.toFixed(1)}°</div>
                <div className="sub">{rad.toFixed(3)} rad</div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="workspace workspace--single">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Unit circle → waves</span>
            <span className="panel-hint">
              {playing ? 'Pause to drag the point on the circle' : 'Drag the point on the unit circle'}
            </span>
          </div>

          <div className="viz-body">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className={`waves-svg${canDrag && !playing ? ' is-draggable' : ''}`}
              role="img"
              aria-label="Unit circle with sine and cosine waves"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Wave axes */}
              <line x1={waveX0} y1={cy} x2={waveX0 + waveW} y2={cy} stroke={grid} strokeWidth="1" />
              <line x1={waveX0} y1={cy - amp} x2={waveX0} y2={cy + amp} stroke={grid} strokeWidth="1" />
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line
                    x1={waveX0 + f * waveW}
                    y1={cy - amp}
                    x2={waveX0 + f * waveW}
                    y2={cy + amp}
                    stroke={grid}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={waveX0 + f * waveW}
                    y={cy + amp + 22}
                    textAnchor="middle"
                    fontSize="11"
                    fill={muted}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {f === 1 ? '2π' : f === 0.5 ? 'π' : f === 0.25 ? 'π/2' : '3π/2'}
                  </text>
                </g>
              ))}
              <text x={waveX0 - 8} y={cy - amp + 4} textAnchor="end" fontSize="11" fill={muted} fontFamily="JetBrains Mono, monospace">
                1
              </text>
              <text x={waveX0 - 8} y={cy + amp + 4} textAnchor="end" fontSize="11" fill={muted} fontFamily="JetBrains Mono, monospace">
                −1
              </text>

              {/* Circle */}
              <circle cx={cx} cy={cy} r={R} fill={panelFill} stroke={ink} strokeOpacity="0.35" strokeWidth="1.5" />
              {/* Invisible hit area for easier dragging */}
              {!playing && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={R + 28}
                  fill="transparent"
                  stroke="none"
                  style={{ cursor: 'grab' }}
                />
              )}
              <line x1={cx - R - 16} y1={cy} x2={cx + R + 16} y2={cy} stroke={grid} />
              <line x1={cx} y1={cy - R - 16} x2={cx} y2={cy + R + 16} stroke={grid} />

              {/* Guide lines from circle to waves */}
              {showSin && (
                <>
                  <line x1={px} y1={py} x2={scanX} y2={sinScanY} stroke="#dc2626" strokeOpacity="0.25" strokeDasharray="4 4" />
                  <line x1={px} y1={py} x2={px} y2={cy} stroke="#dc2626" strokeWidth="2.5" />
                </>
              )}
              {showCos && (
                <>
                  <line x1={px} y1={py} x2={scanX} y2={cosScanY} stroke="#2563eb" strokeOpacity="0.2" strokeDasharray="4 4" />
                  <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#2563eb" strokeWidth="2.5" />
                </>
              )}

              <line x1={cx} y1={cy} x2={px} y2={py} stroke={ink} strokeWidth="2" />
              <circle
                cx={px}
                cy={py}
                r={dragging ? 9 : 7}
                fill={isLight ? '#fff' : '#07080c'}
                stroke="#7dd3fc"
                strokeWidth="2"
                style={{ cursor: playing ? 'default' : dragging ? 'grabbing' : 'grab' }}
              />

              {showCoords && (
                <>
                  <text
                    x={labelX}
                    y={labelY}
                    fontSize="11"
                    fill={coordFill}
                    textAnchor={labelAnchor}
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="500"
                  >
                    {coordsLabel}
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 13}
                    fontSize="10"
                    fill={coordFill}
                    opacity="0.9"
                    textAnchor={labelAnchor}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {angleLabel}
                  </text>
                </>
              )}

              {/* Waves */}
              {showCos && (
                <path d={cosPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
              )}
              {showSin && (
                <path d={sinPath} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
              )}

              {/* Scan line + markers */}
              <line x1={scanX} y1={cy - amp - 8} x2={scanX} y2={cy + amp + 8} stroke={muted} strokeOpacity="0.5" strokeDasharray="3 3" />
              {showSin && <circle cx={scanX} cy={sinScanY} r={5} fill="#dc2626" />}
              {showCos && <circle cx={scanX} cy={cosScanY} r={5} fill="#2563eb" />}

              {/* Labels */}
              <text x={cx} y={28} textAnchor="middle" fontSize="12" fill={muted} letterSpacing="0.12em">
                UNIT CIRCLE
              </text>
              <text x={waveX0 + waveW / 2} y={28} textAnchor="middle" fontSize="12" fill={muted} letterSpacing="0.12em">
                UNWRAPPED WAVES
              </text>
            </svg>

            <div className="waves-controls">
              <div className="wave-toolbar">
                <button type="button" className="btn-primary" onClick={() => setPlaying((p) => !p)}>
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAngle(0)}>
                  Reset
                </button>
                <label className="inline-slider">
                  <span>Speed</span>
                  <input
                    type="range"
                    min="0.25"
                    max="2.5"
                    step="0.05"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  />
                </label>
                <label className="inline-slider">
                  <span>Angle</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="0.5"
                    value={angle}
                    onChange={(e) => {
                      setPlaying(false)
                      setAngle(parseFloat(e.target.value))
                    }}
                  />
                </label>
              </div>

              <div className="metrics metrics--inline">
                <div className="metric metric--sin">
                  <span className="metric-label">sin θ</span>
                  <span className="metric-value">{sin.toFixed(4)}</span>
                </div>
                <div className="metric metric--cos">
                  <span className="metric-label">cos θ</span>
                  <span className="metric-value">{cos.toFixed(4)}</span>
                </div>
                <label className={`chip-toggle${showSin ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={showSin} onChange={(e) => setShowSin(e.target.checked)} />
                  Sine
                </label>
                <label className={`chip-toggle${showCos ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={showCos} onChange={(e) => setShowCos(e.target.checked)} />
                  Cosine
                </label>
                <label className={`chip-toggle${showCoords ? ' is-on' : ''}`}>
                  <input type="checkbox" checked={showCoords} onChange={(e) => setShowCoords(e.target.checked)} />
                  Coordinates
                </label>
                <label
                  className={`chip-toggle${coordsInRadians ? ' is-on' : ''}${!showCoords ? ' is-disabled' : ''}`}
                  title={
                    coordsInRadians
                      ? 'Showing θ in radians (π form at common angles)'
                      : 'Showing θ in degrees — click to switch to radians'
                  }
                >
                  <input
                    type="checkbox"
                    checked={coordsInRadians}
                    disabled={!showCoords}
                    onChange={(e) => setCoordsInRadians(e.target.checked)}
                  />
                  {coordsInRadians ? 'θ in radians' : 'θ in degrees'}
                </label>
              </div>

              <p className="derive-note">
                <strong>Idea:</strong> plot height vs θ for sine, and x vs θ for cosine. One full trip
                around the circle is one full period of each wave (0 → 2π).
                {!playing && ' Drag the point on the unit circle to set θ.'}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
