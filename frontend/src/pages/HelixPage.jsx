import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

/**
 * Parametric helix r(t) = (cos t, sin t, t)
 * Visualizes chain-rule / parametric differentiation:
 * r'(t) = (-sin t, cos t, 1) — tangent along the curve.
 */
export default function HelixPage() {
  const { theme } = useOutletContext()
  const canvasRef = useRef(null)
  const [t, setT] = useState(2.2)
  const [showTangent, setShowTangent] = useState(true)
  const [showDerivative, setShowDerivative] = useState(true)
  const [autoSpin, setAutoSpin] = useState(true)
  const rotRef = useRef({ yaw: 0.7, pitch: 0.45 })
  const dragRef = useRef(null)
  const tRef = useRef(t)

  useEffect(() => {
    tRef.current = t
  }, [t])

  const project = useCallback((x, y, z, w, h) => {
    const { yaw, pitch } = rotRef.current
    // Rotate around Y then X
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)

    let x1 = x * cosY - z * sinY
    let z1 = x * sinY + z * cosY
    let y1 = y * cosP - z1 * sinP
    let z2 = y * sinP + z1 * cosP

    const scale = 90
    const perspective = 4.5
    const f = perspective / (perspective + z2 * 0.35 + 2)
    return {
      x: w / 2 + x1 * scale * f,
      y: h / 2 - y1 * scale * f,
      z: z2,
      f,
    }
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const isLight = theme === 'light'
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = isLight ? 'rgba(244,241,234,0.4)' : 'rgba(7,8,12,0.2)'
    ctx.fillRect(0, 0, w, h)

    const turns = 3.2
    const steps = 280
    const tmax = turns * Math.PI * 2
    const curT = tRef.current

    // Axis guides
    const axes = [
      { a: [0, 0, 0], b: [1.6, 0, 0], color: '#2563eb', label: 'x' },
      { a: [0, 0, 0], b: [0, 1.6, 0], color: '#dc2626', label: 'y' },
      { a: [0, 0, 0], b: [0, 0, 2.4], color: '#94a3b8', label: 'z' },
    ]
    axes.forEach(({ a, b, color, label }) => {
      const p0 = project(a[0], a[1], a[2], w, h)
      const p1 = project(b[0], b[1], b[2], w, h)
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.lineTo(p1.x, p1.y)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.fillStyle = color
      ctx.font = '12px JetBrains Mono, monospace'
      ctx.fillText(label, p1.x + 6, p1.y)
    })

    // Helix polyline with depth shading
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * tmax
      const x = Math.cos(u)
      const y = Math.sin(u)
      const z = (u / tmax) * 2.6 - 1.3
      pts.push({ u, ...project(x, y, z, w, h), raw: [x, y, z] })
    }

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const depth = (a.z + b.z) / 2
      const alpha = 0.35 + 0.55 * (1 / (1 + Math.exp(-depth)))
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = isLight ? `rgba(2,132,199,${alpha})` : `rgba(125,211,252,${alpha})`
      ctx.lineWidth = 2.2
      ctx.stroke()
    }

    // Current point on helix — map t into helix parameter range
    const u = ((curT % tmax) + tmax) % tmax
    const px = Math.cos(u)
    const py = Math.sin(u)
    const pz = (u / tmax) * 2.6 - 1.3
    const P = project(px, py, pz, w, h)

    // Tangent r'(t) = (-sin t, cos t, c)
    if (showTangent) {
      const dx = -Math.sin(u)
      const dy = Math.cos(u)
      const dz = 2.6 / tmax
      const len = 0.85
      const T = project(px + dx * len, py + dy * len, pz + dz * len, w, h)
      ctx.beginPath()
      ctx.moveTo(P.x, P.y)
      ctx.lineTo(T.x, T.y)
      ctx.strokeStyle = '#f0d9a8'
      ctx.lineWidth = 2.5
      ctx.stroke()
      // arrow head
      const ang = Math.atan2(T.y - P.y, T.x - P.x)
      ctx.beginPath()
      ctx.moveTo(T.x, T.y)
      ctx.lineTo(T.x - 10 * Math.cos(ang - 0.4), T.y - 10 * Math.sin(ang - 0.4))
      ctx.lineTo(T.x - 10 * Math.cos(ang + 0.4), T.y - 10 * Math.sin(ang + 0.4))
      ctx.closePath()
      ctx.fillStyle = '#f0d9a8'
      ctx.fill()
    }

    // Point
    ctx.beginPath()
    ctx.arc(P.x, P.y, 7, 0, Math.PI * 2)
    ctx.fillStyle = isLight ? '#fff' : '#07080c'
    ctx.fill()
    ctx.strokeStyle = '#7dd3fc'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(P.x, P.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#7dd3fc'
    ctx.fill()

    // Derivative components overlay (2D HUD)
    if (showDerivative) {
      const dx = -Math.sin(u)
      const dy = Math.cos(u)
      const dz = 2.6 / tmax
      ctx.fillStyle = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(14,16,24,0.75)'
      ctx.strokeStyle = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.08)'
      roundRect(ctx, 16, 16, 240, 118, 12)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = isLight ? '#0f172a' : '#e8eaf0'
      ctx.font = '600 11px Outfit, sans-serif'
      ctx.fillStyle = isLight ? '#64748b' : '#8b92a5'
      ctx.fillText('PARAMETRIC DERIVATIVE', 28, 38)
      ctx.font = '13px JetBrains Mono, monospace'
      ctx.fillStyle = isLight ? '#0f172a' : '#e8eaf0'
      ctx.fillText(`r(t) = (cos t, sin t, t)`, 28, 60)
      ctx.fillStyle = '#f0d9a8'
      ctx.fillText(`r′(t) = (−sin t, cos t, 1)`, 28, 82)
      ctx.fillStyle = isLight ? '#475569' : '#8b92a5'
      ctx.font = '12px JetBrains Mono, monospace'
      ctx.fillText(
        `r′ ≈ (${dx.toFixed(2)}, ${dy.toFixed(2)}, ${dz.toFixed(2)})`,
        28,
        106
      )
    }
  }, [project, showTangent, showDerivative, theme])

  // Animation loop
  useEffect(() => {
    let raf
    let last = performance.now()
    const loop = (now) => {
      const dt = (now - last) / 1000
      last = now
      if (autoSpin && !dragRef.current) {
        rotRef.current.yaw += dt * 0.35
      }
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, autoSpin])

  // Pointer drag to rotate
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e) => {
      e.preventDefault()
      dragRef.current = { x: e.clientX, y: e.clientY, yaw: rotRef.current.yaw, pitch: rotRef.current.pitch }
      canvas.setPointerCapture(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragRef.current) return
      e.preventDefault()
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      rotRef.current.yaw = dragRef.current.yaw + dx * 0.008
      rotRef.current.pitch = Math.max(-1.2, Math.min(1.2, dragRef.current.pitch + dy * 0.008))
    }
    const onUp = (e) => {
      dragRef.current = null
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* */
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onUp)
    }
  }, [])

  const u = t
  const rx = Math.cos(u)
  const ry = Math.sin(u)
  const rdx = -Math.sin(u)
  const rdy = Math.cos(u)

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Parametric differentiation</p>
          <h1>
            Chain rule on a <em>helix</em>
          </h1>
          <p className="hero-copy">
            Drag to orbit. The gold arrow is the velocity vector r′(t) — each component
            is the derivative of the corresponding coordinate (chain rule on parameters).
          </p>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">Parameter t</span>
            <div className="value">{t.toFixed(2)}</div>
            <div className="sub">r = (cos t, sin t, t)</div>
          </div>
        </div>
      </header>

      <main className="workspace workspace--helix">
        <section className="panel helix-panel">
          <div className="panel-header">
            <span className="panel-title">3D helix · drag to rotate</span>
            <span className="panel-hint">r(t) = (cos t, sin t, t)</span>
          </div>
          <canvas ref={canvasRef} className="helix-canvas" />
        </section>

        <aside className="panel controls">
          <div className="panel-header" style={{ padding: 0 }}>
            <span className="panel-title">Controls</span>
          </div>

          <div className="control-group">
            <div className="control-label">
              <span>Parameter t</span>
              <strong>{t.toFixed(2)}</strong>
            </div>
            <div className="slider-wrap" style={{ '--progress': `${(t / (Math.PI * 6)) * 100}%` }}>
              <input
                type="range"
                min="0"
                max={Math.PI * 6}
                step="0.01"
                value={t}
                onChange={(e) => setT(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <hr className="divider" />

          <div className="control-group">
            <span className="control-label">Display</span>
            <div className="toggles">
              <label className={`toggle-row${showTangent ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={(e) => setShowTangent(e.target.checked)}
                />
                <span className="toggle-meta">
                  <span className="toggle-name">Tangent r′(t)</span>
                  <span className="toggle-desc">Velocity along the curve</span>
                </span>
                <span className="switch" aria-hidden="true" />
              </label>
              <label className={`toggle-row${showDerivative ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={showDerivative}
                  onChange={(e) => setShowDerivative(e.target.checked)}
                />
                <span className="toggle-meta">
                  <span className="toggle-name">Derivative HUD</span>
                  <span className="toggle-desc">Show symbolic r′(t)</span>
                </span>
                <span className="switch" aria-hidden="true" />
              </label>
              <label className={`toggle-row${autoSpin ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={autoSpin}
                  onChange={(e) => setAutoSpin(e.target.checked)}
                />
                <span className="toggle-meta">
                  <span className="toggle-name">Auto-rotate</span>
                  <span className="toggle-desc">Gentle orbit when idle</span>
                </span>
                <span className="switch" aria-hidden="true" />
              </label>
            </div>
          </div>

          <hr className="divider" />

          <div className="metrics" style={{ display: 'grid', gap: '0.5rem' }}>
            <div className="metric">
              <span className="metric-label">r(t)</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>
                ({rx.toFixed(3)}, {ry.toFixed(3)}, {t.toFixed(3)})
              </span>
            </div>
            <div className="metric metric--point">
              <span className="metric-label">r′(t)</span>
              <span className="metric-value" style={{ fontSize: '0.85rem' }}>
                ({rdx.toFixed(3)}, {rdy.toFixed(3)}, 1.000)
              </span>
            </div>
          </div>

          <p className="derive-note">
            <strong>Chain rule:</strong> if a particle follows r(t), its velocity is the
            component-wise derivative. Differentiating cos t and sin t gives −sin t and cos t —
            the horizontal spin of the helix — while dz/dt = 1 climbs the axis.
          </p>
        </aside>
      </main>
    </>
  )
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
