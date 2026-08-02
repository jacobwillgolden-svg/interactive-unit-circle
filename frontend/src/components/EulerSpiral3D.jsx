import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

/**
 * Interactive Euler spiral: z = e^{iπt} = cos(πt) + i sin(πt), t ∈ [0, 4].
 * World axes: x = Re(z), y = Im(z), z = t.
 * Drag to orbit. Perfect side view (looking along Re) collapses to y = sin(πt).
 */

const T_MAX = 4
/** Look along −Re so t increases to the right and Im is up → classic sine graph. */
const SIDE_YAW = -Math.PI / 2
const SIDE_PITCH = 0
const SNAP_ANGLE = 0.12 // ~7° magnetic snap into side view
const SIDE_ENTER = 0.18 // show side-view labels within ~10°

function wrapPi(a) {
  let x = a
  while (x > Math.PI) x -= Math.PI * 2
  while (x < -Math.PI) x += Math.PI * 2
  return x
}

function nearestSideYaw(yaw) {
  // ±π/2 both show the sine silhouette (mirrored left/right)
  const a = wrapPi(yaw)
  const candidates = [SIDE_YAW, Math.PI / 2]
  let best = candidates[0]
  let bestD = Infinity
  for (const c of candidates) {
    const d = Math.abs(wrapPi(a - c))
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

function sideViewScore(yaw, pitch) {
  const target = nearestSideYaw(yaw)
  const dy = Math.abs(wrapPi(yaw - target))
  const dp = Math.abs(pitch - SIDE_PITCH)
  return Math.hypot(dy, dp)
}

export default function EulerSpiral3D() {
  const { theme } = useOutletContext() ?? { theme: 'dark' }
  const canvasRef = useRef(null)
  const rotRef = useRef({ yaw: 0.55, pitch: 0.38 })
  const dragRef = useRef(null)
  const autoSpinRef = useRef(true)
  const [autoSpin, setAutoSpin] = useState(true)
  const [isSideView, setIsSideView] = useState(false)
  const [hint, setHint] = useState('Drag to rotate · side view → sine wave')

  useEffect(() => {
    autoSpinRef.current = autoSpin
  }, [autoSpin])

  const project = useCallback((x, y, z, w, h) => {
    const { yaw, pitch } = rotRef.current
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const cosP = Math.cos(pitch)
    const sinP = Math.sin(pitch)

    // x = Re, y = Im, z = t (centered)
    let x1 = x * cosY - z * sinY
    let z1 = x * sinY + z * cosY
    let y1 = y * cosP - z1 * sinP
    let z2 = y * sinP + z1 * cosP

    const scale = Math.min(w, h) * 0.28
    const perspective = 5.2
    const f = perspective / (perspective + z2 * 0.28 + 2.2)
    return {
      x: w / 2 + x1 * scale * f,
      y: h / 2 - y1 * scale * f + h * 0.02,
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
    if (w < 2 || h < 2) return
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const isLight = theme === 'light'
    const score = sideViewScore(rotRef.current.yaw, rotRef.current.pitch)
    const side = score < SIDE_ENTER
    // Smooth blend: 0 = full 3D labels, 1 = pure side view
    const sideBlend = Math.max(0, Math.min(1, 1 - score / SIDE_ENTER))

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = isLight ? 'rgba(255,255,255,0.55)' : 'rgba(10,12,18,0.35)'
    ctx.fillRect(0, 0, w, h)

    // t maps to world-z in [-1.6, 1.6]; Re/Im in [-1,1]
    const tToZ = (t) => (t / T_MAX) * 3.2 - 1.6

    const axisLen = {
      re: 1.35,
      im: 1.35,
      t: 1.85,
    }

    // Axis endpoints (model space)
    const origin = project(0, 0, 0, w, h)
    const reEnd = project(axisLen.re, 0, 0, w, h)
    const imEnd = project(0, axisLen.im, 0, w, h)
    const tEnd = project(0, 0, axisLen.t, w, h)
    const tStart = project(0, 0, -axisLen.t, w, h)
    const reStart = project(-axisLen.re, 0, 0, w, h)
    const imStart = project(0, -axisLen.im, 0, w, h)

    const axisAlpha = (base) => base * (side ? 0.15 + 0.85 * (1 - sideBlend * 0.85) : 1)

    const strokeAxis = (a, b, color, alpha) => {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = color
      ctx.globalAlpha = alpha
      ctx.lineWidth = side && sideBlend > 0.7 ? 1.8 : 1.4
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // In side view, Re axis nearly vanishes (into the page)
    strokeAxis(reStart, reEnd, isLight ? '#2563eb' : '#60a5fa', axisAlpha(side ? 0.12 : 0.4))
    strokeAxis(imStart, imEnd, isLight ? '#0f172a' : '#e2e8f0', axisAlpha(0.55))
    strokeAxis(tStart, tEnd, isLight ? '#0f172a' : '#e2e8f0', axisAlpha(0.55))

    // Tick marks on Im and t
    const tickColor = isLight ? 'rgba(15,23,42,0.45)' : 'rgba(226,232,240,0.4)'
    for (const v of [-1, 1]) {
      const a = project(-0.08, v, 0, w, h)
      const b = project(0.08, v, 0, w, h)
      strokeAxis(a, b, tickColor, axisAlpha(0.7))
    }
    for (let k = 0; k <= T_MAX; k++) {
      const tz = tToZ(k)
      const a = project(0, -0.08, tz, w, h)
      const b = project(0, 0.08, tz, w, h)
      strokeAxis(a, b, tickColor, axisAlpha(0.55))
    }

    // Arrowheads
    const arrow = (from, to, color, alpha) => {
      const ang = Math.atan2(to.y - from.y, to.x - from.x)
      const s = 8
      ctx.beginPath()
      ctx.moveTo(to.x, to.y)
      ctx.lineTo(to.x - s * Math.cos(ang - 0.4), to.y - s * Math.sin(ang - 0.4))
      ctx.lineTo(to.x - s * Math.cos(ang + 0.4), to.y - s * Math.sin(ang + 0.4))
      ctx.closePath()
      ctx.fillStyle = color
      ctx.globalAlpha = alpha
      ctx.fill()
      ctx.globalAlpha = 1
    }
    arrow(origin, imEnd, isLight ? '#0f172a' : '#e2e8f0', axisAlpha(0.7))
    arrow(origin, tEnd, isLight ? '#0f172a' : '#e2e8f0', axisAlpha(0.7))
    if (!side || sideBlend < 0.85) {
      arrow(origin, reEnd, isLight ? '#2563eb' : '#60a5fa', axisAlpha(0.5))
    }

    // Labels
    ctx.font = '600 12px "JetBrains Mono", ui-monospace, monospace'
    ctx.globalAlpha = axisAlpha(0.9)
    ctx.fillStyle = isLight ? '#0f172a' : '#e2e8f0'
    ctx.fillText('y = Im(z)', imEnd.x + 8, imEnd.y - 4)
    ctx.fillText('t', tEnd.x + 10, tEnd.y + 4)
    if (!side || sideBlend < 0.8) {
      ctx.fillStyle = isLight ? '#2563eb' : '#7dd3fc'
      ctx.globalAlpha = axisAlpha(0.85) * (1 - sideBlend)
      ctx.fillText('x = Re(z)', reEnd.x + 6, reEnd.y + 4)
    }
    ctx.globalAlpha = 1

    // Spiral polyline
    const steps = 360
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * T_MAX
      const re = Math.cos(Math.PI * t)
      const im = Math.sin(Math.PI * t)
      const tz = tToZ(t)
      pts.push(project(re, im, tz, w, h))
    }

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const depth = (a.z + b.z) / 2
      // Flatter alpha in side view (no depth cue needed)
      const alpha = side
        ? 0.92
        : 0.4 + 0.55 * (1 / (1 + Math.exp(-depth * 1.4)))
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = isLight ? `rgba(37,99,235,${alpha})` : `rgba(96,165,250,${alpha})`
      ctx.lineWidth = side ? 2.6 : 2.2
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // Formula overlay (top-left)
    const title3d = 'z = e^{iπt},  t ∈ [0, 4]'
    const titleSide = 'y = sin(πt),  t ∈ [0, 4]'
    ctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace'
    if (sideBlend < 0.5) {
      ctx.globalAlpha = 1 - sideBlend * 1.2
      ctx.fillStyle = isLight ? '#0f172a' : '#e8eaf0'
      ctx.fillText(title3d, 14, 24)
      ctx.font = '12px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillStyle = isLight ? '#64748b' : '#94a3b8'
      ctx.fillText('x = cos(πt)   y = sin(πt)', 14, 42)
    }
    if (sideBlend > 0.25) {
      ctx.globalAlpha = Math.min(1, (sideBlend - 0.25) / 0.55)
      ctx.font = '600 13px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillStyle = isLight ? '#0f172a' : '#e8eaf0'
      ctx.fillText(titleSide, 14, 24)
      ctx.font = '12px "JetBrains Mono", ui-monospace, monospace'
      ctx.fillStyle = isLight ? '#2563eb' : '#7dd3fc'
      ctx.fillText('side view · Re axis into the page', 14, 42)
    }
    ctx.globalAlpha = 1

    // Side-view badge
    if (side) {
      const badge = 'SINE WAVE VIEW'
      ctx.font = '700 10px Outfit, system-ui, sans-serif'
      const tw = ctx.measureText(badge).width
      const bx = w - tw - 28
      const by = 14
      ctx.fillStyle = isLight ? 'rgba(37,99,235,0.12)' : 'rgba(125,211,252,0.14)'
      ctx.strokeStyle = isLight ? 'rgba(37,99,235,0.35)' : 'rgba(125,211,252,0.35)'
      ctx.lineWidth = 1
      roundRect(ctx, bx, by, tw + 16, 22, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = isLight ? '#1d4ed8' : '#7dd3fc'
      ctx.fillText(badge, bx + 8, by + 15)
    }
  }, [project, theme])

  // Animation loop (+ gentle auto-orbit when idle)
  useEffect(() => {
    let raf
    let alive = true
    let last = performance.now()
    const loop = (now) => {
      if (!alive) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      if (autoSpinRef.current && !dragRef.current) {
        // Soften pitch toward a pleasant orbit height while yaw spins
        rotRef.current.yaw += dt * 0.32
        const targetPitch = 0.38
        rotRef.current.pitch += (targetPitch - rotRef.current.pitch) * Math.min(1, dt * 1.2)
      }

      const score = sideViewScore(rotRef.current.yaw, rotRef.current.pitch)
      const side = score < SIDE_ENTER
      setIsSideView((prev) => (prev !== side ? side : prev))
      setHint((prev) => {
        const next = side
          ? 'Side view: Im(z) = sin(πt) — drag away for the 3D spiral'
          : autoSpinRef.current
            ? 'Auto-rotating · drag to take over · side-on → sine wave'
            : 'Drag to rotate · align side-on for the sine wave'
        return prev === next ? prev : next
      })
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [draw])

  // Pointer drag + magnetic snap to side view
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e) => {
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        yaw: rotRef.current.yaw,
        pitch: rotRef.current.pitch,
      }
      canvas.setPointerCapture(e.pointerId)
    }

    const onMove = (e) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      let yaw = dragRef.current.yaw + dx * 0.009
      let pitch = Math.max(-1.15, Math.min(1.15, dragRef.current.pitch + dy * 0.009))

      // Magnetic snap into perfect side view when close (only when not auto-spinning)
      if (!autoSpinRef.current) {
        const targetYaw = nearestSideYaw(yaw)
        const dYaw = Math.abs(wrapPi(yaw - targetYaw))
        const dPitch = Math.abs(pitch - SIDE_PITCH)
        if (dYaw < SNAP_ANGLE && dPitch < SNAP_ANGLE) {
          const t = 1 - Math.max(dYaw, dPitch) / SNAP_ANGLE
          const ease = t * t * (3 - 2 * t)
          yaw = yaw + wrapPi(targetYaw - yaw) * ease
          pitch = pitch + (SIDE_PITCH - pitch) * ease
          // Hard lock when very close so it "clicks"
          if (Math.hypot(wrapPi(yaw - targetYaw), pitch - SIDE_PITCH) < 0.03) {
            yaw = targetYaw
            pitch = SIDE_PITCH
          }
        }
      }

      rotRef.current.yaw = yaw
      rotRef.current.pitch = pitch
    }

    const onUp = (e) => {
      // Final snap if near (manual orbit only — auto-spin would leave immediately)
      if (!autoSpinRef.current) {
        const score = sideViewScore(rotRef.current.yaw, rotRef.current.pitch)
        if (score < SNAP_ANGLE * 1.15) {
          rotRef.current.yaw = nearestSideYaw(rotRef.current.yaw)
          rotRef.current.pitch = SIDE_PITCH
        }
      }
      dragRef.current = null
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const snapSide = () => {
    setAutoSpin(false)
    rotRef.current.yaw = SIDE_YAW
    rotRef.current.pitch = SIDE_PITCH
  }

  const snap3d = () => {
    rotRef.current.yaw = 0.55
    rotRef.current.pitch = 0.38
  }

  return (
    <div className={`id-euler-spiral${isSideView ? ' is-side' : ''}${autoSpin ? ' is-spinning' : ''}`}>
      <canvas
        ref={canvasRef}
        className="id-euler-spiral-canvas"
        role="img"
        aria-label={
          isSideView
            ? 'Side view of Euler spiral showing y equals sin of pi t for t from 0 to 4'
            : 'Three-dimensional Euler spiral z equals e to the i pi t for t from 0 to 4. Drag to rotate.'
        }
      />
      <div className="id-euler-spiral-bar">
        <span className="id-euler-spiral-hint">{hint}</span>
        <div className="id-euler-spiral-actions">
          <button
            type="button"
            className={`id-euler-spiral-btn${autoSpin ? ' is-on' : ''}`}
            aria-pressed={autoSpin}
            onClick={() => setAutoSpin((v) => !v)}
          >
            Auto-rotate
          </button>
          <button type="button" className="id-euler-spiral-btn" onClick={snap3d}>
            3D view
          </button>
          <button type="button" className="id-euler-spiral-btn" onClick={snapSide}>
            Side → sine
          </button>
        </div>
      </div>
    </div>
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
