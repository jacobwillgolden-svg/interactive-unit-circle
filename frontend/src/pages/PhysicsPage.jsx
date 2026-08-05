import { useCallback, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import GravityControl from '../components/GravityControl'
import { G0 } from '../utils/constants'

/**
 * Physics — interactive box-on-a-ramp free-body diagram builder.
 * Build classic incline problems (friction, pulleys, multiple masses),
 * toggle full force-component arrows, export PNG for worksheets.
 */

const W = 720
const H = 520

const MODES = [
  { id: 'single', label: 'Single box' },
  { id: 'hang', label: 'Ramp + pulley' },
  { id: 'atwood', label: 'Atwood machine' },
]

const FORCE_META = {
  weight: { color: '#a78bfa', colorLight: '#7c3aed', label: 'mg' },
  wPar: { color: '#f87171', colorLight: '#dc2626', label: 'mg sinθ' },
  wPerp: { color: '#60a5fa', colorLight: '#2563eb', label: 'mg cosθ' },
  normal: { color: '#34d399', colorLight: '#059669', label: 'N' },
  friction: { color: '#fb923c', colorLight: '#ea580c', label: 'f' },
  tension: { color: '#22d3ee', colorLight: '#0891b2', label: 'T' },
  applied: { color: '#f472b6', colorLight: '#db2777', label: 'Fₐ' },
  net: { color: '#f8fafc', colorLight: '#0f172a', label: 'ΣF' },
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function deg2rad(d) {
  return (d * Math.PI) / 180
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—'
  const a = Math.abs(n)
  if (a !== 0 && a < 0.005) return n.toExponential(1)
  return n.toFixed(digits)
}

/** Unit vectors for a ramp rising to the right (θ from horizontal). SVG y+ down. */
function rampBasis(theta) {
  // Along ramp, uphill: (cos θ, −sin θ) in SVG
  const ux = Math.cos(theta)
  const uy = -Math.sin(theta)
  // Outward normal (above surface): (−sin θ, −cos θ) in SVG
  const nx = -Math.sin(theta)
  const ny = -Math.cos(theta)
  return { ux, uy, nx, ny }
}

/**
 * Single box on incline.
 * +a = up the ramp. Fapp > 0 = up the ramp.
 */
function solveSingle(m, theta, muS, muK, Fapp, g, frictionOn) {
  const Wpar = m * g * Math.sin(theta) // down-ramp magnitude
  const N = m * g * Math.cos(theta)
  const weight = m * g
  const Fdrive = Fapp - Wpar // net without friction, + up ramp

  if (!frictionOn) {
    const a = Fdrive / m
    return {
      a,
      N,
      f: 0,
      static: false,
      weight,
      Wpar,
      Wperp: N,
      Fapp,
      moving: Math.abs(a) > 1e-9,
    }
  }

  const fMax = muS * N
  if (Math.abs(Fdrive) <= fMax + 1e-12) {
    return {
      a: 0,
      N,
      f: -Fdrive, // friction balances; + = up ramp
      static: true,
      weight,
      Wpar,
      Wperp: N,
      Fapp,
      moving: false,
      fMax,
    }
  }

  const fk = muK * N
  // Kinetic friction opposes the would-be motion (sign of Fdrive)
  const f = -Math.sign(Fdrive) * fk
  const a = (Fdrive + f) / m
  return {
    a,
    N,
    f,
    static: false,
    weight,
    Wpar,
    Wperp: N,
    Fapp,
    moving: true,
    fMax,
  }
}

/**
 * Box m1 on ramp + hanging m2 over pulley at top.
 * +a = hanging mass down = box up the ramp.
 */
function solveHang(m1, m2, theta, muS, muK, g, frictionOn) {
  const N = m1 * g * Math.cos(theta)
  const Wpar = m1 * g * Math.sin(theta)
  const weight1 = m1 * g
  const weight2 = m2 * g

  if (frictionOn) {
    // Static: a = 0 ⇒ T = m2 g, f = Wpar − T on box (+ up ramp)
    const T0 = m2 * g
    const fNeed = Wpar - T0
    if (Math.abs(fNeed) <= muS * N + 1e-12) {
      return {
        a: 0,
        T: T0,
        f: fNeed,
        N,
        static: true,
        weight1,
        weight2,
        Wpar,
        Wperp: N,
        moving: false,
        fMax: muS * N,
      }
    }
  }

  const fk = frictionOn ? muK * N : 0

  // Try a > 0 (box up, hang down): friction down ramp on box
  const aUp = (m2 * g - Wpar - fk) / (m1 + m2)
  if (aUp > 1e-9) {
    const T = m2 * g - m2 * aUp
    return {
      a: aUp,
      T,
      f: -fk,
      N,
      static: false,
      weight1,
      weight2,
      Wpar,
      Wperp: N,
      moving: true,
      dir: 'box-up',
      fMax: muS * N,
    }
  }

  // Try a < 0 (box down, hang up): friction up ramp on box
  const aDown = (m2 * g - Wpar + fk) / (m1 + m2)
  if (aDown < -1e-9) {
    const T = m2 * g - m2 * aDown
    return {
      a: aDown,
      T,
      f: fk,
      N,
      static: false,
      weight1,
      weight2,
      Wpar,
      Wperp: N,
      moving: true,
      dir: 'box-down',
      fMax: muS * N,
    }
  }

  // Borderline equilibrium with kinetic-scale friction
  const T = m2 * g
  return {
    a: 0,
    T,
    f: Wpar - T,
    N,
    static: true,
    weight1,
    weight2,
    Wpar,
    Wperp: N,
    moving: false,
    fMax: muS * N,
  }
}

/**
 * Ideal Atwood machine (two hanging masses, massless frictionless pulleys/string).
 * Lab form (Atwood’s law): a = g · Δm / Σm   with Δm = |m₁ − m₂|, directed toward heavier.
 * Newton system (+a = m₁ down):  m₁g − T = m₁a ,  T − m₂g = m₂a
 *   a = g (m₁ − m₂) / (m₁ + m₂)
 *   T = 2 m₁ m₂ g / (m₁ + m₂)
 *   also a = ΣF_net / Σm  with ΣF_net = (m₁ − m₂)g
 */
function solveAtwood(m1, m2, g) {
  const weight1 = m1 * g
  const weight2 = m2 * g
  const sumM = m1 + m2
  const deltaM = m1 - m2 // signed: + ⇒ m1 heavier
  if (sumM < 1e-12) {
    return {
      a: 0,
      T: 0,
      static: true,
      weight1,
      weight2,
      sumM: 0,
      deltaM: 0,
      Fnet: 0,
      moving: false,
      dir: 'balance',
      net1: 0,
      net2: 0,
    }
  }
  const Fnet = deltaM * g // net driving force on the system
  const a = Fnet / sumM // = g · Δm / Σm  (signed)
  const T = (2 * m1 * m2 * g) / sumM
  const balanced = Math.abs(deltaM) < 1e-12
  return {
    a,
    T,
    static: balanced,
    weight1,
    weight2,
    sumM,
    deltaM,
    Fnet,
    moving: !balanced,
    dir: balanced ? 'balance' : a > 0 ? 'm1-down' : 'm2-down',
    net1: weight1 - T, // = m1 a
    net2: T - weight2, // = m2 a when +a is m1 down
  }
}

/** Kinematic a from rest over drop h in time t: Δy = ½ a t² ⇒ a = 2h/t² */
function kinematicA(h, t) {
  if (!(t > 1e-9) || !(h >= 0)) return null
  return (2 * h) / (t * t)
}

function arrowHead(x, y, dx, dy, size = 8) {
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux
  const bx = x - ux * size
  const by = y - uy * size
  return `${x},${y} ${bx + px * size * 0.55},${by + py * size * 0.55} ${bx - px * size * 0.55},${by - py * size * 0.55}`
}

/** Tip geometry for a force arrow. `strict` keeps true scale (needed for decomp triangle). */
function forceTip(x, y, dirX, dirY, mag, scale, { minLen = 22, maxLen = 130, strict = false } = {}) {
  if (mag < 1e-9) return null
  const raw = mag * scale
  const len = strict ? raw : clamp(raw, minLen, maxLen)
  const d = Math.hypot(dirX, dirY) || 1
  const ux = dirX / d
  const uy = dirY / d
  return { x0: x, y0: y, x1: x + ux * len, y1: y + uy * len, ux, uy, len }
}

/**
 * Force arrow from a single center-of-mass origin (textbook FBD).
 * Labels sit past the tip so the CoM stays clear.
 */
function ForceArrow({
  x,
  y,
  dirX,
  dirY,
  mag,
  scale,
  color,
  label,
  ink,
  minLen = 22,
  maxLen = 130,
  /** 1 | -1 — which side of the ray the label sits on */
  labelSide = 1,
  /** When true, length = mag×scale exactly (weight decomposition closes). */
  strictScale = false,
}) {
  const tip = forceTip(x, y, dirX, dirY, mag, scale, {
    minLen,
    maxLen,
    strict: strictScale,
  })
  if (!tip) return null
  const { x0, y0, x1, y1, ux, uy } = tip

  // Label beyond the tip, nudged perpendicular so multi-force FBDs stay readable
  const tipPad = 16
  const sidePad = 11
  const px = -uy * labelSide
  const py = ux * labelSide
  const labX = x1 + ux * tipPad + px * sidePad
  const labY = y1 + uy * tipPad + py * sidePad
  const textAnchor = ux < -0.35 ? 'end' : ux > 0.35 ? 'start' : 'middle'
  const dominantBaseline =
    uy < -0.45 ? 'auto' : uy > 0.45 ? 'hanging' : 'middle'

  return (
    <g className="physics-force">
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polygon points={arrowHead(x1, y1, ux, uy, 9)} fill={color} />
      {label && (
        <text
          x={labX}
          y={labY}
          fill={color}
          fontSize="11"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontWeight="600"
          textAnchor={textAnchor}
          dominantBaseline={dominantBaseline}
          stroke={ink}
          strokeWidth="3"
          paintOrder="stroke"
          strokeOpacity="0.55"
        >
          {label}
        </text>
      )}
    </g>
  )
}

/**
 * Dashed right-triangle construction: mg = mg sinθ + mg cosθ.
 * Closes tip(∥) → tip(mg) and tip(⊥) → tip(mg).
 */
function WeightDecompTriangle({
  cx,
  cy,
  weight,
  wPar,
  wPerp,
  dirParX,
  dirParY,
  dirPerpX,
  dirPerpY,
  scale,
  color,
}) {
  const tipW = forceTip(cx, cy, 0, 1, weight, scale, { strict: true })
  const tipPar = forceTip(cx, cy, dirParX, dirParY, wPar, scale, { strict: true })
  const tipPerp = forceTip(cx, cy, dirPerpX, dirPerpY, wPerp, scale, {
    strict: true,
  })
  if (!tipW || !tipPar || !tipPerp) return null

  // Right-angle mark at CoM between parallel & perpendicular axes
  const mark = 10
  const dPar = Math.hypot(dirParX, dirParY) || 1
  const dPerp = Math.hypot(dirPerpX, dirPerpY) || 1
  const pux = dirParX / dPar
  const puy = dirParY / dPar
  const nx = dirPerpX / dPerp
  const ny = dirPerpY / dPerp
  const ax = cx + pux * mark
  const ay = cy + puy * mark
  const bx = cx + nx * mark
  const by = cy + ny * mark
  const cxm = cx + pux * mark + nx * mark
  const cym = cy + puy * mark + ny * mark

  return (
    <g className="physics-decomp" aria-hidden="true">
      {/* Closing sides of the vector triangle (dashed) */}
      <line
        x1={tipPar.x1}
        y1={tipPar.y1}
        x2={tipW.x1}
        y2={tipW.y1}
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="5 4"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />
      <line
        x1={tipPerp.x1}
        y1={tipPerp.y1}
        x2={tipW.x1}
        y2={tipW.y1}
        stroke={color}
        strokeWidth="1.4"
        strokeDasharray="5 4"
        strokeOpacity="0.75"
        strokeLinecap="round"
      />
      {/* Optional third dashed edge tipPar ↔ tipPerp is NOT drawn — that isn't a side of the add triangle */}
      {/* Right-angle tick between component axes at CoM */}
      <path
        d={`M ${ax} ${ay} L ${cxm} ${cym} L ${bx} ${by}`}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.55"
      />
    </g>
  )
}

/** Small cross + ring marking the free-body origin (center of mass). */
function ComMarker({ x, y, color }) {
  const s = 5
  return (
    <g className="physics-com" aria-hidden="true">
      <circle
        cx={x}
        cy={y}
        r={4.5}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeOpacity="0.75"
      />
      <line
        x1={x - s}
        y1={y}
        x2={x + s}
        y2={y}
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
      <line
        x1={x}
        y1={y - s}
        x2={x}
        y2={y + s}
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.7"
      />
    </g>
  )
}

/**
 * Box drawn with (cx, cy) = center of mass (geometric center).
 * Mass label sits above the box so it never covers the CoM / force origin.
 */
function BoxShape({ cx, cy, w, h, angle, fill, stroke, label, labelColor }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${angle})`}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx="3"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.5"
        strokeOpacity="0.45"
      />
      {label && (
        <text
          x={0}
          y={-h / 2 - 10}
          textAnchor="middle"
          dominantBaseline="auto"
          fill={labelColor}
          fontSize="12"
          fontWeight="600"
          fontFamily="Outfit, system-ui, sans-serif"
        >
          {label}
        </text>
      )}
    </g>
  )
}

export default function PhysicsPage() {
  const { theme } = useOutletContext()
  const isLight = theme === 'light'
  const svgRef = useRef(null)

  const [mode, setMode] = useState('single')
  const [thetaDeg, setThetaDeg] = useState(30)
  const [g, setG] = useState(G0)
  const [frictionOn, setFrictionOn] = useState(true)
  const [showComponents, setShowComponents] = useState(true)
  const [showNet, setShowNet] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showValues, setShowValues] = useState(true)

  // Box 1 (on ramp / left ramp)
  const [m1, setM1] = useState(5)
  const [muS1, setMuS1] = useState(0.4)
  const [muK1, setMuK1] = useState(0.25)
  const [Fapp, setFapp] = useState(0)

  // Box 2 / hanging mass / Atwood right mass
  const [m2, setM2] = useState(3)

  // Lab kinematics (from rest): a_exp = 2h/t² — compare to theory
  const [labH, setLabH] = useState(0.5) // m
  const [labT, setLabT] = useState(0.8) // s

  const ink = isLight ? '#0f172a' : '#e8eaf0'
  const muted = isLight ? '#64748b' : '#8b92a5'
  const grid = isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.1)'
  const rampFill = isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.05)'
  const rampStroke = isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.28)'
  const boxFill1 = isLight ? '#38bdf8' : '#0ea5e9'
  const boxFill2 = isLight ? '#a78bfa' : '#8b5cf6'
  const svgBg = isLight ? '#f8fafc' : '#0a0c12'
  const fc = (key) => (isLight ? FORCE_META[key].colorLight : FORCE_META[key].color)

  const theta = deg2rad(thetaDeg)

  const solution = useMemo(() => {
    if (mode === 'single') {
      return {
        mode,
        ...solveSingle(m1, theta, muS1, muK1, Fapp, g, frictionOn),
        m1,
        m2: null,
      }
    }
    if (mode === 'hang') {
      return {
        mode,
        ...solveHang(m1, m2, theta, muS1, muK1, g, frictionOn),
        m1,
        m2,
      }
    }
    return {
      mode,
      ...solveAtwood(m1, m2, g),
      m1,
      m2,
    }
  }, [mode, m1, m2, theta, muS1, muK1, Fapp, g, frictionOn])

  const aExp = useMemo(() => kinematicA(labH, labT), [labH, labT])
  const aTheory = mode === 'atwood' ? Math.abs(solution.a) : null
  const aPctErr =
    aExp != null && aTheory != null && aTheory > 1e-9
      ? (100 * (aExp - aTheory)) / aTheory
      : null

  // Layout geometry
  const layout = useMemo(() => {
    const margin = 48
    const baseY = H - 56

    if (mode === 'atwood') {
      // Double-pulley Atwood (lab-style): two fixed pulleys on a bar
      const ceilY = 72
      const leftX = W * 0.32
      const rightX = W * 0.68
      const pulleyR = 16
      const baseDrop = 175
      // Heavier mass hangs lower (visual cue for which side accelerates down)
      const bias = clamp((m1 - m2) * 8, -36, 36)
      const drop1 = baseDrop + bias
      const drop2 = baseDrop - bias
      return {
        kind: 'atwood',
        ceilY,
        leftX,
        rightX,
        pulleyR,
        pulley1: { x: leftX, y: ceilY },
        pulley2: { x: rightX, y: ceilY },
        mass1: { x: leftX, y: ceilY + pulleyR + drop1 },
        mass2: { x: rightX, y: ceilY + pulleyR + drop2 },
        blockH: 44,
        blockW: 48,
        baseY,
      }
    }

    // Single or hang: ramp from bottom-left up to the right
    const rampLen = mode === 'hang' ? 340 : 400
    const startX = margin + 30
    const startY = baseY
    const endX = startX + rampLen * Math.cos(theta)
    const endY = startY - rampLen * Math.sin(theta)
    // Mid-upper on the incline
    const t = mode === 'hang' ? 0.52 : 0.58
    const box1 = {
      x: startX + (endX - startX) * t,
      y: startY + (endY - startY) * t,
    }
    // Pulley slightly past ramp top
    const pulley = {
      x: endX + 10 * Math.cos(theta),
      y: endY - 10 * Math.sin(theta) - 8,
    }
    const hangX = pulley.x + 52
    const hangTop = pulley.y
    const hangLen = 120
    const hangBob = { x: hangX, y: hangTop + hangLen }
    return {
      kind: mode,
      startX,
      startY,
      endX,
      endY,
      baseY,
      box1,
      pulley,
      hangX,
      hangTop,
      hangBob,
      hangLen,
      basis: rampBasis(theta),
      rampLen,
    }
  }, [mode, theta, m1, m2])

  // Collect force vectors for scaling
  const forces = useMemo(() => {
    const sol = solution
    const list = []

    const pushBox1Forces = (basis, extras = {}) => {
      const { ux, uy, nx, ny } = basis
      // Full weight always; with components also draw ∥ / ⊥ (dashed triangle closes them)
      list.push({
        id: 'w1',
        kind: 'weight',
        mag: sol.weight1 ?? sol.weight,
        dirX: 0,
        dirY: 1,
        body: 'box1',
        label: showLabels ? FORCE_META.weight.label : '',
        strictScale: showComponents,
      })
      if (showComponents) {
        list.push({
          id: 'wpar1',
          kind: 'wPar',
          mag: sol.Wpar1 ?? sol.Wpar,
          dirX: -ux, // down the ramp
          dirY: -uy,
          body: 'box1',
          label: showLabels ? FORCE_META.wPar.label : '',
          strictScale: true,
        })
        list.push({
          id: 'wperp1',
          kind: 'wPerp',
          mag: sol.Wperp1 ?? sol.Wperp ?? sol.N ?? sol.N1,
          dirX: -nx, // into surface
          dirY: -ny,
          body: 'box1',
          label: showLabels ? FORCE_META.wPerp.label : '',
          strictScale: true,
        })
      }
      list.push({
        id: 'n1',
        kind: 'normal',
        mag: sol.N ?? sol.N1,
        dirX: nx,
        dirY: ny,
        body: 'box1',
        label: showLabels ? FORCE_META.normal.label : '',
      })
      if (frictionOn && Math.abs(sol.f ?? sol.f1 ?? 0) > 1e-9) {
        const f = sol.f ?? sol.f1
        list.push({
          id: 'f1',
          kind: 'friction',
          mag: Math.abs(f),
          dirX: Math.sign(f) * ux,
          dirY: Math.sign(f) * uy,
          body: 'box1',
          label: showLabels ? FORCE_META.friction.label : '',
        })
      }
      if (mode === 'single' && Math.abs(Fapp) > 1e-9) {
        list.push({
          id: 'fa',
          kind: 'applied',
          mag: Math.abs(Fapp),
          dirX: Math.sign(Fapp) * ux,
          dirY: Math.sign(Fapp) * uy,
          body: 'box1',
          label: showLabels ? FORCE_META.applied.label : '',
        })
      }
      if (mode === 'hang' && sol.T != null) {
        // Tension up the ramp for box1
        list.push({
          id: 't1',
          kind: 'tension',
          mag: Math.abs(sol.T),
          dirX: extras.tDirX ?? ux,
          dirY: extras.tDirY ?? uy,
          body: 'box1',
          label: showLabels ? FORCE_META.tension.label : '',
        })
      }
      if (showNet) {
        // Net force + up ramp: m*a for single (a is + up); hang a + = up ramp
        let netMag = 0
        let netSign = 1
        if (mode === 'single' || mode === 'hang') {
          netMag = Math.abs(m1 * sol.a)
          netSign = Math.sign(sol.a) || 1
        }
        if (netMag > 1e-9) {
          list.push({
            id: 'net1',
            kind: 'net',
            mag: netMag,
            dirX: netSign * ux,
            dirY: netSign * uy,
            body: 'box1',
            label: showLabels ? FORCE_META.net.label : '',
          })
        }
      }
    }

    if (mode === 'atwood') {
      // Lab FBD: each mass feels Fg = mg (down) and FT = T (up) from CoM
      list.push({
        id: 'w1',
        kind: 'weight',
        mag: sol.weight1,
        dirX: 0,
        dirY: 1,
        body: 'm1',
        label: showLabels ? 'F_g₁' : '',
      })
      list.push({
        id: 't1',
        kind: 'tension',
        mag: Math.abs(sol.T),
        dirX: 0,
        dirY: -1,
        body: 'm1',
        label: showLabels ? 'F_T' : '',
      })
      list.push({
        id: 'w2',
        kind: 'weight',
        mag: sol.weight2,
        dirX: 0,
        dirY: 1,
        body: 'm2',
        label: showLabels ? 'F_g₂' : '',
      })
      list.push({
        id: 't2',
        kind: 'tension',
        mag: Math.abs(sol.T),
        dirX: 0,
        dirY: -1,
        body: 'm2',
        label: showLabels ? 'F_T' : '',
      })
      if (showNet && Math.abs(sol.a) > 1e-9) {
        // +a ⇒ m1 accelerates down, m2 accelerates up
        list.push({
          id: 'net1',
          kind: 'net',
          mag: Math.abs(m1 * sol.a),
          dirX: 0,
          dirY: sol.a > 0 ? 1 : -1,
          body: 'm1',
          label: showLabels ? 'ΣF₁' : '',
        })
        list.push({
          id: 'net2',
          kind: 'net',
          mag: Math.abs(m2 * sol.a),
          dirX: 0,
          dirY: sol.a > 0 ? -1 : 1,
          body: 'm2',
          label: showLabels ? 'ΣF₂' : '',
        })
      }
    } else {
      pushBox1Forces(layout.basis)
      if (mode === 'hang') {
        // Hanging mass forces
        list.push({
          id: 'wH',
          kind: 'weight',
          mag: sol.weight2,
          dirX: 0,
          dirY: 1,
          body: 'hang',
          label: showLabels ? FORCE_META.weight.label : '',
        })
        list.push({
          id: 'tH',
          kind: 'tension',
          mag: Math.abs(sol.T),
          dirX: 0,
          dirY: -1,
          body: 'hang',
          label: showLabels ? FORCE_META.tension.label : '',
        })
        if (showNet && Math.abs(sol.a) > 1e-9) {
          list.push({
            id: 'netH',
            kind: 'net',
            mag: Math.abs(m2 * sol.a),
            dirX: 0,
            dirY: sol.a > 0 ? 1 : -1, // +a hang down
            body: 'hang',
            label: showLabels ? FORCE_META.net.label : '',
          })
        }
      }
    }

    return list
  }, [
    solution,
    layout,
    mode,
    showComponents,
    showNet,
    showLabels,
    frictionOn,
    Fapp,
    m1,
    m2,
  ])

  const forceScale = useMemo(() => {
    const maxF = forces.reduce((m, f) => Math.max(m, f.mag), 0) || 1
    return 90 / maxF
  }, [forces])

  // True geometric centers of mass — all force components for a body share this origin
  const BOX_H = 34
  const HANG_H = 36
  const bodyCenters = useMemo(() => {
    if (layout.kind === 'atwood') {
      return {
        m1: { x: layout.mass1.x, y: layout.mass1.y },
        m2: { x: layout.mass2.x, y: layout.mass2.y },
      }
    }
    const lift = BOX_H / 2
    const c1 = {
      x: layout.box1.x + layout.basis.nx * lift,
      y: layout.box1.y + layout.basis.ny * lift,
    }
    if (layout.kind === 'hang') {
      return {
        box1: c1,
        hang: {
          x: layout.hangBob.x,
          y: layout.hangBob.y - HANG_H / 2,
        },
      }
    }
    return { box1: c1 }
  }, [layout, BOX_H, HANG_H])

  /** Stable label side per force kind so multi-arrow FBDs stay legible */
  const labelSideFor = (kind, index) => {
    const byKind = {
      weight: 1,
      wPar: -1,
      wPerp: 1,
      normal: -1,
      friction: 1,
      tension: -1,
      applied: 1,
      net: -1,
    }
    if (byKind[kind] != null) return byKind[kind]
    return index % 2 === 0 ? 1 : -1
  }

  const forcesByBody = useMemo(() => {
    const map = {}
    for (const f of forces) {
      if (!map[f.body]) map[f.body] = []
      map[f.body].push(f)
    }
    return map
  }, [forces])

  const downloadPng = useCallback(async () => {
    const svg = svgRef.current
    if (!svg) return
    try {
      const clone = svg.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      clone.setAttribute('width', String(W))
      clone.setAttribute('height', String(H))
      clone.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bg.setAttribute('x', '0')
      bg.setAttribute('y', '0')
      bg.setAttribute('width', String(W))
      bg.setAttribute('height', String(H))
      bg.setAttribute('fill', svgBg)
      clone.insertBefore(bg, clone.firstChild)

      const xml = new XMLSerializer().serializeToString(clone)
      const dataUrl =
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      const scale = 2
      const img = new Image()
      await new Promise((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error('PNG export timed out loading SVG')),
          8000
        )
        img.onload = () => {
          clearTimeout(t)
          resolve()
        }
        img.onerror = () => {
          clearTimeout(t)
          reject(new Error('Browser failed to decode SVG for PNG export'))
        }
        img.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = Math.round(W * scale)
      canvas.height = Math.round(H * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.fillStyle = svgBg
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b)
          else reject(new Error('canvas.toBlob returned null'))
        }, 'image/png')
      })

      const parts = [
        mode,
        `th${Math.round(thetaDeg)}`,
        `m${fmt(m1, 1)}`,
      ]
      if (mode !== 'single') parts.push(`m2-${fmt(m2, 1)}`)
      if (frictionOn) parts.push(`mu${fmt(muS1, 2)}`)
      const base = `physics_${parts.join('_')}`

      const a = document.createElement('a')
      const out = URL.createObjectURL(pngBlob)
      a.href = out
      a.download = `${base}.png`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(out), 2000)
    } catch (err) {
      console.error('PNG export failed', err)
      try {
        window.alert(
          'Could not export PNG. Try again.\n\n' +
            (err && err.message ? err.message : String(err))
        )
      } catch {
        /* */
      }
    }
  }, [svgBg, mode, thetaDeg, m1, m2, frictionOn, muS1])

  const resetDefaults = () => {
    setMode('single')
    setThetaDeg(30)
    setG(G0)
    setFrictionOn(true)
    setShowComponents(true)
    setShowNet(false)
    setShowLabels(true)
    setShowValues(true)
    setM1(5)
    setMuS1(0.4)
    setMuK1(0.25)
    setFapp(0)
    setM2(3)
    setLabH(0.5)
    setLabT(0.8)
  }

  const statusLine = (() => {
    if (solution.static) return 'Static equilibrium — no acceleration'
    if (mode === 'single') {
      return solution.a > 0
        ? `Accelerating up the ramp · a = ${fmt(solution.a)} m/s²`
        : `Accelerating down the ramp · a = ${fmt(Math.abs(solution.a))} m/s²`
    }
    if (mode === 'hang') {
      return solution.a > 0
        ? `Hanging mass descending · a = ${fmt(solution.a)} m/s²`
        : `Hanging mass ascending · a = ${fmt(Math.abs(solution.a))} m/s²`
    }
    // Atwood: +a = m1 down
    return solution.a > 0
      ? `m₁ descending · a = g(m₁−m₂)/(m₁+m₂) = ${fmt(solution.a)} m/s²`
      : `m₂ descending · a = ${fmt(Math.abs(solution.a))} m/s²`
  })()

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Free-body diagrams · Newton’s laws</p>
          <h1 className="hero-title--wrap">
            <em>Physics</em>
          </h1>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">
              {mode === 'single'
                ? 'Incline'
                : mode === 'hang'
                  ? 'Ramp + pulley'
                  : 'Atwood machine'}
            </span>
            <div className="value">
              {mode === 'atwood'
                ? `m₁=${fmt(m1, 1)} · m₂=${fmt(m2, 1)}`
                : `${Math.round(thetaDeg)}°`}
            </div>
            <div className="sub">{statusLine}</div>
          </div>
        </div>
      </header>

      <main className="workspace workspace--physics">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Diagram</span>
            <span className="panel-hint">
              {mode === 'atwood'
                ? 'Two fixed pulleys · a = g(m₁−m₂)/(m₁+m₂) · T = 2m₁m₂g/(m₁+m₂)'
                : 'CoM origin · dashed triangle closes mg = mg sinθ + mg cosθ · |F| → length'}
            </span>
          </div>

          <div className="physics-viz">
            <div className="physics-diagram-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="physics-svg"
              role="img"
              aria-label="Box on a ramp free-body diagram"
            >
              {/* Ground line */}
              <line
                x1={24}
                y1={H - 56}
                x2={W - 24}
                y2={H - 56}
                stroke={grid}
                strokeWidth="1.5"
              />

              {layout.kind === 'atwood' ? (
                <>
                  {/* Ceiling bar */}
                  <line
                    x1={layout.leftX - 40}
                    y1={layout.ceilY - layout.pulleyR - 8}
                    x2={layout.rightX + 40}
                    y2={layout.ceilY - layout.pulleyR - 8}
                    stroke={ink}
                    strokeOpacity="0.4"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  {/* Two fixed pulleys */}
                  {[layout.pulley1, layout.pulley2].map((p, i) => (
                    <g key={`pulley-${i}`}>
                      <line
                        x1={p.x}
                        y1={layout.ceilY - layout.pulleyR - 8}
                        x2={p.x}
                        y2={p.y - layout.pulleyR}
                        stroke={ink}
                        strokeOpacity="0.35"
                        strokeWidth="3"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={layout.pulleyR}
                        fill="none"
                        stroke={ink}
                        strokeOpacity="0.55"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={3.5}
                        fill={ink}
                        fillOpacity="0.5"
                      />
                    </g>
                  ))}
                  {/* String: m1 ↑ left pulley → horizontal → right pulley ↓ m2 */}
                  <line
                    x1={layout.mass1.x}
                    y1={layout.mass1.y - layout.blockH / 2}
                    x2={layout.pulley1.x}
                    y2={layout.pulley1.y + layout.pulleyR * 0.2}
                    stroke={fc('tension')}
                    strokeWidth="2"
                    strokeOpacity="0.85"
                  />
                  <line
                    x1={layout.pulley1.x + layout.pulleyR * 0.85}
                    y1={layout.pulley1.y}
                    x2={layout.pulley2.x - layout.pulleyR * 0.85}
                    y2={layout.pulley2.y}
                    stroke={fc('tension')}
                    strokeWidth="2"
                    strokeOpacity="0.85"
                  />
                  <line
                    x1={layout.pulley2.x}
                    y1={layout.pulley2.y + layout.pulleyR * 0.2}
                    x2={layout.mass2.x}
                    y2={layout.mass2.y - layout.blockH / 2}
                    stroke={fc('tension')}
                    strokeWidth="2"
                    strokeOpacity="0.85"
                  />
                  {/* Masses */}
                  <BoxShape
                    cx={layout.mass1.x}
                    cy={layout.mass1.y}
                    w={layout.blockW}
                    h={layout.blockH}
                    angle={0}
                    fill={boxFill1}
                    stroke={ink}
                    label="m₁"
                    labelColor={isLight ? '#0f172a' : '#f8fafc'}
                  />
                  <BoxShape
                    cx={layout.mass2.x}
                    cy={layout.mass2.y}
                    w={layout.blockW}
                    h={layout.blockH}
                    angle={0}
                    fill={boxFill2}
                    stroke={ink}
                    label="m₂"
                    labelColor={isLight ? '#0f172a' : '#f8fafc'}
                  />
                </>
              ) : (
                <>
                  {/* Ramp triangle */}
                  <polygon
                    points={`${layout.startX},${layout.startY} ${layout.endX},${layout.endY} ${layout.endX},${layout.startY}`}
                    fill={rampFill}
                    stroke="none"
                  />
                  <line
                    x1={layout.startX}
                    y1={layout.startY}
                    x2={layout.endX}
                    y2={layout.endY}
                    stroke={rampStroke}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1={layout.startX}
                    y1={layout.startY}
                    x2={Math.min(layout.endX + 40, W - 40)}
                    y2={layout.startY}
                    stroke={grid}
                    strokeWidth="1.5"
                  />
                  {/* Angle mark */}
                  <path
                    d={`M ${layout.startX + 42} ${layout.startY} A 42 42 0 0 0 ${layout.startX + 42 * Math.cos(theta)} ${layout.startY - 42 * Math.sin(theta)}`}
                    fill="none"
                    stroke={muted}
                    strokeWidth="1.3"
                  />
                  <text
                    x={layout.startX + 56}
                    y={layout.startY - 16}
                    fill={muted}
                    fontSize="13"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    θ = {Math.round(thetaDeg)}°
                  </text>

                  {layout.kind === 'hang' && (
                    <>
                      {/* Pulley wheel */}
                      <circle
                        cx={layout.pulley.x}
                        cy={layout.pulley.y}
                        r={14}
                        fill="none"
                        stroke={ink}
                        strokeOpacity="0.55"
                        strokeWidth="2.5"
                      />
                      <circle
                        cx={layout.pulley.x}
                        cy={layout.pulley.y}
                        r={3.5}
                        fill={ink}
                        fillOpacity="0.5"
                      />
                      {/* Rope along ramp to pulley */}
                      <line
                        x1={bodyCenters.box1.x}
                        y1={bodyCenters.box1.y}
                        x2={layout.pulley.x - 6}
                        y2={layout.pulley.y + 4}
                        stroke={fc('tension')}
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                      />
                      {/* Rope over to hang */}
                      <path
                        d={`M ${layout.pulley.x + 10} ${layout.pulley.y} L ${layout.hangX} ${layout.hangTop}`}
                        stroke={fc('tension')}
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                        fill="none"
                      />
                      <line
                        x1={layout.hangX}
                        y1={layout.hangTop}
                        x2={bodyCenters.hang.x}
                        y2={bodyCenters.hang.y - HANG_H / 2}
                        stroke={fc('tension')}
                        strokeWidth="1.8"
                        strokeOpacity="0.8"
                      />
                      {/* Hanging mass — CoM at geometric center */}
                      <rect
                        x={bodyCenters.hang.x - 20}
                        y={bodyCenters.hang.y - HANG_H / 2}
                        width={40}
                        height={HANG_H}
                        rx="3"
                        fill={boxFill2}
                        stroke={ink}
                        strokeWidth="1.5"
                        strokeOpacity="0.45"
                      />
                      <text
                        x={bodyCenters.hang.x}
                        y={bodyCenters.hang.y - HANG_H / 2 - 10}
                        textAnchor="middle"
                        dominantBaseline="auto"
                        fill={isLight ? '#0f172a' : '#f8fafc'}
                        fontSize="12"
                        fontWeight="600"
                      >
                        m₂
                      </text>
                    </>
                  )}

                  <BoxShape
                    cx={bodyCenters.box1.x}
                    cy={bodyCenters.box1.y}
                    w={48}
                    h={34}
                    angle={-thetaDeg}
                    fill={boxFill1}
                    stroke={ink}
                    label="m₁"
                    labelColor={isLight ? '#0f172a' : '#f8fafc'}
                  />
                </>
              )}

              {/* Dashed mg decomposition triangles on ramps only */}
              {showComponents &&
                mode !== 'atwood' &&
                bodyCenters.box1 &&
                layout.basis &&
                (() => {
                  const { ux, uy, nx, ny } = layout.basis
                  return (
                    <WeightDecompTriangle
                      key="decomp-box1"
                      cx={bodyCenters.box1.x}
                      cy={bodyCenters.box1.y}
                      weight={solution.weight1 ?? solution.weight}
                      wPar={solution.Wpar1 ?? solution.Wpar}
                      wPerp={solution.Wperp1 ?? solution.Wperp ?? solution.N}
                      dirParX={-ux}
                      dirParY={-uy}
                      dirPerpX={-nx}
                      dirPerpY={-ny}
                      scale={forceScale}
                      color={muted}
                    />
                  )
                })()}

              {/* Force arrows — every component from that body's CoM */}
              {Object.entries(forcesByBody).map(([body, flist]) =>
                flist.map((f, i) => {
                  const c = bodyCenters[body]
                  if (!c) return null
                  return (
                    <ForceArrow
                      key={f.id}
                      x={c.x}
                      y={c.y}
                      dirX={f.dirX}
                      dirY={f.dirY}
                      mag={f.mag}
                      scale={forceScale}
                      color={fc(f.kind)}
                      label={
                        showValues && showLabels
                          ? `${f.label} ${fmt(f.mag, 1)}`
                          : showLabels
                            ? f.label
                            : showValues
                              ? fmt(f.mag, 1)
                              : ''
                      }
                      ink={svgBg}
                      labelSide={labelSideFor(f.kind, i)}
                      strictScale={Boolean(f.strictScale)}
                    />
                  )
                })
              )}

              {/* CoM markers drawn last so they sit on top of arrow roots */}
              {Object.entries(bodyCenters).map(([body, c]) =>
                c ? (
                  <ComMarker
                    key={`com-${body}`}
                    x={c.x}
                    y={c.y}
                    color={isLight ? '#0f172a' : '#f8fafc'}
                  />
                ) : null
              )}
            </svg>

              {/* Single / Ramp+pulley: forces legend top-left on the diagram */}
              {mode !== 'atwood' && (
                <div className="physics-force-card physics-force-card--overlay">
                  <div className="physics-force-card-title">Forces</div>
                  <ul className="physics-force-list">
                    {(showComponents
                      ? [
                          { key: 'weight', label: FORCE_META.weight.label },
                          { key: 'wPar', label: FORCE_META.wPar.label },
                          { key: 'wPerp', label: FORCE_META.wPerp.label },
                          { key: 'normal', label: FORCE_META.normal.label },
                          { key: 'friction', label: FORCE_META.friction.label },
                          { key: 'tension', label: FORCE_META.tension.label },
                          { key: 'applied', label: FORCE_META.applied.label },
                        ]
                      : [
                          { key: 'weight', label: FORCE_META.weight.label },
                          { key: 'normal', label: FORCE_META.normal.label },
                          { key: 'friction', label: FORCE_META.friction.label },
                          { key: 'tension', label: FORCE_META.tension.label },
                          { key: 'applied', label: FORCE_META.applied.label },
                        ]
                    ).map((item) => (
                      <li key={item.key} className="physics-force-item">
                        <span
                          className="physics-force-swatch"
                          style={{ background: fc(item.key) }}
                          aria-hidden="true"
                        />
                        <span className="physics-force-label">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="physics-force-note">Arrow length ∝ |F|</p>
                </div>
              )}
            </div>

            {/* Atwood only: forces + law cards below the diagram (unchanged) */}
            {mode === 'atwood' && (
              <div className="physics-meta physics-meta--atwood">
                <div className="physics-force-card">
                  <div className="physics-force-card-title">Forces</div>
                  <ul className="physics-force-list">
                    {[
                      { key: 'weight', label: 'F_g = mg' },
                      { key: 'tension', label: 'F_T' },
                      ...(showNet ? [{ key: 'net', label: 'ΣF' }] : []),
                    ].map((item) => (
                      <li key={item.key} className="physics-force-item">
                        <span
                          className="physics-force-swatch"
                          style={{ background: fc(item.key) }}
                          aria-hidden="true"
                        />
                        <span className="physics-force-label">{item.label}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="physics-force-note">Arrow length ∝ |F|</p>
                </div>
                <div className="physics-law-card">
                  <div className="physics-force-card-title">Atwood’s law</div>
                  <p className="physics-law-eq">
                    a = g·Δm/Σm = g·{fmt(Math.abs(solution.deltaM), 2)}/
                    {fmt(solution.sumM, 2)} ={' '}
                    <strong>{fmt(Math.abs(solution.a))} m/s²</strong>
                  </p>
                  <p className="physics-law-eq">
                    ΣF = ma → a = F_net/Σm · F_net = (m₁−m₂)g ={' '}
                    <strong>{fmt(solution.Fnet)} N</strong>
                  </p>
                  <p className="physics-law-eq">
                    T = 2 m₁ m₂ g / Σm = <strong>{fmt(solution.T)} N</strong>
                    <span className="physics-law-dir">
                      {' '}
                      ·{' '}
                      {solution.dir === 'balance'
                        ? 'balanced'
                        : solution.dir === 'm1-down'
                          ? 'm₁ descends'
                          : 'm₂ descends'}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="waves-controls physics-controls">
            <div className="wave-toolbar">
              <button type="button" className="btn-primary" onClick={downloadPng}>
                Save PNG
              </button>
              <button type="button" className="btn-ghost" onClick={resetDefaults}>
                Reset
              </button>
              {mode !== 'atwood' && (
                <label className={`chip-toggle${frictionOn ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={frictionOn}
                    onChange={(e) => setFrictionOn(e.target.checked)}
                  />
                  Friction
                </label>
              )}
              {mode !== 'atwood' && (
                <label className={`chip-toggle${showComponents ? ' is-on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={showComponents}
                    onChange={(e) => setShowComponents(e.target.checked)}
                  />
                  All components
                </label>
              )}
              <label className={`chip-toggle${showNet ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={showNet}
                  onChange={(e) => setShowNet(e.target.checked)}
                />
                Net force
              </label>
              <label className={`chip-toggle${showLabels ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
                Labels
              </label>
              <label className={`chip-toggle${showValues ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={showValues}
                  onChange={(e) => setShowValues(e.target.checked)}
                />
                Values
              </label>
            </div>

            <div className="fn-toggles physics-modes" role="group" aria-label="Problem type">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`chip-toggle${mode === m.id ? ' is-on' : ''}`}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="physics-sliders">
              {mode !== 'atwood' && (
                <label className="pendulum-slider">
                  <span>
                    θ <strong>{Math.round(thetaDeg)}°</strong>
                  </span>
                  <input
                    type="range"
                    min={5}
                    max={60}
                    step={1}
                    value={thetaDeg}
                    onChange={(e) => setThetaDeg(Number(e.target.value))}
                  />
                </label>
              )}
              <GravityControl g={g} onChange={setG} id="physics-g" min={0.1} max={25} />

              <div className="physics-body-params">
                <div className="pendulum-link-label" style={{ color: boxFill1 }}>
                  {mode === 'atwood' ? 'Left mass m₁' : 'Box m₁ (on ramp)'}
                </div>
                <label className="pendulum-slider">
                  <span>
                    m₁ <strong>{fmt(m1, 2)} kg</strong>
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={20}
                    step={0.1}
                    value={m1}
                    onChange={(e) => setM1(Number(e.target.value))}
                  />
                </label>
                {frictionOn && mode !== 'atwood' && (
                  <>
                    <label className="pendulum-slider">
                      <span>
                        μₛ <strong>{fmt(muS1, 2)}</strong>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.01}
                        value={muS1}
                        onChange={(e) => setMuS1(Number(e.target.value))}
                      />
                    </label>
                    <label className="pendulum-slider">
                      <span>
                        μₖ <strong>{fmt(muK1, 2)}</strong>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={1.2}
                        step={0.01}
                        value={muK1}
                        onChange={(e) => setMuK1(Number(e.target.value))}
                      />
                    </label>
                  </>
                )}
                {mode === 'single' && (
                  <label className="pendulum-slider">
                    <span>
                      Fₐ (up ramp) <strong>{fmt(Fapp, 1)} N</strong>
                    </span>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      step={0.5}
                      value={Fapp}
                      onChange={(e) => setFapp(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>

              {mode !== 'single' && (
                <div className="physics-body-params">
                  <div className="pendulum-link-label" style={{ color: boxFill2 }}>
                    {mode === 'hang'
                      ? 'Hanging mass m₂'
                      : 'Right mass m₂'}
                  </div>
                  <label className="pendulum-slider">
                    <span>
                      m₂ <strong>{fmt(m2, 2)} kg</strong>
                    </span>
                    <input
                      type="range"
                      min={0.5}
                      max={20}
                      step={0.1}
                      value={m2}
                      onChange={(e) => setM2(Number(e.target.value))}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="panel physics-side">
          <div className="panel-header">
            <span className="panel-title">Solution</span>
            <span className="panel-hint">Live Newton readout</span>
          </div>
          <div className="pendulum-readout">
            <div className="pendulum-metric">
              <span className="label">State</span>
              <span className="val">{solution.static ? 'static' : 'kinetic'}</span>
            </div>
            <div className="pendulum-metric">
              <span className="label">a</span>
              <span className="val">{fmt(solution.a)} m/s²</span>
            </div>
            {mode === 'single' && (
              <>
                <div className="pendulum-metric">
                  <span className="label">N = m g cosθ</span>
                  <span className="val">{fmt(solution.N)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">mg sinθ</span>
                  <span className="val">{fmt(solution.Wpar)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">f {solution.static ? '(static)' : '(kinetic)'}</span>
                  <span className="val">{fmt(solution.f)} N</span>
                </div>
                {frictionOn && (
                  <div className="pendulum-metric">
                    <span className="label">fₛ,max = μₛ N</span>
                    <span className="val">{fmt(muS1 * solution.N)} N</span>
                  </div>
                )}
                {Math.abs(Fapp) > 1e-9 && (
                  <div className="pendulum-metric">
                    <span className="label">Fₐ</span>
                    <span className="val">{fmt(Fapp)} N</span>
                  </div>
                )}
              </>
            )}
            {mode === 'hang' && (
              <>
                <div className="pendulum-metric">
                  <span className="label">T</span>
                  <span className="val">{fmt(solution.T)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">N₁</span>
                  <span className="val">{fmt(solution.N)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">f on m₁</span>
                  <span className="val">{fmt(solution.f)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">m₁g sinθ</span>
                  <span className="val">{fmt(solution.Wpar)} N</span>
                </div>
              </>
            )}
            {mode === 'atwood' && (
              <>
                <div className="pendulum-metric">
                  <span className="label">Δm = m₁ − m₂</span>
                  <span className="val">{fmt(solution.deltaM, 2)} kg</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">Σm = m₁ + m₂</span>
                  <span className="val">{fmt(solution.sumM, 2)} kg</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">F_net = Δm · g</span>
                  <span className="val">{fmt(solution.Fnet)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">a = g·Δm/Σm</span>
                  <span className="val">{fmt(solution.a)} m/s²</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">T = 2m₁m₂g/Σm</span>
                  <span className="val">{fmt(solution.T)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">F_g₁ = m₁g</span>
                  <span className="val">{fmt(solution.weight1)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">F_g₂ = m₂g</span>
                  <span className="val">{fmt(solution.weight2)} N</span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">m₁g − T ≟ m₁a</span>
                  <span className="val">
                    {fmt(solution.net1)} ≟ {fmt(m1 * solution.a)}
                  </span>
                </div>
                <div className="pendulum-metric">
                  <span className="label">T − m₂g ≟ m₂a</span>
                  <span className="val">
                    {fmt(solution.net2)} ≟ {fmt(m2 * solution.a)}
                  </span>
                </div>
              </>
            )}
          </div>

          {mode === 'atwood' && (
            <div className="pendulum-formulas physics-atwood-lab">
              <h3>Newton system</h3>
              <p className="pendulum-eq">m₁g − T = m₁ a</p>
              <p className="pendulum-eq">T − m₂g = m₂ a</p>
              <p className="pendulum-note">
                Add the pair: (m₁ − m₂)g = (m₁ + m₂)a → Atwood’s law{' '}
                <strong>a = g·Δm/Σm</strong>. Same as ΣF = ma for the whole
                machine: a = F_net / Σm.
              </p>
              <h3>Lab kinematics</h3>
              <p className="pendulum-note">
                From rest over drop h in time t: Δy = ½at² ⇒{' '}
                <strong>a_exp = 2h/t²</strong>. Compare to theory (friction /
                string offset from CoM usually make a_exp slightly smaller).
              </p>
              <label className="pendulum-slider">
                <span>
                  h <strong>{fmt(labH, 2)} m</strong>
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={2}
                  step={0.01}
                  value={labH}
                  onChange={(e) => setLabH(Number(e.target.value))}
                />
              </label>
              <label className="pendulum-slider">
                <span>
                  t <strong>{fmt(labT, 2)} s</strong>
                </span>
                <input
                  type="range"
                  min={0.15}
                  max={5}
                  step={0.01}
                  value={labT}
                  onChange={(e) => setLabT(Number(e.target.value))}
                />
              </label>
              <div className="pendulum-metric" style={{ marginTop: '0.5rem' }}>
                <span className="label">a_exp = 2h/t²</span>
                <span className="val">
                  {aExp != null ? `${fmt(aExp)} m/s²` : '—'}
                </span>
              </div>
              <div className="pendulum-metric">
                <span className="label">|a_theory|</span>
                <span className="val">{fmt(aTheory)} m/s²</span>
              </div>
              <div className="pendulum-metric">
                <span className="label">% error</span>
                <span className="val">
                  {aPctErr != null ? `${fmt(aPctErr, 1)}%` : '—'}
                </span>
              </div>
              <p className="pendulum-note">
                Ideal speed after drop h: v = √(2 a h) ={' '}
                <strong>
                  {aTheory != null && labH > 0
                    ? `${fmt(Math.sqrt(2 * aTheory * labH))} m/s`
                    : '—'}
                </strong>
              </p>
              <p className="pendulum-note">
                Full formula ladder & derivation:{' '}
                <a href="/cheat-sheet#atwood">Cheat sheet · Atwood</a>
              </p>
            </div>
          )}

          <div className="pendulum-formulas">
            <h3>Modes</h3>
            <p className="pendulum-note">
              <strong>Single box</strong> — classic incline a ≈ g sinθ (frictionless)
              with optional Fₐ. Toggle friction for μₛ / μₖ.
            </p>
            <p className="pendulum-note">
              <strong>Ramp + pulley</strong> — modified Atwood: mass on ramp + hanging
              mass. Ideal: a = g(m₂ − m₁ sinθ)/(m₁+m₂) (signs depend on which is
              heavier).
            </p>
            <p className="pendulum-note">
              <strong>Atwood machine</strong> — bidirectional vertical lift (lab: two
              fixed pulleys). a = g·Δm/Σm, T = 2m₁m₂g/Σm. Forces drawn from each
              CoM as F_g and F_T.
            </p>
            <h3>Components</h3>
            <p className="pendulum-note">
              On ramps, <strong>All components</strong> draws <em>mg</em> plus{' '}
              <em>mg sinθ</em> / <em>mg cosθ</em> with a dashed vector triangle.
              On Atwood, each mass shows F_g and F_T from its CoM (toggle Net for
              ΣF = ma).
            </p>
            <h3>Export</h3>
            <p className="pendulum-note">
              <strong>Save PNG</strong> downloads a clean diagram of the current
              setup — ideal for worksheets, slides, and homework keys.
            </p>
          </div>
        </aside>
      </main>
    </>
  )
}
