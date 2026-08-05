import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import GravityControl from '../components/GravityControl'
import { G0 } from '../utils/constants'

/**
 * True pendulums: single / double / triple.
 * Lagrangian multi-link chain, RK4 integration, colored bob path traces.
 */

const BOB_COLORS = ['#f87171', '#38bdf8', '#a78bfa']
const BOB_COLORS_LIGHT = ['#dc2626', '#2563eb', '#7c3aed']

const MODES = [
  { id: 1, label: 'Single' },
  { id: 2, label: 'Double' },
  { id: 3, label: 'Triple' },
]

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function zeros(n) {
  return Array.from({ length: n }, () => 0)
}

/** Gaussian elimination: solve A x = b in-place-ish; returns x */
function solveLinear(Ain, bin) {
  const n = bin.length
  const A = Ain.map((row, i) => [...row, bin[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r
    }
    if (Math.abs(A[piv][col]) < 1e-12) return zeros(n)
    if (piv !== col) {
      const tmp = A[col]
      A[col] = A[piv]
      A[piv] = tmp
    }
    const div = A[col][col]
    for (let c = col; c <= n; c++) A[col][c] /= div
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = A[r][col]
      for (let c = col; c <= n; c++) A[r][c] -= f * A[col][c]
    }
  }
  return A.map((row) => row[n])
}

/**
 * Planar n-link pendulum accelerations from Lagrange:
 * M(θ) θ'' + C(θ,θ') + G(θ) + damping·θ' = 0
 */
function multiAccel(theta, omega, lengths, masses, g, damping) {
  const n = theta.length
  const M = Array.from({ length: n }, () => zeros(n))

  const massFrom = (i) => {
    let s = 0
    for (let k = i; k < n; k++) s += masses[k]
    return s
  }
  const massFromMax = (i, j) => massFrom(Math.max(i, j))

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] =
        massFromMax(i, j) *
        lengths[i] *
        lengths[j] *
        Math.cos(theta[i] - theta[j])
    }
  }

  // Christoffel / Coriolis: C_i = Σ_j Σ_k Γ_ijk ω_j ω_k
  // Γ_ijk = ½ (∂M_ij/∂θ_k + ∂M_ik/∂θ_j - ∂M_jk/∂θ_i)
  const C = zeros(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < n; k++) {
        const dMij_k = dM(i, j, k, lengths, massFromMax, theta)
        const dMik_j = dM(i, k, j, lengths, massFromMax, theta)
        const dMjk_i = dM(j, k, i, lengths, massFromMax, theta)
        const Gamma = 0.5 * (dMij_k + dMik_j - dMjk_i)
        C[i] += Gamma * omega[j] * omega[k]
      }
    }
  }

  const G = zeros(n)
  for (let i = 0; i < n; i++) {
    G[i] = g * lengths[i] * massFrom(i) * Math.sin(theta[i])
  }

  const rhs = zeros(n)
  for (let i = 0; i < n; i++) {
    rhs[i] = -C[i] - G[i] - damping * omega[i]
  }
  return solveLinear(M, rhs)
}

function dM(i, j, p, lengths, massFromMax, theta) {
  // M_ij = μ_ij L_i L_j cos(θ_i − θ_j),  μ depends on max(i,j) only
  if (p !== i && p !== j) return 0
  if (i === j) return 0 // cos(0)=1 constant in angles
  const mu = massFromMax(i, j)
  const base = mu * lengths[i] * lengths[j]
  if (p === i) return -base * Math.sin(theta[i] - theta[j])
  if (p === j) return base * Math.sin(theta[i] - theta[j])
  return 0
}

/** Closed-form double pendulum (faster / classic), falls back unused for n≠2 */
function doubleAccel(th1, th2, w1, w2, L1, L2, m1, m2, g, damping) {
  const delta = th1 - th2
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * delta)
  if (Math.abs(den) < 1e-12) return [0, 0]
  const a1 =
    (-g * (2 * m1 + m2) * Math.sin(th1) -
      m2 * g * Math.sin(th1 - 2 * th2) -
      2 * Math.sin(delta) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(delta))) /
      (L1 * den) -
    damping * w1
  const a2 =
    (2 *
      Math.sin(delta) *
      (w1 * w1 * L1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(th1) +
        w2 * w2 * L2 * m2 * Math.cos(delta))) /
      (L2 * den) -
    damping * w2
  return [a1, a2]
}

function accel(theta, omega, lengths, masses, g, damping) {
  const n = theta.length
  if (n === 1) {
    return [-(g / lengths[0]) * Math.sin(theta[0]) - damping * omega[0]]
  }
  if (n === 2) {
    return doubleAccel(
      theta[0],
      theta[1],
      omega[0],
      omega[1],
      lengths[0],
      lengths[1],
      masses[0],
      masses[1],
      g,
      damping
    )
  }
  return multiAccel(theta, omega, lengths, masses, g, damping)
}

function rk4Step(theta, omega, lengths, masses, g, damping, dt) {
  const n = theta.length
  const add = (a, b, s) => a.map((v, i) => v + s * b[i])

  const k1t = omega
  const k1o = accel(theta, omega, lengths, masses, g, damping)

  const th2 = add(theta, k1t, dt / 2)
  const om2 = add(omega, k1o, dt / 2)
  const k2t = om2
  const k2o = accel(th2, om2, lengths, masses, g, damping)

  const th3 = add(theta, k2t, dt / 2)
  const om3 = add(omega, k2o, dt / 2)
  const k3t = om3
  const k3o = accel(th3, om3, lengths, masses, g, damping)

  const th4 = add(theta, k3t, dt)
  const om4 = add(omega, k3o, dt)
  const k4t = om4
  const k4o = accel(th4, om4, lengths, masses, g, damping)

  const thetaNext = zeros(n)
  const omegaNext = zeros(n)
  for (let i = 0; i < n; i++) {
    thetaNext[i] =
      theta[i] + (dt / 6) * (k1t[i] + 2 * k2t[i] + 2 * k3t[i] + k4t[i])
    omegaNext[i] =
      omega[i] + (dt / 6) * (k1o[i] + 2 * k2o[i] + 2 * k3o[i] + k4o[i])
  }
  return { theta: thetaNext, omega: omegaNext }
}

/** Bob world positions: pivot at origin, +y up in physics, then flip for SVG */
function bobPositions(theta, lengths) {
  const pts = []
  let x = 0
  let y = 0
  for (let i = 0; i < theta.length; i++) {
    x += lengths[i] * Math.sin(theta[i])
    y -= lengths[i] * Math.cos(theta[i])
    pts.push({ x, y })
  }
  return pts
}

const MAX_TRAIL = 1800

export default function PendulumPage() {
  const { theme } = useOutletContext()
  const isLight = theme === 'light'
  const colors = isLight ? BOB_COLORS_LIGHT : BOB_COLORS

  const [nLinks, setNLinks] = useState(2)
  const [playing, setPlaying] = useState(true)
  const [g, setG] = useState(G0)
  const [damping, setDamping] = useState(0)
  const [trailOn, setTrailOn] = useState(true)
  const [trailFade, setTrailFade] = useState(true)

  // Per-link parameters (always keep 3 slots; use first nLinks)
  const [lengths, setLengths] = useState([1, 1, 0.8])
  const [masses, setMasses] = useState([1, 1, 1])
  const [theta0, setTheta0] = useState([0.9, 1.4, -0.6]) // rad release

  const thetaRef = useRef([0.9, 1.4, -0.6])
  const omegaRef = useRef([0, 0, 0])
  const trailRef = useRef(/** @type {{x:number,y:number}[][]} */ ([[], [], []]))
  const [frame, setFrame] = useState(0)
  const [simTime, setSimTime] = useState(0)
  const timeRef = useRef(0)

  const ink = isLight ? '#0f172a' : '#e8eaf0'
  const muted = isLight ? '#64748b' : '#8b92a5'
  const grid = isLight ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.1)'

  const activeL = useMemo(() => lengths.slice(0, nLinks), [lengths, nLinks])
  const activeM = useMemo(() => masses.slice(0, nLinks), [masses, nLinks])

  const reset = useCallback(
    (n = nLinks) => {
      const th = theta0.slice(0, n).map((t) => t)
      while (th.length < n) th.push(0.5)
      thetaRef.current = th
      omegaRef.current = zeros(n)
      trailRef.current = Array.from({ length: 3 }, () => [])
      timeRef.current = 0
      setSimTime(0)
      setFrame((f) => f + 1)
    },
    [nLinks, theta0]
  )

  // Mode change → reset trails & state size
  useEffect(() => {
    reset(nLinks)
  }, [nLinks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Integration
  useEffect(() => {
    if (!playing) return
    let raf
    let last = performance.now()
    const tick = (now) => {
      let dt = Math.min(0.032, (now - last) / 1000)
      last = now
      // Substeps for chaotic multi-pendulum stability
      const sub = Math.max(1, Math.ceil(dt / 0.004))
      const h = dt / sub
      let th = thetaRef.current
      let om = omegaRef.current
      const L = activeL
      const m = activeM
      for (let s = 0; s < sub; s++) {
        const next = rk4Step(th, om, L, m, g, damping, h)
        th = next.theta
        om = next.omega
      }
      // Wrap angles lightly for display stability (keep continuous physically ok)
      thetaRef.current = th
      omegaRef.current = om
      timeRef.current += dt

      if (trailOn) {
        const pts = bobPositions(th, L)
        for (let i = 0; i < nLinks; i++) {
          const tr = trailRef.current[i]
          tr.push({ x: pts[i].x, y: pts[i].y })
          if (tr.length > MAX_TRAIL) tr.splice(0, tr.length - MAX_TRAIL)
        }
      }

      setSimTime(timeRef.current)
      setFrame((f) => f + 1)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, activeL, activeM, g, damping, trailOn, nLinks])

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

  // Sync live state for render
  void frame
  const theta = thetaRef.current
  const omega = omegaRef.current
  const bobs = bobPositions(theta, activeL)

  // SVG layout
  const W = 640
  const H = 520
  const pivotX = W / 2
  const pivotY = 56
  const totalL = activeL.reduce((a, b) => a + b, 0) || 1
  const scale = Math.min(200, (H - 100) / (totalL * 1.15))

  const toSvg = (p) => ({
    x: pivotX + p.x * scale,
    y: pivotY - p.y * scale, // physics +y up → SVG +y down
  })

  const trailPaths = useMemo(() => {
    void frame
    return trailRef.current.map((tr, i) => {
      if (i >= nLinks || tr.length < 2) return null
      // Build path; optional fade via multiple opacity segments
      if (!trailFade) {
        let d = ''
        for (let k = 0; k < tr.length; k++) {
          const p = toSvg(tr[k])
          d += k === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
        }
        return [{ d, opacity: 0.55 }]
      }
      // Segment into chunks with rising opacity (older → fainter)
      const chunks = []
      const segs = 12
      const chunk = Math.max(2, Math.floor(tr.length / segs))
      for (let s = 0; s < segs; s++) {
        const start = s * chunk
        const end = s === segs - 1 ? tr.length : Math.min(tr.length, start + chunk + 1)
        if (end - start < 2) continue
        let d = ''
        for (let k = start; k < end; k++) {
          const p = toSvg(tr[k])
          d += k === start ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`
        }
        const opacity = 0.08 + 0.55 * ((s + 1) / segs)
        chunks.push({ d, opacity })
      }
      return chunks
    })
    // scale/pivot in toSvg close over latest values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, nLinks, trailFade, scale, pivotX, pivotY])

  const setLen = (i, v) => {
    setLengths((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
  }
  const setMass = (i, v) => {
    setMasses((prev) => {
      const next = [...prev]
      next[i] = v
      return next
    })
  }
  const setTh0 = (i, deg) => {
    const rad = (deg * Math.PI) / 180
    setTheta0((prev) => {
      const next = [...prev]
      next[i] = rad
      return next
    })
    // Live-edit angle when paused
    if (!playing) {
      const th = [...thetaRef.current]
      th[i] = rad
      thetaRef.current = th
      omegaRef.current = zeros(nLinks)
      setFrame((f) => f + 1)
    }
  }

  const clearTrails = () => {
    trailRef.current = Array.from({ length: 3 }, () => [])
    setFrame((f) => f + 1)
  }

  const energy = useMemo(() => {
    void frame
    // Rough mechanical energy for readout
    let T = 0
    let V = 0
    const th = thetaRef.current
    const om = omegaRef.current
    const L = activeL
    const m = activeM
    const n = nLinks
    // velocities
    const vx = zeros(n)
    const vy = zeros(n)
    for (let i = 0; i < n; i++) {
      let vxi = 0
      let vyi = 0
      for (let j = 0; j <= i; j++) {
        vxi += L[j] * om[j] * Math.cos(th[j])
        vyi += L[j] * om[j] * Math.sin(th[j])
      }
      vx[i] = vxi
      vy[i] = vyi
      T += 0.5 * m[i] * (vxi * vxi + vyi * vyi)
      // height: y_i = -Σ L cosθ  (pivot y=0, down negative)
      let yi = 0
      for (let j = 0; j <= i; j++) yi -= L[j] * Math.cos(th[j])
      V += m[i] * g * yi
    }
    return { T, V, E: T + V }
  }, [frame, activeL, activeM, nLinks, g])

  return (
    <>
      <header className="hero hero--compact">
        <div>
          <p className="hero-eyebrow">Chaos · coupled oscillators</p>
          <h1 className="hero-title--wrap">
            <em>Pendulums</em>
          </h1>
        </div>
        <div className="hero-stats">
          <div className="live-angle">
            <span className="label">
              {nLinks === 1 ? 'Simple' : nLinks === 2 ? 'Double' : 'Triple'} · t
            </span>
            <div className="value">{simTime.toFixed(2)} s</div>
            <div className="sub">
              E ≈ {energy.E.toFixed(3)} · Space = play/pause
            </div>
          </div>
        </div>
      </header>

      <main className="workspace workspace--pendulum">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-title">Simulation</span>
            <span className="panel-hint">
              Colored trails follow each bob · drag sliders while paused to pose
            </span>
          </div>

          <div className="pendulum-viz">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="pendulum-svg"
              role="img"
              aria-label={`${nLinks}-link pendulum`}
            >
              {/* Mount */}
              <line
                x1={pivotX - 48}
                y1={pivotY - 10}
                x2={pivotX + 48}
                y2={pivotY - 10}
                stroke={ink}
                strokeOpacity="0.35"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Soft floor guide */}
              <line
                x1={40}
                y1={H - 24}
                x2={W - 40}
                y2={H - 24}
                stroke={grid}
                strokeDasharray="4 6"
              />

              {/* Path traces (under rods) */}
              {trailOn &&
                trailPaths.map(
                  (chunks, i) =>
                    chunks &&
                    chunks.map((c, j) => (
                      <path
                        key={`tr-${i}-${j}`}
                        d={c.d}
                        fill="none"
                        stroke={colors[i]}
                        strokeOpacity={c.opacity}
                        strokeWidth={nLinks === 1 ? 2.2 : 1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))
                )}

              {/* Rods + bobs */}
              {bobs.map((p, i) => {
                const prev =
                  i === 0 ? { x: 0, y: 0 } : bobs[i - 1]
                const a = toSvg(prev)
                const b = toSvg(p)
                // first segment from pivot
                const ax = i === 0 ? pivotX : a.x
                const ay = i === 0 ? pivotY : a.y
                return (
                  <g key={`link-${i}`}>
                    <line
                      x1={ax}
                      y1={ay}
                      x2={b.x}
                      y2={b.y}
                      stroke={ink}
                      strokeOpacity="0.55"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle
                      cx={b.x}
                      cy={b.y}
                      r={10 + activeM[i] * 3}
                      fill={colors[i]}
                      fillOpacity="0.9"
                      stroke={ink}
                      strokeOpacity="0.25"
                      strokeWidth="1.5"
                    />
                  </g>
                )
              })}

              <circle cx={pivotX} cy={pivotY} r={6} fill={ink} fillOpacity="0.75" />

              {/* Angle readouts */}
              {theta.map((th, i) => (
                <text
                  key={`lab-${i}`}
                  x={16}
                  y={H - 48 + i * 14}
                  fontSize="12"
                  fill={colors[i]}
                  fontFamily="JetBrains Mono, monospace"
                >
                  θ{i + 1} = {((th * 180) / Math.PI).toFixed(1)}° · ω
                  {i + 1} = {omega[i].toFixed(2)}
                </text>
              ))}
            </svg>
          </div>

          <div className="waves-controls pendulum-controls">
            <div className="wave-toolbar">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setPlaying((p) => !p)}
              >
                {playing ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => reset()}>
                Reset
              </button>
              <button type="button" className="btn-ghost" onClick={clearTrails}>
                Clear trails
              </button>
              <label className={`chip-toggle${trailOn ? ' is-on' : ''}`}>
                <input
                  type="checkbox"
                  checked={trailOn}
                  onChange={(e) => setTrailOn(e.target.checked)}
                />
                Trails
              </label>
              <label
                className={`chip-toggle${trailFade ? ' is-on' : ''}${!trailOn ? ' is-disabled' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={trailFade}
                  disabled={!trailOn}
                  onChange={(e) => setTrailFade(e.target.checked)}
                />
                Fade
              </label>
            </div>

            <div className="fn-toggles pendulum-shapes" role="group" aria-label="Pendulum type">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`chip-toggle${nLinks === m.id ? ' is-on' : ''}`}
                  onClick={() => setNLinks(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="pendulum-sliders">
              <GravityControl g={g} onChange={setG} id="pendulum-g" min={0.1} max={25} />
              <label className="pendulum-slider">
                <span>
                  Damping <strong>{damping.toFixed(3)}</strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={0.5}
                  step={0.005}
                  value={damping}
                  onChange={(e) => setDamping(Number(e.target.value))}
                />
              </label>

              {Array.from({ length: nLinks }, (_, i) => (
                <div key={`params-${i}`} className="pendulum-link-params">
                  <div
                    className="pendulum-link-label"
                    style={{ color: colors[i] }}
                  >
                    Bob {i + 1}
                  </div>
                  <label className="pendulum-slider">
                    <span>
                      L{i + 1} <strong>{lengths[i].toFixed(2)}</strong>
                    </span>
                    <input
                      type="range"
                      min={0.2}
                      max={1.8}
                      step={0.02}
                      value={lengths[i]}
                      onChange={(e) => setLen(i, Number(e.target.value))}
                    />
                  </label>
                  <label className="pendulum-slider">
                    <span>
                      m{i + 1} <strong>{masses[i].toFixed(2)}</strong>
                    </span>
                    <input
                      type="range"
                      min={0.2}
                      max={3}
                      step={0.05}
                      value={masses[i]}
                      onChange={(e) => setMass(i, Number(e.target.value))}
                    />
                  </label>
                  <label className="pendulum-slider">
                    <span>
                      θ{i + 1}₀{' '}
                      <strong>{((theta0[i] * 180) / Math.PI).toFixed(0)}°</strong>
                    </span>
                    <input
                      type="range"
                      min={-179}
                      max={179}
                      step={1}
                      value={Math.round((theta0[i] * 180) / Math.PI)}
                      onChange={(e) => setTh0(i, Number(e.target.value))}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="panel pendulum-side">
          <div className="panel-header">
            <span className="panel-title">Readout</span>
            <span className="panel-hint">Live state</span>
          </div>
          <div className="pendulum-readout">
            {Array.from({ length: nLinks }, (_, i) => (
              <div key={i} className="pendulum-metric">
                <span className="label" style={{ color: colors[i] }}>
                  θ{i + 1} · ω{i + 1}
                </span>
                <span className="val">
                  {(((theta[i] ?? 0) * 180) / Math.PI).toFixed(1)}° ·{' '}
                  {(omega[i] ?? 0).toFixed(2)} rad/s
                </span>
              </div>
            ))}
            <div className="pendulum-metric">
              <span className="label">Kinetic T</span>
              <span className="val">{energy.T.toFixed(3)}</span>
            </div>
            <div className="pendulum-metric">
              <span className="label">Potential V</span>
              <span className="val">{energy.V.toFixed(3)}</span>
            </div>
            <div className="pendulum-metric">
              <span className="label">Total E</span>
              <span className="val">{energy.E.toFixed(3)}</span>
            </div>
          </div>
          <div className="pendulum-formulas">
            <h3>Modes</h3>
            <p className="pendulum-note">
              <strong style={{ color: colors[0] }}>Single</strong> — classic
              simple pendulum, periodic for any amplitude (nonlinear period).
            </p>
            <p className="pendulum-note">
              <strong style={{ color: colors[1] }}>Double</strong> — chaotic for
              large angles; trails fill strange attractors in the plane.
            </p>
            <p className="pendulum-note">
              <strong style={{ color: colors[2] }}>Triple</strong> — three
              coupled links; even richer chaos. Try uneven lengths/masses.
            </p>
            <h3>Tips</h3>
            <p className="pendulum-note">
              Pause, set release angles with the θ₀ sliders, then Play. Clear
              trails anytime. A little damping settles wild swings; g = 0 is
              free-float fun.
            </p>
            <p className="pendulum-note">
              Integration: RK4 · double uses the classic closed-form; triple
              uses the full Lagrangian mass matrix.
            </p>
          </div>
        </aside>
      </main>
    </>
  )
}
