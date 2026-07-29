import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { formatCoords, formatRadLabel, snapCommonAngle } from '../utils/angles'

/** Neon-leaning stroke colors for each function */
const FN_COLORS = {
  sin: '#dc2626',
  cos: '#2563eb',
  tan: '#ff9f1c', // neon orange
  csc: '#39ff14', // neon green
  sec: '#bf5af2', // neon violet
  cot: '#f5e642', // neon yellow
}

/** Soft triangle fill matching a stroke color (light theme slightly stronger) */
function softFill(hex, light) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const a = light ? 0.14 : 0.12
  return `rgba(${r},${g},${b},${a})`
}

const EPS = 1e-6
const ZOOM_MIN = 0.55
const ZOOM_MAX = 5
const ZOOM_FACTOR = 1.12

function safeTan(s, c) {
  if (Math.abs(c) < EPS) return null
  return s / c
}

function safeCsc(s) {
  if (Math.abs(s) < EPS) return null
  return 1 / s
}

function safeSec(c) {
  if (Math.abs(c) < EPS) return null
  return 1 / c
}

function safeCot(s, c) {
  if (Math.abs(s) < EPS) return null
  return c / s
}

function formatTrigValue(v) {
  if (v == null || !Number.isFinite(v)) return '∞'
  if (Math.abs(v) > 1e4) return '∞'
  return v.toFixed(4)
}

/** Angle display: int = whole numbers; float = three decimal places */
function formatAngleNumber(n, asInt) {
  if (!Number.isFinite(n)) return '—'
  return asInt ? String(Math.round(n)) : n.toFixed(3)
}

/**
 * Build an SVG path that breaks at vertical asymptotes / clipped extremes.
 * getValue(point) → number | null
 */
function buildClippedPath(pts, getValue, cy, amp, yClip) {
  let d = ''
  let drawing = false
  for (const p of pts) {
    const v = getValue(p)
    if (v == null || !Number.isFinite(v) || Math.abs(v) > yClip) {
      drawing = false
      continue
    }
    const y = cy - v * amp
    if (!drawing) {
      d += `M ${p.x} ${y} `
      drawing = true
    } else {
      d += `L ${p.x} ${y} `
    }
  }
  return d.trim()
}

/**
 * Unit circle + unwrapped trig graphs (sin, cos, tan, csc, sec, cot).
 */
export default function WavesPage() {
  const { theme } = useOutletContext()
  const [angle, setAngle] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [showSin, setShowSin] = useState(true)
  const [showCos, setShowCos] = useState(true)
  const [showTan, setShowTan] = useState(false)
  const [showCsc, setShowCsc] = useState(false)
  const [showSec, setShowSec] = useState(false)
  const [showCot, setShowCot] = useState(false)
  // Defaults match design screenshot: coords on (θ in °), axis labels + radians on
  const [showCoords, setShowCoords] = useState(true)
  const [coordsInRadians, setCoordsInRadians] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [labelsInRadians, setLabelsInRadians] = useState(true)
  /** Color-coded sin/cos/tan/… labels on the construction */
  const [showNames, setShowNames] = useState(false)
  /** true = whole-number θ; false = three decimal places */
  const [angleAsInt, setAngleAsInt] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [dragging, setDragging] = useState(false)
  /** Free-text field for the top-right angle card (degrees or radians by mode) */
  const [angleInput, setAngleInput] = useState('0')
  /** View transform: screen = k * content + (tx, ty) */
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 })
  const svgRef = useRef(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const pointerModeRef = useRef(null) // 'angle' | 'pan' | null
  const panStartRef = useRef(null)

  // Keep the input in sync when angle changes from play/drag/slider (not while typing focus)
  const angleInputFocused = useRef(false)
  useEffect(() => {
    if (angleInputFocused.current) return
    if (coordsInRadians) {
      const r = (angle * Math.PI) / 180
      setAngleInput(formatAngleNumber(r, angleAsInt))
    } else {
      setAngleInput(formatAngleNumber(angle, angleAsInt))
    }
  }, [angle, coordsInRadians, angleAsInt])

  // Switching to int snaps θ to the nearest whole degree
  useEffect(() => {
    if (!angleAsInt) return
    setAngle((a) => {
      const snapped = ((Math.round(a) % 360) + 360) % 360
      return snapped === a ? a : snapped
    })
  }, [angleAsInt])

  const applyAngleInput = useCallback(() => {
    const raw = String(angleInput).trim().replace(/°/g, '')
    if (raw === '' || raw === '.' || raw === '-') return
    let n = parseFloat(raw)
    if (!Number.isFinite(n)) return
    // Radians mode: user typed radians → convert to degrees for internal state
    let deg = coordsInRadians ? (n * 180) / Math.PI : n
    if (angleAsInt) deg = Math.round(deg)
    else deg = Math.round(deg * 1000) / 1000
    // Normalize to [0, 360)
    deg = ((deg % 360) + 360) % 360
    setPlaying(false)
    setAngle(deg)
  }, [angleInput, coordsInRadians, angleAsInt])

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

  // Spacebar toggles play/pause (skip when typing in an input/textarea)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      const tag = (e.target && e.target.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      e.preventDefault()
      setPlaying((p) => !p)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isLight = theme === 'light'
  const ink = isLight ? '#0f172a' : '#e8eaf0'
  const muted = isLight ? '#64748b' : '#8b92a5'
  const grid = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'
  const panelFill = isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.02)'
  const svgBg = isLight ? '#f4f6fa' : '#0b0d12'

  // Layout: circle left (room for sec/csc axis intercepts), waves right.
  // Geometry matches mathsisfun circle-unit.js (Rod Pierce) “Names” mode:
  //   cos: O → (cos,0)     sin: (cos,0) → P
  //   sec: O → (sec,0)     csc: O → (0,csc)
  //   tan: P → (sec,0)     cot: P → (0,csc)   [tangent line at P]
  // Tall canvas: csc/cot intercepts stay on-screen; top pad keeps titles clear of tips
  const R = 90
  const MAX_GEO = 4.2 // |sec|/|csc| draw extent in unit lengths
  const TOP_PAD = 44 // room for UNIT CIRCLE / TRIG GRAPHS above max intercept
  const BOTTOM_PAD = 40
  const H = Math.ceil(2 * MAX_GEO * R + TOP_PAD + BOTTOM_PAD)
  // Center so ±MAX_GEO fits with title band above the top intercept
  const cy = TOP_PAD + MAX_GEO * R
  const cx = 40 + MAX_GEO * R
  const constructZone = 40
  const waveX0 = cx + MAX_GEO * R + constructZone
  const waveW = 520
  const W = waveX0 + waveW + 40
  const amp = R
  const yClip = Math.min(MAX_GEO - 0.05, (cy - 12) / amp)

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const tan = safeTan(sin, cos)
  const csc = safeCsc(sin)
  const sec = safeSec(cos)
  const cot = safeCot(sin, cos)
  const px = cx + cos * R
  const py = cy - sin * R
  // Foot of perpendicular from P to x-axis (screen)
  const footX = px
  const footY = cy

  /**
   * Clip a unit-plane point so |u|,|v| ≤ MAX_GEO (keeps intercepts on canvas).
   * Returns null if the value is undefined/infinite.
   */
  const clipPt = (u, v) => {
    if (u == null || v == null || !Number.isFinite(u) || !Number.isFinite(v)) return null
    const cu = Math.max(-MAX_GEO, Math.min(MAX_GEO, u))
    const cv = Math.max(-MAX_GEO, Math.min(MAX_GEO, v))
    return { u: cu, v: cv, x: cx + cu * R, y: cy - cv * R }
  }

  // Axis intercepts of the tangent line at P: x·cos + y·sin = 1
  //   x-intercept (sec, 0),  y-intercept (0, csc)
  // Same formulas as mathsisfun: secWd = R/cos, cscHt = R/sin (with y flip)
  const secPt = sec != null ? clipPt(sec, 0) : null
  const cscPt = csc != null ? clipPt(0, csc) : null

  // When intercepts are clipped, still draw tan/cot along the ray from P toward the intercept
  const toward = (fromU, fromV, toU, toV) => {
    if (toU == null || toV == null || !Number.isFinite(toU) || !Number.isFinite(toV)) return null
    // If target is inside box, use it; else intersect ray P→target with the MAX_GEO box
    if (Math.abs(toU) <= MAX_GEO && Math.abs(toV) <= MAX_GEO) {
      return { u: toU, v: toV, x: cx + toU * R, y: cy - toV * R }
    }
    const du = toU - fromU
    const dv = toV - fromV
    let tMax = 1
    if (du !== 0) {
      const t1 = (MAX_GEO - fromU) / du
      const t2 = (-MAX_GEO - fromU) / du
      if (t1 > 0) tMax = Math.min(tMax, t1)
      if (t2 > 0) tMax = Math.min(tMax, t2)
    }
    if (dv !== 0) {
      const t1 = (MAX_GEO - fromV) / dv
      const t2 = (-MAX_GEO - fromV) / dv
      if (t1 > 0) tMax = Math.min(tMax, t1)
      if (t2 > 0) tMax = Math.min(tMax, t2)
    }
    if (!(tMax > 0) || !Number.isFinite(tMax)) return null
    const u = fromU + du * tMax
    const v = fromV + dv * tMax
    return { u, v, x: cx + u * R, y: cy - v * R }
  }

  const tanEnd =
    tan != null && sec != null ? toward(cos, sin, sec, 0) : null
  const cotEnd =
    cot != null && csc != null ? toward(cos, sin, 0, csc) : null

  const showTanGeo = showTan && tanEnd != null && Math.abs(tan) > 1e-8
  const showSecGeo = showSec && secPt != null && Math.abs(sec) > 1e-8
  const showCotGeo = showCot && cotEnd != null && Math.abs(cot) > 1e-8
  const showCscGeo = showCsc && cscPt != null && Math.abs(csc) > 1e-8
  const anyRecip = showTanGeo || showSecGeo || showCotGeo || showCscGeo

  // Wider snap so exact √ forms show while scrubbing near common angles
  const nearCommon = snapCommonAngle(angle, 1.5)
  const coordsLabel = (() => {
    if (coordsInRadians && nearCommon !== null) {
      return formatCoords(nearCommon, cos, sin, true, 2)
    }
    if (coordsInRadians) {
      return `(${cos.toFixed(2)}, ${sin.toFixed(2)})`
    }
    return `(${cos.toFixed(2)}, ${sin.toFixed(2)})`
  })()
  const radLabel = formatRadLabel(nearCommon !== null ? nearCommon : angle)
  // Prefer exact π forms at common angles in radians mode; otherwise int/float precision
  const angleLabel = coordsInRadians
    ? nearCommon !== null && !angleAsInt
      ? `θ = ${radLabel}`
      : nearCommon !== null && angleAsInt
        ? `θ = ${formatAngleNumber(rad, true)}`
        : `θ = ${formatAngleNumber(rad, angleAsInt)}`
    : `θ = ${formatAngleNumber(angle, angleAsInt)}°`

  const coordFill = isLight ? '#b45309' : '#f0d9a8'
  const angleLabelFill = isLight ? '#334155' : '#c8cdd9'
  const tickStroke = isLight ? 'rgba(15,23,42,0.28)' : 'rgba(255,255,255,0.2)'
  const labelFill = muted
  const labelAnchor = cos >= 0 ? 'start' : 'end'
  const labelX = px + (cos >= 0 ? 12 : -12)
  const labelY = py + (sin >= 0 ? -10 : 16)

  const clientToSvg = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return null
      return {
        sx: ((clientX - rect.left) * W) / rect.width,
        sy: ((clientY - rect.top) * H) / rect.height,
      }
    },
    [W, H]
  )

  const svgToContent = useCallback((sx, sy, v = viewRef.current) => {
    const k = v.k || 1
    return {
      x: (sx - v.tx) / k,
      y: (sy - v.ty) / k,
    }
  }, [])

  const getAngleFromEvent = useCallback(
    (clientX, clientY) => {
      const svgPt = clientToSvg(clientX, clientY)
      if (!svgPt) return angle
      const { x, y } = svgToContent(svgPt.sx, svgPt.sy)
      const dx = x - cx
      const dy = cy - y
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI
      if (deg < 0) deg += 360
      if (angleAsInt) deg = Math.round(deg)
      else deg = Math.round(deg * 1000) / 1000
      return deg
    },
    [angle, angleAsInt, clientToSvg, svgToContent, cx, cy]
  )

  const canDrag = !playing || dragging
  const viewIsDefault = view.k === 1 && view.tx === 0 && view.ty === 0

  const zoomAt = useCallback((sx, sy, factor) => {
    setView((v) => {
      const k2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, v.k * factor))
      if (k2 === v.k) return v
      const f = k2 / v.k
      return {
        k: k2,
        tx: sx - f * (sx - v.tx),
        ty: sy - f * (sy - v.ty),
      }
    })
  }, [])

  const zoomByButton = useCallback(
    (factor) => {
      zoomAt(W / 2, H / 2, factor)
    },
    [zoomAt, W, H]
  )

  const resetView = useCallback(() => {
    setView({ k: 1, tx: 0, ty: 0 })
  }, [])

  // Wheel zoom on the diagram (non-passive so page doesn't scroll)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      const sx = ((e.clientX - rect.left) * W) / rect.width
      const sy = ((e.clientY - rect.top) * H) / rect.height
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
      zoomAt(sx, sy, factor)
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [W, H, zoomAt])

  const handlePointerDown = (e) => {
    // Right-click, middle-click, or Alt+left: pan the view
    if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault()
      pointerModeRef.current = 'pan'
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return
    }

    // Left-click only: set θ when paused, near the circle
    if (e.button !== 0) return
    if (playing) return
    const svgPt = clientToSvg(e.clientX, e.clientY)
    if (!svgPt) return
    const { x, y } = svgToContent(svgPt.sx, svgPt.sy)
    const hitPad = 40 / (viewRef.current.k || 1)
    const dist = Math.hypot(x - cx, y - cy)
    if (dist > R + hitPad) return
    pointerModeRef.current = 'angle'
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    setAngle(getAngleFromEvent(e.clientX, e.clientY))
  }

  const handlePointerMove = (e) => {
    if (pointerModeRef.current === 'pan' && panStartRef.current) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect || rect.width < 1) return
      const start = panStartRef.current
      const dx = ((e.clientX - start.x) * W) / rect.width
      const dy = ((e.clientY - start.y) * H) / rect.height
      setView((v) => ({
        ...v,
        tx: start.tx + dx,
        ty: start.ty + dy,
      }))
      return
    }
    if (pointerModeRef.current === 'angle' && dragging) {
      setAngle(getAngleFromEvent(e.clientX, e.clientY))
    }
  }

  const handlePointerUp = (e) => {
    if (pointerModeRef.current === 'angle') {
      setDragging(false)
    }
    pointerModeRef.current = null
    panStartRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* */
    }
  }

  // Suppress browser menu so right-drag can pan
  const handleContextMenu = (e) => {
    e.preventDefault()
  }

  const downloadPng = useCallback(async () => {
    const svg = svgRef.current
    if (!svg) return
    try {
      const clone = svg.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('width', String(W))
      clone.setAttribute('height', String(H))
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('x', '0')
      bg.setAttribute('y', '0')
      bg.setAttribute('width', String(W))
      bg.setAttribute('height', String(H))
      bg.setAttribute('fill', svgBg)
      clone.insertBefore(bg, clone.firstChild)

      const xml = new XMLSerializer().serializeToString(clone)
      const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const scale = 2
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(W * scale)
      canvas.height = Math.round(H * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        return
      }
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!pngBlob) return

      const fnKeys = [
        ['sin', showSin],
        ['cos', showCos],
        ['tan', showTan],
        ['csc', showCsc],
        ['sec', showSec],
        ['cot', showCot],
      ]
        .filter(([, on]) => on)
        .map(([name]) => name)
      const anglePart = angleAsInt
        ? String(Math.round(angle))
        : String(Math.round(angle * 1000) / 1000)
      const base =
        fnKeys.length > 0 ? `${fnKeys.join('_')}_${anglePart}` : `trig_${anglePart}`

      const a = document.createElement('a')
      const out = URL.createObjectURL(pngBlob)
      a.href = out
      a.download = `${base}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(out), 2000)
    } catch (err) {
      console.error('PNG export failed', err)
    }
  }, [
    W,
    H,
    svgBg,
    showSin,
    showCos,
    showTan,
    showCsc,
    showSec,
    showCot,
    angle,
    angleAsInt,
  ])

  const viewTransform = `matrix(${view.k} 0 0 ${view.k} ${view.tx} ${view.ty})`

  // Wave history: θ from 0 → current
  const history = useMemo(() => {
    const pts = []
    const steps = 720 // denser sampling for vertical asymptotes
    const end = Math.min(angle, 360)
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * end
      const tr = (t * Math.PI) / 180
      const s = Math.sin(tr)
      const c = Math.cos(tr)
      pts.push({
        t,
        x: waveX0 + (t / 360) * waveW,
        sin: s,
        cos: c,
        tan: safeTan(s, c),
        csc: safeCsc(s),
        sec: safeSec(c),
        cot: safeCot(s, c),
      })
    }
    return pts
  }, [angle, waveW, waveX0])

  const sinPath = useMemo(
    () => buildClippedPath(history, (p) => p.sin, cy, amp, yClip),
    [history, cy, amp, yClip]
  )
  const cosPath = useMemo(
    () => buildClippedPath(history, (p) => p.cos, cy, amp, yClip),
    [history, cy, amp, yClip]
  )
  const tanPath = useMemo(
    () => buildClippedPath(history, (p) => p.tan, cy, amp, yClip),
    [history, cy, amp, yClip]
  )
  const cscPath = useMemo(
    () => buildClippedPath(history, (p) => p.csc, cy, amp, yClip),
    [history, cy, amp, yClip]
  )
  const secPath = useMemo(
    () => buildClippedPath(history, (p) => p.sec, cy, amp, yClip),
    [history, cy, amp, yClip]
  )
  const cotPath = useMemo(
    () => buildClippedPath(history, (p) => p.cot, cy, amp, yClip),
    [history, cy, amp, yClip]
  )

  const scanX = waveX0 + (angle / 360) * waveW

  const scanY = (v) => {
    if (v == null || !Number.isFinite(v) || Math.abs(v) > yClip) return null
    return cy - v * amp
  }

  const sinScanY = scanY(sin)
  const cosScanY = scanY(cos)
  const tanScanY = scanY(tan)
  const cscScanY = scanY(csc)
  const secScanY = scanY(sec)
  const cotScanY = scanY(cot)

  const functions = [
    { key: 'sin', label: 'sin x', short: 'sin θ', show: showSin, setShow: setShowSin, value: sin, path: sinPath, scanY: sinScanY, color: FN_COLORS.sin },
    { key: 'cos', label: 'cos x', short: 'cos θ', show: showCos, setShow: setShowCos, value: cos, path: cosPath, scanY: cosScanY, color: FN_COLORS.cos },
    { key: 'tan', label: 'tan x', short: 'tan θ', show: showTan, setShow: setShowTan, value: tan, path: tanPath, scanY: tanScanY, color: FN_COLORS.tan },
    { key: 'csc', label: 'csc x', short: 'csc θ', show: showCsc, setShow: setShowCsc, value: csc, path: cscPath, scanY: cscScanY, color: FN_COLORS.csc },
    { key: 'sec', label: 'sec x', short: 'sec θ', show: showSec, setShow: setShowSec, value: sec, path: secPath, scanY: secScanY, color: FN_COLORS.sec },
    { key: 'cot', label: 'cot x', short: 'cot θ', show: showCot, setShow: setShowCot, value: cot, path: cotPath, scanY: cotScanY, color: FN_COLORS.cot },
  ]

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Graphs</p>
          <h1 className="hero-title--wrap">
            Trigonometric <em>functions</em>
          </h1>

        </div>
        <div className="hero-stats">
          <div className="live-angle live-angle--input">
            <span className="label">θ — type to snap</span>
            <div className="value value--input">
              <input
                type="text"
                inputMode="decimal"
                className={`angle-input${angleAsInt ? ' angle-input--int' : ' angle-input--float'}`}
                value={angleInput}
                aria-label={coordsInRadians ? 'Angle in radians' : 'Angle in degrees'}
                title={
                  coordsInRadians
                    ? 'Enter θ in radians, then Enter or leave the field'
                    : 'Enter θ in degrees, then Enter or leave the field'
                }
                onFocus={() => {
                  angleInputFocused.current = true
                }}
                onChange={(e) => setAngleInput(e.target.value)}
                onBlur={() => {
                  angleInputFocused.current = false
                  applyAngleInput()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur()
                  }
                }}
              />
              <span className="angle-input-unit">{coordsInRadians ? 'rad' : '°'}</span>
            </div>
            <div className="sub">
              {coordsInRadians
                ? `${formatAngleNumber(angle, angleAsInt)}° · ${angleAsInt ? 'int' : 'float'} mode`
                : `${formatAngleNumber(rad, angleAsInt)} rad · ${angleAsInt ? 'int' : 'float'} mode`}
            </div>
          </div>
        </div>
      </header>

      <main className="workspace workspace--single">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Unit circle → trig graphs</span>
            <span className="panel-hint">
              {playing
                ? 'Space = pause · scroll = zoom · right-drag = pan'
                : 'Space = play · left-drag point · scroll = zoom · right-drag = pan'}
            </span>
          </div>

          <div className="viz-body">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className={`waves-svg${canDrag && !playing ? ' is-draggable' : ''}`}
              role="img"
              aria-label="Unit circle with trigonometric function graphs"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={handleContextMenu}
            >
              <g transform={viewTransform}>
              {/* Wave axes — extended vertically for unbounded functions */}
              <line x1={waveX0} y1={cy} x2={waveX0 + waveW} y2={cy} stroke={grid} strokeWidth="1" />
              <line
                x1={waveX0}
                y1={20}
                x2={waveX0}
                y2={H - 20}
                stroke={grid}
                strokeWidth="1"
              />
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line
                    x1={waveX0 + f * waveW}
                    y1={20}
                    x2={waveX0 + f * waveW}
                    y2={H - 36}
                    stroke={grid}
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={waveX0 + f * waveW}
                    y={H - 14}
                    textAnchor="middle"
                    fontSize="11"
                    fill={muted}
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {f === 1 ? '2π' : f === 0.5 ? 'π' : f === 0.25 ? 'π/2' : '3π/2'}
                  </text>
                </g>
              ))}
              <text
                x={waveX0 - 8}
                y={cy - amp + 4}
                textAnchor="end"
                fontSize="11"
                fill={muted}
                fontFamily="JetBrains Mono, monospace"
              >
                1
              </text>
              <text
                x={waveX0 - 8}
                y={cy + amp + 4}
                textAnchor="end"
                fontSize="11"
                fill={muted}
                fontFamily="JetBrains Mono, monospace"
              >
                −1
              </text>
              {/* faint ±1 guides across the wave plot */}
              <line
                x1={waveX0}
                y1={cy - amp}
                x2={waveX0 + waveW}
                y2={cy - amp}
                stroke={grid}
                strokeWidth="1"
                strokeDasharray="2 5"
              />
              <line
                x1={waveX0}
                y1={cy + amp}
                x2={waveX0 + waveW}
                y2={cy + amp}
                stroke={grid}
                strokeWidth="1"
                strokeDasharray="2 5"
              />

              {/* Circle */}
              <circle cx={cx} cy={cy} r={R} fill={panelFill} stroke={ink} strokeOpacity="0.35" strokeWidth="1.5" />
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
              {/* Axes — full construction extent when recip functions are on */}
              <line
                x1={cx - R * (showCotGeo || showCscGeo ? MAX_GEO + 0.25 : 1.15)}
                y1={cy}
                x2={cx + R * (showTanGeo || showSecGeo ? MAX_GEO + 0.25 : 1.15)}
                y2={cy}
                stroke={grid}
              />
              <line
                x1={cx}
                y1={cy - R * (showTanGeo || showSecGeo || showCotGeo || showCscGeo ? MAX_GEO + 0.25 : 1.15)}
                x2={cx}
                y2={cy + R * (showTanGeo || showSecGeo || showCotGeo || showCscGeo ? MAX_GEO + 0.25 : 1.15)}
                stroke={grid}
              />

              {[0, 90, 180, 270].map((a) => {
                const tr = (a * Math.PI) / 180
                const tx = Math.cos(tr)
                const ty = Math.sin(tr)
                return (
                  <line
                    key={a}
                    x1={cx + tx * (R - 6)}
                    y1={cy - ty * (R - 6)}
                    x2={cx + tx * (R + 6)}
                    y2={cy - ty * (R + 6)}
                    stroke={tickStroke}
                    strokeWidth="1.5"
                    opacity={showLabels ? 1 : 0.55}
                  />
                )
              })}

              {showLabels && (
                <g className="circle-axis-labels" aria-hidden="true">
                  <text x={cx + R + 12} y={cy - 10} fontSize="10" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                    1
                  </text>
                  <text x={cx - R - 26} y={cy - 10} fontSize="10" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                    −1
                  </text>
                  <text x={cx + 10} y={cy - R - 10} fontSize="10" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                    1
                  </text>
                  <text x={cx + 10} y={cy + R + 16} fontSize="10" fill={labelFill} fontFamily="JetBrains Mono, monospace">
                    −1
                  </text>
                  <text x={cx + R + 22} y={cy + 4} fontSize="11" fill={angleLabelFill} fontFamily="JetBrains Mono, monospace">
                    {labelsInRadians ? '0' : '0°'}
                  </text>
                  <text
                    x={cx}
                    y={cy - R - 22}
                    fontSize="11"
                    fill={angleLabelFill}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {labelsInRadians ? 'π/2' : '90°'}
                  </text>
                  <text
                    x={cx - R - 22}
                    y={cy + 4}
                    fontSize="11"
                    fill={angleLabelFill}
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {labelsInRadians ? 'π' : '180°'}
                  </text>
                  <text
                    x={cx}
                    y={cy + R + 30}
                    fontSize="11"
                    fill={angleLabelFill}
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {labelsInRadians ? '3π/2' : '270°'}
                  </text>
                </g>
              )}

              {/*
                Segment geometry — port of mathsisfun.com circle-unit.js (Names mode):
                  sec: O → (sec, 0) on the x-axis
                  csc: O → (0, csc) on the y-axis
                  cot: P → (0, csc) along the tangent at P
                  tan: P → (sec, 0) along the tangent at P
                  sin: (cos, 0) → P   cos: O → (cos, 0)

                Shaded triangles (one per toggled function, same hue as the stroke):
                  cos / sin → O–foot–P
                  tan / sec → O–P–(sec,0)
                  cot / csc → O–P–(0,csc)
              */}

              {/* ── Soft fills (under strokes) ── */}
              {showCos && (
                <polygon
                  points={`${cx},${cy} ${footX},${footY} ${px},${py}`}
                  fill={softFill(FN_COLORS.cos, isLight)}
                  stroke="none"
                />
              )}
              {showSin && (
                <polygon
                  points={`${cx},${cy} ${footX},${footY} ${px},${py}`}
                  fill={softFill(FN_COLORS.sin, isLight)}
                  stroke="none"
                />
              )}
              {showSecGeo && secPt && (
                <polygon
                  points={`${cx},${cy} ${px},${py} ${secPt.x},${secPt.y}`}
                  fill={softFill(FN_COLORS.sec, isLight)}
                  stroke="none"
                />
              )}
              {showTanGeo && tanEnd && (
                <polygon
                  points={`${cx},${cy} ${px},${py} ${tanEnd.x},${tanEnd.y}`}
                  fill={softFill(FN_COLORS.tan, isLight)}
                  stroke="none"
                />
              )}
              {showCscGeo && cscPt && (
                <polygon
                  points={`${cx},${cy} ${px},${py} ${cscPt.x},${cscPt.y}`}
                  fill={softFill(FN_COLORS.csc, isLight)}
                  stroke="none"
                />
              )}
              {showCotGeo && cotEnd && (
                <polygon
                  points={`${cx},${cy} ${px},${py} ${cotEnd.x},${cotEnd.y}`}
                  fill={softFill(FN_COLORS.cot, isLight)}
                  stroke="none"
                />
              )}

              {/* Full tangent line guide (through P, intercepts axes) */}
              {anyRecip && secPt && cscPt && (
                <line
                  x1={cscPt.x}
                  y1={cscPt.y}
                  x2={secPt.x}
                  y2={secPt.y}
                  stroke={ink}
                  strokeOpacity="0.15"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
              )}

              {/* sec — O → (sec, 0)  [mathsisfun: fnLineDraw(0,1, secWd, 0)] */}
              {showSecGeo && secPt && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={secPt.x}
                    y2={secPt.y}
                    stroke={FN_COLORS.sec}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx={secPt.x} cy={secPt.y} r={3.5} fill={FN_COLORS.sec} />
                  {showNames && (
                    <text
                      x={(cx + secPt.x) / 2}
                      y={cy + 16}
                      fontSize="12"
                      fill={FN_COLORS.sec}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      sec
                    </text>
                  )}
                </g>
              )}

              {/* csc — O → (0, csc)  [mathsisfun: fnLineDraw(0,0, 0, cscHt)] */}
              {showCscGeo && cscPt && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cscPt.x}
                    y2={cscPt.y}
                    stroke={FN_COLORS.csc}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx={cscPt.x} cy={cscPt.y} r={3.5} fill={FN_COLORS.csc} />
                  {showNames && (
                    <text
                      x={cx - 12}
                      y={Math.max(TOP_PAD + 14, (cy + cscPt.y) / 2)}
                      fontSize="12"
                      fill={FN_COLORS.csc}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor="end"
                    >
                      csc
                    </text>
                  )}
                </g>
              )}

              {/* cot — P → (0, csc)  [mathsisfun: fnLineDraw(cX,cY, -cX, -cY+cscHt)] */}
              {showCotGeo && cotEnd && (
                <g>
                  <line
                    x1={px}
                    y1={py}
                    x2={cotEnd.x}
                    y2={cotEnd.y}
                    stroke={FN_COLORS.cot}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {showNames && (
                    <text
                      x={(px + cotEnd.x) / 2 + 10}
                      y={Math.max(TOP_PAD + 14, (py + cotEnd.y) / 2 - 4)}
                      fontSize="12"
                      fill={FN_COLORS.cot}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      cot
                    </text>
                  )}
                </g>
              )}

              {/* tan — P → (sec, 0)  [mathsisfun: fnLineDraw(cX,cY, -tanLen*sin, -cY)] */}
              {showTanGeo && tanEnd && (
                <g>
                  <line
                    x1={px}
                    y1={py}
                    x2={tanEnd.x}
                    y2={tanEnd.y}
                    stroke={FN_COLORS.tan}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <circle cx={tanEnd.x} cy={tanEnd.y} r={3.5} fill={FN_COLORS.tan} />
                  {showNames && (
                    <text
                      x={(px + tanEnd.x) / 2 + 8}
                      y={(py + tanEnd.y) / 2}
                      fontSize="12"
                      fill={FN_COLORS.tan}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                    >
                      tan
                    </text>
                  )}
                </g>
              )}

              {/* cos — O → (cos, 0) */}
              {showCos && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={footX}
                    y2={footY}
                    stroke={FN_COLORS.cos}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {showNames && (
                    <text
                      x={(cx + footX) / 2}
                      y={cy - 8}
                      fontSize="12"
                      fill={FN_COLORS.cos}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      cos
                    </text>
                  )}
                  {cosScanY != null && (
                    <line
                      x1={px}
                      y1={py}
                      x2={scanX}
                      y2={cosScanY}
                      stroke={FN_COLORS.cos}
                      strokeOpacity="0.18"
                      strokeDasharray="4 4"
                    />
                  )}
                </g>
              )}

              {/* sin — (cos, 0) → P */}
              {showSin && (
                <g>
                  <line
                    x1={footX}
                    y1={footY}
                    x2={px}
                    y2={py}
                    stroke={FN_COLORS.sin}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {showNames && (
                    <text
                      x={px + (cos >= 0 ? 8 : -8)}
                      y={(footY + py) / 2}
                      fontSize="12"
                      fill={FN_COLORS.sin}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor={cos >= 0 ? 'start' : 'end'}
                    >
                      sin
                    </text>
                  )}
                  {sinScanY != null && (
                    <line
                      x1={px}
                      y1={py}
                      x2={scanX}
                      y2={sinScanY}
                      stroke={FN_COLORS.sin}
                      strokeOpacity="0.22"
                      strokeDasharray="4 4"
                    />
                  )}
                </g>
              )}

              {/* Radius OP */}
              <line
                x1={cx}
                y1={cy}
                x2={px}
                y2={py}
                stroke={ink}
                strokeWidth="1.6"
                strokeLinecap="round"
              />

              {/* Dashed links construction tips → wave markers */}
              {showTanGeo && tanEnd && tanScanY != null && (
                <line
                  x1={tanEnd.x}
                  y1={tanEnd.y}
                  x2={scanX}
                  y2={tanScanY}
                  stroke={FN_COLORS.tan}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showSecGeo && secPt && secScanY != null && (
                <line
                  x1={secPt.x}
                  y1={secPt.y}
                  x2={scanX}
                  y2={secScanY}
                  stroke={FN_COLORS.sec}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showCotGeo && cotEnd && cotScanY != null && (
                <line
                  x1={cotEnd.x}
                  y1={cotEnd.y}
                  x2={scanX}
                  y2={cotScanY}
                  stroke={FN_COLORS.cot}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showCscGeo && cscPt && cscScanY != null && (
                <line
                  x1={cscPt.x}
                  y1={cscPt.y}
                  x2={scanX}
                  y2={cscScanY}
                  stroke={FN_COLORS.csc}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}

              <circle
                cx={px}
                cy={py}
                r={dragging ? 8 : 6}
                fill={
                  isLight
                    ? 'rgba(37, 99, 235, 0.12)'
                    : 'rgba(125, 211, 252, 0.16)'
                }
                stroke={
                  isLight
                    ? 'rgba(37, 99, 235, 0.5)'
                    : 'rgba(125, 211, 252, 0.55)'
                }
                strokeWidth="1.75"
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

              {/* Function graphs (draw order: unbounded first, then sin/cos on top) */}
              {functions
                .filter((f) => f.show && f.path)
                .map((f) => (
                  <path
                    key={f.key}
                    d={f.path}
                    fill="none"
                    stroke={f.color}
                    strokeWidth={f.key === 'sin' || f.key === 'cos' ? 2 : 1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

              {/* Scan line + markers */}
              <line
                x1={scanX}
                y1={20}
                x2={scanX}
                y2={H - 36}
                stroke={muted}
                strokeOpacity="0.5"
                strokeDasharray="3 3"
              />
              {functions.map(
                (f) =>
                  f.show &&
                  f.scanY != null && (
                    <circle key={`scan-${f.key}`} cx={scanX} cy={f.scanY} r={5} fill={f.color} />
                  )
              )}

              <text
                x={cx}
                y={18}
                textAnchor="middle"
                fontSize="11"
                fill={muted}
                letterSpacing="0.12em"
              >
                UNIT CIRCLE
              </text>
              <text
                x={waveX0 + waveW / 2}
                y={18}
                textAnchor="middle"
                fontSize="11"
                fill={muted}
                letterSpacing="0.12em"
              >
                TRIG GRAPHS
              </text>
              </g>
            </svg>

            <div className="waves-controls">
              <div className="wave-toolbar">
                <button type="button" className="btn-primary" onClick={() => setPlaying((p) => !p)}>
                  {playing ? 'Pause' : 'Play'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => setAngle(0)}>
                  Reset θ
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={downloadPng}
                  title="Download diagram as PNG"
                >
                  Save PNG
                </button>
                <div className="zoom-controls" role="group" aria-label="Diagram zoom">
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    onClick={() => zoomByButton(1 / ZOOM_FACTOR)}
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    −
                  </button>
                  <span
                    className="zoom-readout"
                    title="Scroll to zoom · right-drag (or Alt-drag / middle-drag) to pan"
                  >
                    {Math.round(view.k * 100)}%
                  </span>
                  <button
                    type="button"
                    className="btn-ghost btn-icon"
                    onClick={() => zoomByButton(ZOOM_FACTOR)}
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={resetView}
                    disabled={viewIsDefault}
                    title="Reset zoom and pan"
                  >
                    Reset view
                  </button>
                </div>
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
                    step={angleAsInt ? 1 : 0.001}
                    value={angle}
                    onChange={(e) => {
                      setPlaying(false)
                      let v = parseFloat(e.target.value)
                      if (angleAsInt) v = Math.round(v)
                      setAngle(v)
                    }}
                  />
                </label>
                <label
                  className={`chip-toggle${angleAsInt ? ' is-on' : ''}`}
                  title={
                    angleAsInt
                      ? 'Angle as whole numbers (int) — click for 3 decimal places'
                      : 'Angle with 3 decimal places (float) — click for whole numbers'
                  }
                >
                  <input
                    type="checkbox"
                    checked={angleAsInt}
                    onChange={(e) => setAngleAsInt(e.target.checked)}
                  />
                  {angleAsInt ? 'θ: int' : 'θ: float'}
                </label>
              </div>

              <div className="fn-toggles">
                {functions.map((f) => (
                  <label
                    key={f.key}
                    className={`chip-toggle chip--${f.key}${f.show ? ' is-on' : ''}`}
                    title={`Toggle ${f.label}`}
                  >
                    <input
                      type="checkbox"
                      checked={f.show}
                      onChange={(e) => f.setShow(e.target.checked)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>

              <div className="metrics metrics--inline">
                {functions
                  .filter((f) => f.show)
                  .map((f) => (
                    <div key={f.key} className={`metric metric--${f.key}`}>
                      <span className="metric-label">{f.short}</span>
                      <span className="metric-value">{formatTrigValue(f.value)}</span>
                    </div>
                  ))}
                <label
                  className={`chip-toggle${showNames ? ' is-on' : ''}`}
                  title="Show or hide sin / cos / tan / … labels on the unit circle"
                >
                  <input
                    type="checkbox"
                    checked={showNames}
                    onChange={(e) => setShowNames(e.target.checked)}
                  />
                  Names
                </label>
                <label className={`chip-toggle${showCoords ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={showCoords}
                    onChange={(e) => setShowCoords(e.target.checked)}
                  />
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
                <label
                  className={`chip-toggle${showLabels ? ' is-on' : ''}`}
                  title="Unit scale (±1) and cardinal angles on the unit circle"
                >
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                  />
                  Axis labels
                </label>
                <label
                  className={`chip-toggle${labelsInRadians ? ' is-on' : ''}${!showLabels ? ' is-disabled' : ''}`}
                  title={
                    labelsInRadians
                      ? 'Axis angles: 0 · π/2 · π · 3π/2'
                      : 'Axis angles: 0° · 90° · 180° · 270°'
                  }
                >
                  <input
                    type="checkbox"
                    checked={labelsInRadians}
                    disabled={!showLabels}
                    onChange={(e) => setLabelsInRadians(e.target.checked)}
                  />
                  {labelsInRadians ? 'Axis labels in radians' : 'Axis labels in degrees'}
                </label>
              </div>

              <p className="derive-note">
                Each function is a length on the unit circle and a wave against θ. Toggle sin, cos,
                tan, csc, sec, and cot — circle segments and graphs stay in sync; unbounded curves
                break at their asymptotes.
                {!playing && ' Left-drag the point on the unit circle to set θ.'}
                {' '}Scroll to zoom, right-drag to pan, Save PNG to export.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
