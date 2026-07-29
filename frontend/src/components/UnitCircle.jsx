import { useEffect, useRef, useState } from 'react'
import {
  formatCoords,
  formatRadLabel,
  formatTrig,
  snapCommonAngle,
} from '../utils/angles'

export default function UnitCircle({
  angle,
  onAngleChange,
  showSin,
  showCos,
  showTan,
  showLabels,
  labelsInRadians,
  showCoords,
  coordsInRadians,
  showSohcahtoa = false,
  snapPulse = 0,
  theme = 'dark',
}) {
  const svgRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [pulseOn, setPulseOn] = useState(false)

  useEffect(() => {
    if (!snapPulse) return
    setPulseOn(true)
    const t = setTimeout(() => setPulseOn(false), 450)
    return () => clearTimeout(t)
  }, [snapPulse])

  // Extra padding so coord labels + left SOHCAHTOA card are not clipped
  const radius = 175
  const pad = 190
  const size = radius * 2 + pad * 2
  const center = size / 2

  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad)
  const y = Math.sin(rad)

  const pointX = center + x * radius
  const pointY = center - y * radius

  const cos = x
  const sin = y
  const tan = Math.abs(cos) < 0.0001 ? Infinity : sin / cos
  // True tangent at P: line x·cos + y·sin = 1 (unit plane).
  // Segment P → x-intercept (sec, 0) lies on that tangent (MathIsFun geometry).
  const TAN_MAX = 3.5 // clip far intercepts so the segment stays on-canvas
  let tanSeg = null
  if (Math.abs(cos) > 0.01 && Number.isFinite(tan)) {
    const secU = 1 / cos
    // Clip toward (sec, 0) if |sec| is huge
    let endU = secU
    let endV = 0
    if (Math.abs(endU) > TAN_MAX) {
      const du = endU - cos
      const dv = endV - sin
      const t = (Math.sign(endU) * TAN_MAX - cos) / du
      endU = cos + du * t
      endV = sin + dv * t
    }
    tanSeg = {
      x1: pointX,
      y1: pointY,
      x2: center + endU * radius,
      y2: center - endV * radius,
    }
  }
  const coordsLabel = formatCoords(angle, cos, sin, coordsInRadians, 3)
  const coordsLabelShort = formatCoords(angle, cos, sin, coordsInRadians, 2)
  const radLabel = formatRadLabel(angle)
  const nearSnap = snapCommonAngle(angle, 1.5) !== null
  const angleLabel = coordsInRadians
    ? `θ = ${radLabel}`
    : `θ = ${angle.toFixed(1)}°`

  const isLight = theme === 'light'
  const axisStroke = isLight ? 'rgba(15,23,42,0.14)' : 'rgba(255,255,255,0.12)'
  const circleStroke = isLight ? 'rgba(15,23,42,0.35)' : 'rgba(232,234,240,0.35)'
  const tickStroke = isLight ? 'rgba(15,23,42,0.28)' : 'rgba(255,255,255,0.2)'
  const hypotStroke = isLight ? '#0f172a' : '#e8eaf0'
  const labelFill = isLight ? '#64748b' : '#8b92a5'
  const angleLabelFill = isLight ? '#334155' : '#c8cdd9'
  const handleFill = isLight ? '#ffffff' : '#07080c'
  const originFill = isLight ? '#0f172a' : '#e8eaf0'
  const coordFill = isLight ? '#b45309' : '#f0d9a8'
  const arcStroke = isLight ? 'rgba(180, 83, 9, 0.75)' : 'rgba(240,217,168,0.7)'
  const ringStroke = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.04)'
  const triFill = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(125, 211, 252, 0.06)'

  // Angle arc
  const arcRadius = 42
  const largeArc = angle > 180 ? 1 : 0
  const arcEndX = center + Math.cos(rad) * arcRadius
  const arcEndY = center - Math.sin(rad) * arcRadius
  const arcPath =
    angle < 0.5
      ? ''
      : `M ${center + arcRadius} ${center} A ${arcRadius} ${arcRadius} 0 ${largeArc} 0 ${arcEndX} ${arcEndY}`

  const getAngleFromEvent = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = size / rect.width
    const scaleY = size / rect.height
    const svgX = (clientX - rect.left) * scaleX
    const svgY = (clientY - rect.top) * scaleY

    const dx = svgX - center
    const dy = center - svgY

    let degrees = (Math.atan2(dy, dx) * 180) / Math.PI
    if (degrees < 0) degrees += 360
    return degrees
  }

  const handlePointerDown = (e) => {
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    onAngleChange(getAngleFromEvent(e.clientX, e.clientY))
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    onAngleChange(getAngleFromEvent(e.clientX, e.clientY))
  }

  const handlePointerUp = (e) => {
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
  }

  // Keep labels inside the padded canvas near 0° / 180°
  const labelX = pointX + (x >= 0 ? 14 : -14)
  const labelY = pointY + (y >= 0 ? -14 : 20)
  const textAnchor = x >= 0 ? 'start' : 'end'

  return (
    <section className="panel unit-circle-panel">
      <div className="panel-header">
        <span className="panel-title">Canvas</span>
        <span className="panel-hint">Drag the point or anywhere on the circle</span>
      </div>

      <div className="unit-circle-container">
        <div className={`canvas-wrap${pulseOn ? ' is-pulse' : ''}${nearSnap ? ' is-near-snap' : ''}`}>
          <svg
            ref={svgRef}
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="unit-circle"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              <radialGradient id="circleGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(125,211,252,0.1)" />
                <stop offset="70%" stopColor="rgba(125,211,252,0.02)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0)" />
              </radialGradient>
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx={center} cy={center} r={radius + 36} fill="url(#circleGlow)" />

            <circle
              cx={center}
              cy={center}
              r={radius * 0.5}
              fill="none"
              stroke={ringStroke}
              strokeWidth="1"
            />

            <circle
              cx={center}
              cy={center}
              r={radius}
              fill={isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.015)'}
              stroke={circleStroke}
              strokeWidth="1.5"
            />

            {/* Snap pulse ring */}
            {pulseOn && (
              <circle
                cx={pointX}
                cy={pointY}
                r={18}
                fill="none"
                stroke="#7dd3fc"
                strokeWidth="2"
                className="snap-ring"
              />
            )}

            <line
              x1={center - radius - 24}
              y1={center}
              x2={center + radius + 24}
              y2={center}
              stroke={axisStroke}
              strokeWidth="1"
            />
            <line
              x1={center}
              y1={center - radius - 24}
              x2={center}
              y2={center + radius + 24}
              stroke={axisStroke}
              strokeWidth="1"
            />

            {[0, 90, 180, 270].map((a) => {
              const r = (a * Math.PI) / 180
              const tx = Math.cos(r)
              const ty = Math.sin(r)
              return (
                <line
                  key={a}
                  x1={center + tx * (radius - 6)}
                  y1={center - ty * (radius - 6)}
                  x2={center + tx * (radius + 6)}
                  y2={center - ty * (radius + 6)}
                  stroke={tickStroke}
                  strokeWidth="1.5"
                />
              )
            })}

            {arcPath && (
              <path
                d={arcPath}
                fill="none"
                stroke={arcStroke}
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}

            {(showCos || showSin) && (
              <polygon
                points={`${center},${center} ${pointX},${center} ${pointX},${pointY}`}
                fill={triFill}
                stroke="none"
              />
            )}

            {showCos && (
              <line
                x1={center}
                y1={center}
                x2={pointX}
                y2={center}
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {showSin && (
              <line
                x1={pointX}
                y1={center}
                x2={pointX}
                y2={pointY}
                stroke="#dc2626"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            <line
              x1={center}
              y1={center}
              x2={pointX}
              y2={pointY}
              stroke={hypotStroke}
              strokeWidth="2.25"
              strokeLinecap="round"
            />

            {showSohcahtoa && (
              <>
                <text
                  x={(center + pointX) / 2}
                  y={center + (pointY < center ? 18 : -10)}
                  fontSize="11"
                  fill="#2563eb"
                  textAnchor="middle"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="600"
                >
                  adjacent
                </text>
                <text
                  x={pointX + (x >= 0 ? 12 : -12)}
                  y={(center + pointY) / 2}
                  fontSize="11"
                  fill="#dc2626"
                  textAnchor={x >= 0 ? 'start' : 'end'}
                  fontFamily="Outfit, sans-serif"
                  fontWeight="600"
                >
                  opposite
                </text>
                <text
                  x={(center + pointX) / 2 + (y >= 0 ? -14 : 14)}
                  y={(center + pointY) / 2 + (x >= 0 ? -8 : 8)}
                  fontSize="11"
                  fill={angleLabelFill}
                  textAnchor="middle"
                  fontFamily="Outfit, sans-serif"
                  fontWeight="600"
                >
                  hypotenuse
                </text>
                {/* SOHCAHTOA card — bottom-left of canvas */}
                <g transform={`translate(12, ${size - 130})`}>
                  <rect
                    x={0}
                    y={0}
                    width={168}
                    height={118}
                    rx={10}
                    fill={isLight ? 'rgba(255,255,255,0.94)' : 'rgba(14,16,24,0.92)'}
                    stroke={isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'}
                  />
                  {/* sin θ = opp / hyp */}
                  <text x={12} y={28} fontSize="13" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#dc2626">
                    sin θ
                  </text>
                  <text x={52} y={28} fontSize="13" fontFamily="Outfit, sans-serif" fill={angleLabelFill}>
                    =
                  </text>
                  <text x={100} y={18} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#dc2626">
                    opposite
                  </text>
                  <line x1={68} y1={22} x2={132} y2={22} stroke={angleLabelFill} strokeWidth="1.25" />
                  <text x={100} y={36} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill={angleLabelFill}>
                    hypotenuse
                  </text>

                  {/* cos θ = adj / hyp */}
                  <text x={12} y={64} fontSize="13" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#2563eb">
                    cos θ
                  </text>
                  <text x={52} y={64} fontSize="13" fontFamily="Outfit, sans-serif" fill={angleLabelFill}>
                    =
                  </text>
                  <text x={100} y={54} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#2563eb">
                    adjacent
                  </text>
                  <line x1={68} y1={58} x2={132} y2={58} stroke={angleLabelFill} strokeWidth="1.25" />
                  <text x={100} y={72} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill={angleLabelFill}>
                    hypotenuse
                  </text>

                  {/* tan θ = opp / adj */}
                  <text x={12} y={100} fontSize="13" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#94a3b8">
                    tan θ
                  </text>
                  <text x={52} y={100} fontSize="13" fontFamily="Outfit, sans-serif" fill={angleLabelFill}>
                    =
                  </text>
                  <text x={100} y={90} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#dc2626">
                    opposite
                  </text>
                  <line x1={68} y1={94} x2={132} y2={94} stroke={angleLabelFill} strokeWidth="1.25" />
                  <text x={100} y={108} fontSize="11" textAnchor="middle" fontFamily="Outfit, sans-serif" fontWeight="600" fill="#2563eb">
                    adjacent
                  </text>
                </g>
              </>
            )}

            {showTan && tanSeg && (
              <line
                x1={tanSeg.x1}
                y1={tanSeg.y1}
                x2={tanSeg.x2}
                y2={tanSeg.y2}
                stroke="#ff9f1c"
                strokeWidth="2.25"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            )}

            <circle cx={center} cy={center} r={3.5} fill={originFill} opacity="0.7" />

            <circle
              className="handle"
              cx={pointX}
              cy={pointY}
              r={isDragging ? 12 : 10}
              fill={handleFill}
              stroke="#7dd3fc"
              strokeWidth="2.5"
              filter="url(#softGlow)"
              style={{ pointerEvents: 'all' }}
            />
            <circle
              cx={pointX}
              cy={pointY}
              r={4}
              fill="#7dd3fc"
              style={{ pointerEvents: 'none' }}
            />

            {showLabels && (
              <>
                <text x={center + radius + 14} y={center - 12} fontSize="12" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                  1
                </text>
                <text x={center - radius - 30} y={center - 12} fontSize="12" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                  −1
                </text>
                <text x={center + 12} y={center - radius - 12} fontSize="12" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                  1
                </text>
                <text x={center + 12} y={center + radius + 20} fontSize="12" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                  −1
                </text>
                <text
                  x={center + radius + 28}
                  y={center + 5}
                  fontSize="13"
                  fill={angleLabelFill}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelsInRadians ? '0' : '0°'}
                </text>
                <text
                  x={center}
                  y={center - radius - 28}
                  fontSize="13"
                  fill={angleLabelFill}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelsInRadians ? 'π/2' : '90°'}
                </text>
                <text
                  x={center - radius - 28}
                  y={center + 5}
                  fontSize="13"
                  fill={angleLabelFill}
                  textAnchor="end"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelsInRadians ? 'π' : '180°'}
                </text>
                <text
                  x={center}
                  y={center + radius + 38}
                  fontSize="13"
                  fill={angleLabelFill}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelsInRadians ? '3π/2' : '270°'}
                </text>
              </>
            )}

            {showCoords && (
              <>
                <text
                  x={labelX}
                  y={labelY}
                  fontSize="12"
                  fill={coordFill}
                  textAnchor={textAnchor}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="500"
                >
                  {coordsLabelShort}
                </text>
                <text
                  x={labelX}
                  y={labelY + 14}
                  fontSize="11"
                  fill={coordFill}
                  opacity="0.9"
                  textAnchor={textAnchor}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {angleLabel}
                </text>
              </>
            )}
          </svg>
        </div>

        <div className="metrics">
          <div className="metric">
            <span className="metric-label">Angle</span>
            <span className="metric-value">
              {coordsInRadians ? (
                <>
                  {radLabel}
                  <span className="metric-sub">{angle.toFixed(1)}°</span>
                </>
              ) : (
                <>
                  {angle.toFixed(1)}°
                  <span className="metric-sub">{radLabel}</span>
                </>
              )}
            </span>
          </div>
          <div className="metric metric--cos">
            <span className="metric-label">cos θ</span>
            <span className="metric-value">
              {formatTrig(angle, cos, sin, tan, 'cos', coordsInRadians)}
            </span>
          </div>
          <div className="metric metric--sin">
            <span className="metric-label">sin θ</span>
            <span className="metric-value">
              {formatTrig(angle, cos, sin, tan, 'sin', coordsInRadians)}
            </span>
          </div>
          <div className="metric metric--tan">
            <span className="metric-label">tan θ</span>
            <span className="metric-value">
              {formatTrig(angle, cos, sin, tan, 'tan', coordsInRadians)}
            </span>
          </div>
          {showCoords && (
            <div className="metric metric--point metric--wide">
              <span className="metric-label">
                Point (x, y){coordsInRadians ? ' · exact' : ''}
              </span>
              <span className="metric-value">
                {coordsLabel}
                {coordsInRadians && (
                  <span className="metric-sub">θ = {radLabel}</span>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
