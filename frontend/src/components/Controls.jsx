import { useState } from 'react'
import { COMMON_ANGLES } from '../utils/angles'

function SwitchRow({ checked, onChange, disabled, name, desc, swatch }) {
  return (
    <label
      className={`toggle-row${checked ? ' is-on' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-meta">
        <span className="toggle-name">
          {swatch && <span className={`toggle-swatch toggle-swatch--${swatch}`} />}
          {name}
        </span>
        {desc && <span className="toggle-desc">{desc}</span>}
      </span>
      <span className="switch" aria-hidden="true" />
    </label>
  )
}

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
  labelsInRadians,
  setLabelsInRadians,
  showCoords,
  setShowCoords,
  coordsInRadians,
  setCoordsInRadians,
  showSohcahtoa,
  setShowSohcahtoa,
}) {
  const [showRadians, setShowRadians] = useState(false)
  const progress = `${(angle / 360) * 100}%`

  return (
    <aside className="panel controls">
      <div className="panel-header" style={{ padding: 0 }}>
        <span className="panel-title">Controls</span>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>Angle</span>
          <strong>{angle.toFixed(1)}°</strong>
        </div>
        <div className="slider-wrap" style={{ '--progress': progress }}>
          <input
            type="range"
            min="0"
            max="360"
            step="0.1"
            value={angle}
            onChange={(e) => onAngleChange(parseFloat(e.target.value))}
            aria-label="Angle in degrees"
          />
          <div className="slider-ends">
            <span>0°</span>
            <span>360°</span>
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="control-group">
        <div className="section-header">
          <span className="control-label">Common angles</span>
          <label className={`chip-toggle${showRadians ? ' is-on' : ''}`}>
            <input
              type="checkbox"
              checked={showRadians}
              onChange={(e) => setShowRadians(e.target.checked)}
            />
            Radians
          </label>
        </div>
        <div className="angle-buttons">
          {COMMON_ANGLES.filter((a) => a.deg < 360).map(({ deg, rad }) => {
            const active = Math.abs(((angle % 360) + 360) % 360 - deg) < 0.15
            return (
              <button
                key={deg}
                type="button"
                className={active ? 'is-active' : undefined}
                onClick={() => onAngleChange(deg, { animate: true })}
              >
                {showRadians ? rad : `${deg}°`}
              </button>
            )
          })}
        </div>
      </div>

      <hr className="divider" />

      <div className="control-group">
        <span className="control-label">Display</span>
        <div className="toggles">
          <SwitchRow
            checked={showSin}
            onChange={setShowSin}
            name="Sine"
            desc="Vertical component"
            swatch="sin"
          />
          <SwitchRow
            checked={showCos}
            onChange={setShowCos}
            name="Cosine"
            desc="Horizontal component"
            swatch="cos"
          />
          <SwitchRow
            checked={showTan}
            onChange={setShowTan}
            name="Tangent"
            desc="Vertical height on x = ±1 (orange)"
            swatch="tan"
          />
          <SwitchRow
            checked={showSohcahtoa}
            onChange={setShowSohcahtoa}
            name="SOHCAHTOA"
            desc="Label opposite, adjacent, hypotenuse"
          />
        </div>
      </div>

      <hr className="divider" />

      <div className="control-group">
        <span className="control-label">Labels</span>
        <div className="toggles">
          <SwitchRow
            checked={showLabels}
            onChange={setShowLabels}
            name="Axis labels"
            desc="Unit scale & cardinal angles"
          />
          <SwitchRow
            checked={labelsInRadians}
            onChange={setLabelsInRadians}
            disabled={!showLabels}
            name="Axis labels in radians"
            desc="0 · π/2 · π · 3π/2"
          />
          <SwitchRow
            checked={showCoords}
            onChange={setShowCoords}
            name="Coordinate labels"
            desc="(x, y) and θ on the point"
          />
          <SwitchRow
            checked={coordsInRadians}
            onChange={setCoordsInRadians}
            disabled={!showCoords}
            name="θ in radians"
            desc="π fractions + exact √ coords at common angles"
          />
        </div>
      </div>
    </aside>
  )
}
