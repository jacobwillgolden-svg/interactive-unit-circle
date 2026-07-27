export const COMMON_ANGLES = [
  { deg: 0, rad: '0' },
  { deg: 30, rad: 'π/6' },
  { deg: 45, rad: 'π/4' },
  { deg: 60, rad: 'π/3' },
  { deg: 90, rad: 'π/2' },
  { deg: 120, rad: '2π/3' },
  { deg: 135, rad: '3π/4' },
  { deg: 150, rad: '5π/6' },
  { deg: 180, rad: 'π' },
  { deg: 210, rad: '7π/6' },
  { deg: 225, rad: '5π/4' },
  { deg: 240, rad: '4π/3' },
  { deg: 270, rad: '3π/2' },
  { deg: 300, rad: '5π/3' },
  { deg: 315, rad: '7π/4' },
  { deg: 330, rad: '11π/6' },
  { deg: 360, rad: '2π' },
]

export const EXACT_COORDS = {
  0: ['1', '0'],
  30: ['√3/2', '1/2'],
  45: ['√2/2', '√2/2'],
  60: ['1/2', '√3/2'],
  90: ['0', '1'],
  120: ['-1/2', '√3/2'],
  135: ['-√2/2', '√2/2'],
  150: ['-√3/2', '1/2'],
  180: ['-1', '0'],
  210: ['-√3/2', '-1/2'],
  225: ['-√2/2', '-√2/2'],
  240: ['-1/2', '-√3/2'],
  270: ['0', '-1'],
  300: ['1/2', '-√3/2'],
  315: ['√2/2', '-√2/2'],
  330: ['√3/2', '-1/2'],
  360: ['1', '0'],
}

export const EXACT_TRIG = {
  0: { cos: '1', sin: '0', tan: '0' },
  30: { cos: '√3/2', sin: '1/2', tan: '1/√3' },
  45: { cos: '√2/2', sin: '√2/2', tan: '1' },
  60: { cos: '1/2', sin: '√3/2', tan: '√3' },
  90: { cos: '0', sin: '1', tan: 'undefined' },
  120: { cos: '-1/2', sin: '√3/2', tan: '-√3' },
  135: { cos: '-√2/2', sin: '√2/2', tan: '-1' },
  150: { cos: '-√3/2', sin: '1/2', tan: '-1/√3' },
  180: { cos: '-1', sin: '0', tan: '0' },
  210: { cos: '-√3/2', sin: '-1/2', tan: '1/√3' },
  225: { cos: '-√2/2', sin: '-√2/2', tan: '1' },
  240: { cos: '-1/2', sin: '-√3/2', tan: '√3' },
  270: { cos: '0', sin: '-1', tan: 'undefined' },
  300: { cos: '1/2', sin: '-√3/2', tan: '-√3' },
  315: { cos: '√2/2', sin: '-√2/2', tan: '-1' },
  330: { cos: '√3/2', sin: '-1/2', tan: '-1/√3' },
  360: { cos: '1', sin: '0', tan: '0' },
}

export function normalizeAngle(deg) {
  return ((deg % 360) + 360) % 360
}

export function snapCommonAngle(deg, tolerance = 0.15) {
  const n = normalizeAngle(deg)
  const hit = COMMON_ANGLES.find(
    ({ deg: d }) => Math.abs(n - d) < tolerance || Math.abs(n - d + 360) < tolerance || Math.abs(n - d - 360) < tolerance
  )
  return hit ? hit.deg % 360 : null
}

export function formatRadLabel(deg) {
  const snapped = snapCommonAngle(deg)
  if (snapped !== null) {
    const entry = COMMON_ANGLES.find((a) => a.deg === snapped || (snapped === 0 && a.deg === 0))
    // prefer 0 over 2π for zero
    if (snapped === 0) return '0'
    return entry?.rad ?? `${((deg * Math.PI) / 180).toFixed(3)}`
  }
  return `${((deg * Math.PI) / 180).toFixed(3)}`
}

export function formatCoords(angleDeg, cos, sin, inRadians, decimals = 3) {
  if (inRadians) {
    const snapped = snapCommonAngle(angleDeg)
    if (snapped !== null) {
      const [cx, cy] = EXACT_COORDS[snapped] ?? EXACT_COORDS[0]
      return `(${cx}, ${cy})`
    }
  }
  return `(${cos.toFixed(decimals)}, ${sin.toFixed(decimals)})`
}

export function formatTrig(angleDeg, cos, sin, tan, key, inRadians) {
  if (inRadians) {
    const snapped = snapCommonAngle(angleDeg)
    if (snapped !== null && EXACT_TRIG[snapped]) {
      return EXACT_TRIG[snapped][key]
    }
  }
  if (key === 'tan' && (tan === Infinity || !Number.isFinite(tan))) return 'undefined'
  const v = key === 'cos' ? cos : key === 'sin' ? sin : tan
  return v.toFixed(4)
}

/** Shortest-path lerp on a circle (degrees). */
export function animateAngle(from, to, onUpdate, duration = 420) {
  const start = normalizeAngle(from)
  let target = normalizeAngle(to)
  let delta = target - start
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360

  // Prefer landing on 360-equivalent as 0 for display consistency
  if (to === 360 || to === 0) target = 0

  const t0 = performance.now()
  let raf

  return new Promise((resolve) => {
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration)
      // ease-out cubic
      const e = 1 - (1 - t) ** 3
      let value = start + delta * e
      value = normalizeAngle(value)
      // Snap exactly at end
      if (t >= 1) {
        onUpdate(normalizeAngle(to === 360 ? 0 : to))
        resolve()
        return
      }
      onUpdate(value)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  })
}

let audioCtx
export function playSnapSound(enabled) {
  if (!enabled || typeof window === 'undefined') return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(660, audioCtx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12)
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.14)
  } catch {
    /* autoplay / unsupported */
  }
}
