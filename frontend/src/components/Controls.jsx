import { useState } from 'react'

const COMMON_ANGLES = [
  { deg: 0, rad: '0' },
  { deg: 30, rad: 'π/6' },
  { deg: 45, rad: 'π/4' },
  { deg: 60, rad: 'π/3' },
  { deg: 90, rad: 'π/2' },
  { deg: 120, rad: '2π/3' },
  { deg: 135, rad: '3π/4' },
  { deg: 150, rad: '5π/6' },
  { deg: 180, rad: 'π' },
  { deg: 210, rad: '7π/6' },
  { deg: 225, rad: '5π/4' },
  { deg: 240, rad: '4π/3' },
  { deg: 270, rad: '3π/2' },
  { deg: 300, rad: '5π/3' },
  { deg: 315, rad: '7π/4' },
  { deg: 330, rad: '11π/6' },
]

export default function Controls({
  angle,
  onAngleChange,
  showSin,
  setShowSin,
  showCos,
  setShowCos,
  showTan,
  setShowTan,
  showLabels,
  setShowLabels,
  showCoords,
  setShowCoords,
}) {
  const [showRadians, setShowRadians] = useState(false)

  return (
    <div className="controls">
      <div className="control-group">
        <label>Angle: {angle.toFixed(1)}°</label>
        <input
          type="range"
          min="0"
          max="360"
          step="0.1"
          value={angle}
          onChange={(e) => onAngleChange(parseFloat(e.target.value))}
        />
      </div>

      <div className="control-group">
        <div className="section-header">
          <label>Jump to common angles</label>
          <label className="inline-toggle">
            <input
              type="checkbox"
              checked={showRadians}
              onChange={(e) => setShowRadians(e.target.checked)}
            />
            Radians
          </label>
        </div>
        <div className="angle-buttons">
          {COMMON_ANGLES.map(({ deg, rad }) => (
            <button key={deg} onClick={() => onAngleChange(deg)}>
              {showRadians ? rad : `${deg}°`}
            </button>
          ))}
        </div>
      </div>

      <div className="control-group toggles">
        <label>
          <input type="checkbox" checked={showSin} onChange={(e) => setShowSin(e.target.checked)} />
          Show Sine (red)
        </label>
        <label>
          <input type="checkbox" checked={showCos} onChange={(e) => setShowCos(e.target.checked)} />
          Show Cosine (blue)
        </label>
        <label>
          <input type="checkbox" checked={showTan} onChange={(e) => setShowTan(e.target.checked)} />
          Show Tangent (grey)
        </label>
        <label>
          <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
          Show Axis Labels
        </label>
        <label>
          <input type="checkbox" checked={showCoords} onChange={(e) => setShowCoords(e.target.checked)} />
          Show Coordinates
        </label>
      </div>
    </div>
  )
}