import { useRef, useState } from 'react'

export default function UnitCircle({
  angle,
  onAngleChange,
  showSin,
  showCos,
  showTan,
  showLabels,
}) {
  const svgRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const size = 500
  const center = size / 2
  const radius = 180

  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad)
  const y = Math.sin(rad)

  const pointX = center + x * radius
  const pointY = center - y * radius

  const cos = x
  const sin = y
  const tan = Math.abs(cos) < 0.0001 ? Infinity : sin / cos

  const getAngleFromEvent = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    const svgX = clientX - rect.left
    const svgY = clientY - rect.top

    const dx = svgX - center
    const dy = center - svgY

    let degrees = (Math.atan2(dy, dx) * 180) / Math.PI
    if (degrees < 0) degrees += 360
    return degrees
  }

  const handlePointerDown = (e) => {
    setIsDragging(true)
    e.target.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e) => {
    if (!isDragging) return
    const newAngle = getAngleFromEvent(e.clientX, e.clientY)
    onAngleChange(newAngle)
  }

  const handlePointerUp = (e) => {
    setIsDragging(false)
    e.target.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="unit-circle-container">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="unit-circle"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#333" strokeWidth="2" />
        <line x1={center - radius - 20} y1={center} x2={center + radius + 20} y2={center} stroke="#666" strokeWidth="1.5" />
        <line x1={center} y1={center - radius - 20} x2={center} y2={center + radius + 20} stroke="#666" strokeWidth="1.5" />

        {showCos && (
          <line x1={center} y1={center} x2={pointX} y2={center} stroke="#2563eb" strokeWidth="3" />
        )}

        {showSin && (
          <line x1={pointX} y1={center} x2={pointX} y2={pointY} stroke="#dc2626" strokeWidth="3" />
        )}

        <line x1={center} y1={center} x2={pointX} y2={pointY} stroke="#111" strokeWidth="2" />

        {showTan && Math.abs(cos) > 0.01 && (
          <line
            x1={pointX}
            y1={pointY}
            x2={center + radius * Math.sign(cos)}
            y2={pointY}
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
        )}

        <circle
          cx={pointX}
          cy={pointY}
          r={10}
          fill="#111"
          stroke="white"
          strokeWidth="2"
          style={{ cursor: 'grab' }}
          onPointerDown={handlePointerDown}
        />

        {showLabels && (
          <>
            <text x={center + radius + 28} y={center + 5} fontSize="14" fill="#666">1</text>
            <text x={center - radius - 38} y={center + 5} fontSize="14" fill="#666">-1</text>
            <text x={center - 5} y={center - radius - 25} fontSize="14" fill="#666">1</text>
            <text x={center - 8} y={center + radius + 30} fontSize="14" fill="#666">-1</text>
          </>
        )}
      </svg>

      <div className="values">
        <div className="value-row">
          <span className="label">Angle:</span>
          <span>{angle.toFixed(1)}°</span>
          <span className="muted">({rad.toFixed(3)} rad)</span>
        </div>
        <div className="value-row" style={{ color: '#2563eb' }}>
          <span className="label">cos θ:</span>
          <span>{cos.toFixed(4)}</span>
        </div>
        <div className="value-row" style={{ color: '#dc2626' }}>
          <span className="label">sin θ:</span>
          <span>{sin.toFixed(4)}</span>
        </div>
        <div className="value-row" style={{ color: '#6b7280' }}>
          <span className="label">tan θ:</span>
          <span>{tan === Infinity ? 'undefined' : tan.toFixed(4)}</span>
        </div>
        <div className="value-row">
          <span className="label">Point:</span>
          <span>({cos.toFixed(3)}, {sin.toFixed(3)})</span>
        </div>
      </div>
    </div>
  )
}