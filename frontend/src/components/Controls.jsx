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
}) {
  const commonAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]

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
        <label>Jump to common angles</label>
        <div className="angle-buttons">
          {commonAngles.map((a) => (
            <button key={a} onClick={() => onAngleChange(a)}>
              {a}°
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
      </div>
    </div>
  )
}