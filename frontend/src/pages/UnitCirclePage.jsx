import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import UnitCircle from '../components/UnitCircle'
import Controls from '../components/Controls'
import { animateAngle, formatRadLabel, playSnapSound, snapCommonAngle } from '../utils/angles'

export default function UnitCirclePage() {
  const { theme, soundOn } = useOutletContext()
  const [angle, setAngle] = useState(45)
  const [showSin, setShowSin] = useState(true)
  const [showCos, setShowCos] = useState(true)
  const [showTan, setShowTan] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [labelsInRadians, setLabelsInRadians] = useState(false)
  const [showCoords, setShowCoords] = useState(true)
  const [coordsInRadians, setCoordsInRadians] = useState(false)
  const [showSohcahtoa, setShowSohcahtoa] = useState(false)
  const [snapPulse, setSnapPulse] = useState(0)
  const angleRef = useRef(angle)
  const animatingRef = useRef(false)
  const lastSnapRef = useRef(null)

  useEffect(() => {
    angleRef.current = angle
  }, [angle])

  const triggerSnapFeedback = useCallback(
    (deg) => {
      const snapped = snapCommonAngle(deg, 0.2)
      if (snapped === null) {
        lastSnapRef.current = null
        return
      }
      if (lastSnapRef.current === snapped) return
      lastSnapRef.current = snapped
      setSnapPulse((n) => n + 1)
      playSnapSound(soundOn)
    },
    [soundOn]
  )

  const handleAngleChange = useCallback(
    (next, { animate = false } = {}) => {
      if (animate) {
        if (animatingRef.current) return
        animatingRef.current = true
        animateAngle(angleRef.current, next, setAngle).then(() => {
          animatingRef.current = false
          triggerSnapFeedback(next)
        })
        return
      }
      setAngle(next)
      triggerSnapFeedback(next)
    },
    [triggerSnapFeedback]
  )

  const rad = (angle * Math.PI) / 180
  const radLabel = formatRadLabel(angle)

  return (
    <>
      <header className="hero">
        <div>
          <p className="hero-eyebrow">Trigonometry, refined</p>
          <h1>
            Explore the <em>unit circle</em>
          </h1>
          <p className="hero-copy">
            Drag the point, scrub the angle, and reveal how sine, cosine, and
            tangent relate in real time — with exact values when you need them.
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">Current angle</span>
            {coordsInRadians ? (
              <>
                <div className="value">{radLabel}</div>
                <div className="sub">
                  {angle.toFixed(1)}° · {rad.toFixed(4)} rad
                </div>
              </>
            ) : (
              <>
                <div className="value">{angle.toFixed(1)}°</div>
                <div className="sub">
                  {radLabel} · {rad.toFixed(4)} rad
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="workspace">
        <UnitCircle
          angle={angle}
          onAngleChange={handleAngleChange}
          showSin={showSin}
          showCos={showCos}
          showTan={showTan}
          showLabels={showLabels}
          labelsInRadians={labelsInRadians}
          showCoords={showCoords}
          coordsInRadians={coordsInRadians}
          showSohcahtoa={showSohcahtoa}
          snapPulse={snapPulse}
          theme={theme}
        />

        <Controls
          angle={angle}
          onAngleChange={handleAngleChange}
          showSin={showSin}
          setShowSin={setShowSin}
          showCos={showCos}
          setShowCos={setShowCos}
          showTan={showTan}
          setShowTan={setShowTan}
          showLabels={showLabels}
          setShowLabels={setShowLabels}
          labelsInRadians={labelsInRadians}
          setLabelsInRadians={setLabelsInRadians}
          showCoords={showCoords}
          setShowCoords={setShowCoords}
          coordsInRadians={coordsInRadians}
          setCoordsInRadians={setCoordsInRadians}
          showSohcahtoa={showSohcahtoa}
          setShowSohcahtoa={setShowSohcahtoa}
        />
      </main>
    </>
  )
}
