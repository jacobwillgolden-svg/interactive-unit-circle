/**
 * Constants & identities — HS / undergrad focused:
 * Core trig rewrite toolkit (cheat-sheet style), then unit-circle / Euler,
 * Calc 1 bridge, number types, and optional “bonus” constants (φ, Fibonacci).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import EulerSpiral3D from '../components/EulerSpiral3D'

const PHI = (1 + Math.sqrt(5)) / 2
const E = Math.E

function tex(source, display = false) {
  try {
    return katex.renderToString(source, {
      throwOnError: false,
      displayMode: display,
      output: 'html',
      strict: 'ignore',
    })
  } catch {
    return source
  }
}

function Formula({ math, display = true, className = '' }) {
  const Tag = display ? 'div' : 'span'
  return (
    <Tag
      className={`id-katex${display ? ' id-katex--display' : ' id-katex--inline'}${className ? ` ${className}` : ''}`}
      dangerouslySetInnerHTML={{ __html: tex(math, display) }}
    />
  )
}

function UseWhen({ children }) {
  return (
    <p className="id-use-when">
      <span className="id-use-label">When do I use this?</span> {children}
    </p>
  )
}

function WatchOut({ children }) {
  return (
    <p className="id-watch-out">
      <span className="id-watch-label">Common mistake</span> {children}
    </p>
  )
}

function Check({ children }) {
  return (
    <div className="id-check">
      <span className="id-check-label">Quick check</span>
      <div className="id-check-body">{children}</div>
    </div>
  )
}

/** Course chips — colors match Browse by level (trig red, precalc blue, calc1 gold, calc2 purple). */
const COURSE_META = {
  trig: { label: 'Trig', cls: 'id-course-tag--trig' },
  precalc: { label: 'Pre-Calc', cls: 'id-course-tag--precalc' },
  calc1: { label: 'Calc 1', cls: 'id-course-tag--calc1' },
  calc2: { label: 'Calc 2', cls: 'id-course-tag--calc2' },
  geometry: { label: 'Geometry', cls: 'id-course-tag--neutral' },
  graphs: { label: 'Graphs', cls: 'id-course-tag--neutral' },
  bonus: { label: 'Bonus', cls: 'id-course-tag--neutral' },
}

/**
 * Tiny circular logo for sections with drag / play / orbit modules (Thales, Euler, …).
 * Icon-only — sits next to course tags and in Browse-by-level hover panels.
 */
function InteractiveBadge({ compact = false }) {
  const uid = useId().replace(/:/g, '')
  return (
    <span
      className={`id-interactive-badge${compact ? ' id-interactive-badge--compact' : ''}`}
      title="Interactive module — drag or explore in this section"
      aria-label="Interactive module"
    >
      <svg
        className="id-interactive-badge-icon"
        viewBox="0 0 24 24"
        width="22"
        height="22"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`${uid}-ring`} x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f0d9a8" />
            <stop offset="55%" stopColor="#e8b86d" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <radialGradient id={`${uid}-core`} cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#fdf6e8" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#f0d9a8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f0d9a8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* soft core glow */}
        <circle cx="12" cy="12" r="7.5" fill={`url(#${uid}-core)`} />
        {/* outer orbit */}
        <circle
          cx="12"
          cy="12"
          r="8.2"
          fill="none"
          stroke={`url(#${uid}-ring)`}
          strokeWidth="1.35"
          opacity="0.95"
        />
        {/* dashed inner track (motion) */}
        <circle
          cx="12"
          cy="12"
          r="5.1"
          fill="none"
          stroke="#f0d9a8"
          strokeWidth="1"
          strokeDasharray="2.2 2.4"
          opacity="0.55"
        />
        {/* unit-circle point */}
        <circle cx="16.9" cy="8.6" r="1.85" fill="#f0d9a8" />
        <circle cx="16.9" cy="8.6" r="0.7" fill="#1a1520" opacity="0.55" />
        {/* radius tick */}
        <line
          x1="12"
          y1="12"
          x2="16.2"
          y2="9.1"
          stroke="#f0d9a8"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.75"
        />
        {/* center */}
        <circle cx="12" cy="12" r="1.15" fill="#f0d9a8" />
      </svg>
    </span>
  )
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.sectionId] — looks up tags from CHEAT_SECTIONS
 * @param {Array<keyof typeof COURSE_META>} [props.courses] — override if needed
 */
function SectionLabel({ children, sectionId, courses }) {
  const catalog = sectionId ? CHEAT_SECTIONS.find((s) => s.id === sectionId) : null
  const tags = courses ?? catalog?.courses ?? []
  const interactive = Boolean(catalog?.interactive)
  return (
    <div className="id-section-head">
      <h2 className="id-section-title">{children}</h2>
      {(tags.length > 0 || interactive) && (
        <div className="id-course-tags" aria-label="Course levels">
          {tags.map((key) => {
            const meta = COURSE_META[key]
            if (!meta) return null
            return (
              <span key={key} className={`id-course-tag ${meta.cls}`}>
                {meta.label}
              </span>
            )
          })}
          {interactive && <InteractiveBadge />}
        </div>
      )}
    </div>
  )
}

/** Compact unit-circle sketch for a known angle (degrees for labels; math in radians). */
function MiniUnitCircle({ deg, cosLabel, sinLabel }) {
  const rad = (deg * Math.PI) / 180
  const cx = 80
  const cy = 80
  const r = 52
  const px = cx + r * Math.cos(rad)
  const py = cy - r * Math.sin(rad)
  return (
    <svg viewBox="0 0 160 160" className="id-svg id-svg--mini-circle" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" />
      <line x1={cx - r - 8} y1={cy} x2={cx + r + 8} y2={cy} stroke="currentColor" strokeOpacity="0.2" />
      <line x1={cx} y1={cy - r - 8} x2={cx} y2={cy + r + 8} stroke="currentColor" strokeOpacity="0.2" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#7dd3fc" strokeWidth="2" />
      <line x1={cx} y1={cy} x2={px} y2={cy} stroke="#2563eb" strokeWidth="2" />
      <line x1={px} y1={cy} x2={px} y2={py} stroke="#dc2626" strokeWidth="2" />
      <circle cx={px} cy={py} r={4} fill="#7dd3fc" />
      <text x={cx + 6} y={cy + 14} fontSize="10" fill="#2563eb">
        {cosLabel}
      </text>
      <text x={px + 6} y={(cy + py) / 2} fontSize="10" fill="#dc2626">
        {sinLabel}
      </text>
      <text x={px + 4} y={py - 6} fontSize="10" fill="#7dd3fc">
        {deg}°
      </text>
    </svg>
  )
}

function RightTriangle() {
  // Mirror layout (how many people sketch it):
  // right angle at C bottom-left; θ at A bottom-right; opposite = left vertical;
  // adjacent = base; hypotenuse slopes down-left → up-right from C-side top to A.
  const Cx = 88 // right angle
  const Cy = 120
  const Bx = 88 // top of opposite leg
  const By = 44
  const Ax = 238 // θ corner
  const Ay = 120
  const arcR = 22
  // Unit directions from A: adjacent toward C (left); hypotenuse toward B
  const hypDx = Bx - Ax
  const hypDy = By - Ay
  const hypLen = Math.hypot(hypDx, hypDy)
  const hypUX = hypDx / hypLen
  const hypUY = hypDy / hypLen
  const arcStartX = Ax - arcR
  const arcStartY = Ay
  const arcEndX = Ax + hypUX * arcR
  const arcEndY = Ay + hypUY * arcR
  // Label along AB, outside the triangle, and never upside-down
  const midHx = (Ax + Bx) / 2
  const midHy = (Ay + By) / 2
  let hypRot = (Math.atan2(By - Ay, Bx - Ax) * 180) / Math.PI
  if (hypRot > 90) hypRot -= 180
  if (hypRot < -90) hypRot += 180
  // Push label away from interior (opposite direction of C from midpoint)
  const toCx = Cx - midHx
  const toCy = Cy - midHy
  const toCLen = Math.hypot(toCx, toCy) || 1
  const hypLabelX = midHx - (toCx / toCLen) * 16
  const hypLabelY = midHy - (toCy / toCLen) * 16

  return (
    <svg viewBox="0 0 300 160" className="id-svg id-svg--triangle" aria-hidden="true">
      <polygon
        points={`${Ax},${Ay} ${Cx},${Cy} ${Bx},${By}`}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      {/* right-angle square at C (inside triangle) */}
      <rect x={Cx} y={Cy - 12} width="12" height="12" fill="none" stroke="currentColor" strokeOpacity="0.5" />
      {/* angle arc at A: adjacent → hypotenuse (sweep=1 with y-down) */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 0 1 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke="#f0d9a8"
        strokeWidth="1.5"
        strokeOpacity="0.9"
      />
      {/* θ inside the arc — a hair lower */}
      <text x={Ax - 30} y={Ay - 2} fontSize="11" fill="#f0d9a8" fontFamily="Georgia, serif">
        θ
      </text>
      <text
        x={(Ax + Cx) / 2}
        y="145"
        fontSize="13"
        fill="#2563eb"
        textAnchor="middle"
        fontFamily="system-ui, sans-serif"
      >
        adjacent
      </text>
      <text
        x={Cx - 8}
        y={(By + Cy) / 2 + 4}
        fontSize="13"
        fill="#dc2626"
        textAnchor="end"
        fontFamily="system-ui, sans-serif"
      >
        opposite
      </text>
      <text
        x={hypLabelX}
        y={hypLabelY}
        fontSize="13"
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${hypRot} ${hypLabelX} ${hypLabelY})`}
        fontFamily="system-ui, sans-serif"
      >
        hypotenuse
      </text>
    </svg>
  )
}

/**
 * Squaring a circle by rolling + Thales geometric mean.
 * All four steps on ONE horizontal row — large panels.
 * Step 2: drag the circle to roll a half turn (distance πr, rotation s/r).
 */
function ThalesDiagram() {
  const r = 100
  const piR = Math.PI * r
  const x = Math.sqrt(piR * r)
  const semiR = (piR + r) / 2

  const pad = 36
  const labelH = 52
  const colGap = 48
  // Each column wide enough for its diagram
  const col1W = r * 2 + 120
  const col2W = piR + r + 140
  const col3W = piR + r + 100
  const col4W = piR + r + x + 80

  const col1 = pad
  const col2 = col1 + col1W + colGap
  const col3 = col2 + col2W + colGap
  const col4 = col3 + col3W + colGap

  const contentTop = pad + labelH
  const contentH = Math.max(r * 2 + 160, semiR + x + 160, r + x + 180)

  const W = col4 + col4W + pad
  const H = contentTop + contentH + pad

  // ①
  const c1x = col1 + col1W / 2
  const c1y = contentTop + r + 40

  // ② track geometry (fixed)
  const trackY = contentTop + r * 2 + 56
  const trackX0 = col2 + 24

  // Interactive roll: s ∈ [0, πr]. After half turn, drag the second radius onto the grey r slot.
  const [rollS, setRollS] = useState(0)
  const [rPlaced, setRPlaced] = useState(false)
  const [dragging, setDragging] = useState(false) // rolling the circle
  const [isRadiusDragging, setIsRadiusDragging] = useState(false)
  const [radiusDrag, setRadiusDrag] = useState(null) // { x, y } free end while dragging radius stick
  const svgRef = useRef(null)
  const grabOffsetRef = useRef(0)
  const draggingRef = useRef(false)
  const rollCxRef = useRef(trackX0)

  const rollCx = trackX0 + rollS
  const rollCy = trackY - r
  rollCxRef.current = rollCx
  // Rolling right without slip → clockwise rotation (SVG +angle is clockwise with y-down)
  const rollDeg = (rollS / r) * (180 / Math.PI)
  const halfDone = rollS >= piR - 0.5
  const rDone = rPlaced

  // First radius local: −90° (starts up, ends down after half turn)
  const rad1LocalDeg = -90
  // Second radius 90° from first: local 180° → world-right after half-turn rotation
  const rad2LocalDeg = 180
  const rad2LocalRad = (rad2LocalDeg * Math.PI) / 180

  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const ctm = svg.getScreenCTM()
    if (ctm) {
      const pt = svg.createSVGPoint()
      pt.x = clientX
      pt.y = clientY
      const p = pt.matrixTransform(ctm.inverse())
      return { x: p.x, y: p.y }
    }
    const rect = svg.getBoundingClientRect()
    const style = getComputedStyle(svg)
    const padL = parseFloat(style.paddingLeft) || 0
    const padT = parseFloat(style.paddingTop) || 0
    const padR = parseFloat(style.paddingRight) || 0
    const padB = parseFloat(style.paddingBottom) || 0
    const cw = rect.width - padL - padR
    const ch = rect.height - padT - padB
    const vb = svg.viewBox.baseVal
    return {
      x: ((clientX - rect.left - padL) / cw) * vb.width,
      y: ((clientY - rect.top - padT) / ch) * vb.height,
    }
  }, [])

  const setRollFromClientX = useCallback(
    (clientX) => {
      const { x: sx } = clientToSvg(clientX, 0)
      const next = Math.min(piR, Math.max(0, sx - trackX0 - grabOffsetRef.current))
      setRollS(next)
      if (next < piR - 0.5) setRPlaced(false)
    },
    [clientToSvg, piR, trackX0],
  )

  const interacting = dragging || isRadiusDragging

  // Lock page/figure scroll while dragging (critical for touch)
  useEffect(() => {
    if (!interacting) return undefined
    const prev = document.documentElement.style.touchAction
    document.documentElement.style.touchAction = 'none'
    return () => {
      document.documentElement.style.touchAction = prev
    }
  }, [interacting])

  const onRollPointerDown = (e) => {
    if (isRadiusDragging) return
    if (e.isPrimary === false) return
    e.stopPropagation()
    e.preventDefault()
    const { x: sx } = clientToSvg(e.clientX, e.clientY)
    grabOffsetRef.current = sx - rollCxRef.current
    draggingRef.current = true
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture optional — window listeners still work */
    }
    setRollFromClientX(e.clientX)
  }

  // Window-level roll drag (reliable on touch; non-passive so we can preventDefault)
  useEffect(() => {
    if (!dragging) return undefined
    const clientXOf = (e) => e.clientX ?? e.touches?.[0]?.clientX ?? e.changedTouches?.[0]?.clientX
    const onMove = (e) => {
      if (!draggingRef.current) return
      if (e.isPrimary === false) return
      const cx = clientXOf(e)
      if (cx == null) return
      e.preventDefault()
      setRollFromClientX(cx)
    }
    const onUp = (e) => {
      if (e.isPrimary === false) return
      draggingRef.current = false
      setDragging(false)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    // iOS Safari: non-passive touchmove so scrolling doesn't win
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
  }, [dragging, setRollFromClientX])

  // Grey drop target for the second radius (length r after πr) — generous for fingers
  const dropPadX = 40
  const dropPadY = 72
  const dropZone = {
    x0: trackX0 + piR,
    x1: trackX0 + piR + r,
    y: trackY,
  }
  const isOverDropZone = (x, y) =>
    x >= dropZone.x0 - dropPadX &&
    x <= dropZone.x1 + dropPadX &&
    y >= dropZone.y - dropPadY &&
    y <= dropZone.y + dropPadY

  const onRadiusPointerDown = (e) => {
    if (!halfDone || rPlaced) return
    if (e.isPrimary === false) return
    e.stopPropagation()
    e.preventDefault()
    // Don't start a roll at the same time
    draggingRef.current = false
    setDragging(false)
    setIsRadiusDragging(true)
    setRadiusDrag(clientToSvg(e.clientX, e.clientY))
  }

  // Window-level radius drag + drop
  useEffect(() => {
    if (!isRadiusDragging) return undefined
    const overDrop = (x, y) =>
      x >= trackX0 + piR - dropPadX &&
      x <= trackX0 + piR + r + dropPadX &&
      y >= trackY - dropPadY &&
      y <= trackY + dropPadY
    const onMove = (e) => {
      if (e.isPrimary === false) return
      // touchmove events don't always have clientX on the same shape — normalize
      const cx = e.clientX ?? e.touches?.[0]?.clientX
      const cy = e.clientY ?? e.touches?.[0]?.clientY
      if (cx == null || cy == null) return
      e.preventDefault()
      setRadiusDrag(clientToSvg(cx, cy))
    }
    const onUp = (e) => {
      if (e.isPrimary === false) return
      const cx = e.clientX ?? e.changedTouches?.[0]?.clientX
      const cy = e.clientY ?? e.changedTouches?.[0]?.clientY
      if (cx != null && cy != null) {
        const p = clientToSvg(cx, cy)
        const midX = p.x - r / 2
        if (overDrop(p.x, p.y) || overDrop(midX, p.y) || overDrop(p.x - r, p.y)) {
          setRPlaced(true)
        }
      }
      setIsRadiusDragging(false)
      setRadiusDrag(null)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
  }, [isRadiusDragging, clientToSvg, r, trackX0, piR, trackY])

  const rightAngle = (ax, ay, bx, by, cx, cy, s = 22) => {
    const toA = { x: ax - cx, y: ay - cy }
    const toB = { x: bx - cx, y: by - cy }
    const lenA = Math.hypot(toA.x, toA.y) || 1
    const lenB = Math.hypot(toB.x, toB.y) || 1
    const uA = { x: (toA.x / lenA) * s, y: (toA.y / lenA) * s }
    const uB = { x: (toB.x / lenB) * s, y: (toB.y / lenB) * s }
    return (
      <path
        d={`M ${cx + uA.x} ${cy + uA.y} L ${cx + uA.x + uB.x} ${cy + uA.y + uB.y} L ${cx + uB.x} ${cy + uB.y}`}
        fill="none"
        stroke="#f87171"
        strokeWidth="3"
      />
    )
  }

  // ③
  const A3 = col3 + 28
  const D3 = A3 + piR
  const B3 = D3 + r
  const diamY3 = contentTop + 48
  const C3x = D3
  const C3y = diamY3 + x

  // ④
  const r4 = r * 0.92
  const piR4 = Math.PI * r4
  const x4 = Math.sqrt(piR4 * r4)
  const semiR4 = (piR4 + r4) / 2
  const diamY4 = contentTop + 52 + r4
  const A4 = col4 + 20
  const D4 = A4 + piR4
  const B4 = D4 + r4
  const C4x = D4
  const C4y = diamY4 + x4
  // Step 4 circle sits at D (join of πr and r) — original fixed location
  const combCx = D4
  const combCy = diamY4 - r4
  const sqX = D4
  const sqY = diamY4
  const sqSide = x4

  // Rim paint mark (step 2): local angle from +x, SVG y-down; bottom contact = 90°
  const markLocalDeg = 90

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`id-svg id-svg--thales${interacting ? ' is-interacting' : ''}${dragging ? ' is-rolling' : ''}${isRadiusDragging ? ' is-radius-dragging' : ''}`}
      preserveAspectRatio="xMinYMid meet"
      aria-label="Four large steps: circle, drag-to-roll half turn, geometric mean, combined figure"
    >
      <defs>
        {/* Modest fixed-size heads (user units) — visible but not huge */}
        <marker
          id="thalesArrow"
          markerWidth="18"
          markerHeight="14"
          refX="16"
          refY="7"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M1,1 L16,7 L1,13 Z" fill="#c4b5fd" opacity="0.9" />
        </marker>
      </defs>

      {/* Step 1 — purple to match steps 2–4 */}
      <g transform={`translate(${col1 + 8}, ${pad + 8})`}>
        <circle cx="18" cy="18" r="18" fill="rgba(196,181,253,0.15)" stroke="#c4b5fd" strokeWidth="2.5" />
        <text x="18" y="24" textAnchor="middle" fontSize="22" fill="#c4b5fd" fontWeight="700" fontFamily="Outfit, system-ui, sans-serif">
          1
        </text>
      </g>
      <circle cx={c1x} cy={c1y} r={r} fill="rgba(167,139,250,0.2)" stroke="#c4b5fd" strokeWidth="4.5" />
      <line x1={c1x} y1={c1y} x2={c1x + r} y2={c1y} stroke="#c4b5fd" strokeWidth="4" />
      <circle cx={c1x} cy={c1y} r={5} fill="#c4b5fd" />
      <text x={c1x + r / 2} y={c1y - 20} fontSize="36" fill="#c4b5fd" textAnchor="middle" fontWeight="700">
        r
      </text>
      <text x={c1x} y={c1y + r + 48} fontSize="34" fill="#c4b5fd" textAnchor="middle" fontWeight="600">
        A○ = πr²
      </text>

      {/* Roll — interactive: drag circle back and forth a half turn (πr) */}
      <g transform={`translate(${col2 + 8}, ${pad + 8})`}>
        <circle cx="18" cy="18" r="18" fill="rgba(196,181,253,0.15)" stroke="#c4b5fd" strokeWidth="2.5" />
        <text x="18" y="24" textAnchor="middle" fontSize="22" fill="#c4b5fd" fontWeight="700" fontFamily="Outfit, system-ui, sans-serif">
          2
        </text>
      </g>
      {/* Ground line (extends past πr + r) */}
      <line
        x1={trackX0 - 16}
        y1={trackY}
        x2={trackX0 + piR + r + 48}
        y2={trackY}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="3"
      />
      {/* Full half-turn track (dim) */}
      <line
        x1={trackX0}
        y1={trackY}
        x2={trackX0 + piR}
        y2={trackY}
        stroke="#c4b5fd"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.28"
      />
      {/* Painted rim so far (purple = rolled half-circumference) */}
      {rollS > 1 && (
        <line
          x1={trackX0}
          y1={trackY}
          x2={trackX0 + rollS}
          y2={trackY}
          stroke="#c4b5fd"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      {/* Grey r slot after πr — drop target for the second radius */}
      <line
        x1={trackX0 + piR}
        y1={trackY}
        x2={trackX0 + piR + r}
        y2={trackY}
        stroke={
          radiusDrag && isOverDropZone(radiusDrag.x, radiusDrag.y)
            ? '#f1f5f9'
            : 'currentColor'
        }
        strokeWidth="5"
        strokeLinecap="round"
        opacity={
          rPlaced
            ? 0
            : radiusDrag && isOverDropZone(radiusDrag.x, radiusDrag.y)
              ? 0.55
              : 0.28
        }
      />
      {rPlaced && (
        <line
          x1={trackX0 + piR}
          y1={trackY}
          x2={trackX0 + piR + r}
          y2={trackY}
          stroke="#f1f5f9"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}
      {/* End ticks: 0, πr, and πr+r */}
      <line x1={trackX0} y1={trackY - 10} x2={trackX0} y2={trackY + 10} stroke="#c4b5fd" strokeWidth="2.5" opacity="0.7" />
      <line
        x1={trackX0 + piR}
        y1={trackY - 10}
        x2={trackX0 + piR}
        y2={trackY + 10}
        stroke={halfDone ? '#f1f5f9' : '#c4b5fd'}
        strokeWidth="2.5"
        opacity="0.7"
      />
      <line
        x1={trackX0 + piR + r}
        y1={trackY - 10}
        x2={trackX0 + piR + r}
        y2={trackY + 10}
        stroke="#f1f5f9"
        strokeWidth="2.5"
        opacity={rDone ? 0.85 : 0.35}
      />
      <text
        x={trackX0 + piR / 2}
        y={trackY + 48}
        fontSize="34"
        fill="#c4b5fd"
        textAnchor="middle"
        fontWeight="700"
      >
        {halfDone ? 'πr = C/2' : `s = ${(rollS / r).toFixed(2)} r`}
      </text>
      {rPlaced && (
        <text
          x={trackX0 + piR + r / 2}
          y={trackY + 48}
          fontSize="34"
          fill="#f1f5f9"
          textAnchor="middle"
          fontWeight="700"
        >
          r
        </text>
      )}
      {/* Ghost start position */}
      <circle
        cx={trackX0}
        cy={trackY - r}
        r={r}
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="3.5"
        strokeDasharray="10 7"
        opacity="0.35"
      />
      {/* Ghost end (half turn) */}
      <circle
        cx={trackX0 + piR}
        cy={trackY - r}
        r={r}
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="2.5"
        strokeDasharray="8 8"
        opacity="0.22"
      />

      {/* Draggable rolling circle */}
      <g
        className={`thales-roll-handle${dragging ? ' is-dragging' : ''}`}
        transform={`translate(${rollCx}, ${rollCy}) rotate(${rollDeg})`}
        onPointerDown={onRollPointerDown}
        role="slider"
        tabIndex={0}
        aria-label="Roll the circle a half turn, then drag the second radius onto the grey segment."
        aria-valuemin={0}
        aria-valuemax={Math.PI}
        aria-valuenow={Number((rollS / r).toFixed(3))}
        aria-valuetext={`rolled ${(rollS / r).toFixed(2)} r of π r`}
        onKeyDown={(e) => {
          const step = piR / 40
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            setRollS((s) => Math.min(piR, s + step))
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            setRollS((s) => {
              const next = Math.max(0, s - step)
              if (next < piR - 0.5) setRPlaced(false)
              return next
            })
          } else if (e.key === 'Home') {
            e.preventDefault()
            setRollS(0)
            setRPlaced(false)
          } else if (e.key === 'End') {
            e.preventDefault()
            setRollS(piR)
          }
        }}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      >
        {/* Large hit ring for touch */}
        <circle cx={0} cy={0} r={r + 36} fill="transparent" />
        {/* Outline only: full rim white; the half that will roll is pre-painted purple */}
        <circle cx={0} cy={0} r={r} fill="none" stroke="#f1f5f9" strokeWidth="4.5" />
        {(() => {
          const a0 = markLocalDeg // 90° bottom (first contact)
          const a1 = markLocalDeg - 180 // −90° top (after half turn)
          const rad = (d) => (d * Math.PI) / 180
          const x0 = r * Math.cos(rad(a0))
          const y0 = r * Math.sin(rad(a0))
          const x1 = r * Math.cos(rad(a1))
          const y1 = r * Math.sin(rad(a1))
          return (
            <path
              d={`M ${x0} ${y0} A ${r} ${r} 0 0 0 ${x1} ${y1}`}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
          )
        })()}
        {/* Primary radius: starts up, ends down after half turn */}
        <line
          x1={0}
          y1={0}
          x2={r * Math.cos((rad1LocalDeg * Math.PI) / 180)}
          y2={r * Math.sin((rad1LocalDeg * Math.PI) / 180)}
          stroke="#f1f5f9"
          strokeWidth="3"
          opacity="0.85"
        />
        {/* After half turn: second white radius at 90° — drag onto grey track below */}
        {halfDone && !rPlaced && (
          <g
            className="thales-roll-handle"
            onPointerDown={onRadiusPointerDown}
            style={{
              cursor: radiusDrag ? 'grabbing' : 'grab',
              touchAction: 'none',
              opacity: radiusDrag ? 0.2 : 1,
            }}
            aria-label="Drag this radius onto the grey segment of length r"
          >
            {/* Fat hit area for the radius stick + free end (touch-friendly) */}
            <line
              x1={0}
              y1={0}
              x2={r * Math.cos(rad2LocalRad)}
              y2={r * Math.sin(rad2LocalRad)}
              stroke="transparent"
              strokeWidth="44"
            />
            <circle
              cx={r * Math.cos(rad2LocalRad)}
              cy={r * Math.sin(rad2LocalRad)}
              r={28}
              fill="transparent"
            />
            <line
              x1={0}
              y1={0}
              x2={r * Math.cos(rad2LocalRad)}
              y2={r * Math.sin(rad2LocalRad)}
              stroke="#f1f5f9"
              strokeWidth="3.5"
              pointerEvents="none"
            />
            {/* small right-angle mark at center */}
            <path
              d={`M ${18 * Math.cos((rad1LocalDeg * Math.PI) / 180)} ${18 * Math.sin((rad1LocalDeg * Math.PI) / 180)}
                  L ${18 * Math.cos((rad1LocalDeg * Math.PI) / 180) + 18 * Math.cos(rad2LocalRad)}
                    ${18 * Math.sin((rad1LocalDeg * Math.PI) / 180) + 18 * Math.sin(rad2LocalRad)}
                  L ${18 * Math.cos(rad2LocalRad)} ${18 * Math.sin(rad2LocalRad)}`}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="2"
              opacity="0.75"
              pointerEvents="none"
            />
            <circle
              cx={r * Math.cos(rad2LocalRad)}
              cy={r * Math.sin(rad2LocalRad)}
              r={11}
              fill="#f1f5f9"
              stroke="#c4b5fd"
              strokeWidth="2"
              pointerEvents="none"
            />
          </g>
        )}
        <circle cx={0} cy={0} r={4.5} fill="#f1f5f9" pointerEvents="none" />
        {/* Endpoints of the purple half-circumference */}
        <circle
          cx={r * Math.cos((markLocalDeg * Math.PI) / 180)}
          cy={r * Math.sin((markLocalDeg * Math.PI) / 180)}
          r={5}
          fill="#c4b5fd"
          stroke="#f1f5f9"
          strokeWidth="1.5"
          pointerEvents="none"
        />
        <circle
          cx={r * Math.cos(((markLocalDeg - 180) * Math.PI) / 180)}
          cy={r * Math.sin(((markLocalDeg - 180) * Math.PI) / 180)}
          r={5.5}
          fill="#c4b5fd"
          stroke="#f1f5f9"
          strokeWidth="1.5"
          pointerEvents="none"
        />
      </g>

      {/* Floating radius stick while dragging (horizontal length r, free end at pointer) */}
      {radiusDrag && (
        <g style={{ pointerEvents: 'none' }}>
          <line
            x1={radiusDrag.x - r}
            y1={radiusDrag.y}
            x2={radiusDrag.x}
            y2={radiusDrag.y}
            stroke="#f1f5f9"
            strokeWidth="5"
            strokeLinecap="round"
            opacity={isOverDropZone(radiusDrag.x, radiusDrag.y) ? 1 : 0.85}
          />
          <circle cx={radiusDrag.x - r} cy={radiusDrag.y} r={6} fill="#f1f5f9" />
          <circle cx={radiusDrag.x} cy={radiusDrag.y} r={8} fill="#f1f5f9" stroke="#c4b5fd" strokeWidth="2" />
        </g>
      )}

      <text
        x={rollCx}
        y={rollCy - r - 28}
        fontSize="26"
        fill="#c4b5fd"
        textAnchor="middle"
        fontWeight="600"
        opacity="0.9"
        pointerEvents="none"
      >
        {rDone
          ? 'πr + r ✓'
          : halfDone
            ? radiusDrag
              ? 'drop on grey r…'
              : '½ turn ✓ · drag radius → r'
            : dragging
              ? 'rolling…'
              : 'drag to roll'}
      </text>
      {/* Arc-length callout above painted purple segment */}
      {rollS > r * 0.35 && (
        <text
          x={trackX0 + rollS / 2}
          y={trackY - 22}
          fontSize="24"
          fill="#c4b5fd"
          textAnchor="middle"
          fontWeight="600"
          opacity="0.85"
          pointerEvents="none"
        >
          {halfDone ? 'πr' : `${(rollS / r).toFixed(2)}r`}
        </text>
      )}

      {/* Geometric mean — colors match step 2: purple πr, white r */}
      <g transform={`translate(${col3 + 8}, ${pad + 8})`}>
        <circle cx="18" cy="18" r="18" fill="rgba(196,181,253,0.15)" stroke="#c4b5fd" strokeWidth="2.5" />
        <text x="18" y="24" textAnchor="middle" fontSize="22" fill="#c4b5fd" fontWeight="700" fontFamily="Outfit, system-ui, sans-serif">
          3
        </text>
      </g>
      {/* Similar triangles: ADC (πr/x, yellow) ~ CDB (x/r, blue) — light fills under strokes */}
      <polygon
        points={`${A3},${diamY3} ${D3},${diamY3} ${C3x},${C3y}`}
        fill="rgba(254, 249, 195, 0.22)"
      />
      <polygon
        points={`${D3},${diamY3} ${B3},${diamY3} ${C3x},${C3y}`}
        fill="rgba(56, 189, 248, 0.16)"
      />
      {/* Diameter: πr (purple) + r (white) */}
      <line x1={A3} y1={diamY3} x2={D3} y2={diamY3} stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" />
      <line x1={D3} y1={diamY3} x2={B3} y2={diamY3} stroke="#f1f5f9" strokeWidth="5" strokeLinecap="round" />
      <line x1={D3} y1={diamY3 - 16} x2={D3} y2={diamY3 + 16} stroke="#f1f5f9" strokeWidth="3.5" />
      <path
        d={`M ${A3} ${diamY3} A ${semiR} ${semiR} 0 0 0 ${B3} ${diamY3}`}
        fill="none"
        stroke="#f1f5f9"
        strokeOpacity="0.55"
        strokeWidth="4"
      />
      <line
        x1={A3}
        y1={diamY3}
        x2={C3x}
        y2={C3y}
        stroke="#f1f5f9"
        strokeOpacity="0.4"
        strokeWidth="3"
        strokeDasharray="12 8"
      />
      <line
        x1={B3}
        y1={diamY3}
        x2={C3x}
        y2={C3y}
        stroke="#f1f5f9"
        strokeOpacity="0.4"
        strokeWidth="3"
        strokeDasharray="12 8"
      />
      <line x1={D3} y1={diamY3} x2={C3x} y2={C3y} stroke="#f1f5f9" strokeWidth="4.5" />
      <text x={D3 - 22} y={(diamY3 + C3y) / 2 + 12} fontSize="38" fill="#f1f5f9" fontWeight="700" textAnchor="end">
        x
      </text>
      <text x={(A3 + D3) / 2} y={diamY3 - 22} fontSize="36" fill="#c4b5fd" textAnchor="middle" fontWeight="700">
        πr
      </text>
      <text x={(D3 + B3) / 2} y={diamY3 - 22} fontSize="36" fill="#f1f5f9" textAnchor="middle" fontWeight="700">
        r
      </text>
      {rightAngle(A3, diamY3, B3, diamY3, C3x, C3y)}
      <circle cx={A3} cy={diamY3} r={6} fill="#c4b5fd" />
      <circle cx={D3} cy={diamY3} r={5.5} fill="#f1f5f9" />
      <circle cx={B3} cy={diamY3} r={6} fill="#f1f5f9" />
      <circle cx={C3x} cy={C3y} r={6.5} fill="#f1f5f9" />
      <text x={A3 - 12} y={diamY3 - 24} fontSize="26" fill="#c4b5fd" fontWeight="600">
        A
      </text>
      <text x={B3 + 14} y={diamY3 - 24} fontSize="26" fill="#f1f5f9" fontWeight="600">
        B
      </text>
      <text x={C3x + 18} y={C3y + 12} fontSize="26" fill="#f1f5f9" fontWeight="600">
        C · 90°
      </text>
      {/* Vertical fractions: πr/x = x/r ⇒ x² = (πr)·r */}
      {(() => {
        const baseX = A3 + 40
        const midY = C3y + 108
        const fs = 28
        const fracW = 52
        const barY = midY
        const numY = midY - 18
        const denY = midY + 26
        // Layout: [πr/x]  =  [x/r]  ⇒  x² = (πr)·r
        const f1x = baseX
        const eqX = f1x + fracW + 22
        const f2x = eqX + 28
        const arrX = f2x + fracW + 28
        return (
          <g fontFamily="JetBrains Mono, monospace" fontWeight="600" fontSize={fs}>
            {/* yellow πr / x */}
            <text x={f1x + fracW / 2} y={numY} textAnchor="middle" fill="#fef08a">
              πr
            </text>
            <line
              x1={f1x + 4}
              y1={barY}
              x2={f1x + fracW - 4}
              y2={barY}
              stroke="#fef08a"
              strokeWidth="2.5"
            />
            <text x={f1x + fracW / 2} y={denY} textAnchor="middle" fill="#fef08a">
              x
            </text>
            {/* = */}
            <text x={eqX} y={midY + 8} textAnchor="middle" fill="#f1f5f9" fontSize={fs + 4}>
              =
            </text>
            {/* blue x / r */}
            <text x={f2x + fracW / 2} y={numY} textAnchor="middle" fill="#38bdf8">
              x
            </text>
            <line
              x1={f2x + 4}
              y1={barY}
              x2={f2x + fracW - 4}
              y2={barY}
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <text x={f2x + fracW / 2} y={denY} textAnchor="middle" fill="#38bdf8">
              r
            </text>
            {/* ⇒ x² = (πr)·r */}
            <text x={arrX} y={midY + 8} fill="#f1f5f9">
              <tspan>⇒  x² = (</tspan>
              <tspan fill="#fef08a">πr</tspan>
              <tspan fill="#f1f5f9">)·</tspan>
              <tspan fill="#38bdf8">r</tspan>
            </text>
          </g>
        )
      })()}

      {/* Combined — same diagram; colors only: purple πr / white r (match steps 2–3) */}
      <g transform={`translate(${col4 + 8}, ${pad + 8})`}>
        <circle cx="18" cy="18" r="18" fill="rgba(196,181,253,0.15)" stroke="#c4b5fd" strokeWidth="2.5" />
        <text x="18" y="24" textAnchor="middle" fontSize="22" fill="#c4b5fd" fontWeight="700" fontFamily="Outfit, system-ui, sans-serif">
          4
        </text>
      </g>

      {/* Diameter: πr purple + r white (colors only; full figure) */}
      <line x1={A4} y1={diamY4} x2={D4} y2={diamY4} stroke="#c4b5fd" strokeWidth="4.5" />
      <line x1={D4} y1={diamY4} x2={B4} y2={diamY4} stroke="#f1f5f9" strokeWidth="4.5" />
      <line x1={B4} y1={diamY4} x2={sqX + sqSide} y2={diamY4} stroke="#f1f5f9" strokeWidth="4.5" />

      {/* Square + circle: shaded fill (was teal; now purple) */}
      <rect
        x={sqX}
        y={sqY}
        width={sqSide}
        height={sqSide}
        fill="rgba(167,139,250,0.35)"
        stroke="#c4b5fd"
        strokeWidth="4"
      />

      <path
        d={`M ${A4} ${diamY4} A ${semiR4} ${semiR4} 0 0 0 ${B4} ${diamY4}`}
        fill="none"
        stroke="#f1f5f9"
        strokeWidth="4"
      />

      <line
        x1={A4}
        y1={diamY4}
        x2={C4x}
        y2={C4y}
        stroke="#f1f5f9"
        strokeWidth="3.5"
        strokeDasharray="12 8"
        strokeOpacity="0.9"
      />
      <line
        x1={B4}
        y1={diamY4}
        x2={C4x}
        y2={C4y}
        stroke="#f1f5f9"
        strokeWidth="3.5"
        strokeDasharray="12 8"
        strokeOpacity="0.75"
      />
      <line x1={D4} y1={diamY4} x2={C4x} y2={C4y} stroke="#f1f5f9" strokeWidth="4.5" />

      {/* Circle fixed at D — original location */}
      <circle
        cx={combCx}
        cy={combCy}
        r={r4}
        fill="rgba(167,139,250,0.35)"
        stroke="#c4b5fd"
        strokeWidth="3.5"
      />
      <line x1={combCx} y1={combCy} x2={D4} y2={diamY4} stroke="#f1f5f9" strokeWidth="4" />

      <text
        x={(A4 + D4) / 2}
        y={diamY4 - 24}
        fontSize="34"
        fill="#c4b5fd"
        textAnchor="middle"
        fontStyle="italic"
        fontWeight="600"
      >
        πr
      </text>
      <text
        x={D4 - 20}
        y={(diamY4 + C4y) / 2 + 12}
        fontSize="38"
        fill="#f1f5f9"
        textAnchor="end"
        fontStyle="italic"
        fontWeight="700"
      >
        x
      </text>

      <circle cx={A4} cy={diamY4} r={6} fill="#c4b5fd" />
      <circle cx={D4} cy={diamY4} r={5} fill="#f1f5f9" />
      <circle cx={C4x} cy={C4y} r={6} fill="#f1f5f9" />

      {rightAngle(A4, diamY4, B4, diamY4, C4x, C4y, 24)}

      <text
        x={A4}
        y={diamY4 + sqSide + 88}
        fontSize="28"
        fill="#c4b5fd"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
      >
        x² = (πr)·r = πr² = A○ = A□
      </text>
    </svg>
  )
}

function FibonacciSpiral() {
  return (
    <figure className="fib-figure">
      <img
        src="/fibonacci-golden-spiral.png"
        alt="Fibonacci golden spiral: squares labeled 1, 1, 2, 3, 5, 8, 13 with a continuous spiral curve"
        className="fib-img"
      />
      <figcaption className="id-caption">
        Squares Fₙ = 1, 1, 2, 3, 5, 8, 13 · quarter-circle arcs form the golden spiral · ratios → φ
      </figcaption>
    </figure>
  )
}

function NoteFigure({ src, alt, caption, diagram = false }) {
  return (
    <figure className="id-note-figure">
      <img
        src={src}
        alt={alt}
        className={`id-note-img${diagram ? ' id-note-img--diagram' : ''}`}
        loading="lazy"
        decoding="async"
      />
      {caption && <figcaption className="id-caption">{caption}</figcaption>}
    </figure>
  )
}

/**
 * Single source of truth for cheat-sheet sections and course tags.
 * Browse-by-level panels only list sections whose `courses` include that level.
 * Keep SectionLabel `courses={…}` in sync with this catalog (same keys / ids).
 */
const CHEAT_SECTIONS = [
  {
    id: 'core-trig',
    title: 'Core trig identities',
    note: 'SOH-CAH-TOA, Pythagorean, sum/double-angle, ranges',
    courses: ['trig', 'precalc'],
    subsections: [
      { id: 'core-trig-defs', title: 'Definitions · SOH-CAH-TOA' },
      { id: 'core-trig-pythag', title: 'Pythagorean identities' },
      { id: 'core-trig-ranges', title: 'Ranges & undefined values' },
      { id: 'core-trig-even-odd', title: 'Even, odd & co-function' },
      { id: 'core-trig-sum-diff', title: 'Sum & difference' },
      { id: 'core-trig-double', title: 'Double-angle formulas' },
      { id: 'core-trig-laws', title: 'Law of sines & cosines' },
    ],
  },
  {
    id: 'thales',
    title: 'Thales’ theorem',
    note: 'Right angle in a semicircle — geometry warm-up',
    courses: ['geometry', 'precalc'],
    interactive: true,
    subsections: [
      { id: 'thales-roll', title: 'Roll · mean · square' },
      { id: 'thales-why', title: 'Why the geometry works' },
    ],
  },
  {
    id: 'eratosthenes',
    title: 'Eratosthenes · measuring Earth',
    note: 'Circumference from a shadow angle and C = 2πr',
    courses: ['geometry', 'precalc'],
    subsections: [
      { id: 'eratosthenes-earth', title: 'Alexandria · Syene · 7.2°' },
    ],
  },
  {
    id: 'first-principles',
    title: 'Differentiation from first principles',
    note: 'The limit definition of f′(x)',
    courses: ['calc1'],
    subsections: [
      { id: 'first-principles-def', title: 'From two points to dy/dx' },
      { id: 'first-principles-x2', title: 'Worked example · y = x²' },
    ],
  },
  {
    id: 'liate',
    title: 'Integration by parts · LIATE',
    note: 'Pick u and dv without guessing every time',
    courses: ['calc2'],
    subsections: [
      { id: 'liate-formula', title: 'The parts formula' },
      { id: 'liate-order', title: 'LIATE priority order' },
    ],
  },
  {
    id: 'close-points',
    title: 'Close points · max, min & inflection',
    note: 'Sign charts without graphing everything',
    courses: ['calc1'],
    subsections: [
      { id: 'close-points-tests', title: 'First & second derivative tests' },
      { id: 'close-points-check', title: 'Close-points checklist' },
      { id: 'close-points-indet', title: 'Indeterminate forms (side note)' },
    ],
  },
  {
    id: 'logs',
    title: 'Logarithms · bases & derivative',
    note: 'Change of base, ln, and d/dx[ln x]',
    courses: ['precalc', 'calc1'],
    subsections: [{ id: 'logs-bases', title: 'Bases by field' }],
  },
  {
    id: 'unit-circle-bridge',
    title: 'Unit circle & Euler',
    note: 'Points (cos θ, sin θ) and e^{iθ}',
    courses: ['precalc', 'calc1'],
    interactive: true,
    subsections: [
      { id: 'euler-formula', title: 'Euler’s formula' },
      { id: 'unit-circle-pi', title: 'On the unit circle at π' },
      { id: 'euler-identity', title: 'Euler’s identity' },
    ],
  },
  {
    id: 'calc-bridge',
    title: 'Why identities show up in calculus',
    note: 'Chain rule, related rates, sin² / cos² tricks',
    courses: ['calc1'],
    subsections: [
      { id: 'calc-bridge-deriv', title: 'Derivatives of sin & cos' },
      { id: 'calc-bridge-integrals', title: 'Integrals that need identities' },
      { id: 'calc-bridge-limits', title: 'Limits · undefined vs indeterminate' },
    ],
  },
  {
    id: 'inverse-trig',
    title: 'Inverse trig',
    note: 'arctan vs cot vs −tan; principal values',
    courses: ['precalc', 'calc1', 'graphs'],
    subsections: [
      { id: 'inverse-trig-terms', title: 'Terminology · tan family' },
      { id: 'inverse-trig-how', title: 'How an inverse trig function works' },
      { id: 'inverse-trig-three', title: 'Three “inverses” — do not mix them' },
      { id: 'inverse-trig-cycle', title: 'sin · cos · −sin · −cos cycle' },
    ],
  },
  {
    id: 'pendulums',
    title: 'Pendulums · simple to triple',
    note: 'Isochronism, sin θ, ODEs, and chaotic multi-links',
    courses: ['calc1'],
    subsections: [
      { id: 'pendulums-isochronism', title: 'Isochronism · Galileo' },
      { id: 'pendulums-fbd', title: 'Free body → ODE' },
      { id: 'pendulums-analogy', title: 'Linear ↔ angular analogy' },
      { id: 'pendulums-small-angle', title: 'Small angle vs full sin θ' },
      { id: 'pendulums-multi', title: 'Double & triple · chaos' },
      { id: 'pendulums-toolkit', title: 'Formula toolkit' },
    ],
  },
  {
    id: 'number-types',
    title: 'What kind of number is that?',
    note: 'Natural → real: vocabulary for every level',
    courses: ['trig', 'precalc', 'calc1', 'calc2'],
    subsections: [{ id: 'number-types-map', title: 'Number systems map' }],
  },
  {
    id: 'constants',
    title: 'Constants worth knowing',
    note: 'e, π, and friends in limits and integrals',
    courses: ['calc1', 'calc2'],
    subsections: [
      { id: 'constants-e', title: 'Euler’s number' },
      { id: 'constants-pi', title: 'π on the circle' },
    ],
  },
  {
    id: 'bonus',
    title: 'Golden ratio & Fibonacci',
    note: 'Enrichment — not required on most syllabi',
    courses: ['bonus'],
    subsections: [
      { id: 'bonus-phi', title: 'The golden ratio' },
      { id: 'bonus-angle', title: 'Golden angle on the circle' },
      { id: 'bonus-fib', title: 'Fibonacci spiral' },
    ],
  },
]

const GRADE_META = {
  trig: {
    label: 'Trig',
    short: 'HS trig',
    blurb: 'Definitions, identities, and number language tagged for high-school trig.',
  },
  precalc: {
    label: 'Pre-Calc',
    short: 'Precalculus',
    blurb: 'Sections tagged Pre-Calc — identities, logs, unit circle, inverse trig.',
  },
  calc1: {
    label: 'Calc 1',
    short: 'Differential calc',
    blurb: 'Sections tagged Calc 1 — derivatives, limits, ODEs (pendulums), and the calc bridge.',
  },
  calc2: {
    label: 'Calc 2',
    short: 'Integral calc',
    blurb: 'Sections tagged Calc 2 — integration by parts and related tools.',
  },
}

/** Cancel in-flight jump timers when the user picks another card quickly */
let jumpFlashCleanup = null

/**
 * Scroll to a section/card, then flash once the page has finished scrolling.
 * Sequence: click → smooth scroll → flash (not during the scroll).
 */
function jumpToSection(id) {
  const el = document.getElementById(id)
  if (!el) return

  try {
    history.replaceState(null, '', `#${id}`)
  } catch {
    /* */
  }

  // Abort any previous jump’s pending flash
  if (typeof jumpFlashCleanup === 'function') {
    jumpFlashCleanup()
    jumpFlashCleanup = null
  }
  el.classList.remove('id-flash')

  let clearFlashId = 0
  const flash = () => {
    // Force reflow so re-triggering the same target still animates
    void el.offsetWidth
    el.classList.add('id-flash')
    clearFlashId = window.setTimeout(() => {
      el.classList.remove('id-flash')
    }, 1400)
  }

  const prefersReduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
    // Next paint after instant jump
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(flash)
    })
    jumpFlashCleanup = () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      window.clearTimeout(clearFlashId)
      el.classList.remove('id-flash')
    }
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })

  let done = false
  let pollId = 0
  let fallbackId = 0
  let settleId = 0

  const finish = () => {
    if (done) return
    done = true
    window.removeEventListener('scrollend', onScrollEnd)
    window.clearTimeout(pollId)
    window.clearTimeout(fallbackId)
    // Brief settle so layout after scroll is painted before the flash
    settleId = window.setTimeout(flash, 60)
  }

  const onScrollEnd = () => finish()

  // Modern browsers: fires when smooth scrolling stops
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', onScrollEnd, { once: true })
  }

  // Fallback: poll until the target sits near the focus band (or timeout)
  const start = performance.now()
  const scrollMargin = 5.5 * 16 // matches .id-card scroll-margin-top
  const poll = () => {
    if (done) return
    const rect = el.getBoundingClientRect()
    const elapsed = performance.now() - start
    // “Arrived” when the card top is near the sticky offset (or already on-screen mid-band)
    const nearFocus = Math.abs(rect.top - scrollMargin) < 28
    const alreadyVisible =
      rect.top >= 0 && rect.top < window.innerHeight * 0.4 && elapsed > 100
    if ((nearFocus && elapsed > 120) || alreadyVisible || elapsed > 1100) {
      finish()
      return
    }
    pollId = window.setTimeout(poll, 40)
  }
  pollId = window.setTimeout(poll, 40)

  // Absolute safety net if neither scrollend nor poll settles
  fallbackId = window.setTimeout(finish, 1200)

  jumpFlashCleanup = () => {
    done = true
    window.removeEventListener('scrollend', onScrollEnd)
    window.clearTimeout(pollId)
    window.clearTimeout(fallbackId)
    window.clearTimeout(settleId)
    window.clearTimeout(clearFlashId)
    el.classList.remove('id-flash')
  }
}

/** Hover panels: only sections that carry this grade’s tag. */
const GRADE_TRACKS = /** @type {const} */ (['trig', 'precalc', 'calc1', 'calc2']).map((id) => ({
  id,
  ...GRADE_META[id],
  topics: CHEAT_SECTIONS.filter((s) => s.courses.includes(id)).map((s) => ({
    id: s.id,
    href: `#${s.id}`,
    title: s.title,
    note: s.note,
    interactive: Boolean(s.interactive),
    subsections: s.subsections || [],
  })),
}))

function GradeBrowse() {
  const [openId, setOpenId] = useState(null)
  /** Pinned section id for nested subsection flyout (touch + hover) */
  const [openTopicId, setOpenTopicId] = useState(null)
  const rootRef = useRef(null)

  // Close pinned panel on outside click / Escape (touch + keyboard)
  useEffect(() => {
    if (!openId && !openTopicId) return
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenId(null)
        setOpenTopicId(null)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpenTopicId(null)
        setOpenId(null)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId, openTopicId])

  const onChipClick = (id) => {
    setOpenTopicId(null)
    setOpenId((prev) => (prev === id ? null : id))
  }

  const go = (id) => {
    setOpenTopicId(null)
    setOpenId(null)
    jumpToSection(id)
  }

  return (
    <nav
      ref={rootRef}
      className="id-grade-browse panel"
      aria-label="Browse cheat sheet by grade level"
    >
      <div className="id-grade-browse-head">
        <span className="id-grade-browse-label">Browse by level</span>
        <span className="id-grade-browse-hint">Hover a course → section → card</span>
      </div>
      <div className="id-grade-row">
        {GRADE_TRACKS.map((track) => {
          const isOpen = openId === track.id
          return (
            <div
              key={track.id}
              className={`id-grade-chip-wrap${isOpen ? ' is-open' : ''}`}
              data-grade={track.id}
            >
              <button
                type="button"
                className={`id-grade-chip id-grade-chip--${track.id}${isOpen ? ' is-active' : ''}`}
                aria-expanded={isOpen}
                aria-controls={`grade-panel-${track.id}`}
                onClick={() => onChipClick(track.id)}
              >
                <span className="id-grade-chip-label">{track.label}</span>
                <span className="id-grade-chip-short">{track.short}</span>
              </button>
              <div
                id={`grade-panel-${track.id}`}
                className="id-grade-panel"
                role="region"
                aria-label={`${track.label} topics`}
              >
                <div className="id-grade-panel-inner">
                  <header className="id-grade-panel-head">
                    <h3 className="id-grade-panel-title">{track.label}</h3>
                    <p className="id-grade-panel-blurb">{track.blurb}</p>
                  </header>
                  <ul className="id-grade-topic-list">
                    {track.topics.map((t) => {
                      const hasSubs = t.subsections && t.subsections.length > 0
                      const topicOpen = openTopicId === t.id
                      return (
                        <li
                          key={t.id}
                          className={`id-grade-topic-wrap${topicOpen ? ' is-open' : ''}${hasSubs ? ' has-subs' : ''}`}
                          onMouseEnter={() => hasSubs && setOpenTopicId(t.id)}
                          onMouseLeave={() => {
                            // Only clear if this topic still owns the flyout
                            setOpenTopicId((prev) => (prev === t.id ? null : prev))
                          }}
                        >
                          <a
                            href={t.href}
                            className={`id-grade-topic${t.interactive ? ' id-grade-topic--interactive' : ''}`}
                            onClick={(e) => {
                              e.preventDefault()
                              if (hasSubs && !topicOpen) {
                                // Touch: first tap opens subsections; second goes to section
                                setOpenTopicId(t.id)
                                return
                              }
                              go(t.id)
                            }}
                          >
                            <span className="id-grade-topic-title-row">
                              <span className="id-grade-topic-title">{t.title}</span>
                              {t.interactive && <InteractiveBadge compact />}
                              {hasSubs && (
                                <span className="id-grade-topic-chevron" aria-hidden="true">
                                  ›
                                </span>
                              )}
                            </span>
                            <span className="id-grade-topic-note">{t.note}</span>
                          </a>
                          {hasSubs && (
                            <div
                              className="id-grade-subpanel"
                              role="region"
                              aria-label={`${t.title} cards`}
                            >
                              <div className="id-grade-subpanel-inner">
                                <header className="id-grade-subpanel-head">
                                  <span className="id-grade-subpanel-title">Cards</span>
                                  <button
                                    type="button"
                                    className="id-grade-subpanel-all"
                                    onClick={() => go(t.id)}
                                  >
                                    Whole section
                                  </button>
                                </header>
                                <ul className="id-grade-sublist">
                                  {t.subsections.map((sub) => (
                                    <li key={sub.id}>
                                      <a
                                        href={`#${sub.id}`}
                                        className="id-grade-sublink"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          go(sub.id)
                                        }}
                                      >
                                        {sub.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export default function IdentitiesPage() {
  // Deep-link flash when landing with a hash (e.g. /cheat-sheet#pendulums-fbd)
  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return
    const t = window.setTimeout(() => jumpToSection(raw), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Cheat sheet</p>
          <h1>
            The <em>rewrite toolkit</em>
          </h1>
          <p className="hero-copy">
            The trig identities you actually use in high school and undergrad — plus differentiation
            from first principles, LIATE for integration by parts, the close-points method for
            max/min/inflection, unit-circle geometry, and optional extras (Euler, e, φ). Hover a
            grade level → section → card to jump (with a flash so you know where you landed).
          </p>
        </div>
      </header>

      <main className="workspace workspace--single">
        <GradeBrowse />

        <p className="id-radian-note panel">
          <strong>Radians vs degrees.</strong> Calculus and this site use <strong>radians</strong>{' '}
          by default (a full turn is 2π). Precalc often lists both: 180° = π rad, 90° = π/2, 60° =
          π/3, 45° = π/4, 30° = π/6. Calculator mode must match the unit you intend.
        </p>

        {/* ═══════════════════════════════════════════
            CORE TRIG — cheat-sheet material first
            ═══════════════════════════════════════════ */}
        <section id="core-trig" className="id-block">
          <SectionLabel sectionId="core-trig">Core trig identities</SectionLabel>
          <p className="id-block-lead">
            These are the formulas you rearrange on homework. Each card pairs the identity with a
            unit-circle or triangle picture and a numerical check.
          </p>

          <div className="id-grid">
            {/* Definitions */}
            <section id="core-trig-defs" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Definitions · SOH-CAH-TOA</span>
                <span className="panel-hint">Right triangle · unit circle</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <Formula math={String.raw`\sin\theta=\dfrac{\text{opp}}{\text{hyp}},\quad
                    \cos\theta=\dfrac{\text{adj}}{\text{hyp}},\quad
                    \tan\theta=\dfrac{\text{opp}}{\text{adj}}`} />
                  <Formula
                    math={String.raw`\csc\theta=\dfrac{1}{\sin\theta},\quad
                    \sec\theta=\dfrac{1}{\cos\theta},\quad
                    \cot\theta=\dfrac{1}{\tan\theta}`}
                  />
                  <p>
                    On the <strong>unit circle</strong> (radius 1), the point at angle θ is exactly{' '}
                    <Formula math={String.raw`(\cos\theta,\;\sin\theta)`} display={false} /> — so
                    cosine is the x-coordinate and sine is the y-coordinate.
                  </p>
                  <UseWhen>
                    Setting up any right triangle, reading a unit-circle point, or converting
                    between sin/cos/tan and their reciprocals.
                  </UseWhen>
                  <WatchOut>
                    Reciprocals flip the function — sec is 1/cos, not 1/sin. And tan = sin/cos, not
                    cos/sin.
                  </WatchOut>
                </div>
                <RightTriangle />
              </div>
            </section>

            {/* Pythagorean */}
            <section id="core-trig-pythag" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Pythagorean identities</span>
                <span className="panel-hint">The workhorse of simplification</span>
              </div>
              <div className="id-body">
                <div className="id-formula-stack">
                  <Formula math={String.raw`\sin^{2}\theta + \cos^{2}\theta = 1`} />
                  <Formula math={String.raw`1 + \tan^{2}\theta = \sec^{2}\theta`} />
                  <Formula math={String.raw`1 + \cot^{2}\theta = \csc^{2}\theta`} />
                </div>
                <p className="id-mini-label" style={{ marginTop: '0.75rem' }}>
                  Useful rearrangements
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\sin^{2}\theta = 1 - \cos^{2}\theta,\qquad
                      \cos^{2}\theta = 1 - \sin^{2}\theta`}
                  />
                  <Formula
                    math={String.raw`\tan^{2}\theta = \sec^{2}\theta - 1,\qquad
                      \cot^{2}\theta = \csc^{2}\theta - 1`}
                  />
                  <Formula
                    math={String.raw`\sec^{2}\theta - \tan^{2}\theta = 1,\qquad
                      \csc^{2}\theta - \cot^{2}\theta = 1`}
                  />
                </div>
                <div className="id-body--split" style={{ marginTop: '0.75rem' }}>
                  <div>
                    <p>
                      The first line is the unit circle itself: a point at distance 1 from the
                      origin satisfies x² + y² = 1. Divide by cos²θ or sin²θ to get the tan/sec and
                      cot/csc forms. The rearrangements are the same identities solved for a
                      different piece — pick whichever cancels what you already have.
                    </p>
                    <UseWhen>
                      Replacing sin² + cos² with 1, converting everything to sin/cos, or simplifying
                      before integrating sin² / cos².
                    </UseWhen>
                    <WatchOut>
                      <Formula math={String.raw`\sin^{2}\theta`} display={false} /> means{' '}
                      <Formula math={String.raw`(\sin\theta)^{2}`} display={false} />, not{' '}
                      <Formula math={String.raw`\sin(\theta^{2})`} display={false} />.
                    </WatchOut>
                    <Check>
                      <p>
                        θ = 30° = π/6: sin = 1/2, cos = √3/2 → (1/2)² + (√3/2)² = 1/4 + 3/4 ={' '}
                        <strong>1</strong> ✓
                      </p>
                    </Check>
                  </div>
                  <MiniUnitCircle deg={30} cosLabel="√3/2" sinLabel="1/2" />
                </div>
              </div>
            </section>

            {/* Ranges & undefined — from unit-circle all-six diagram */}
            <section id="core-trig-ranges" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Ranges & undefined values</span>
                <span className="panel-hint">What the unit circle allows</span>
              </div>
              <div className="id-body">
                  <p>
                    The six trig lengths on the unit circle are not free to be any real number.
                    Pythagorean identities force hard bounds — especially once you leave sin and cos.
                  </p>
                  <div className="id-range-grid">
                    <article className="id-range-card">
                      <Formula math={String.raw`-1 \le \sin\theta,\;\cos\theta \le 1`} />
                      <p>x- and y-coordinates of a point on the unit circle.</p>
                    </article>
                    <article className="id-range-card">
                      <Formula math={String.raw`|\sec\theta|,\;|\csc\theta| \ge 1`} />
                      <p>
                        Reciprocals of cos and sin — never between −1 and 1 (except undefined).
                        Follows from 1 + tan² = sec² ≥ 1 when defined.
                      </p>
                    </article>
                    <article className="id-range-card id-range-card--wide">
                      <Formula
                        math={String.raw`-\infty < \tan\theta,\;\cot\theta < \infty
                          \quad\text{(all reals, when defined)}`}
                      />
                      <p>Slope of the terminal ray (tan) and its reciprocal (cot) can be any real.</p>
                    </article>
                  </div>
                  <p className="id-mini-label">Classic undefined spots</p>
                  <ul className="id-list">
                    <li>
                      <strong>tan(π/2) and sec(π/2)</strong> are undefined — cos = 0, so you cannot
                      divide by cos (vertical asymptotes on the graphs).
                    </li>
                    <li>
                      <strong>cot(0) and csc(0)</strong> are undefined — sin = 0, so you cannot
                      divide by sin.
                    </li>
                    <li>
                      More generally: sec and tan undefined where cos = 0; csc and cot undefined
                      where sin = 0.
                    </li>
                  </ul>
                  <UseWhen>
                    Domain questions, graphing, and checking whether a rewritten expression is still
                    defined at the angle you care about.
                  </UseWhen>
                  <WatchOut>
                    A calculator may show a huge number near π/2 for tan instead of “undefined” —
                    that is overflow, not a real value of tan(π/2).
                  </WatchOut>
                  <p className="id-caption" style={{ marginTop: '0.75rem' }}>
                    See the live all-six geometry on the{' '}
                    <a href="/waves">Trigonometric Functions</a> page — cos is drawn elevated so it
                    does not paint over sec on the x-axis.
                  </p>
              </div>
            </section>

            {/* Even / odd / cofunction */}
            <section id="core-trig-even-odd" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Even, odd & co-function</span>
                <span className="panel-hint">Signs · complementary angles</span>
              </div>
              <div className="id-body">
                <Formula math={String.raw`\sin(-\theta)=-\sin\theta,\quad \cos(-\theta)=\cos\theta`} />
                <Formula math={String.raw`\sin\!\left(\tfrac{\pi}{2}-\theta\right)=\cos\theta`} />
                <Formula math={String.raw`\cos\!\left(\tfrac{\pi}{2}-\theta\right)=\sin\theta`} />
                <p>
                  Sine is <strong>odd</strong>, cosine is <strong>even</strong>. Co-function
                  identities say complementary angles (sum to 90° / π/2) swap sin and cos.
                </p>
                <UseWhen>
                  Reflecting angles across axes, simplifying sin(90° − θ), or checking calculator
                  signs in quadrants II–IV.
                </UseWhen>
                <WatchOut>
                  cos(−θ) stays positive when cos θ is positive — do not flip the sign for cosine the
                  way you do for sine.
                </WatchOut>
              </div>
            </section>

            {/* Sum and difference */}
            <section id="core-trig-sum-diff" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Sum & difference</span>
                <span className="panel-hint">α ± β</span>
              </div>
              <div className="id-body">
                <Formula math={String.raw`\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta`} />
                <Formula math={String.raw`\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta`} />
                <Formula
                  math={String.raw`\tan(\alpha\pm\beta)=\dfrac{\tan\alpha\pm\tan\beta}{1\mp\tan\alpha\tan\beta}`}
                />
                <UseWhen>
                  Exact values for non-standard angles (e.g. 75° = 45° + 30°), phase shifts, and
                  expanding wave formulas.
                </UseWhen>
                <WatchOut>
                  For cosine, the middle sign flips: cos(α − β) uses a <em>plus</em> between the
                  products. Memorize “cos keeps the opposite sign.”
                </WatchOut>
                <Check>
                  <p>
                    sin(75°) = sin(45°+30°) = (√2/2)(√3/2) + (√2/2)(1/2) ={' '}
                    <strong>(√6 + √2)/4</strong>
                  </p>
                </Check>
              </div>
            </section>

            {/* Double angle */}
            <section id="core-trig-double" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Double-angle formulas</span>
                <span className="panel-hint">2θ · power-reducing cousins</span>
              </div>
              <div className="id-body">
                <div className="id-formula-stack">
                  <Formula math={String.raw`\sin(2\theta)=2\sin\theta\cos\theta`} />
                  <Formula
                    math={String.raw`\cos(2\theta)=\cos^{2}\theta-\sin^{2}\theta
                    =2\cos^{2}\theta-1
                    =1-2\sin^{2}\theta`}
                  />
                  <Formula math={String.raw`\tan(2\theta)=\dfrac{2\tan\theta}{1-\tan^{2}\theta}`} />
                </div>
                <p>
                  Rearrange the last two cos forms to get the power-reducing identities used in
                  Calc 2 integrals:
                </p>
                <Formula
                  math={String.raw`\sin^{2}\theta=\dfrac{1-\cos(2\theta)}{2},\qquad
                    \cos^{2}\theta=\dfrac{1+\cos(2\theta)}{2}`}
                />
                <UseWhen>
                  Exact sin/cos of double angles, max/min of products like sin·cos, and integrating
                  powers of sine and cosine.
                </UseWhen>
                <WatchOut>
                  There are three cos(2θ) forms — pick the one that cancels what you already have
                  (only sin, only cos, or mixed).
                </WatchOut>
                <Check>
                  <p>
                    θ = 45°: sin(90°) = 2 · (√2/2) · (√2/2) = 2 · (1/2) = <strong>1</strong> ✓
                  </p>
                </Check>
              </div>
            </section>

            {/* Law of sines / cosines */}
            <section id="core-trig-laws" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Law of sines & cosines</span>
                <span className="panel-hint">Any triangle · leave the unit circle</span>
              </div>
              <div className="id-body">
                <div className="id-two-col-formulas">
                  <div>
                    <p className="id-mini-label">Law of sines</p>
                    <Formula math={String.raw`\dfrac{a}{\sin A}=\dfrac{b}{\sin B}=\dfrac{c}{\sin C}`} />
                  </div>
                  <div>
                    <p className="id-mini-label">Law of cosines</p>
                    <Formula math={String.raw`c^{2}=a^{2}+b^{2}-2ab\cos C`} />
                  </div>
                </div>
                <p>
                  Side a is opposite angle A, and so on. Law of cosines is the Pythagorean theorem
                  with a correction term when C is not 90°.
                </p>
                <UseWhen>
                  AAS / ASA / SSA triangle solving (sines); SAS / SSS or finding an angle from three
                  sides (cosines).
                </UseWhen>
                <WatchOut>
                  SSA is the ambiguous case — two triangles, one, or none can match the same data.
                  Check both supplementary angles for the unknown angle when sin is positive.
                </WatchOut>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            THALES' THEOREM (notes: geometric mean → circle area = square)
            ═══════════════════════════════════════════ */}
        <section id="thales" className="id-block">
          <SectionLabel sectionId="thales">Thales’ theorem</SectionLabel>
          <p className="id-block-lead">
            Square a circle by <strong>rolling</strong> it to lay out half the circumference, then
            using Thales’ right angle + altitude geometric mean to build a square of equal area.
          </p>

          <div className="id-grid">
            <section id="thales-roll" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Roll · mean · square</span>
                <span className="panel-hint">Drag the circle in step 2 · half turn = πr</span>
              </div>
              <div className="id-body id-body--thales-layout">
                {/* Full-width figure — fills the card; no side column */}
                <div className="id-thales-figure">
                  <ThalesDiagram />
                </div>
                <div className="id-thales-steps">
                  <div className="id-thales-step">
                    <span className="id-thales-num">1</span>
                    <div>
                      <strong>Circle of radius r</strong>
                      <p>
                        Area A = πr². Half turn of the rim is length πr.
                      </p>
                      <Formula math={String.raw`A_{\circ}=\pi r^{2},\quad \tfrac{C}{2}=\pi r`} />
                    </div>
                  </div>
                  <div className="id-thales-step">
                    <span className="id-thales-num">2</span>
                    <div>
                      <strong>Roll half a turn</strong>
                      <p>
                        <strong>Drag</strong> the circle for a half turn (paints πr). A second
                        white radius appears at 90° — drag it onto the grey slot to place length{' '}
                        <strong>r</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="id-thales-step">
                    <span className="id-thales-num">3</span>
                    <div>
                      <strong>Semicircle · geometric mean</strong>
                      <p>
                        Diameter πr + r with altitude x at the join. The two right triangles are
                        similar — corresponding sides give the ratio in the figure (cross-multiply
                        for x²).
                      </p>
                    </div>
                  </div>
                  <div className="id-thales-step">
                    <span className="id-thales-num">4</span>
                    <div>
                      <strong>Equal-area square</strong>
                      <p>
                        Combined figure: circle + semicircle + square of side x.
                      </p>
                      <Formula math={String.raw`A_{\square}=x^{2}=A_{\circ}`} />
                    </div>
                  </div>
                </div>
                <div className="id-thales-notes">
                  <UseWhen>
                    Seeing why A = πr² can become a square; linking rolling to Thales; geometric mean.
                  </UseWhen>
                  <WatchOut>
                    Pure compass-and-straightedge squaring is impossible (π transcendental). Rolling
                    uses the circle’s rim to produce length πr.
                  </WatchOut>
                  <Check>
                    <p>
                      r = 1 → x² = π → square side √π has area π, matching the unit circle.
                    </p>
                  </Check>
                </div>
              </div>
            </section>

            <section id="thales-why" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Why the geometry works</span>
                <span className="panel-hint">Thales + altitude mean</span>
              </div>
              <div className="id-body id-two-col-formulas">
                <div>
                  <p className="id-mini-label">Thales · angle in a semicircle</p>
                  <Formula
                    math={String.raw`AB\text{ diameter},\; C\text{ on arc}
                      \;\Rightarrow\; \angle ACB = 90^{\circ}`}
                  />
                  <p>
                    Rolling only supplies the length πr. The right angle that lets us drop a clean
                    altitude comes from Thales: C sits on the semicircle over diameter AB.
                  </p>
                </div>
                <div>
                  <p className="id-mini-label">Altitude geometric mean</p>
                  <Formula math={String.raw`x^{2}=a\cdot b`} />
                  <p>
                    Segments a = πr (from the roll) and b = r (the radius) multiply under the square
                    root: x = √(ab) = r√π, so x² = πr².
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            ERATOSTHENES · measuring Earth
            ═══════════════════════════════════════════ */}
        <section id="eratosthenes" className="id-block">
          <SectionLabel sectionId="eratosthenes">Eratosthenes · measuring Earth</SectionLabel>
          <p className="id-block-lead">
            Same circumference idea as Thales’ roll — C = 2πr — used at planetary scale: one shadow
            angle and the distance between two cities.
          </p>

          <div className="id-grid">
            <section id="eratosthenes-earth" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Alexandria · Syene · 7.2°</span>
                <span className="panel-hint">Parallel rays · similar angles · full turn</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <p>
                    At noon on the summer solstice, sunlight fell straight down a deep well at{' '}
                    <strong>Syene</strong> (no shadow). The same day at <strong>Alexandria</strong>,
                    a stick cast a shadow of about <strong>7.2°</strong> from the vertical.
                  </p>
                  <p>
                    Treat sun rays as parallel. Then that shadow angle equals the central angle
                    between the two cities on Earth’s sphere. A full circle is 360°, so:
                  </p>
                  <Formula
                    math={String.raw`\dfrac{7.2^{\circ}}{360^{\circ}}=\dfrac{1}{50}
                      \quad\Rightarrow\quad
                      C_{\text{Earth}}=50\cdot d_{\text{Alexandria–Syene}}`}
                  />
                  <p>
                    With the measured north–south distance between the cities, he recovered the
                    whole circumference — then radius from the usual relation:
                  </p>
                  <Formula math={String.raw`C=2\pi r \quad\Rightarrow\quad r=\dfrac{C}{2\pi}`} />
                  <UseWhen>
                    Linking central angles to arc length; seeing why C = 2πr is not just a unit-circle
                    formula but a scale tool; classical geometry that prefigures measured rates.
                  </UseWhen>
                  <WatchOut>
                    The method assumes the cities share a meridian, rays are parallel, and Earth is
                    a sphere — good first-order model, not modern geodesy.
                  </WatchOut>
                  <Check>
                    <p>
                      7.2° is 1/50 of a turn. If the city-to-city arc is about 5000 stadia, C ≈
                      250{'\u2009'}000 stadia — within tens of percent of the modern value depending
                      on which stadium length you use.
                    </p>
                  </Check>
                </div>
                <NoteFigure
                  src="/notes/eratosthenes-earth.jpg"
                  alt="Eratosthenes’ measurement of Earth: parallel sunlight at Alexandria and Syene, 7.2° shadow angle at Alexandria, well with no shadow at Syene"
                  caption="Sunlight · stick shadow at Alexandria · well at Syene · central angle 7.2°"
                  diagram
                />
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            FIRST PRINCIPLES (from notebook pages)
            ═══════════════════════════════════════════ */}
        <section id="first-principles" className="id-block">
          <SectionLabel sectionId="first-principles">Differentiation from first principles</SectionLabel>
          <p className="id-block-lead">
            Before power rules, build the derivative from average rate of change — then shrink the
            gap. This is the definition every later rule must match.
          </p>

          <div className="id-grid">
            <section id="first-principles-def" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">From two points to dy/dx</span>
                <span className="panel-hint">Close points · difference quotient</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <p>
                    Pick two points on a curve: at <strong>x₁</strong> and a nearby{' '}
                    <strong>x₂</strong>. The average slope between them is rise over run:
                  </p>
                  <Formula
                    math={String.raw`\dfrac{dy}{dx}
                      =\lim_{x_{2}\to x_{1}}\dfrac{\Delta y}{\Delta x}
                      =\lim_{x_{2}\to x_{1}}\dfrac{f(x_{2})-f(x_{1})}{x_{2}-x_{1}}`}
                  />
                  <p>
                    Set <strong>x₁ = x</strong> and <strong>x₂ = x + h</strong> (the second point is
                    a step h away). Then x₂ − x₁ = h, and the same limit becomes the standard
                    classroom form:
                  </p>
                  <Formula
                    math={String.raw`\dfrac{dy}{dx}
                      =\lim_{h\to 0}\dfrac{f(x+h)-f(x)}{h}`}
                    className="id-katex--hero"
                  />
                  <p>
                    That is differentiation from first principles: start with a chord between two
                    close points, write the difference quotient, algebraically simplify, then let
                    h → 0 so the chord becomes the tangent.
                  </p>
                  <UseWhen>
                    Proving a derivative rule from scratch, exam “from first principles” questions,
                    or checking that a formula for f′ really matches the definition.
                  </UseWhen>
                  <WatchOut>
                    You never plug h = 0 into the fraction first — that is 0/0. Simplify until the h
                    in the denominator cancels (or factors out), then take the limit.
                  </WatchOut>
                </div>
                <NoteFigure
                  src="/notes/first-principles-1.jpeg"
                  alt="Notebook: differentiation from first principles, difference quotient, example y=x², power rule, and LIATE for integration by parts"
                  caption="Notebook · first principles → power rule → LIATE (page 1)"
                />
              </div>
            </section>

            <section id="first-principles-x2" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Worked example · y = x²</span>
                <span className="panel-hint">Then the power rule</span>
              </div>
              <div className="id-body">
                <p>Apply the definition with f(x) = x²:</p>
                <Formula
                  math={String.raw`\dfrac{f(x+h)-f(x)}{h}
                    =\dfrac{(x+h)^{2}-x^{2}}{h}
                    =\dfrac{x^{2}+2xh+h^{2}-x^{2}}{h}
                    =\dfrac{2xh+h^{2}}{h}
                    =2x+h`}
                />
                <p>
                  Now let the second point approach the first: as h → 0, the extra h vanishes and
                  you get the instantaneous slope.
                </p>
                <Formula math={String.raw`\lim_{h\to 0}(2x+h)=2x
                  \qquad\Longrightarrow\qquad
                  \dfrac{dy}{dx}=2x\quad\text{when }y=x^{2}`} />
                <p>
                  The same pattern for y = xⁿ (expand (x+h)ⁿ, cancel, take h → 0) yields the power
                  rule — a shortcut that still means “first principles done once for the whole
                  family”:
                </p>
                <Formula math={String.raw`\dfrac{d}{dx}\big[x^{n}\big]=n\,x^{n-1}`} />
                <Check>
                  <p>
                    y = x³: difference quotient expands to 3x² + 3xh + h² → limit <strong>3x²</strong>
                    , matching n xⁿ⁻¹ with n = 3.
                  </p>
                </Check>
              </div>
            </section>
          </div>
        </section>

        {/* LIATE / integration by parts */}
        <section id="liate" className="id-block">
          <SectionLabel sectionId="liate">Integration by parts · LIATE</SectionLabel>
          <p className="id-block-lead">
            Parts is the product rule run backwards. LIATE tells you which factor to call u
            (differentiate) and which to call dv (integrate).
          </p>

          <div className="id-grid">
            <section id="liate-formula" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">The parts formula</span>
                <span className="panel-hint">∫ u dv = uv − ∫ v du</span>
              </div>
              <div className="id-body">
                <Formula
                  math={String.raw`\int f\,g'\,dx = f\,g - \int f'\,g\,dx`}
                  className="id-katex--hero"
                />
                <p>
                  Same idea with u and dv: choose u = f (you will differentiate it) and dv = g′ dx
                  (you will integrate it). Then:
                </p>
                <Formula math={String.raw`\int u\,dv = uv - \int v\,du`} />
                <UseWhen>
                  Products in an integrand where one factor gets simpler when differentiated (logs,
                  inverse trig, polynomials) and the other is easy to integrate (exp, sin, cos,
                  powers).
                </UseWhen>
              </div>
            </section>

            <section id="liate-order" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">LIATE priority order</span>
                <span className="panel-hint">Pick u from the top of the list</span>
              </div>
              <div className="id-body">
                <p>
                  When the integrand is a product, assign <strong>u</strong> to the factor that
                  appears earliest in <strong>LIATE</strong>:
                </p>
                <ol className="id-liate-list">
                  <li>
                    <span className="id-liate-letter">L</span>
                    <strong>ogarithmic</strong> — ln x, logₐ x
                  </li>
                  <li>
                    <span className="id-liate-letter">I</span>
                    <strong>nverse trig</strong> — arctan, arcsin, …
                  </li>
                  <li>
                    <span className="id-liate-letter">A</span>
                    <strong>lgebraic / polynomial</strong> — x, x², √x, …
                  </li>
                  <li>
                    <span className="id-liate-letter">T</span>
                    <strong>rigonometric</strong> — sin, cos, tan, …
                  </li>
                  <li>
                    <span className="id-liate-letter">E</span>
                    <strong>xponential</strong> — eˣ, aˣ
                  </li>
                </ol>
                <p>
                  The other factor becomes dv. Priority runs top → bottom: logs beat inverse trig,
                  which beat polynomials, which beat trig, which beat exponentials. Goal: u should
                  get simpler under differentiation; dv should stay integrable.
                </p>
                <Check>
                  <p>
                    ∫ x eˣ dx → L is absent, I absent, so u = x (Algebraic), dv = eˣ dx → uv − ∫ v du
                    = x eˣ − ∫ eˣ dx = <strong>eˣ (x − 1) + C</strong>.
                  </p>
                </Check>
                <WatchOut>
                  LIATE is a guideline, not a law. If the integral gets worse, swap u and dv and try
                  again (or use a different method).
                </WatchOut>
              </div>
            </section>
          </div>
        </section>

        {/* Close points · max / min / inflection */}
        <section id="close-points" className="id-block">
          <SectionLabel sectionId="close-points">Close points · max, min & inflection</SectionLabel>
          <p className="id-block-lead">
            After you can differentiate, classify critical points by looking at the sign of f′ and
            f″ near the candidate — the “close points” test from first principles of shape.
          </p>

          <div className="id-grid">
            <section id="close-points-tests" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">First & second derivative tests</span>
                <span className="panel-hint">Concavity · extrema · inflection</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <div className="id-shape-grid">
                    <article className="id-shape-card">
                      <h3 className="id-shape-title">Local maximum</h3>
                      <Formula math={String.raw`f'(c)=0\text{ (or undefined), and }f''(c)<0`} />
                      <p>
                        Graph is concave down near c (⋂) — like a hilltop. First derivative changes
                        + → − when you pass c left to right.
                      </p>
                    </article>
                    <article className="id-shape-card">
                      <h3 className="id-shape-title">Local minimum</h3>
                      <Formula math={String.raw`f'(c)=0\text{ (or undefined), and }f''(c)>0`} />
                      <p>
                        Graph is concave up near c (⋃) — like a valley. First derivative changes − →
                        + across c.
                      </p>
                    </article>
                    <article className="id-shape-card id-shape-card--wide">
                      <h3 className="id-shape-title">Inflection point</h3>
                      <Formula math={String.raw`f''(c)=0\text{ (often) and concavity changes}`} />
                      <p>
                        Concavity flips from up to down or down to up. Checking f″ = 0 alone is not
                        enough — use close points on either side of c and see whether f″ (or the
                        bend of the graph) actually changes sign.
                      </p>
                    </article>
                  </div>
                  <UseWhen>
                    Curve sketching, optimization word problems, and justifying “this critical
                    point is a max/min” on an exam without a graphing calculator.
                  </UseWhen>
                  <WatchOut>
                    f′(c) = 0 does not guarantee a max or min (e.g. y = x³ at 0 is an inflection).
                    Always check the neighborhood — that is the close-points method.
                  </WatchOut>
                </div>
                <NoteFigure
                  src="/notes/first-principles-2.jpeg"
                  alt="Notebook: concave up/down, max and min second-derivative tests, inflection, and indeterminate forms"
                  caption="Notebook · concavity, extrema, inflection (page 2)"
                />
              </div>
            </section>

            <section id="close-points-check" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Close-points checklist</span>
                <span className="panel-hint">Left of c · at c · right of c</span>
              </div>
              <div className="id-body">
                <ol className="id-list id-list--numbered">
                  <li>Find candidates: f′(c) = 0 or f′ undefined (critical points).</li>
                  <li>
                    Pick test x-values slightly left and right of c (close points on the number
                    line).
                  </li>
                  <li>
                    Sign of f′: + to − ⇒ local max; − to + ⇒ local min; same sign ⇒ neither.
                  </li>
                  <li>
                    Optional: evaluate f″(c). Negative ⇒ concave down (max); positive ⇒ concave up
                    (min); zero ⇒ inconclusive — go back to close points.
                  </li>
                </ol>
                <Check>
                  <p>
                    f(x) = x³ − 3x: f′ = 3x² − 3 = 0 at x = ±1. f″ = 6x → f″(1) = 6 &gt; 0 (min),
                    f″(−1) = −6 &lt; 0 (max).
                  </p>
                </Check>
              </div>
            </section>

            <section id="close-points-indet" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Indeterminate forms (side note)</span>
                <span className="panel-hint">1^∞ · ∞/∞</span>
              </div>
              <div className="id-body">
                <p>
                  Limits that “look like” 1<sup>∞</sup> or ∞/∞ are not automatic answers — rewrite
                  (often with ln for 1<sup>∞</sup>, or l’Hôpital for 0/0 and ∞/∞). Classic example:
                </p>
                <Formula math={String.raw`\lim_{n\to\infty}\!\left(1+\dfrac{1}{n}\right)^{\!n}=e`} />
                <p>
                  Same theme as first principles: you only get a solid value after a limit process,
                  not by plugging symbols like ∞ into arithmetic.
                </p>
              </div>
            </section>
          </div>
        </section>

        {/* Logs from notebook page 3 */}
        <section id="logs" className="id-block">
          <SectionLabel sectionId="logs">Logarithms · bases & derivative</SectionLabel>
          <p className="id-block-lead">
            Logs undo exponentials. Different fields default to different bases; calculus almost
            always wants the natural log.
          </p>

          <div className="id-grid">
            <section id="logs-bases" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Bases by field</span>
                <span className="panel-hint">e · 10 · 2</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <ul className="id-list">
                    <li>
                      <strong>Math / pure calc:</strong> base e →{' '}
                      <Formula math={String.raw`\log_e=\ln`} display={false} />
                    </li>
                    <li>
                      <strong>Engineering / “common log”:</strong> base 10 → log₁₀
                    </li>
                    <li>
                      <strong>Computer science:</strong> base 2 → log₂ (bits, binary trees)
                    </li>
                  </ul>
                  <Formula math={String.raw`\log_a 1=0,\qquad a^{\log_a y}=y,\qquad \log_a(a^{x})=x`} />
                  <p>
                    Power rule for logs: n logₐ(y) = logₐ(yⁿ). Change of base (always available):
                  </p>
                  <Formula
                    math={String.raw`\log_a y=\dfrac{\ln y}{\ln a}=\dfrac{\log_{10} y}{\log_{10} a}`}
                  />
                  <p>
                    Differentiating y = aˣ is easiest via ln; for the log itself (a &gt; 0, a ≠ 1):
                  </p>
                  <Formula
                    math={String.raw`\dfrac{d}{dx}\big[\log_a y\big]
                      =\dfrac{1}{y\ln a}
                      \quad(y>0)`}
                    className="id-katex--hero"
                  />
                  <p>
                    In particular, d/dx [ln y] = 1/y (chain rule: times y′ if y is a function of x).
                  </p>
                  <UseWhen>
                    Solving exponential equations, half-life / growth models, and any derivative that
                    produces 1/x.
                  </UseWhen>
                  <WatchOut>
                    log without a base is ambiguous — in higher math it often means ln; on a
                    calculator “log” is usually log₁₀. Know your audience.
                  </WatchOut>
                </div>
                <NoteFigure
                  src="/notes/first-principles-3.jpeg"
                  alt="Notebook: log bases e, 10, and 2; change of base; derivative of log"
                  caption="Notebook · logs and change of base (page 3)"
                />
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            UNIT CIRCLE + EULER
            ═══════════════════════════════════════════ */}
        <section id="unit-circle-bridge" className="id-block">
          <SectionLabel sectionId="unit-circle-bridge">Unit circle & Euler</SectionLabel>
          <p className="id-block-lead">
            Same circle as the interactive page: angle θ, point (cos θ, sin θ), and the complex form
            that ties e, i, and π together.
          </p>

          <div className="id-grid">
            <section id="euler-formula" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Euler’s formula</span>
                <span className="panel-hint">e^{'{iθ}'} · drag the spiral · side view → sine</span>
              </div>
              <div className="id-body id-body--euler-formula">
                <div className="id-euler-formula-copy">
                  <Formula math={String.raw`e^{i\theta}=\cos\theta+i\sin\theta`} className="id-katex--hero" />
                  <p>
                    Parametrize θ = πt and plot the complex number in 3D with time as the third
                    axis: z = e<sup>iπt</sup> = cos(πt) + i sin(πt) for t ∈ [0, 4]. The curve is a
                    helix. Turn the camera to a pure side view (looking along the real axis) and the
                    imaginary part becomes the familiar sine wave.
                  </p>
                  <ul className="id-list">
                    <li>
                      θ = 0 → e<sup>0</sup> = 1
                    </li>
                    <li>
                      θ = π/2 → e<sup>iπ/2</sup> = i
                    </li>
                    <li>
                      θ = π → e<sup>iπ</sup> = −1
                    </li>
                  </ul>
                  <UseWhen>
                    Complex numbers, rotations, signals / waves, and connecting polar form to sin/cos
                    (Calc 2 / Diff Eq / physics).
                  </UseWhen>
                </div>
                <EulerSpiral3D />
              </div>
            </section>

            <section id="unit-circle-pi" className="panel content-panel id-card id-card--unit-pi">
              <div className="panel-header">
                <span className="panel-title">On the unit circle at π</span>
                <span className="panel-hint">−1 = cos π + i sin π</span>
              </div>
              <div className="id-body id-body--unit-pi">
                <div className="id-formula id-formula--hero id-formula--yellow">
                  <span>−1</span>
                  <span className="id-eq">=</span>
                  <span>cos(π)</span>
                  <span className="id-eq">+</span>
                  <span>i · sin(π)</span>
                </div>
                <div className="id-unit-pi-diagram">
                  <MiniUnitCircle deg={180} cosLabel="−1" sinLabel="0" />
                </div>
                <p>
                  At angle π radians (180°), cosine is −1 and sine is 0, so the complex number on
                  the unit circle is exactly −1. That is the geometric stepping-stone to Euler’s
                  identity.
                </p>
                <Check>
                  <p>
                    cos(π) = −1, sin(π) = 0 → −1 + i·0 = <strong>−1</strong>
                  </p>
                </Check>
              </div>
            </section>

            <section id="euler-identity" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Euler’s identity</span>
                <span className="panel-hint">Five constants, one line</span>
              </div>
              <div className="id-body id-body--euler-id">
                <div className="id-euler-id-copy">
                  <Formula math={String.raw`e^{i\pi}+1=0`} className="id-katex--hero" />
                  <p>
                    From e<sup>iπ</sup> = −1, add 1 to obtain 0. The constants{' '}
                    <strong>0, 1, e, i, π</strong> meet in a single equation — a theorem, not a
                    coincidence.
                  </p>
                  <div className="id-pills">
                    <span className="id-pill">0 · additive identity</span>
                    <span className="id-pill">1 · multiplicative identity</span>
                    <span className="id-pill">e · analysis</span>
                    <span className="id-pill">i · √−1</span>
                    <span className="id-pill">π · circle</span>
                  </div>
                </div>
                <figure className="id-chalk-figure">
                  <img
                    src="/right-banner.png"
                    alt="Chalkboard: golden ratio φ, e, undefined forms, and Euler’s formulas"
                    className="id-chalk-img"
                    loading="lazy"
                    decoding="async"
                  />
                  <figcaption className="id-caption">
                    Reference chalkboard — φ, e, and Euler’s formulas
                  </figcaption>
                </figure>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            CALC 1 BRIDGE
            ═══════════════════════════════════════════ */}
        <section id="calc-bridge" className="id-block">
          <SectionLabel sectionId="calc-bridge">Why identities show up in calculus</SectionLabel>
          <p className="id-block-lead">
            Trig is not only for triangles — derivatives, limits, and integrals lean on the same
            rewrite rules.
          </p>

          <div className="id-grid">
            <section id="calc-bridge-deriv" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Derivatives of sin & cos</span>
                <span className="panel-hint">Chain rule ready</span>
              </div>
              <div className="id-body">
                <Formula math={String.raw`\dfrac{d}{dx}[\sin x]=\cos x,\qquad
                  \dfrac{d}{dx}[\cos x]=-\sin x`} />
                <Formula math={String.raw`\dfrac{d}{dx}[\tan x]=\sec^{2}x`} />
                <p>
                  Angles must be in <strong>radians</strong> for these formulas (the limit
                  definition of the derivative assumes radian measure). See{' '}
                  <a href="#inverse-trig">Inverse trig</a> for the full four-step cycle and
                  calculator graphs of −sin / −cos.
                </p>
                <UseWhen>
                  Related rates, harmonic motion, and any chain-rule problem with a trig outer
                  function.
                </UseWhen>
              </div>
            </section>

            <section id="calc-bridge-integrals" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Integrals that need identities</span>
                <span className="panel-hint">Power-reducing</span>
              </div>
              <div className="id-body">
                <Formula math={String.raw`\int\sin^{2}x\,dx
                  =\int\dfrac{1-\cos(2x)}{2}\,dx
                  =\dfrac{x}{2}-\dfrac{\sin(2x)}{4}+C`} />
                <p>
                  You almost never integrate sin² “as is” — double-angle / power-reducing turns it
                  into something with an elementary antiderivative.
                </p>
                <UseWhen>
                  Calc 2 trig integrals; also average values of sin² / cos² over a period.
                </UseWhen>
              </div>
            </section>

            <section id="calc-bridge-limits" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Limits · undefined vs indeterminate</span>
                <span className="panel-hint">1/0 vs 1^∞ · ties to l’Hôpital</span>
              </div>
              <div className="id-body id-two-col-formulas">
                <div>
                  <div className="id-formula id-formula--danger">
                    <span className="id-frac">
                      <span className="id-num">1</span>
                      <span className="id-bar" />
                      <span className="id-den">0</span>
                    </span>
                    <span className="id-eq">=</span>
                    <span className="id-big id-undefined">undefined</span>
                  </div>
                  <p>
                    No number x satisfies 0 · x = 1. Limits may diverge to ±∞, but that describes a
                    process — not a value of 1/0.
                  </p>
                </div>
                <div>
                  <div className="id-formula id-formula--warn">
                    <span className="id-big">
                      1<sup>∞</sup>
                    </span>
                    <span className="id-eq">=</span>
                    <span className="id-big id-indet">indeterminate</span>
                  </div>
                  <p>
                    Different limits that “look like” 1<sup>∞</sup> can give different answers —
                    including e:
                  </p>
                  <Formula math={String.raw`\lim_{n\to\infty}\left(1+\dfrac{1}{n}\right)^{n}=e`} />
                </div>
              </div>
              <div className="id-body" style={{ paddingTop: 0 }}>
                <UseWhen>
                  Classifying limit forms before plugging in; spotting when l’Hôpital (0/0 or ∞/∞)
                  or an algebraic rewrite is needed.
                </UseWhen>
                <WatchOut>
                  “Undefined” is not the same as “indeterminate.” 1/0 is broken arithmetic; 1^∞ is a
                  label for a family of limits that still need work.
                </WatchOut>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            INVERSE TRIG · terminology + how it works
            ═══════════════════════════════════════════ */}
        <section id="inverse-trig" className="id-block">
          <SectionLabel sectionId="inverse-trig">Inverse trig</SectionLabel>
          <p className="id-block-lead">
            Three different ideas share the word “inverse” in trig. Get the names straight first —
            then the graphs and the derivative cycle make sense.
          </p>

          <div className="id-grid">
            {/* Terminology from user table + full family */}
            <section id="inverse-trig-terms" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Terminology · tan family (works the same for sin / cos)</span>
                <span className="panel-hint">Name · meaning · notation · example</span>
              </div>
              <div className="id-body">
                <p>
                  Start with one forward function — here <strong>tan</strong>. Everything else is
                  built from it: reciprocal, inverse function, or (on the Graphs page) a simple
                  flip through the axis.
                </p>

                <div className="id-term-table-wrap">
                  <table className="id-term-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Meaning</th>
                        <th scope="col">Notation</th>
                        <th scope="col">Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>tan</strong>
                        </td>
                        <td>Tangent function (forward)</td>
                        <td>
                          <Formula math={String.raw`\tan\theta`} display={false} />
                        </td>
                        <td>
                          <Formula math={String.raw`\tan 45^{\circ}=1`} display={false} />
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>cotangent</strong>
                        </td>
                        <td>
                          <em>Reciprocal</em> of tan — flip the fraction, not the function
                        </td>
                        <td>
                          <Formula math={String.raw`\cot\theta=\dfrac{1}{\tan\theta}`} display={false} />
                        </td>
                        <td>
                          <Formula math={String.raw`\cot 45^{\circ}=1`} display={false} />
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>arctangent</strong>
                        </td>
                        <td>
                          <em>Inverse function</em> of tan — undoes tan (principal angle)
                        </td>
                        <td>
                          <Formula math={String.raw`\arctan(x)`} display={false} />
                        </td>
                        <td>
                          <Formula math={String.raw`\arctan(1)=45^{\circ}`} display={false} />
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>tan⁻¹</strong>
                        </td>
                        <td>
                          Same as arctangent — the superscript −1 means inverse{' '}
                          <em>function</em>, not “to the power −1”
                        </td>
                        <td>
                          <Formula math={String.raw`\tan^{-1}(x)`} display={false} />
                        </td>
                        <td>
                          <Formula math={String.raw`\tan^{-1}(1)=45^{\circ}`} display={false} />
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>−tan</strong>
                        </td>
                        <td>
                          <em>Additive</em> inverse — flip the graph through the θ-axis (phase
                          flip). Not arctan, not cot.
                        </td>
                        <td>
                          <Formula math={String.raw`-\tan\theta`} display={false} />
                        </td>
                        <td>
                          <Formula math={String.raw`-\tan 45^{\circ}=-1`} display={false} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="id-mini-label" style={{ marginTop: '1rem' }}>
                  Same pattern for the whole family
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\sin^{-1}=\arcsin,\quad
                      \cos^{-1}=\arccos,\quad
                      \tan^{-1}=\arctan`}
                  />
                  <Formula
                    math={String.raw`\csc\theta=\dfrac{1}{\sin\theta},\quad
                      \sec\theta=\dfrac{1}{\cos\theta},\quad
                      \cot\theta=\dfrac{1}{\tan\theta}`}
                  />
                </div>
                <WatchOut>
                  On a calculator, <strong>tan⁻¹</strong> is arctan. Writing{' '}
                  <Formula math={String.raw`\tan^{-1}\theta`} display={false} /> does{' '}
                  <em>not</em> mean <Formula math={String.raw`1/\tan\theta`} display={false} /> —
                  that reciprocal is <strong>cot</strong>. And neither is <strong>−tan</strong>.
                </WatchOut>
              </div>
            </section>

            {/* How inverse functions work */}
            <section id="inverse-trig-how" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">How an inverse trig function works</span>
                <span className="panel-hint">Undo the forward map · principal values</span>
              </div>
              <div className="id-body">
                <p>
                  A forward function sends an <strong>angle</strong> to a <strong>ratio</strong>{' '}
                  (or coordinate). The inverse sends that ratio back to an angle — but only on a
                  restricted range so the answer is unique (the <strong>principal value</strong>).
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\tan\theta = x
                      \quad\Longleftrightarrow\quad
                      \theta = \tan^{-1}(x)
                      \quad\text{(with }\theta\text{ in the principal range)}`}
                  />
                  <Formula
                    math={String.raw`\tan^{-1}:\mathbb{R}\to\left(-\dfrac{\pi}{2},\dfrac{\pi}{2}\right)
                      \qquad
                      \sin^{-1}:[-1,1]\to\left[-\dfrac{\pi}{2},\dfrac{\pi}{2}\right]
                      \qquad
                      \cos^{-1}:[-1,1]\to[0,\pi]`}
                  />
                </div>
                <p>
                  Example with the table: <Formula math={String.raw`\tan 45^{\circ}=1`} display={false} />,
                  so <Formula math={String.raw`\tan^{-1}(1)=45^{\circ}`} display={false} /> (or π/4
                  rad). Same number, roles swapped — input and output trade places.
                </p>
                <p>
                  On the unit circle, if P = (cos θ, sin θ), then:
                </p>
                <ul className="id-wave-key">
                  <li>
                    <strong>tan θ</strong> = slope of the ray OP (or opposite/adjacent on the
                    triangle)
                  </li>
                  <li>
                    <strong>tan⁻¹(x)</strong> = the unique principal angle whose tan is x
                  </li>
                  <li>
                    <strong>cot θ</strong> = 1/tan θ — still a function of the same angle, not an
                    inverse map
                  </li>
                </ul>
                <p>
                  Graph of <Formula math={String.raw`y=\tan^{-1}x`} display={false} />: smooth
                  S-curve with horizontal asymptotes ±π/2 (see Graphs page tan⁻¹). That is{' '}
                  <em>not</em> the same as plotting{' '}
                  <Formula math={String.raw`\tan^{-1}(\tan\theta)`} display={false} />, which folds
                  into a sawtooth of straight segments (principal-value composition).
                </p>
                <UseWhen>
                  Solving for an angle from a known ratio (right triangles, “find θ”), switching
                  between degrees and radians carefully, and reading inverse graphs on the Graphs
                  page.
                </UseWhen>
                <Check>
                  <p>
                    If <Formula math={String.raw`\tan\theta=1`} display={false} />, then one
                    answer is θ = 45°. Also θ = 45° + 180°k for integers k — but{' '}
                    <Formula math={String.raw`\tan^{-1}(1)`} display={false} /> returns only the
                    principal value 45° (or π/4).
                  </p>
                </Check>
              </div>
            </section>

            {/* Three-way confusion card */}
            <section id="inverse-trig-three" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Three “inverses” — do not mix them</span>
                <span className="panel-hint">Reciprocal · inverse function · additive flip</span>
              </div>
              <div className="id-body">
                <div className="id-term-table-wrap">
                  <table className="id-term-table id-term-table--compact">
                    <thead>
                      <tr>
                        <th scope="col">Idea</th>
                        <th scope="col">Symbol example</th>
                        <th scope="col">What it does</th>
                        <th scope="col">On Graphs page</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Reciprocal</strong>
                        </td>
                        <td>
                          <Formula math={String.raw`\cot=\frac{1}{\tan}`} display={false} />
                        </td>
                        <td>Invert the number (multiply by 1/y)</td>
                        <td>cot, csc, sec toggles</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Inverse function</strong>
                        </td>
                        <td>
                          <Formula math={String.raw`\tan^{-1}=\arctan`} display={false} />
                        </td>
                        <td>Undo the map: ratio → angle</td>
                        <td>tan⁻¹, cot⁻¹, sec⁻¹, csc⁻¹</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Additive flip</strong>
                        </td>
                        <td>
                          <Formula math={String.raw`-\sin,\;-\cos`} display={false} />
                        </td>
                        <td>Reflect the wave through the θ-axis</td>
                        <td>−sin, −cos (derivative cycle)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <WatchOut>
                  Spoken language is sloppy: people say “inverse tan” for both cot and arctan.
                  Always check notation — cot vs tan⁻¹ vs −tan.
                </WatchOut>
              </div>
            </section>

            {/* Derivative cycle — phase flips, not inverse functions */}
            <section id="inverse-trig-cycle" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">sin · cos · −sin · −cos · the derivative cycle</span>
                <span className="panel-hint">Additive flips · not arctrig · RADIAN mode</span>
              </div>
              <div className="id-body">
                <p>
                  Differentiating sine and cosine walks a four-step cycle of{' '}
                  <strong>phase flips</strong> (−sin, −cos), not inverse functions. After four
                  derivatives you return to sin x.
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\dfrac{d}{dx}[\sin x]=\cos x,\qquad
                      \dfrac{d}{dx}[\cos x]=-\sin x,\qquad
                      \dfrac{d}{dx}[-\sin x]=-\cos x,\qquad
                      \dfrac{d}{dx}[-\cos x]=\sin x`}
                  />
                </div>
                <p>
                  Clockwise on the colour key below is “differentiate once.” Angles must be in{' '}
                  <strong>radians</strong>.
                </p>

                <div className="id-calc-gallery">
                  <NoteFigure
                    src="/notes/sin-cos-derivative-cycle.jpg"
                    alt="Graphing calculator: Y1=sin(X) red, Y2=cos(X) orange, Y5=-sin(X) green, Y6=-cos(X) blue, with a colour-coded derivative cycle ring linking sin → cos → −sin → −cos"
                    caption="Colour key · d/dx cycle: sin (red) → cos (orange) → −sin (green) → −cos (blue) → sin"
                  />
                  <NoteFigure
                    src="/notes/sin-cos-inverted-waves.jpg"
                    alt="Graphing calculator plot of sin(X), cos(X), −sin(X), and −cos(X) as four phase-shifted sinusoids"
                    caption="All four are sinusoids — same amplitude, shifted phase. −sin and −cos flip through the x-axis"
                  />
                </div>

                <p className="id-mini-label" style={{ marginTop: '0.85rem' }}>
                  Reading the four waves
                </p>
                <ul className="id-wave-key">
                  <li>
                    <span className="id-swatch id-swatch--sin" aria-hidden="true" />
                    <strong>sin x</strong> — starts at 0, rises (red on the calc)
                  </li>
                  <li>
                    <span className="id-swatch id-swatch--cos" aria-hidden="true" />
                    <strong>cos x</strong> — starts at 1; slope of sin (orange)
                  </li>
                  <li>
                    <span className="id-swatch id-swatch--nsin" aria-hidden="true" />
                    <strong>−sin x</strong> — sin flipped through the axis; slope of cos (green)
                  </li>
                  <li>
                    <span className="id-swatch id-swatch--ncos" aria-hidden="true" />
                    <strong>−cos x</strong> — cos flipped; slope of −sin (blue)
                  </li>
                </ul>
                <UseWhen>
                  Memorizing d/dx of sin and cos as one closed loop; checking Graphs-page −sin /
                  −cos toggles against a calculator; related rates and harmonic motion.
                </UseWhen>
                <WatchOut>
                  Do not confuse the leading minus on <strong>−sin</strong> (additive flip) with
                  the superscript on <strong>sin⁻¹</strong> (arcsin / inverse function).
                </WatchOut>
                <Check>
                  <p>
                    Differentiate sin three times: cos → −sin → −cos. One more step returns sin.
                    Same loop starting at cos: −sin → −cos → sin → cos.
                  </p>
                </Check>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            PENDULUMS · simple → double → triple
            (inspired by physical-pendulum lab writeup)
            ═══════════════════════════════════════════ */}
        <section id="pendulums" className="id-block">
          <SectionLabel sectionId="pendulums">Pendulums · simple to triple</SectionLabel>
          <p className="id-block-lead">
            Restoring torque is proportional to{' '}
            <Formula math={String.raw`\sin\theta`} display={false} />; for small angles that is
            almost proportional to θ itself — simple harmonic motion (Calc 1 / Diff Eq). Link
            several bobs and the same sine becomes a chaotic system. Live single · double · triple
            simulation: <a href="/pendulums">Pendulums</a>.
          </p>

          <div className="id-grid">
            {/* Galileo / isochronism */}
            <section id="pendulums-isochronism" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Isochronism · Galileo’s observation</span>
                <span className="panel-hint">Period independent of mass (and ≈ amplitude if small)</span>
              </div>
              <div className="id-body">
                <p>
                  In <em>De motu antiquiora</em> (and later work), Galileo noticed that heavier and
                  lighter pendulums of the same length keep nearly the same time —{' '}
                  <strong>isochronism</strong>. The period is mass-independent and, for modest
                  swings, proportional to the square root of length. That idea powered centuries of
                  pendulum clocks before quartz took over; the pendulum is still the cleanest lab
                  for circular motion, torque, and second-order ODEs.
                </p>
                <Formula
                  math={String.raw`T=2\pi\sqrt{\dfrac{L}{g}}\qquad(\text{simple pendulum, small }\theta)`}
                />
                <UseWhen>
                  Timing problems, estimating g from a measured period, or checking whether mass
                  “should” appear in T (it should not, for an ideal simple pendulum).
                </UseWhen>
                <WatchOut>
                  Large release angles break the small-angle story: the true period grows with
                  amplitude. Dropping from θ ≳ 30° without measuring θ is a classic lab confounder.
                </WatchOut>
              </div>
            </section>

            {/* Free body + ODE */}
            <section id="pendulums-fbd" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Simple pendulum · free body → ODE</span>
                <span className="panel-hint">Static FBD · Calc 1+ · not interactive</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <p>
                    Model a bob of mass m on a massless string (or rod) of length ℓ. Measure θ(t)
                    from the downward vertical (dashed). Gravity mg acts straight down; the
                    restoring component tangent to the arc is mg sin θ (toward equilibrium), so the
                    torque about the pivot is
                  </p>
                  <Formula math={String.raw`\tau=-mg\ell\sin\theta`} />
                  <p>
                    With moment of inertia I = mℓ² about the pivot, τ = Iα = I θ̈ gives
                  </p>
                  <Formula
                    math={String.raw`-mg\ell\sin\theta=m\ell^{2}\,\ddot\theta
                      \quad\Rightarrow\quad
                      \ddot\theta+\dfrac{g}{\ell}\sin\theta=0`}
                  />
                  <p>
                    That is a nonlinear second-order ODE — standard Calc 1 / Diff Eq material. Only
                    the small-angle limit{' '}
                    <Formula math={String.raw`\sin\theta\approx\theta`} display={false} /> (θ in
                    radians!) turns it into simple harmonic motion:
                  </p>
                  <Formula
                    math={String.raw`\ddot\theta+\dfrac{g}{\ell}\theta=0,\qquad
                      \omega_{0}=\sqrt{\dfrac{g}{\ell}},\qquad
                      T=\dfrac{2\pi}{\omega_{0}}`}
                  />
                  <Check>
                    <p>
                      For ℓ = 1 m and g ≈ 9.81 m/s², T ≈ 2π√(1/9.81) ≈ <strong>2.0 s</strong> — a
                      useful mental check.
                    </p>
                  </Check>
                </div>
                <div>
                  <figure className="id-pendulum-fbd-figure">
                    <img
                      src="/notes/simple-pendulum-fbd.jpg"
                      alt="Free-body diagram of a simple pendulum: pivot, angle θ(t) from the vertical, length ℓ, weight mg downward, and restoring component mg sin θ"
                      className="id-pendulum-fbd-img"
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption className="id-caption">
                      Free-body diagram (static reference · Calc 1+). Live single / double / triple
                      motion: <a href="/pendulums">Pendulums</a>.
                    </figcaption>
                  </figure>
                </div>
              </div>
            </section>

            {/* Linear ↔ angular analogy */}
            <section id="pendulums-analogy" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Linear ↔ angular analogy</span>
                <span className="panel-hint">Why I = mr² shows up</span>
              </div>
              <div className="id-body">
                <p>
                  Arc length s = Lθ (radians). Differentiating, v = Lω and a = Lα when L is fixed.
                  Matching linear and rotational forms:
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`p=mv \;\longleftrightarrow\; L_{\text{ang}}=mr^{2}\omega`}
                  />
                  <Formula
                    math={String.raw`F=ma \;\longleftrightarrow\; \tau=mr^{2}\alpha`}
                  />
                </div>
                <p>
                  The factor mr² is the <strong>moment of inertia</strong> of a point mass a
                  distance r from the axis. Extended bodies sum (or integrate) that idea; the
                  interactive lab uses ideal point-mass links, so each bob still contributes mᵢLᵢ²
                  geometry through the Lagrangian.
                </p>
                <UseWhen>
                  Translating F = ma intuition into torque and angular acceleration; reading lab
                  writeups that compare p and L, F and τ.
                </UseWhen>
              </div>
            </section>

            {/* Small vs large angle */}
            <section id="pendulums-small-angle" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Small angle vs full sin θ</span>
                <span className="panel-hint">When the sine wave “looks wrong”</span>
              </div>
              <div className="id-body">
                <p>
                  Both pendulums and sine waves oscillate — but 2π is always the period of sin(ωt),
                  while a real pendulum’s period is T = 2π√(L/g) only under{' '}
                  <Formula math={String.raw`\sin\theta\approx\theta`} display={false} />. As
                  amplitude grows, the graph of θ(t) stretches and is no longer a pure sinusoid.
                </p>
                <Formula
                  math={String.raw`\text{error in }\sin\theta\approx\theta
                    \text{ is }<\sim 1\%\text{ for }|\theta|\lesssim 14^{\circ}
                    \text{ (}\sim 0.24\text{ rad)}`}
                />
                <WatchOut>
                  Fitting a pure sine to a large-angle swing and reading “T = 2π” from the fit is
                  misleading — the ODE is nonlinear. Use the interactive page’s full sin θ mode to
                  see the stretch.
                </WatchOut>
                <UseWhen>
                  Deciding whether a SHM formula is legal; debugging lab data where large drops
                  inflate the measured period.
                </UseWhen>
              </div>
            </section>

            {/* Double / triple */}
            <section id="pendulums-multi" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Double & triple pendulums · chaos</span>
                <span className="panel-hint">Coupled angles · colored trails</span>
              </div>
              <div className="id-body">
                <p>
                  A <strong>double pendulum</strong> is two simple links: angles θ₁, θ₂, lengths
                  L₁, L₂, masses m₁, m₂. Energy still conserves (with no damping), but trajectories
                  in the plane become sensitive to initial conditions — classic low-dimensional
                  chaos. A <strong>triple</strong> link adds a third angle and even richer motion.
                </p>
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\text{single:}\quad
                      \ddot\theta+\dfrac{g}{L}\sin\theta=0`}
                  />
                  <Formula
                    math={String.raw`\text{multi-link:}\quad
                      \mathbf{M}(\boldsymbol\theta)\,\ddot{\boldsymbol\theta}
                      +\mathbf{C}(\boldsymbol\theta,\dot{\boldsymbol\theta})
                      +\mathbf{G}(\boldsymbol\theta)=\mathbf{0}`}
                  />
                </div>
                <p>
                  Here M is a configuration-dependent mass matrix (from kinetic energy), C collects
                  Coriolis / centrifugal terms, and G comes from gravity — each Gᵢ still carries a{' '}
                  <Formula math={String.raw`\sin\theta_{i}`} display={false} /> factor. The site
                  integrates these with RK4 and paints a trail for every bob.
                </p>
                <ul className="id-list">
                  <li>
                    <strong style={{ color: '#f87171' }}>Bob 1</strong> — red trail (upper link)
                  </li>
                  <li>
                    <strong style={{ color: '#38bdf8' }}>Bob 2</strong> — blue trail
                  </li>
                  <li>
                    <strong style={{ color: '#a78bfa' }}>Bob 3</strong> — violet trail (triple only)
                  </li>
                </ul>
                <UseWhen>
                  Diff Eq / dynamics demos, chaos intuition, or comparing “looks random” motion to
                  a deterministic ODE with no noise term.
                </UseWhen>
                <Check>
                  <p>
                    On <a href="/pendulums">Pendulums</a>: pause, set large unequal θ₀ for a
                    double pendulum, play, and clear trails — the path fills a region instead of
                    retracing a single curve.
                  </p>
                </Check>
              </div>
            </section>

            {/* Toolkit card */}
            <section id="pendulums-toolkit" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Formula toolkit</span>
                <span className="panel-hint">Copy-ready · radians for ODEs</span>
              </div>
              <div className="id-body">
                <div className="id-formula-stack">
                  <Formula
                    math={String.raw`\ddot\theta+\dfrac{g}{L}\sin\theta=0
                      \quad\text{(simple, exact)}`}
                  />
                  <Formula
                    math={String.raw`T=2\pi\sqrt{\dfrac{L}{g}}
                      \quad\text{(simple, small }\theta\text{)}`}
                  />
                  <Formula
                    math={String.raw`\tau=-mgL\sin\theta,\qquad I_{\text{pivot}}=mL^{2}`}
                  />
                  <Formula
                    math={String.raw`s=L\theta,\quad v=L\omega,\quad
                      \omega=\dot\theta,\quad\alpha=\ddot\theta`}
                  />
                </div>
                <p>
                  Interactive controls: lengths, masses, g, light damping, release angles, and
                  trail fade — all on{' '}
                  <a href="/pendulums">
                    <strong>Pendulums</strong>
                  </a>
                  . Pair with <a href="#calc-bridge">Calc 1 bridge</a> (derivatives of sin/cos) and{' '}
                  <a href="/waves">Trig Functions</a> (graph of sin itself).
                </p>
                <WatchOut>
                  Always use <strong>radians</strong> in the ODE and in numerical integrators.
                  Degree mode on a calculator will wreck sin θ ≈ θ checks.
                </WatchOut>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            NUMBER TYPES
            ═══════════════════════════════════════════ */}
        <section id="number-types" className="id-block">
          <SectionLabel sectionId="number-types">What kind of number is that?</SectionLabel>

          <section id="number-types-map" className="panel content-panel id-card id-card--wide">
            <div className="panel-header">
              <span className="panel-title">Number systems map</span>
              <span className="panel-hint">Vi Hart–style nest · colored by type</span>
            </div>
            <div className="id-body">
              <p>
                Numbers nest like Russian dolls — then split. Rationals sit inside algebraics; some
                irrationals are algebraic (√2, φ) and some are transcendental (π, e). Hyperreals wrap
                the whole real line with infinitesimals. Complex numbers step <em>off</em> that line.
              </p>

              {/* Nested Venn (Vi Hart structure) */}
              <div className="num-venn" aria-label="Nested number systems diagram">
                <div className="num-venn-ring num-venn-ring--hyper">
                  <span className="num-venn-label num-venn-label--hyper">Hyperreals *ℝ</span>
                  <span className="num-venn-note">∞ · infinitesimals · all reals</span>
                  <div className="num-venn-ring num-venn-ring--real">
                    <span className="num-venn-label num-venn-label--real">Real numbers ℝ</span>
                    <div className="num-venn-real-split">
                      <div className="num-venn-side num-venn-side--alg">
                        <span className="num-venn-label num-venn-label--alg">Algebraics</span>
                        <div className="num-venn-ring num-venn-ring--rat">
                          <span className="num-venn-label num-venn-label--rat">Rationals ℚ</span>
                          <div className="num-venn-ring num-venn-ring--int">
                            <span className="num-venn-label num-venn-label--int">Integers ℤ</span>
                            <div className="num-venn-ring num-venn-ring--nat">
                              <span className="num-venn-label num-venn-label--nat">Naturals ℕ</span>
                              <span className="num-venn-examples">1, 2, 3…</span>
                            </div>
                            <span className="num-venn-examples">… −1, 0 …</span>
                          </div>
                          <span className="num-venn-examples">½ · −5 · 0.75</span>
                        </div>
                        <span className="num-venn-examples num-venn-examples--alg-irr">
                          √2 · φ · ³√2
                        </span>
                      </div>
                      <div className="num-venn-side num-venn-side--irr">
                        <span className="num-venn-label num-venn-label--irr">Irrationals</span>
                        <div className="num-venn-ring num-venn-ring--trans">
                          <span className="num-venn-label num-venn-label--trans">Transcendentals</span>
                          <span className="num-venn-examples">π · e · τ</span>
                        </div>
                        <span className="num-venn-examples">√2 · φ also here</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="num-type-legend" aria-label="Color key by type">
                <span className="num-leg num-leg--nat">ℕ natural</span>
                <span className="num-leg num-leg--int">ℤ integer</span>
                <span className="num-leg num-leg--rat">ℚ rational</span>
                <span className="num-leg num-leg--alg">algebraic</span>
                <span className="num-leg num-leg--irr">irrational</span>
                <span className="num-leg num-leg--trans">transcendental</span>
                <span className="num-leg num-leg--real">ℝ real</span>
                <span className="num-leg num-leg--hyper">*ℝ hyperreal</span>
                <span className="num-leg num-leg--imag">imaginary</span>
                <span className="num-leg num-leg--cplx">ℂ complex</span>
              </div>

              {/* ── Counting ladder ── */}
              <h3 className="id-subhead num-group-head">Counting ladder</h3>
              <div className="num-type-grid">
                <article className="num-type-card num-type-card--nat">
                  <h3 className="num-type-title">Natural numbers · ℕ</h3>
                  <p className="num-type-examples">1, 2, 3, 4, 5…</p>
                  <p>
                    Counting numbers. Innermost nest. Some texts include 0; either way, discrete
                    “how many?” before negatives.
                  </p>
                </article>

                <article className="num-type-card num-type-card--int">
                  <h3 className="num-type-title">Integers · ℤ</h3>
                  <p className="num-type-examples">… −2, −1, 0, 1, 2 …</p>
                  <p>
                    Naturals plus zero and negatives — whole numbers with sign, still no fractional
                    part.
                  </p>
                </article>

                <article className="num-type-card num-type-card--rat">
                  <h3 className="num-type-title">Rational numbers · ℚ</h3>
                  <p className="num-type-examples">½ · −5 · 0.75 · 0.333… = ⅓</p>
                  <p>
                    Ratio of two integers (denominator ≠ 0). Decimals stop or repeat. Every integer
                    is rational. All rationals are algebraic.
                  </p>
                </article>
              </div>

              {/* ── Algebraic vs transcendental cut ── */}
              <h3 className="id-subhead num-group-head">How “wild” is the number?</h3>
              <p className="id-block-lead" style={{ marginBottom: '0.75rem' }}>
                Two overlapping cuts of the reals: <strong>rational / irrational</strong> (fraction
                or not) and <strong>algebraic / transcendental</strong> (root of a polynomial or
                not).
              </p>
              <div className="num-type-grid">
                <article className="num-type-card num-type-card--alg">
                  <h3 className="num-type-title">Algebraic numbers</h3>
                  <p className="num-type-examples">all rationals · √2 · φ · ³√2 · i</p>
                  <p>
                    Roots of polynomials with integer coefficients. Includes every rational and many
                    irrationals (√2 solves x² − 2 = 0; φ solves x² − x − 1 = 0). The green “lens”
                    over rationals + some irrationals in the nest diagram.
                  </p>
                </article>

                <article className="num-type-card num-type-card--irr">
                  <h3 className="num-type-title">Irrational numbers</h3>
                  <p className="num-type-examples">√2 · φ · π · e · τ</p>
                  <p>
                    Reals that are <strong>not</strong> rational. Decimals never stop and never
                    loop. Split further into algebraic irrationals (√2, φ) and transcendentals (π,
                    e).
                  </p>
                </article>

                <article className="num-type-card num-type-card--trans">
                  <h3 className="num-type-title">Transcendental numbers</h3>
                  <p className="num-type-examples">π · e · τ = 2π · e^π …</p>
                  <p>
                    Not algebraic — not the root of any nonzero integer polynomial. Famous examples:
                    π and e. All transcendentals that are real are irrational, but most irrationals
                    people meet early (√2, φ) are still algebraic.
                  </p>
                </article>
              </div>

              {/* ── Lines ── */}
              <h3 className="id-subhead num-group-head">The line — and thickening it</h3>
              <div className="num-type-grid">
                <article className="num-type-card num-type-card--real">
                  <h3 className="num-type-title">Real numbers · ℝ</h3>
                  <p className="num-type-examples">ℚ ∪ irrationals · the number line</p>
                  <p>
                    All rationals and all irrationals. Continuous line Calc 1 uses for limits,
                    derivatives, and integrals.
                  </p>
                </article>

                <article className="num-type-card num-type-card--hyper">
                  <h3 className="num-type-title">Hyperreal numbers · *ℝ</h3>
                  <p className="num-type-examples">ε ≈ 0⁺ · H ≈ ∞ · every real</p>
                  <p>
                    Outer shell in the nest: reals plus infinitesimals (infinitely close to a real
                    but not equal) and infinite hyperreals. Language of nonstandard calculus —
                    “dx is tiny” made literal.
                  </p>
                </article>
              </div>

              {/* ── Off the line ── */}
              <h3 className="id-subhead num-group-head">Off the real line</h3>
              <div className="num-type-grid">
                <article className="num-type-card num-type-card--imag">
                  <h3 className="num-type-title">Imaginary numbers</h3>
                  <p className="num-type-examples">i · 2i · √−1 · √−4 = 2i</p>
                  <p>
                    Built from <strong>i² = −1</strong>. Pure imaginaries sit on a second axis, not
                    on ℝ. (i itself is algebraic: root of x² + 1 = 0.)
                  </p>
                </article>

                <article className="num-type-card num-type-card--cplx">
                  <h3 className="num-type-title">Complex numbers · ℂ</h3>
                  <p className="num-type-examples">3 + 2i · cos θ + i sin θ · e^{'{iθ}'}</p>
                  <p>
                    a + bi. The unit circle is the set of complex numbers with length 1. Not inside
                    the hyperreal nest — a sideways plane extension of ℝ.
                  </p>
                </article>
              </div>

              <div className="num-type-ladder" aria-label="Nesting along the real line">
                <span className="num-ladder-step num-leg--nat">ℕ</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--int">ℤ</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--rat">ℚ</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--alg">algebraics</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--real">ℝ</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--hyper">*ℝ</span>
              </div>
              <div
                className="num-type-ladder"
                style={{ marginTop: '0.5rem' }}
                aria-label="Irrational split and complex"
              >
                <span className="num-ladder-step num-leg--irr">irrationals</span>
                <span className="num-ladder-arrow">=</span>
                <span className="num-ladder-step num-leg--alg">alg. irrat.</span>
                <span className="num-ladder-arrow">∪</span>
                <span className="num-ladder-step num-leg--trans">transcendentals</span>
                <span className="num-ladder-arrow">·</span>
                <span className="num-ladder-step num-leg--real">ℝ</span>
                <span className="num-ladder-arrow">⊂</span>
                <span className="num-ladder-step num-leg--cplx">ℂ</span>
              </div>
              <p className="id-caption" style={{ marginTop: '0.75rem' }}>
                Key Vi Hart idea: algebraics are not “next to” irrationals — they cut across, taking
                all of ℚ and some of the irrationals (√2, φ), while transcendentals (π, e) sit in the
                irrational region outside algebraics.
              </p>
            </div>
          </section>
        </section>

        {/* ═══════════════════════════════════════════
            CONSTANTS (e) — keep, after core
            ═══════════════════════════════════════════ */}
        <section id="constants" className="id-block">
          <SectionLabel sectionId="constants">Constants worth knowing</SectionLabel>

          <div className="id-grid">
            <section id="constants-e" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Euler’s number</span>
                <span className="panel-hint">e · natural growth</span>
              </div>
              <div className="id-body">
                <div className="id-formula">
                  <span className="id-big">e</span>
                  <span className="id-eq">≈</span>
                  <span className="id-e-digits">
                    2.7
                    <mark className="id-mark">1828</mark>
                    <mark className="id-mark">1828</mark>
                    45…
                  </span>
                </div>
                <p className="id-caption" style={{ marginTop: '-0.5rem' }}>
                  After 2.7, the block <strong>1828</strong> appears twice — a memory aid, then digits
                  continue without that forever-repeat.
                </p>
                <p>More precisely e ≈ {E.toFixed(12)}… Base of natural growth:</p>
                <Formula math={String.raw`e=\lim_{n\to\infty}\left(1+\dfrac{1}{n}\right)^{n}=\sum_{n=0}^{\infty}\dfrac{1}{n!}`} />
                <Formula math={String.raw`\dfrac{d}{dx}[e^{x}]=e^{x}`} />
                <UseWhen>
                  Continuous compound interest, exponential growth/decay, natural log, and any
                  derivative that should “stay the same shape.”
                </UseWhen>
              </div>
            </section>

            <section id="constants-pi" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">π on the circle</span>
                <span className="panel-hint">Irrational · radians</span>
              </div>
              <div className="id-body">
                <Formula math={String.raw`\pi\approx 3.14159\ldots,\qquad C=2\pi r`} />
                <p>
                  Circumference ÷ diameter. Irrational (and transcendental): 22/7 is only an
                  approximation. Full turn of the unit circle is <strong>2π radians</strong>, half
                  turn is π.
                </p>
                <UseWhen>
                  Arc length, sector area, converting degrees ↔ radians, and every unit-circle
                  special angle.
                </UseWhen>
                <Check>
                  <p>
                    180° = π rad · 360° = 2π · 90° = π/2 · 45° = π/4
                  </p>
                </Check>
              </div>
            </section>
          </div>
        </section>

        {/* ═══════════════════════════════════════════
            BONUS — φ / Fibonacci demoted
            ═══════════════════════════════════════════ */}
        <section id="bonus" className="id-block id-block--bonus">
          <SectionLabel sectionId="bonus">Golden ratio & Fibonacci</SectionLabel>
          <p className="id-block-lead">
            Beautiful and common in enrichment problems — not part of the standard trig identity
            checklist. Safe to skip for exams; fun if you like patterns.
          </p>

          <div className="id-grid">
            <section id="bonus-phi" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">The golden ratio</span>
                <span className="panel-hint">φ · optional</span>
              </div>
              <div className="id-body">
                <div className="id-formula" aria-label="phi equals one plus square root of five over two">
                  <span className="id-big">φ</span>
                  <span className="id-eq">=</span>
                  <span className="id-frac">
                    <span className="id-num">1 + √5</span>
                    <span className="id-bar" />
                    <span className="id-den">2</span>
                  </span>
                  <span className="id-eq">≈</span>
                  <span className="id-num-plain">{PHI.toFixed(8)}…</span>
                </div>
                <p>
                  A segment is cut in the <strong>golden ratio</strong> when whole ∶ longer = longer
                  ∶ shorter. φ satisfies φ² = φ + 1 and is irrational.
                </p>
                <div className="id-formula id-formula--sm">φ² = φ + 1 ··· Fibonacci ratios → φ</div>
              </div>
            </section>

            <section id="bonus-angle" className="panel content-panel id-card">
              <div className="panel-header">
                <span className="panel-title">Golden angle on the circle</span>
                <span className="panel-hint">≈ 137.5°</span>
              </div>
              <div className="id-body">
                <Formula
                  math={String.raw`\psi=\dfrac{360^{\circ}}{\varphi^{2}}=\dfrac{360^{\circ}}{\varphi+1}\approx 137.508^{\circ}`}
                />
                <p>
                  Split a full turn in the golden ratio: the smaller arc is the golden angle.
                  Appears in leaf / seed packing models — φ as a <em>rotation</em>, not only a
                  length ratio.
                </p>
                <Formula
                  math={
                    String.raw`\text{in radians: }\dfrac{2\pi}{\varphi^{2}}\approx ` +
                    `${((2 * Math.PI) / (PHI * PHI)).toFixed(4)}\\ldots`
                  }
                />
              </div>
            </section>

            <section id="bonus-fib" className="panel content-panel id-card id-card--wide">
              <div className="panel-header">
                <span className="panel-title">Fibonacci spiral</span>
                <span className="panel-hint">1, 1, 2, 3, 5, 8, 13…</span>
              </div>
              <div className="id-body id-body--split">
                <div>
                  <p>
                    F₁ = 1, F₂ = 1, F<sub>n</sub> = F<sub>n−1</sub> + F<sub>n−2</sub>. Tile squares
                    with those sides and draw quarter-circles for an approximate golden spiral.
                    Successive ratios F<sub>n+1</sub>/F<sub>n</sub> hop above and below φ, then
                    squeeze toward it:
                  </p>
                  <ul className="id-list id-list--ratios">
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&lt;</span>
                      <span className="id-ratio-pair">2 / 1</span>
                      <span className="id-eq">=</span>
                      <span>2</span>
                    </li>
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&gt;</span>
                      <span className="id-ratio-pair">3 / 2</span>
                      <span className="id-eq">=</span>
                      <span>1.5</span>
                    </li>
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&lt;</span>
                      <span className="id-ratio-pair">5 / 3</span>
                      <span className="id-eq">≈</span>
                      <span>1.666…</span>
                    </li>
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&gt;</span>
                      <span className="id-ratio-pair">8 / 5</span>
                      <span className="id-eq">=</span>
                      <span>1.6</span>
                    </li>
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&lt;</span>
                      <span className="id-ratio-pair">13 / 8</span>
                      <span className="id-eq">=</span>
                      <span>1.625</span>
                    </li>
                    <li>
                      <span className="id-big">φ</span>
                      <span className="id-eq">&gt;</span>
                      <span className="id-ratio-pair">21 / 13</span>
                      <span className="id-eq">≈</span>
                      <span>1.615…</span>
                    </li>
                    <li>
                      <span className="id-eq">…</span>
                      <span className="id-big">φ</span>
                      <span className="id-eq">≈</span>
                      <span className="id-num-plain">{PHI.toFixed(6)}…</span>
                    </li>
                  </ul>
                </div>
                <FibonacciSpiral />
              </div>
            </section>
          </div>
        </section>

        <p className="id-footnote panel" style={{ padding: '0.85rem 1.15rem' }}>
          Core trig layout follows standard precalc / Calc 1 reference sheets (definitions,
          Pythagorean, sum/difference, double-angle, laws of sines & cosines). Open the{' '}
          <a href="/">Unit Circle</a>, <a href="/waves">Trig Functions</a>, or{' '}
          <a href="/pendulums">Pendulums</a> pages to see the same ideas move live.
        </p>
      </main>
    </>
  )
}
