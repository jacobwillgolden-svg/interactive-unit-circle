import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { formatCoords, formatRadLabel, snapCommonAngle } from '../utils/angles'
import GiantStepsScore from '../components/GiantStepsScore'
import {
  ARP_STEPS_PER_REV,
  arpInfo,
  disposeTrigMusic,
  exportLoopMp3,
  getPianoInstrument,
  setPianoInstrument,
  updateTrigMusic,
} from '../utils/trigMusic'

/**
 * Neon-leaning stroke colors.
 * asin/acos keys = phase flips −sin/−cos (derivative cycle).
 * atan/acot/acsc/asec = true inverse trig (principal values, radians).
 */
const FN_COLORS = {
  sin: '#dc2626',
  cos: '#2563eb',
  tan: '#ff9f1c', // neon orange
  csc: '#39ff14', // neon green
  sec: '#bf5af2', // neon violet
  cot: '#f5e642', // neon yellow
  asin: '#f87171', // soft red — −sin
  acos: '#60a5fa', // soft blue — −cos
  atan: '#fbbf24', // soft amber — tan⁻¹
  acsc: '#86efac', // soft green — csc⁻¹
  asec: '#d8b4fe', // soft violet — sec⁻¹
  acot: '#fde047', // soft yellow — cot⁻¹
}

/** Soft triangle fill matching a stroke color (light theme slightly stronger) */
function softFill(color, light) {
  const a = light ? 0.14 : 0.12
  // HSL from unit-circle / octave pitch colours
  const hsl = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)$/i.exec(color)
  if (hsl) {
    return `hsl(${hsl[1]} ${hsl[2]}% ${hsl[3]}% / ${a})`
  }
  const hex = color.replace('#', '')
  if (!/^[0-9a-f]{3,8}$/i.test(hex)) return color
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex.slice(0, 6)
  const n = parseInt(full, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${a})`
}

const EPS = 1e-6
const ZOOM_MIN = 0.55
const ZOOM_MAX = 5
const ZOOM_FACTOR = 1.12
/** Construction stroke weight (function segments) */
const GEO_STROKE = 1.5
/** Wave-plot stroke weights */
const WAVE_STROKE_MAIN = 1.55
const WAVE_STROKE_OTHER = 1.35

/** θ animation: degrees per second at speed = 1 (see play loop) */
const ANIM_DEG_PER_SEC = 40
/** Musical grid: 4 quarter notes per full θ rotation */
const BEATS_PER_REV = 4
const BPM_MIN = 7
const BPM_MAX = 170
/** speed ↔ BPM: BPM = BEATS_PER_REV * ANIM_DEG_PER_SEC * speed * 60 / 360 */
const SPEED_MIN = (BPM_MIN * 360) / (BEATS_PER_REV * ANIM_DEG_PER_SEC * 60)
const SPEED_MAX = (BPM_MAX * 360) / (BEATS_PER_REV * ANIM_DEG_PER_SEC * 60)

function bpmFromSpeed(speed) {
  return Math.round((BEATS_PER_REV * ANIM_DEG_PER_SEC * speed * 60) / 360)
}

/** Full θ rotations per minute */
function rpmFromSpeed(speed) {
  return Math.round(((ANIM_DEG_PER_SEC * speed) / 360) * 60)
}

/** Translucent tip marker; large invisible hit ring for easier left-drag */
function TipDot({ x, y, color, interactive = true }) {
  return (
    <g style={{ cursor: interactive ? 'grab' : 'default' }} pointerEvents={interactive ? 'auto' : 'none'}>
      {/* Hit target (content units ≈ screen-friendly when not zoomed) */}
      {interactive && (
        <circle cx={x} cy={y} r={14} fill="transparent" stroke="none" />
      )}
      <circle
        cx={x}
        cy={y}
        r={3.25}
        fill={color}
        fillOpacity="0.28"
        stroke={color}
        strokeOpacity="0.55"
        strokeWidth="1.15"
        pointerEvents="none"
      />
    </g>
  )
}

/** Degrees from unit coords (u,v), normalized to [0, 360) */
function degFromUV(u, v, asInt) {
  let deg = (Math.atan2(v, u) * 180) / Math.PI
  if (deg < 0) deg += 360
  if (asInt) deg = Math.round(deg)
  else deg = Math.round(deg * 1000) / 1000
  return ((deg % 360) + 360) % 360
}

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

/**
 * Additive inverse (phase flip): −f(θ).
 * Used only for −sin / −cos on the derivative cycle sin → cos → −sin → −cos → sin.
 * Not inverse trig (arcsin ≠ −sin, arctan ≠ −tan).
 */
function negate(v) {
  if (v == null || !Number.isFinite(v)) return null
  return -v
}

/**
 * True inverse trig: y = f⁻¹(x) with real input x, NOT f⁻¹(f(θ)).
 * Composition f⁻¹(f(θ)) is a sawtooth of straight segments; the real graph of
 * arctan is the smooth S-curve with asymptotes ±π/2 (see calculator reference).
 *
 * Across the wave panel we map θ-progress 0°…360° → x ∈ [−INV_X_MAX, +INV_X_MAX]
 * so one full sweep draws the full inverse curve left→right (0 at panel center).
 */
const INV_X_MAX = 10

/** Map unwrapped θ (degrees, 0…360) → real input for inverse-trig plots. */
function invInputFromTheta(tDeg) {
  const t = Math.max(0, Math.min(360, tDeg))
  return -INV_X_MAX + (t / 360) * (2 * INV_X_MAX)
}

/** y = arctan(x), x real → (−π/2, π/2) */
function trueAtan(x) {
  if (x == null || !Number.isFinite(x)) return null
  return Math.atan(x)
}

/** y = arccot(x) ∈ (0, π) via atan2(1, x) */
function trueAcot(x) {
  if (x == null || !Number.isFinite(x)) return null
  return Math.atan2(1, x)
}

/** y = arccsc(x), |x| ≥ 1 → [−π/2, π/2] \ {0} */
function trueAcsc(x) {
  if (x == null || !Number.isFinite(x) || Math.abs(x) < 1 - EPS) return null
  return Math.asin(1 / x)
}

/** y = arcsec(x), |x| ≥ 1 → [0, π] \ {π/2} */
function trueAsec(x) {
  if (x == null || !Number.isFinite(x) || Math.abs(x) < 1 - EPS) return null
  return Math.acos(1 / x)
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
  const { theme, soundOn } = useOutletContext()
  const [angle, setAngle] = useState(0)
  const [playing, setPlaying] = useState(true)
  /** Wave-tied kit (samples + pad) */
  const [musicOn, setMusicOn] = useState(false)
  /** True while capturing one θ revolution for MP3 export */
  const [savingMp3, setSavingMp3] = useState(false)
  /** Ableton Grand Piano multi vs E-Piano sample bank */
  const [pianoInst, setPianoInst] = useState(() => getPianoInstrument())
  /** Piano shell: sin / cos / −sin / −cos (4-note chords in music mode) */
  const [showSin, setShowSin] = useState(true)
  const [showCos, setShowCos] = useState(true)
  const [showAsin, setShowAsin] = useState(false)
  const [showAcos, setShowAcos] = useState(false)
  /** Hats: tan / cot / tan⁻¹ / cot⁻¹ · kicks/perc: sec / csc / sec⁻¹ / csc⁻¹ */
  const [showTan, setShowTan] = useState(false)
  const [showAtan, setShowAtan] = useState(false)
  const [showCot, setShowCot] = useState(false)
  const [showAcot, setShowAcot] = useState(false)
  const [showCsc, setShowCsc] = useState(false)
  const [showAcsc, setShowAcsc] = useState(false)
  const [showSec, setShowSec] = useState(false)
  const [showAsec, setShowAsec] = useState(false)
  /** Per-step shell MIDI overrides from staff drag (null = use defaults) */
  const [shellVoicings, setShellVoicings] = useState(
    () => /** @type {(import('../utils/trigMusic').ShellVoicing | null)[]} */ (
      Array.from({ length: ARP_STEPS_PER_REV }, () => null)
    )
  )
  /** Key signature in fifths: −7…+7 (editable on score); 0 = C major */
  const [keySigFifths, setKeySigFifths] = useState(0)
  // Defaults match design screenshot: coords on (θ in °), axis labels + radians on
  const [showCoords, setShowCoords] = useState(true)
  const [coordsInRadians, setCoordsInRadians] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [labelsInRadians, setLabelsInRadians] = useState(true)
  /** Color-coded sin/cos/tan/… labels on the construction */
  const [showNames, setShowNames] = useState(false)
  /** Translucent dots at the free end of each function segment */
  const [showEndpoints, setShowEndpoints] = useState(true)
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
  const pointerModeRef = useRef(null) // 'angle' | 'pan' | 'pinch' | null
  const panStartRef = useRef(null)
  /** Active pointers for multi-touch pinch: id → { x, y } client coords */
  const pointersRef = useRef(new Map())
  /** Pinch session: baseline distance, midpoint, view */
  const pinchRef = useRef(null)

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
      setAngle((a) => (a + dt * ANIM_DEG_PER_SEC * speed) % 360)
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

  useEffect(() => () => disposeTrigMusic(), [])

  const isLight = theme === 'light'
  const ink = isLight ? '#0f172a' : '#e8eaf0'
  const muted = isLight ? '#64748b' : '#8b92a5'
  const grid = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'
  const panelFill = isLight ? 'rgba(15,23,42,0.02)' : 'rgba(255,255,255,0.02)'
  const svgBg = isLight ? '#f4f6fa' : '#0b0d12'

  // Layout: circle left (room for exterior tan/sec + axis csc/cot), waves right.
  // Identity-based unit-circle segments (e.g. all six at 45°):
  //   cos: O → (cos, 0) on the x-axis     sin: (cos, 0) → P
  //   tan: vertical on x = ±1, (±1, 0) → (±1, tan·±1)   [similar triangles]
  //   sec: O → tan tip  (through P; length |sec| = √(1+tan²))
  //   csc: O → (0, csc) on the y-axis
  //   cot: P → (0, csc)  (length |cot| = |cos|/|sin|)
  // Tall canvas so exterior tips stay on-screen; top pad keeps titles clear of tips
  const R = 90
  const MAX_GEO = 4.2 // |tan|/|sec|/… draw extent in unit lengths
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

  // Music: 4-note piano (sin/cos/asin/acos) + Cymatics drum rack
  useEffect(() => {
    const r = (angle * Math.PI) / 180
    const s = Math.sin(r)
    const c = Math.cos(r)
    const t = safeTan(s, c)
    const cscV = safeCsc(s)
    const secV = safeSec(c)
    const cotV = safeCot(s, c)
    updateTrigMusic(musicOn && soundOn, {
      angleDeg: angle,
      instrument: pianoInst,
      // Piano
      sin: { show: showSin, value: s },
      cos: { show: showCos, value: c },
      asin: { show: showAsin, value: negate(s) },
      acos: { show: showAcos, value: negate(c) },
      // Closed hats — roll rate from |tan|/|cot| (sign does not matter for rate)
      tan: { show: showTan, value: t },
      cot: { show: showCot, value: cotV },
      atan: { show: showAtan, value: t },
      acot: { show: showAcot, value: cotV },
      // Kick / perc — valley strikes on |sec|/|csc|
      sec: { show: showSec, value: secV },
      asec: { show: showAsec, value: secV },
      csc: { show: showCsc, value: cscV },
      acsc: { show: showAcsc, value: cscV },
      shellVoicings,
    })
  }, [
    musicOn,
    soundOn,
    angle,
    showSin,
    showCos,
    showAsin,
    showAcos,
    showTan,
    showCot,
    showAtan,
    showAcot,
    showSec,
    showAsec,
    showCsc,
    showAcsc,
    shellVoicings,
    pianoInst,
  ])

  const onShellVoicingChange = useCallback((step, voicing) => {
    setShellVoicings((prev) => {
      const next = prev.slice()
      while (next.length < ARP_STEPS_PER_REV) next.push(null)
      // null clears a slot (used when applying a shorter progression)
      next[step] = voicing
      return next
    })
  }, [])

  // Colours/symbols follow analysed composition + key spelling
  const sinArp = useMemo(
    () => arpInfo(angle, 'sin', shellVoicings, keySigFifths),
    [angle, shellVoicings, keySigFifths]
  )
  const cosArp = useMemo(
    () => arpInfo(angle, 'cos', shellVoicings, keySigFifths),
    [angle, shellVoicings, keySigFifths]
  )
  const asinArp = useMemo(
    () => arpInfo(angle, 'asin', shellVoicings, keySigFifths),
    [angle, shellVoicings, keySigFifths]
  )
  const acosArp = useMemo(
    () => arpInfo(angle, 'acos', shellVoicings, keySigFifths),
    [angle, shellVoicings, keySigFifths]
  )
  const sinColor = musicOn && showSin ? sinArp.color : FN_COLORS.sin
  const cosColor = musicOn && showCos ? cosArp.color : FN_COLORS.cos
  const asinColor = musicOn && showAsin ? asinArp.color : FN_COLORS.asin
  const acosColor = musicOn && showAcos ? acosArp.color : FN_COLORS.acos
  const tanColor = FN_COLORS.tan
  const chordTag =
    musicOn && (showSin || showCos || showAsin || showAcos)
      ? sinArp.chordSymbol
      : null

  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const tan = safeTan(sin, cos)
  const csc = safeCsc(sin)
  const sec = safeSec(cos)
  const cot = safeCot(sin, cos)
  // −sin / −cos: phase flips (derivative cycle).
  // tan⁻¹…: true inverse trig y=f⁻¹(x) with x mapped across the panel (not f⁻¹(f(θ))).
  const invX = invInputFromTheta(angle)
  const asin = negate(sin)
  const acos = negate(cos)
  const atan = trueAtan(invX)
  const acsc = trueAcsc(invX)
  const asec = trueAsec(invX)
  const acot = trueAcot(invX)
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

  // Identity-based tips (match standard “all six” unit-circle diagram).
  // sC puts the vertical tangent on the side of cos.
  const sC = Math.sign(cos) || 1
  // tan: vertical (±1,0)→(±1, tan·±1); sec: O → that exterior corner
  const tanBase = tan != null ? clipPt(sC, 0) : null
  const tanTip = tan != null ? clipPt(sC, tan * sC) : null
  const secTip = tanTip
  // csc: O → (0, csc) on the y-axis; cot: P → that intercept (length |cot|)
  const cscTip = csc != null ? clipPt(0, csc) : null
  const cotTip = cscTip

  const showTanGeo = showTan && tanBase != null && tanTip != null && Math.abs(tan) > 1e-8
  const showSecGeo = showSec && secTip != null && sec != null && Math.abs(sec) > 1e-8
  const showCotGeo = showCot && cotTip != null && cot != null && Math.abs(cot) > 1e-8
  const showCscGeo = showCsc && cscTip != null && csc != null && Math.abs(csc) > 1e-8

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
  // Prefer exact π forms at common angles in radians mode; otherwise int/float precision.
  // Never round radians to a whole number (that produced “θ = 2” at 135°).
  const angleLabel = coordsInRadians
    ? nearCommon !== null
      ? `θ = ${radLabel}`
      : `θ = ${formatAngleNumber(rad, false)}`
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

  /**
   * Map pointer → θ.
   * mode:
   *  - 'point' / 'ring': direction of ray from origin (P on the unit circle)
   *  - 'cos': foot on x-axis → cos from x, sin sign from y / previous
   *  - 'sec': sec intercept on x-axis → cos = 1/u
   *  - 'csc': csc intercept on y-axis → sin = 1/v
   */
  const getAngleFromEvent = useCallback(
    (clientX, clientY, mode = 'point') => {
      const svgPt = clientToSvg(clientX, clientY)
      if (!svgPt) return angle
      const { x, y } = svgToContent(svgPt.sx, svgPt.sy)
      const u = (x - cx) / R
      const v = (cy - y) / R

      if (mode === 'point' || mode === 'ring') {
        return degFromUV(u, v, angleAsInt)
      }

      if (mode === 'cos') {
        // Cos free end sits on the x-axis at (cos, 0)
        const c = Math.max(-1, Math.min(1, u))
        const sSign = Math.abs(v) > 1e-6 ? Math.sign(v) : Math.sign(sin) || 1
        const s = sSign * Math.sqrt(Math.max(0, 1 - c * c))
        return degFromUV(c, s, angleAsInt)
      }

      if (mode === 'sec') {
        // Exterior tan/sec tip lies on ray OP
        return degFromUV(u, v, angleAsInt)
      }

      if (mode === 'csc') {
        // csc tip at (0, 1/sin) on the y-axis
        let s
        if (Math.abs(v) < 1 + 1e-9) {
          s = Math.sign(v || sin || 1) * 0.999999
        } else {
          s = 1 / v
        }
        s = Math.max(-1, Math.min(1, s))
        const cSign = Math.abs(u) > 1e-6 ? Math.sign(u) : Math.sign(cos) || 1
        const c = cSign * Math.sqrt(Math.max(0, 1 - s * s))
        return degFromUV(c, s, angleAsInt)
      }

      return degFromUV(u, v, angleAsInt)
    },
    [angle, angleAsInt, clientToSvg, svgToContent, cx, cy, cos, sin]
  )

  const canDrag = !playing || dragging
  const viewIsDefault = view.k === 1 && view.tx === 0 && view.ty === 0
  const dragModeRef = useRef('point')

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

  const clientMidToSvg = useCallback(
    (x0, y0, x1, y1) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return null
      const mx = (x0 + x1) / 2
      const my = (y0 + y1) / 2
      return {
        sx: ((mx - rect.left) * W) / rect.width,
        sy: ((my - rect.top) * H) / rect.height,
        scaleX: W / rect.width,
        scaleY: H / rect.height,
      }
    },
    [W, H]
  )

  const beginPinch = useCallback(() => {
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return
    const [a, b] = pts
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    if (!(dist > 8)) return
    const mid = clientMidToSvg(a.x, a.y, b.x, b.y)
    if (!mid) return
    const v = viewRef.current
    pinchRef.current = {
      dist0: dist,
      k0: v.k,
      tx0: v.tx,
      ty0: v.ty,
      midSx: mid.sx,
      midSy: mid.sy,
      // content under midpoint at pinch start (stays fixed while pinching)
      contentX: (mid.sx - v.tx) / v.k,
      contentY: (mid.sy - v.ty) / v.k,
    }
    pointerModeRef.current = 'pinch'
    setDragging(false)
    panStartRef.current = null
  }, [clientMidToSvg])

  const updatePinch = useCallback(() => {
    const pinch = pinchRef.current
    if (!pinch) return
    const pts = [...pointersRef.current.values()]
    if (pts.length < 2) return
    const [a, b] = pts
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    if (!(dist > 4) || !(pinch.dist0 > 4)) return

    const mid = clientMidToSvg(a.x, a.y, b.x, b.y)
    if (!mid) return

    let k2 = pinch.k0 * (dist / pinch.dist0)
    k2 = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k2))

    // Keep the content point under the moving midpoint (zoom + two-finger pan)
    const tx = mid.sx - k2 * pinch.contentX
    const ty = mid.sy - k2 * pinch.contentY
    setView({ k: k2, tx, ty })
  }, [clientMidToSvg])

  const handlePointerDown = (e) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    // Two or more contacts → pinch-to-zoom (touch screens / trackpads that send pointers)
    if (pointersRef.current.size >= 2) {
      e.preventDefault()
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* */
      }
      // Release any prior single-finger capture
      beginPinch()
      return
    }

    const startPan = () => {
      e.preventDefault()
      pointerModeRef.current = 'pan'
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: viewRef.current.tx,
        ty: viewRef.current.ty,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    // Mouse: right-click, middle-click, or Alt+left → pan
    if (e.pointerType !== 'touch') {
      if (e.button === 2 || e.button === 1 || (e.button === 0 && e.altKey)) {
        startPan()
        return
      }
    }

    // Build tip hit list (shared by mouse left-drag + touch tip-drag)
    const hitTestTipMode = () => {
      if (playing) return null
      const svgPt = clientToSvg(e.clientX, e.clientY)
      if (!svgPt) return null
      const { x, y } = svgToContent(svgPt.sx, svgPt.sy)
      const k = viewRef.current.k || 1
      const hitR = 16 / k

      /** @type {{ mode: string, x: number, y: number }[]} */
      const tips = []
      if (showEndpoints) {
        tips.push({ mode: 'point', x: px, y: py })
        if (showSin) tips.push({ mode: 'point', x: px, y: py })
        // Cos free end on the x-axis at (cos, 0)
        if (showCos) tips.push({ mode: 'cos', x: footX, y: footY })
        // Exterior tan/sec corner (on ray OP); csc/cot share the y-intercept (0, csc)
        if (showTanGeo && tanTip) tips.push({ mode: 'sec', x: tanTip.x, y: tanTip.y })
        if (showSecGeo && secTip) tips.push({ mode: 'sec', x: secTip.x, y: secTip.y })
        if (showCotGeo && cotTip) tips.push({ mode: 'csc', x: cotTip.x, y: cotTip.y })
        if (showCscGeo && cscTip) tips.push({ mode: 'csc', x: cscTip.x, y: cscTip.y })
      }

      let mode = null
      let bestD = hitR
      for (const t of tips) {
        const d = Math.hypot(x - t.x, y - t.y)
        if (d <= bestD) {
          bestD = d
          mode = t.mode
        }
      }
      return mode
    }

    // Touch (one finger): pan anywhere, except grab tips/handle for θ when Endpoints is on
    if (e.pointerType === 'touch') {
      const tipMode = hitTestTipMode()
      if (tipMode != null) {
        dragModeRef.current = tipMode
        pointerModeRef.current = 'angle'
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        setAngle(getAngleFromEvent(e.clientX, e.clientY, tipMode))
        return
      }
      startPan()
      return
    }

    // Mouse left-click: set θ when paused — endpoints first, then unit-circle ring
    if (e.button !== 0) return
    if (playing) return
    const svgPt = clientToSvg(e.clientX, e.clientY)
    if (!svgPt) return
    const { x, y } = svgToContent(svgPt.sx, svgPt.sy)
    const k = viewRef.current.k || 1

    let mode = hitTestTipMode()
    if (mode == null) {
      const dist = Math.hypot(x - cx, y - cy)
      const ringPad = 40 / k
      if (dist > R + ringPad || dist < Math.max(0, R - ringPad * 1.2)) return
      mode = 'ring'
    }

    dragModeRef.current = mode
    pointerModeRef.current = 'angle'
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    setAngle(getAngleFromEvent(e.clientX, e.clientY, mode))
  }

  const handlePointerMove = (e) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }

    if (pointersRef.current.size >= 2) {
      e.preventDefault()
      if (pointerModeRef.current !== 'pinch') beginPinch()
      updatePinch()
      return
    }

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
      setAngle(getAngleFromEvent(e.clientX, e.clientY, dragModeRef.current))
    }
  }

  const handlePointerUp = (e) => {
    pointersRef.current.delete(e.pointerId)

    if (pointersRef.current.size >= 2) {
      // Still pinching with remaining fingers — re-baseline
      beginPinch()
      return
    }

    if (pointersRef.current.size === 1 && pointerModeRef.current === 'pinch') {
      // One finger left after pinch — stop pinch; don't auto-start angle drag
      pinchRef.current = null
      pointerModeRef.current = null
      setDragging(false)
      panStartRef.current = null
      return
    }

    if (pointerModeRef.current === 'angle') {
      setDragging(false)
    }
    pointerModeRef.current = null
    panStartRef.current = null
    pinchRef.current = null
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

  /**
   * Record one full θ revolution of the live music mix and download as .mp3.
   * Uses current speed, instrument, progression, and function toggles.
   */
  const downloadMp3 = useCallback(async () => {
    if (!musicOn || savingMp3) return
    if (!soundOn) {
      try {
        window.alert(
          'Site sound is muted (nav ♪). Turn it on to record your loop as MP3.'
        )
      } catch {
        /* */
      }
      return
    }

    setSavingMp3(true)
    const wasPlaying = playing
    // Ensure θ advances so hats/kicks and chord steps fire during capture
    if (!playing) setPlaying(true)

    // One full revolution: θ moves ANIM_DEG_PER_SEC * speed degrees per second
    const durationSec = 360 / (ANIM_DEG_PER_SEC * Math.max(0.05, speed))

    try {
      // Brief beat so the graph/music effect is definitely driving the bus
      await new Promise((r) => setTimeout(r, 80))
      const blob = await exportLoopMp3(durationSec)
      if (!blob || blob.size < 64) {
        throw new Error('Recorded audio was empty — try with Music on and Play')
      }

      const bpm = bpmFromSpeed(speed)
      const instTag = pianoInst === 'electric' ? 'uber-tines' : 'grand'
      const fnKeys = [
        ['sin', showSin],
        ['cos', showCos],
        ['asin', showAsin],
        ['acos', showAcos],
        ['tan', showTan],
        ['cot', showCot],
        ['sec', showSec],
        ['csc', showCsc],
      ]
        .filter(([, on]) => on)
        .map(([name]) => name)
      const base =
        fnKeys.length > 0
          ? `trig_loop_${instTag}_${bpm}bpm_${fnKeys.join('-')}`
          : `trig_loop_${instTag}_${bpm}bpm`

      const a = document.createElement('a')
      const out = URL.createObjectURL(blob)
      a.href = out
      a.download = `${base}.mp3`
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(out), 4000)
    } catch (err) {
      console.error('MP3 export failed', err)
      try {
        window.alert(
          'Could not export MP3. Keep Music on, ensure Play is running, and try again.\n\n' +
            (err && err.message ? err.message : String(err))
        )
      } catch {
        /* */
      }
    } finally {
      setSavingMp3(false)
      if (!wasPlaying) setPlaying(false)
    }
  }, [
    musicOn,
    savingMp3,
    soundOn,
    playing,
    speed,
    pianoInst,
    showSin,
    showCos,
    showAsin,
    showAcos,
    showTan,
    showCot,
    showSec,
    showCsc,
  ])

  const downloadPng = useCallback(async () => {
    const svg = svgRef.current
    if (!svg) return
    try {
      const clone = svg.cloneNode(true)
      // Standalone SVG for rasterization (blob URLs often fail without full namespace + size)
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
      // data: URL is more reliable than blob: for SVG→canvas in Chromium
      const dataUrl =
        'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
      const scale = 2
      const img = new Image()
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('PNG export timed out loading SVG')), 8000)
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

      const fnKeys = [
        ['sin', showSin],
        ['cos', showCos],
        ['tan', showTan],
        ['csc', showCsc],
        ['sec', showSec],
        ['cot', showCot],
        ['asin', showAsin],
        ['acos', showAcos],
        ['atan', showAtan],
        ['acsc', showAcsc],
        ['asec', showAsec],
        ['acot', showAcot],
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
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(out), 2000)
    } catch (err) {
      console.error('PNG export failed', err)
      // Surface a non-fatal notice; never rethrow (rethrows crash the UI if the click handler is async)
      try {
        window.alert(
          'Could not export PNG. Try Reset view, then Save PNG again.\n\n' +
            (err && err.message ? err.message : String(err))
        )
      } catch {
        /* */
      }
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
    showAsin,
    showAcos,
    showAtan,
    showAcsc,
    showAsec,
    showAcot,
    angle,
    angleAsInt,
  ])

  const viewTransform = `matrix(${view.k} 0 0 ${view.k} ${view.tx} ${view.ty})`

  // Wave history: θ from 0 → current (forward + phase flips).
  // Inverse trig use the same x-position but y = f⁻¹(real input), not f⁻¹(f(θ)).
  const history = useMemo(() => {
    const pts = []
    const steps = 720 // denser sampling for vertical asymptotes
    const end = Math.min(angle, 360)
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * end
      const tr = (t * Math.PI) / 180
      const s = Math.sin(tr)
      const c = Math.cos(tr)
      const tVal = safeTan(s, c)
      const cscV = safeCsc(s)
      const secV = safeSec(c)
      const cotV = safeCot(s, c)
      const xInv = invInputFromTheta(t)
      pts.push({
        t,
        x: waveX0 + (t / 360) * waveW,
        sin: s,
        cos: c,
        tan: tVal,
        csc: cscV,
        sec: secV,
        cot: cotV,
        asin: negate(s),
        acos: negate(c),
        atan: trueAtan(xInv),
        acsc: trueAcsc(xInv),
        asec: trueAsec(xInv),
        acot: trueAcot(xInv),
      })
    }
    return pts
  }, [angle, waveW, waveX0])

  const makePath = (key) =>
    buildClippedPath(history, (p) => p[key], cy, amp, yClip)
  const sinPath = useMemo(() => makePath('sin'), [history, cy, amp, yClip])
  const cosPath = useMemo(() => makePath('cos'), [history, cy, amp, yClip])
  const tanPath = useMemo(() => makePath('tan'), [history, cy, amp, yClip])
  const cscPath = useMemo(() => makePath('csc'), [history, cy, amp, yClip])
  const secPath = useMemo(() => makePath('sec'), [history, cy, amp, yClip])
  const cotPath = useMemo(() => makePath('cot'), [history, cy, amp, yClip])
  const asinPath = useMemo(() => makePath('asin'), [history, cy, amp, yClip])
  const acosPath = useMemo(() => makePath('acos'), [history, cy, amp, yClip])
  const atanPath = useMemo(() => makePath('atan'), [history, cy, amp, yClip])
  const acscPath = useMemo(() => makePath('acsc'), [history, cy, amp, yClip])
  const asecPath = useMemo(() => makePath('asec'), [history, cy, amp, yClip])
  const acotPath = useMemo(() => makePath('acot'), [history, cy, amp, yClip])

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
    {
      key: 'sin',
      label:
        musicOn && showSin
          ? `sin · root ${sinArp.name}${chordTag ? ` · ${chordTag}` : ''}`
          : 'sin x',
      short: 'sin θ',
      show: showSin,
      setShow: setShowSin,
      value: sin,
      path: sinPath,
      scanY: scanY(sin),
      color: sinColor,
    },
    {
      key: 'cos',
      label: musicOn && showCos ? `cos · 3rd ${cosArp.name}` : 'cos x',
      short: 'cos θ',
      show: showCos,
      setShow: setShowCos,
      value: cos,
      path: cosPath,
      scanY: scanY(cos),
      color: cosColor,
    },
    {
      key: 'asin',
      label: musicOn && showAsin ? `−sin · 5th ${asinArp.name}` : '−sin x',
      short: '−sin',
      show: showAsin,
      setShow: setShowAsin,
      value: asin,
      path: asinPath,
      scanY: scanY(asin),
      color: asinColor,
    },
    {
      key: 'acos',
      label: musicOn && showAcos ? `−cos · 7th ${acosArp.name}` : '−cos x',
      short: '−cos',
      show: showAcos,
      setShow: setShowAcos,
      value: acos,
      path: acosPath,
      scanY: scanY(acos),
      color: acosColor,
    },
    {
      key: 'tan',
      label: musicOn && showTan ? 'tan · closed hat' : 'tan x',
      short: 'tan θ',
      show: showTan,
      setShow: setShowTan,
      value: tan,
      path: tanPath,
      scanY: scanY(tan),
      color: tanColor,
    },
    {
      key: 'cot',
      label: musicOn && showCot ? 'cot · closed hat' : 'cot x',
      short: 'cot θ',
      show: showCot,
      setShow: setShowCot,
      value: cot,
      path: cotPath,
      scanY: scanY(cot),
      color: FN_COLORS.cot,
    },
    {
      key: 'atan',
      label: musicOn && showAtan ? 'tan⁻¹ · closed hat' : 'tan⁻¹ x',
      short: 'tan⁻¹',
      show: showAtan,
      setShow: setShowAtan,
      value: atan,
      path: atanPath,
      scanY: scanY(atan),
      color: FN_COLORS.atan,
    },
    {
      key: 'acot',
      label: musicOn && showAcot ? 'cot⁻¹ · closed hat' : 'cot⁻¹ x',
      short: 'cot⁻¹',
      show: showAcot,
      setShow: setShowAcot,
      value: acot,
      path: acotPath,
      scanY: scanY(acot),
      color: FN_COLORS.acot,
    },
    {
      key: 'csc',
      label: musicOn && showCsc ? 'csc · perc' : 'csc x',
      short: 'csc θ',
      show: showCsc,
      setShow: setShowCsc,
      value: csc,
      path: cscPath,
      scanY: scanY(csc),
      color: FN_COLORS.csc,
    },
    {
      key: 'sec',
      label: musicOn && showSec ? 'sec · kick' : 'sec x',
      short: 'sec θ',
      show: showSec,
      setShow: setShowSec,
      value: sec,
      path: secPath,
      scanY: scanY(sec),
      color: FN_COLORS.sec,
    },
    {
      key: 'acsc',
      label: musicOn && showAcsc ? 'csc⁻¹ · perc' : 'csc⁻¹ x',
      short: 'csc⁻¹',
      show: showAcsc,
      setShow: setShowAcsc,
      value: acsc,
      path: acscPath,
      scanY: scanY(acsc),
      color: FN_COLORS.acsc,
    },
    {
      key: 'asec',
      label: musicOn && showAsec ? 'sec⁻¹ · kick' : 'sec⁻¹ x',
      short: 'sec⁻¹',
      show: showAsec,
      setShow: setShowAsec,
      value: asec,
      path: asecPath,
      scanY: scanY(asec),
      color: FN_COLORS.asec,
    },
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
                ? 'Space = pause · scroll/pinch = zoom · one-finger or right-drag = pan'
                : 'Space = play · drag tips for θ · one-finger / right-drag = pan · pinch = zoom'}
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
                Identity-based segments (reference: all six at 45°):
                  cos: O → (cos, 0)     sin: (cos, 0) → P
                  tan: vertical on x = ±1   sec: O → tan tip (through P)
                  csc: O → (0, csc)        cot: P → (0, csc)
                tan/1 = sin/cos by similar triangles; |cot| = dist(P, (0,csc)).
              */}

              {/* ── Soft fills (under strokes) ── */}
              {(showCos || showSin) && (
                <polygon
                  points={`${cx},${cy} ${footX},${footY} ${px},${py}`}
                  fill={softFill(showSin ? sinColor : cosColor, isLight)}
                  stroke="none"
                />
              )}
              {/* Exterior right triangle O–(±1,0)–tan tip (shared by tan & sec) */}
              {(showTanGeo || showSecGeo) && tanBase && tanTip && (
                <polygon
                  points={`${cx},${cy} ${tanBase.x},${tanBase.y} ${tanTip.x},${tanTip.y}`}
                  fill={softFill(showTanGeo ? tanColor : FN_COLORS.sec, isLight)}
                  stroke="none"
                />
              )}
              {/* Triangle O–P–(0,csc) for cot/csc */}
              {(showCotGeo || showCscGeo) && cscTip && (
                <polygon
                  points={`${cx},${cy} ${px},${py} ${cscTip.x},${cscTip.y}`}
                  fill={softFill(showCotGeo ? FN_COLORS.cot : FN_COLORS.csc, isLight)}
                  stroke="none"
                />
              )}

              {/* Guide: vertical tangent line x = ±1 when tan/sec are on */}
              {(showTanGeo || showSecGeo) && tanBase && (
                <line
                  x1={tanBase.x}
                  y1={cy - MAX_GEO * R}
                  x2={tanBase.x}
                  y2={cy + MAX_GEO * R}
                  stroke={ink}
                  strokeOpacity="0.12"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                />
              )}

              {/* sec — O → exterior tan tip (through P; length |sec|) */}
              {showSecGeo && secTip && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={secTip.x}
                    y2={secTip.y}
                    stroke={FN_COLORS.sec}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={secTip.x} y={secTip.y} color={FN_COLORS.sec} />
                  )}
                  {showNames && (
                    <text
                      x={(cx + secTip.x) / 2 + (sC > 0 ? 10 : -10)}
                      y={(cy + secTip.y) / 2}
                      fontSize="12"
                      fill={FN_COLORS.sec}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor={sC > 0 ? 'start' : 'end'}
                    >
                      sec
                    </text>
                  )}
                </g>
              )}

              {/* csc — O → (0, csc) on the y-axis */}
              {showCscGeo && cscTip && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cscTip.x}
                    y2={cscTip.y}
                    stroke={FN_COLORS.csc}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={cscTip.x} y={cscTip.y} color={FN_COLORS.csc} />
                  )}
                  {showNames && (
                    <text
                      x={cx - 12}
                      y={(cy + cscTip.y) / 2}
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

              {/* cot — P → (0, csc); length = |cot θ| */}
              {showCotGeo && cotTip && (
                <g>
                  <line
                    x1={px}
                    y1={py}
                    x2={cotTip.x}
                    y2={cotTip.y}
                    stroke={FN_COLORS.cot}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={cotTip.x} y={cotTip.y} color={FN_COLORS.cot} />
                  )}
                  {showNames && (
                    <text
                      x={(px + cotTip.x) / 2 + 10}
                      y={(py + cotTip.y) / 2 - 4}
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

              {/* tan — vertical on x = ±1: (±1, 0) → (±1, tan·±1)
                  Height equals tan θ by similar triangles (tan/1 = sin/cos). */}
              {showTanGeo && tanBase && tanTip && (
                <g>
                  <line
                    x1={tanBase.x}
                    y1={tanBase.y}
                    x2={tanTip.x}
                    y2={tanTip.y}
                    stroke={tanColor}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={tanTip.x} y={tanTip.y} color={tanColor} />
                  )}
                  {showNames && (
                    <text
                      x={tanTip.x + (sC > 0 ? 10 : -10)}
                      y={(tanBase.y + tanTip.y) / 2}
                      fontSize="12"
                      fill={tanColor}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor={sC > 0 ? 'start' : 'end'}
                    >
                      tan
                    </text>
                  )}
                </g>
              )}

              {/* cos — O → (cos, 0) on the x-axis */}
              {showCos && (
                <g>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={footX}
                    y2={footY}
                    stroke={cosColor}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={footX} y={footY} color={cosColor} />
                  )}
                  {showNames && (
                    <text
                      x={(cx + footX) / 2}
                      y={cy + (sin >= 0 ? 16 : -10)}
                      fontSize="12"
                      fill={cosColor}
                      fontFamily="JetBrains Mono, monospace"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      cos
                    </text>
                  )}
                  {cosScanY != null && (
                    <line
                      x1={footX}
                      y1={footY}
                      x2={scanX}
                      y2={cosScanY}
                      stroke={cosColor}
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
                    stroke={sinColor}
                    strokeWidth={GEO_STROKE}
                    strokeLinecap="round"
                  />
                  {showEndpoints && (
                    <TipDot x={px} y={py} color={sinColor} />
                  )}
                  {showNames && (
                    <text
                      x={px + (cos >= 0 ? 8 : -8)}
                      y={(footY + py) / 2}
                      fontSize="12"
                      fill={sinColor}
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
                      stroke={sinColor}
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
                strokeWidth="1.3"
                strokeLinecap="round"
              />

              {/* Dashed links construction tips → wave markers */}
              {showTanGeo && tanTip && tanScanY != null && (
                <line
                  x1={tanTip.x}
                  y1={tanTip.y}
                  x2={scanX}
                  y2={tanScanY}
                  stroke={tanColor}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showSecGeo && secTip && secScanY != null && (
                <line
                  x1={secTip.x}
                  y1={secTip.y}
                  x2={scanX}
                  y2={secScanY}
                  stroke={FN_COLORS.sec}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showCotGeo && cotTip && cotScanY != null && (
                <line
                  x1={cotTip.x}
                  y1={cotTip.y}
                  x2={scanX}
                  y2={cotScanY}
                  stroke={FN_COLORS.cot}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}
              {showCscGeo && cscTip && cscScanY != null && (
                <line
                  x1={cscTip.x}
                  y1={cscTip.y}
                  x2={scanX}
                  y2={cscScanY}
                  stroke={FN_COLORS.csc}
                  strokeOpacity="0.2"
                  strokeDasharray="4 4"
                />
              )}

              {/* Drag handle at P — same Endpoints toggle as tip dots */}
              {showEndpoints && (
                <g style={{ cursor: playing ? 'default' : dragging ? 'grabbing' : 'grab' }}>
                  <circle cx={px} cy={py} r={14} fill="transparent" stroke="none" />
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
                    pointerEvents="none"
                  />
                </g>
              )}

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
                    strokeWidth={
                      f.key === 'sin' ||
                      f.key === 'cos' ||
                      f.key === 'asin' ||
                      f.key === 'acos'
                        ? WAVE_STROKE_MAIN
                        : WAVE_STROKE_OTHER
                    }
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
                <button
                  type="button"
                  className={`btn-ghost${musicOn ? ' is-active' : ''}`}
                  onClick={() => {
                    setMusicOn((m) => {
                      if (!m) {
                        // Music mode: 4-note piano shell (sin/cos family)
                        setShowSin(true)
                        setShowCos(true)
                        setShowAsin(true)
                        setShowAcos(true)
                      }
                      return !m
                    })
                  }}
                  title={
                    !soundOn
                      ? 'Site sound is muted (nav ♪) — turn it on to hear waves'
                      : musicOn
                        ? 'Mute wave music'
                        : 'Music: 4-note piano (sin/cos/−sin/−cos) · hats (tan/cot) · kick/perc (sec/csc)'
                  }
                  aria-pressed={musicOn}
                >
                  {musicOn ? 'Music on' : 'Music'}
                </button>
                {musicOn && (
                  <button
                    type="button"
                    className={`btn-ghost${pianoInst === 'electric' ? ' is-active' : ''}`}
                    onClick={() => {
                      const next = pianoInst === 'grand' ? 'electric' : 'grand'
                      // One shot only: stop tails + swap bank; music loop re-fires chord once
                      setPianoInstrument(next)
                      setPianoInst(next)
                    }}
                    title={
                      pianoInst === 'grand'
                        ? 'Now: Ableton Grand Piano (warm mf multi) — click for Uber Tines EP'
                        : 'Now: MPC Uber Tines soft (vel 068) — click for Grand Piano'
                    }
                    aria-pressed={pianoInst === 'electric'}
                  >
                    {pianoInst === 'grand' ? 'Grand Piano' : 'Uber Tines'}
                  </button>
                )}
                {musicOn && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={downloadMp3}
                    disabled={savingMp3}
                    title={
                      !soundOn
                        ? 'Site sound is muted (nav ♪) — turn it on to record'
                        : savingMp3
                          ? 'Recording one full θ revolution…'
                          : 'Download one loop (full θ revolution) as MP3'
                    }
                  >
                    {savingMp3 ? 'Recording…' : 'Save MP3'}
                  </button>
                )}
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
                    title="Scroll or pinch to zoom · right-drag / Alt-drag / two-finger drag to pan"
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
              </div>

              <div className="wave-sliders">
                <div className="wave-slider-row">
                  <label className="inline-slider inline-slider--row">
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
                    className={`chip-toggle chip-toggle--slider-end${angleAsInt ? ' is-on' : ''}`}
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
                <div className="wave-slider-row">
                  <label className="inline-slider inline-slider--row">
                    <span>Speed</span>
                    <input
                      type="range"
                      min={SPEED_MIN}
                      max={SPEED_MAX}
                      step="0.01"
                      value={speed}
                      onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    />
                  </label>
                  <div
                    className="tempo-readout"
                    title={
                      musicOn
                        ? `Quarter-note BPM (${BPM_MIN}–${BPM_MAX}): 4 beats per full θ rotation. Scales with Speed.`
                        : 'Revolutions per minute of θ. Turn Music on to show BPM instead.'
                    }
                    aria-live="polite"
                  >
                    <span className="tempo-value">
                      {musicOn ? bpmFromSpeed(speed) : rpmFromSpeed(speed)}
                    </span>
                    <span className="tempo-unit">{musicOn ? 'BPM' : 'RPM'}</span>
                  </div>
                </div>
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
                <label
                  className={`chip-toggle${showEndpoints ? ' is-on' : ''}`}
                  title="Show or hide tip dots and the drag handle at P (tips are left-draggable when paused)"
                >
                  <input
                    type="checkbox"
                    checked={showEndpoints}
                    onChange={(e) => setShowEndpoints(e.target.checked)}
                  />
                  Endpoints
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
                Each forward function is a length on the unit circle and a wave against θ.{' '}
                <strong>−sin</strong> and <strong>−cos</strong> are phase flips (additive inverses)
                that complete the derivative cycle{' '}
                <em>sin → cos → −sin → −cos → sin</em> — still full sinusoids.{' '}
                <strong>tan⁻¹, cot⁻¹, sec⁻¹, csc⁻¹</strong> are the true inverse functions{' '}
                y = f⁻¹(x) (principal branch, radians): as the graph sweeps left→right, x runs about
                −{INV_X_MAX}…+{INV_X_MAX}, so tan⁻¹ is the smooth S-curve with asymptotes ±π/2 — not
                the sawtooth tan⁻¹(tan θ). Toggle any combination — unbounded curves break at their
                asymptotes.
                {musicOn && (
                  <>
                    {' '}
                    <strong>Music</strong> defaults to a Giant Steps excerpt (up to 8 chords /
                    θ turn; apply any 1–8 chord progression). Toggle <em>Grand Piano</em> vs{' '}
                    <em>Uber Tines</em>. Four-note shells: <em>sin</em>=root, <em>cos</em>=3rd,{' '}
                    <em>−sin</em>=5th, <em>−cos</em>=7th. Closed hats: tan / cot / tan⁻¹ / cot⁻¹.
                    Kick: sec / sec⁻¹. Perc: csc / csc⁻¹. Type chord names or drag notes; colours
                    follow the circle of fifths (or one colour for pure I–IV–V). Key signature is
                    manual; time stays 4/4. <em>Save MP3</em> records one full θ revolution of the
                    live mix.
                  </>
                )}
                {!playing &&
                  ' Left-drag an endpoint or the unit circle ring to set θ (Endpoints toggle shows tips + P handle).'}
                {' '}Scroll or pinch to zoom; one-finger drag (touch) or right-drag (mouse) to pan;
                Save PNG to export.
              </p>

              {musicOn && (
                <GiantStepsScore
                  angleDeg={angle}
                  active={musicOn}
                  voicings={shellVoicings}
                  onVoicingChange={onShellVoicingChange}
                  keySigFifths={keySigFifths}
                  onKeySigChange={setKeySigFifths}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
