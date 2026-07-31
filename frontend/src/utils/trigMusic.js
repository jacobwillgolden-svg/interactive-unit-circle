/**
 * Graph-tied kit:
 *   perc  — Cymatics Terror samples (public/samples/)
 *   sin / cos / tan — Giant Steps shells on Ableton Live Lite Grand Piano
 *   (mf multisamples). Analog_BD_Sin is fallback if piano fails to load.
 *
 *   Opening Giant Steps excerpt (4 bars · 4/4 · 2 chords/bar). Staff editable;
 *   key signature manual; time 4/4 fixed.
 *
 *   Shell: sin → root · tan → 3rd · cos → 7th (no 5th)
 *   Colour = CoF rainbow by root (or 2-colour I–IV–V mode)
 *   Perc: sec=kick, csc=snare, cot=closed-hat
 *
 * Piano: public/samples/piano/ (from Live 12 Lite Core Library Grand Piano)
 */

// ——— Musical map: Giant Steps (partial CoF) ———

/** CoF generator (for rainbow index only): +7 semitones mod 12 */
export const FIFTH_GEN = 7

/**
 * Root near C3 so 3rd and 7th stack above cleanly.
 */
export const ARP_ROOT_BASE = 48 // C3
export const ARP_MIDI_MIN = ARP_ROOT_BASE
export const ARP_MIDI_MAX = ARP_ROOT_BASE + 11 + 11

/**
 * Circle-of-fifths rainbow (outer major ring of the reference wheel).
 * Index = fifths index: C=0, G=1, D=2, A=3, E=4, B=5, F♯=6, C♯=7, G♯=8, D♯=9, A♯=10, F=11.
 */
export const COF_RAINBOW = [
  '#E53935', // 0  C   red
  '#FF7043', // 1  G   coral / orange-red
  '#FB8C00', // 2  D   orange
  '#FFB300', // 3  A   amber / gold
  '#FDD835', // 4  E   yellow
  '#9CCC65', // 5  B   lime
  '#43A047', // 6  F♯  green
  '#26A69A', // 7  C♯  teal
  '#1E88E5', // 8  G♯  blue
  '#3949AB', // 9  D♯  indigo
  '#8E24AA', // 10 A♯  purple
  '#EC407A', // 11 F   magenta / pink
]

/**
 * Default Music progression: *portion* of Giant Steps (opening changes only).
 * One θ revolution walks these 8 chords — not a full 16-bar chorus crammed
 * into the circle. Classic partial CoF motion: B→D7→G→B♭7→E♭ plus Am7–D7–G.
 *
 *   Bmaj7 | D7 | Gmaj7 | B♭7 | E♭maj7 | Am7 | D7 | Gmaj7
 *
 * suffix '' for maj7 matches chart shorthand (B, G, E♭).
 * Users can retune shell notes by dragging on the treble staff.
 */
/**
 * cosInt / tanInt = semitones above root for the cos & tan voices.
 *   sin = root
 *   cos = 3rd or 5th (usually 3rd)
 *   tan = 5th or 7th (5th for triads, 7th for 7th chords)
 */
export const GIANT_STEPS = [
  { pc: 11, quality: 'maj7', cosInt: 4, tanInt: 11, suffix: '' }, // B (maj7 shell)
  { pc: 2, quality: 'dom7', cosInt: 4, tanInt: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', cosInt: 4, tanInt: 11, suffix: '' }, // G
  { pc: 10, quality: 'dom7', cosInt: 4, tanInt: 10, suffix: '7' }, // B♭7
  { pc: 3, quality: 'maj7', cosInt: 4, tanInt: 11, suffix: '' }, // E♭
  { pc: 9, quality: 'm7', cosInt: 3, tanInt: 10, suffix: 'm7' }, // Am7
  { pc: 2, quality: 'dom7', cosInt: 4, tanInt: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', cosInt: 4, tanInt: 11, suffix: '' }, // G
]

/** Stations per θ revolution (= length of active progression) */
export const ARP_STEPS_PER_REV = GIANT_STEPS.length

/** @deprecated alias — older Spectrum Cycle name */
export const SPECTRUM_CYCLE = GIANT_STEPS

/**
 * Index 0–11 on the circle of fifths for a pitch class (C=0, G=1, D=2, …).
 * @param {number} pc
 */
export function pitchClassToFifthsIndex(pc) {
  const p = ((Math.round(pc) % 12) + 12) % 12
  for (let i = 0; i < 12; i++) {
    if ((i * FIFTH_GEN) % 12 === p) return i
  }
  return 0
}

/** CoF / unit-circle sector angle (fifths index × 30°). */
export function fifthsUnitAngle(midiOrPc) {
  const pc = ((Math.round(midiOrPc) % 12) + 12) % 12
  return pitchClassToFifthsIndex(pc) * 30
}

export function chordToneUnitAngle(midi) {
  return fifthsUnitAngle(midi)
}

/**
 * Colour from the CoF rainbow wheel (by pitch class → fifths index).
 * @param {number} midi
 */
export function pitchToColor(midi) {
  if (midi == null || !Number.isFinite(midi)) return '#94a3b8'
  const pc = ((Math.round(midi) % 12) + 12) % 12
  const idx = pitchClassToFifthsIndex(pc)
  return COF_RAINBOW[idx] ?? '#94a3b8'
}

/**
 * Colour for the *root* of the chord at θ (whole shell shares key colour).
 * @param {number} angleDeg
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 */
export function rootColorAtAngle(angleDeg, voicings = null) {
  return chordAtAngle(angleDeg, voicings).color
}

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Pitch-class names preferring flats when preferFlats is true. */
export function pcToName(pc, preferFlats = false) {
  const p = ((Math.round(pc) % 12) + 12) % 12
  const sharps = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const flats = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']
  return (preferFlats ? flats : sharps)[p]
}

/**
 * Infer a 7th/triad symbol from three shell midis (edit-mode composition).
 * @param {number[]} midis
 * @param {{ preferFlats?: boolean, colorForRoot?: (rootPc: number) => string }} [opts]
 */
export function analyzeChordFromMidis(midis, opts = {}) {
  const preferFlats = !!opts.preferFlats
  const raw = (midis || [])
    .filter((m) => Number.isFinite(m))
    .map((m) => Math.round(m))
  if (raw.length === 0) {
    return {
      rootPc: 0,
      symbol: '?',
      quality: 'unknown',
      color: COF_RAINBOW[0],
      fifthsIndex: 0,
      cosInt: 4,
      tanInt: 7,
    }
  }
  const pcs = [...new Set(raw.map((m) => ((m % 12) + 12) % 12))]
  const bassPc = ((Math.min(...raw) % 12) + 12) % 12

  /** @type {{ score: number, rootPc: number, quality: string, suffix: string, cosInt: number, tanInt: number } | null} */
  let best = null

  for (const rootPc of pcs) {
    const iv = new Set(
      pcs.map((pc) => ((pc - rootPc) % 12 + 12) % 12).filter((x) => x !== 0)
    )
    const has3 = iv.has(3)
    const has4 = iv.has(4)
    const has7 = iv.has(7)
    const has10 = iv.has(10)
    const has11 = iv.has(11)
    const has6 = iv.has(6)
    const has8 = iv.has(8)

    /** cos = 3rd|5th, tan = 5th|7th (semitones from root) */
    /** @type {{ quality: string, suffix: string, score: number, cosInt: number, tanInt: number }[]} */
    const cands = []
    // Prefer full triad / 7th IDs; triads score high so simple R–3–5 works
    if (has4 && has7)
      cands.push({ quality: 'maj', suffix: '', score: 13, cosInt: 4, tanInt: 7 })
    if (has3 && has7)
      cands.push({ quality: 'min', suffix: 'm', score: 13, cosInt: 3, tanInt: 7 })
    if (has4 && has11)
      cands.push({ quality: 'maj7', suffix: 'maj7', score: 12, cosInt: 4, tanInt: 11 })
    if (has4 && has10)
      cands.push({ quality: 'dom7', suffix: '7', score: 12, cosInt: 4, tanInt: 10 })
    if (has3 && has10)
      cands.push({ quality: 'm7', suffix: 'm7', score: 12, cosInt: 3, tanInt: 10 })
    if (has3 && has11)
      cands.push({ quality: 'm(maj7)', suffix: 'm(maj7)', score: 11, cosInt: 3, tanInt: 11 })
    if (has3 && has6 && has10)
      cands.push({ quality: 'ø7', suffix: 'ø7', score: 11, cosInt: 3, tanInt: 10 })
    if (has3 && has6 && !has10)
      cands.push({ quality: 'dim', suffix: 'dim', score: 8, cosInt: 3, tanInt: 6 })
    if (has4 && has8)
      cands.push({ quality: 'aug', suffix: 'aug', score: 7, cosInt: 4, tanInt: 8 })
    // Shell without 5th still OK
    if (has4 && has11 && !has7)
      cands.push({ quality: 'maj7', suffix: 'maj7', score: 11, cosInt: 4, tanInt: 11 })
    if (has4 && !has3 && !has10 && !has11 && !has7)
      cands.push({ quality: 'maj?', suffix: '', score: 3, cosInt: 4, tanInt: 7 })
    if (has3 && !has4 && !has10 && !has11 && !has7)
      cands.push({ quality: 'min?', suffix: 'm', score: 3, cosInt: 3, tanInt: 7 })
    if (cands.length === 0)
      cands.push({ quality: 'pc', suffix: '', score: 1, cosInt: 4, tanInt: 7 })

    for (const c of cands) {
      let score = c.score
      if (rootPc === bassPc) score += 2.5
      if (pcs.length >= 3 && (c.suffix.includes('7') || c.suffix === 'maj7')) score += 0.5
      if (!best || score > best.score) {
        best = {
          score,
          rootPc,
          quality: c.quality,
          suffix: c.suffix,
          cosInt: c.cosInt,
          tanInt: c.tanInt,
        }
      }
    }
  }

  const rootPc = best?.rootPc ?? pcs[0]
  const suffix = best?.suffix ?? ''
  let symbol = `${pcToName(rootPc, preferFlats)}${suffix}`
  if (best?.quality === 'maj7') {
    symbol = `${pcToName(rootPc, preferFlats)}maj7`
  }
  const fifthsIndex = pitchClassToFifthsIndex(rootPc)
  const color = opts.colorForRoot
    ? opts.colorForRoot(rootPc)
    : (COF_RAINBOW[fifthsIndex] ?? '#94a3b8')
  return {
    rootPc,
    symbol,
    quality: best?.quality ?? 'unknown',
    color,
    fifthsIndex,
    cosInt: best?.cosInt ?? 4,
    tanInt: best?.tanInt ?? 7,
  }
}

/**
 * Parse a typed chord symbol → root + cos/tan intervals.
 * Robust for simple triads: C, Am, F, G, Bb, C#, "C major", "D minor".
 * Sevenths: D7, Gmaj7, Am7, etc.
 *
 * @param {string} text
 * @returns {{ rootPc: number, cosInt: number, tanInt: number, quality: string, suffix: string, symbol: string } | null}
 */
export function parseChordSymbol(text) {
  if (text == null || typeof text !== 'string') return null
  let s = text.trim()
  if (!s) return null

  // Normalize unicode / aliases
  s = s
    .replace(/Δ|∆|△/g, 'maj7')
    .replace(/º|°/g, 'dim')
    .replace(/ø|Ø/g, 'm7b5')
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/\s+/g, ' ')

  // Root: letter + optional accidental (allow "Bb", "B b", "F#")
  const m = s.match(/^([A-Ga-g])\s*([#b])?\s*(.*)$/i)
  if (!m) return null
  const letter = m[1].toUpperCase()
  const acc = (m[2] || '').toLowerCase()
  const qualRaw = (m[3] || '').trim()
  // Preserve lone "M" vs "m" before lowercasing
  let qual = qualRaw.toLowerCase().replace(/\s+/g, '')
  if (qualRaw === 'M') qual = 'maj'

  const letterPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter]
  if (letterPc == null) return null
  let rootPc = letterPc
  if (acc === '#') rootPc = (rootPc + 1) % 12
  if (acc === 'b') rootPc = (rootPc + 11) % 12

  // Collapse common quality spellings (order matters: longer forms first)
  if (/^(maj7|ma7|major7|△7|Δ7)$/.test(qual)) qual = 'maj7'
  else if (/^(m7b5|min7b5|-7b5|halfdim|hdim|ø7)$/.test(qual)) qual = 'm7b5'
  else if (/^(m7|min7|mi7|-7)$/.test(qual)) qual = 'm7'
  else if (/^(mmaj7|minmaj7|m\(maj7\)|mΔ|m△)$/.test(qual)) qual = 'mmaj7'
  else if (/^(maj|ma|major|triad)$/.test(qual)) qual = 'maj'
  else if (/^(m|min|mi)$/.test(qual) || qual === '-') qual = 'm'
  else if (/^(dom7|dominant7|7)$/.test(qual)) qual = '7'
  else if (/^(dim7|o7|°7)$/.test(qual)) qual = 'dim7'
  else if (/^(dim|o|°)$/.test(qual)) qual = 'dim'
  else if (/^(aug|\+)$/.test(qual)) qual = 'aug'
  else if (qual === '6') qual = '6'
  else if (qual === 'm6') qual = 'm6'
  else if (/^(5|power|no3)$/.test(qual)) qual = '5'
  else if (qual === '') qual = 'maj' // bare "C" → major triad
  // else leave unknown for fallback triad

  /** @type {{ cosInt: number, tanInt: number, quality: string, suffix: string }} */
  let spec
  switch (qual) {
    case 'maj':
      // Simple major triad: root, maj3, 5th
      spec = { cosInt: 4, tanInt: 7, quality: 'maj', suffix: '' }
      break
    case 'm':
      spec = { cosInt: 3, tanInt: 7, quality: 'min', suffix: 'm' }
      break
    case 'maj7':
      spec = { cosInt: 4, tanInt: 11, quality: 'maj7', suffix: 'maj7' }
      break
    case '7':
      spec = { cosInt: 4, tanInt: 10, quality: 'dom7', suffix: '7' }
      break
    case 'm7':
      spec = { cosInt: 3, tanInt: 10, quality: 'm7', suffix: 'm7' }
      break
    case 'mmaj7':
      spec = { cosInt: 3, tanInt: 11, quality: 'm(maj7)', suffix: 'm(maj7)' }
      break
    case 'm7b5':
      spec = { cosInt: 3, tanInt: 10, quality: 'ø7', suffix: 'ø7' }
      break
    case 'dim':
    case 'dim7':
      spec = { cosInt: 3, tanInt: 9, quality: 'dim7', suffix: 'dim7' }
      break
    case 'aug':
      spec = { cosInt: 4, tanInt: 8, quality: 'aug', suffix: 'aug' }
      break
    case '6':
      spec = { cosInt: 4, tanInt: 9, quality: '6', suffix: '6' }
      break
    case 'm6':
      spec = { cosInt: 3, tanInt: 9, quality: 'm6', suffix: 'm6' }
      break
    case '5':
      spec = { cosInt: 7, tanInt: 12, quality: '5', suffix: '5' }
      break
    default:
      // Unknown tail → still major triad so typing never "does nothing"
      spec = { cosInt: 4, tanInt: 7, quality: 'maj', suffix: '' }
  }

  const preferFlats = acc === 'b' || [1, 3, 6, 8, 10].includes(rootPc)
  const rootName = pcToName(rootPc, preferFlats && acc !== '#')
  const symbol = spec.suffix === '' ? rootName : `${rootName}${spec.suffix}`

  return {
    rootPc,
    cosInt: spec.cosInt,
    tanInt: spec.tanInt,
    quality: spec.quality,
    suffix: spec.suffix,
    symbol,
  }
}

/**
 * Strict root-position voicing: root lowest, then cos, then tan (no inversions).
 * sin=root, cos=3rd|5th, tan=5th|7th.
 *
 * @param {number} rootPc
 * @param {number} cosInt
 * @param {number} tanInt
 * @param {number} [registerHintMidi] ignored for placement; always comfortable mid register
 * @returns {ShellVoicing}
 */
export function buildShellVoicing(rootPc, cosInt, tanInt, _registerHintMidi = 60) {
  const pc = ((rootPc % 12) + 12) % 12
  // Always place root in C3–B3 band (MIDI 48–59), then stack above — true root position
  let root = ARP_ROOT_BASE + pc // C3 + pc
  // Prefer around C3–G3 for shells; lift once if very low is fine
  if (root < 48) root += 12
  let cos = root + cosInt
  let tan = root + tanInt
  // Guarantee ascending root < cos < tan (root position on staff)
  while (cos <= root) cos += 12
  while (tan <= cos) tan += 12
  // Cap top note for speakers / staff
  while (tan > 88 && root > 48) {
    root -= 12
    cos -= 12
    tan -= 12
  }
  return { root, cos, tan }
}

/**
 * Parse a whole progression string into up to N chord symbols.
 * Accepts: "C Am F G" | "C | Am | F | G" | "C, Am, F, G"
 * @param {string} text
 * @param {number} [max]
 * @returns {ReturnType<typeof parseChordSymbol>[]}
 */
export function parseProgressionString(text, max = ARP_STEPS_PER_REV) {
  if (!text || typeof text !== 'string') return []
  const parts = text
    .split(/[|,\n\t]+|\s{2,}/)
    .flatMap((p) => p.trim().split(/\s+/))
    .map((p) => p.trim())
    .filter(Boolean)
  const out = []
  for (const part of parts) {
    if (out.length >= max) break
    const parsed = parseChordSymbol(part)
    if (parsed) out.push(parsed)
  }
  return out
}

/**
 * Detect whether a sequence of roots is pure I–IV–V (diatonic) in some major key,
 * vs free circle-of-fifths / chromatic motion (Giant Steps, etc.).
 *
 * @param {number[]} rootPcs
 * @returns {{ mode: 'IVV' | 'cof', tonic: number, keySigFifths: number }}
 */
export function detectProgressionHarmony(rootPcs) {
  const roots = (rootPcs || [])
    .filter((p) => Number.isFinite(p))
    .map((p) => ((p % 12) + 12) % 12)
  if (roots.length === 0) {
    return { mode: 'cof', tonic: 0, keySigFifths: 0 }
  }

  let bestTonic = 0
  let bestScore = -1
  let bestFitsAll = false

  for (let tonic = 0; tonic < 12; tonic++) {
    const I = tonic
    const IV = (tonic + 5) % 12
    const V = (tonic + 7) % 12
    const allowed = new Set([I, IV, V])
    let fit = 0
    let all = true
    for (const r of roots) {
      if (allowed.has(r)) fit++
      else all = false
    }
    // Prefer keys where everything fits; then denser I usage
    const iCount = roots.filter((r) => r === I).length
    const score = (all ? 100 : 0) + fit * 10 + iCount
    if (score > bestScore) {
      bestScore = score
      bestTonic = tonic
      bestFitsAll = all
    }
  }

  const mode = bestFitsAll && roots.length >= 2 ? 'IVV' : 'cof'
  return {
    mode,
    tonic: bestTonic,
    keySigFifths: majorKeyToFifths(bestTonic),
  }
}

/** Major-key tonic pitch class → key-signature fifths (−7…+7). */
export function majorKeyToFifths(tonicPc) {
  const t = ((tonicPc % 12) + 12) % 12
  /** @type {Record<number, number>} */
  const map = {
    0: 0, // C
    7: 1, // G
    2: 2, // D
    9: 3, // A
    4: 4, // E
    11: 5, // B
    6: 6, // F♯
    1: 7, // C♯
    5: -1, // F
    10: -2, // B♭
    3: -3, // E♭
    8: -4, // A♭
  }
  return map[t] ?? 0
}

/**
 * Colour for a chord root given progression harmony mode.
 * I–IV–V only → two colours (tonic vs IV/V). Otherwise CoF rainbow.
 *
 * @param {number} rootPc
 * @param {{ mode: 'IVV' | 'cof', tonic: number }} harmony
 */
export function colorForProgressionRoot(rootPc, harmony) {
  const pc = ((rootPc % 12) + 12) % 12
  if (harmony?.mode === 'IVV') {
    const tonic = ((harmony.tonic % 12) + 12) % 12
    if (pc === tonic) {
      return COF_RAINBOW[pitchClassToFifthsIndex(tonic)]
    }
    // IV and V share the dominant colour (V’s place on the CoF wheel)
    const dominant = (tonic + 7) % 12
    return COF_RAINBOW[pitchClassToFifthsIndex(dominant)]
  }
  return COF_RAINBOW[pitchClassToFifthsIndex(pc)] ?? '#94a3b8'
}

/**
 * Collect root PCs from progression defaults + voicing overrides.
 * @param {(ShellVoicing | null | undefined)[] | null} voicings
 */
export function progressionRootPcs(voicings = null) {
  const roots = []
  for (let i = 0; i < GIANT_STEPS.length; i++) {
    const v = resolveShellVoicing(i, voicings?.[i])
    const a = analyzeChordFromMidis([v.root, v.cos, v.tan])
    roots.push(a.rootPc)
  }
  return roots
}

/**
 * Key-signature fifths: -7…+7 (negative = flats, positive = sharps).
 * 0 = C major / A minor (no accidentals).
 */
export const KEY_SIG_MIN = -7
export const KEY_SIG_MAX = 7

/** Fixed time signature for Music score (not editable). */
export const SCORE_TIME_SIG = { beats: 4, unit: 4 }
/** Fixed bars per θ revolution (2 shell chords per bar × 4 bars = 8 changes). */
export const SCORE_BARS_PER_REV = 4
export const SCORE_CHORDS_PER_BAR = 2

export function preferFlatsFromKeySig(fifths) {
  return (fifths ?? 0) < 0
}

export function midiToName(midi, preferFlats = false) {
  if (midi == null || !Number.isFinite(midi)) return '—'
  const m = Math.round(midi)
  const pc = ((m % 12) + 12) % 12
  const oct = Math.floor(m / 12) - 1
  return `${pcToName(pc, preferFlats)}${oct}`
}

export function midiToOctave(midi) {
  if (midi == null || !Number.isFinite(midi)) return null
  return Math.floor(Math.round(midi) / 12) - 1
}

/** θ → progression step (Giant Steps form) */
export function angleToStep(angleDeg) {
  const n = ARP_STEPS_PER_REV
  const t = ((angleDeg % 360) + 360) % 360
  return Math.floor((t / 360) * n) % n
}

/**
 * MIDI voicing for the three music voices:
 *   root → sin, cos → 3rd or 5th, tan → 5th or 7th
 * @typedef {{ root: number, cos: number, tan: number }} ShellVoicing
 */

/**
 * Default voicing for a progression step (treble-friendly register).
 * @param {number} step
 * @returns {ShellVoicing}
 */
export function defaultShellVoicing(step) {
  const k =
    ((Math.floor(step) % ARP_STEPS_PER_REV) + ARP_STEPS_PER_REV) %
    ARP_STEPS_PER_REV
  const spec = GIANT_STEPS[k] ?? GIANT_STEPS[0]
  const rootPc = ((spec.pc % 12) + 12) % 12
  let root = ARP_ROOT_BASE + rootPc
  let cos = root + spec.cosInt
  let tan = root + spec.tanInt
  while (root < 55) {
    root += 12
    cos += 12
    tan += 12
  }
  while (tan > 86) {
    root -= 12
    cos -= 12
    tan -= 12
  }
  return { root, cos, tan }
}

/**
 * @param {number} step
 * @param {ShellVoicing | null | undefined} override
 * @returns {ShellVoicing}
 */
export function resolveShellVoicing(step, override) {
  if (
    override &&
    Number.isFinite(override.root) &&
    Number.isFinite(override.cos) &&
    Number.isFinite(override.tan)
  ) {
    return {
      root: Math.round(override.root),
      cos: Math.round(override.cos),
      tan: Math.round(override.tan),
    }
  }
  // Migrate legacy { third, seventh } overrides if present
  if (
    override &&
    Number.isFinite(override.root) &&
    Number.isFinite(/** @type {any} */ (override).third) &&
    Number.isFinite(/** @type {any} */ (override).seventh)
  ) {
    return {
      root: Math.round(override.root),
      cos: Math.round(/** @type {any} */ (override).third),
      tan: Math.round(/** @type {any} */ (override).seventh),
    }
  }
  return defaultShellVoicing(step)
}

/**
 * @param {number} angleDeg
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 * @param {number} [keySigFifths]
 */
export function chordAtAngle(angleDeg, voicings = null, keySigFifths = 0) {
  const step = angleToStep(angleDeg)
  const spec = GIANT_STEPS[step] ?? GIANT_STEPS[0]
  const chartRootPc = ((spec.pc % 12) + 12) % 12
  const rad = (angleDeg * Math.PI) / 180
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const v = resolveShellVoicing(step, voicings?.[step])
  const harmony = detectProgressionHarmony(progressionRootPcs(voicings))
  const analyzed = analyzeChordFromMidis([v.root, v.cos, v.tan], {
    preferFlats: preferFlatsFromKeySig(keySigFifths),
    colorForRoot: (pc) => colorForProgressionRoot(pc, harmony),
  })
  const rootPc = analyzed.rootPc
  const fifthsIndex = analyzed.fifthsIndex

  return {
    step,
    rootPc,
    chartRootPc,
    root: v.root,
    cos: v.cos,
    tan: v.tan,
    cosInt: spec.cosInt,
    tanInt: spec.tanInt,
    quality: analyzed.quality,
    suffix: spec.suffix,
    chordSymbol: analyzed.symbol,
    fifthsIndex,
    unitDeg: fifthsIndex * 30,
    color: analyzed.color,
    harmonyMode: harmony.mode,
    sin: s,
    cosVal: c,
  }
}

/**
 * @param {number} angleDeg
 * @param {'sin' | 'cos' | 'tan'} voice
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 * @param {number} [keySigFifths]
 */
export function arpInfo(angleDeg, voice = 'sin', voicings = null, keySigFifths = 0) {
  const ch = chordAtAngle(angleDeg, voicings, keySigFifths)
  const role = voice === 'sin' ? 'root' : voice
  const midi = voice === 'sin' ? ch.root : voice === 'cos' ? ch.cos : ch.tan
  const pc = ((midi % 12) + 12) % 12
  const color = ch.color
  const preferFlats = preferFlatsFromKeySig(keySigFifths)
  return {
    step: ch.step,
    midi,
    freq: midiToFreq(midi),
    name: midiToName(midi, preferFlats),
    color,
    role,
    quality: ch.quality,
    chordSymbol: ch.chordSymbol,
    root: ch.root,
    cos: ch.cos,
    tan: ch.tan,
    pitchClass: pc,
    fifthsIndex: ch.fifthsIndex,
    unitDeg: ch.unitDeg,
    rootUnitDeg: ch.unitDeg,
    octave: midiToOctave(midi),
  }
}

/** Preview a single pitch while dragging a staff note. */
export function previewShellPitch(midi) {
  if (!Number.isFinite(midi)) return
  ensureCtx()
  playArpNote('sin', Math.round(midi), 0.45, 0.4, 0)
}

/** Root MIDI at progression step (for legacy helpers). */
export function stepToMidi(step) {
  const k = ((Math.floor(step) % ARP_STEPS_PER_REV) + ARP_STEPS_PER_REV) % ARP_STEPS_PER_REV
  const pc = ((GIANT_STEPS[k]?.pc ?? 0) % 12 + 12) % 12
  return ARP_ROOT_BASE + pc
}

// ——— Percussion samples ———

const SAMPLE_URLS = {
  kick: '/samples/kick.wav',
  snare: '/samples/snare.wav',
  /** Closed hat — cot roll (tan’s former drum) */
  hat: '/samples/hat.wav',
}

/**
 * Ableton Live 12 Lite Grand Piano (mf velocity layer).
 * Files in public/samples/piano/. Live octave: C3 = middle C = MIDI 60.
 */
const PIANO_SAMPLE_SPEC = [
  { midi: 33, file: 'GrandPiano_A0_mf.aif' }, // Live A0
  { midi: 25, file: 'GrandPiano_C#0_mf.aif' },
  { midi: 28, file: 'GrandPiano_E0_mf.aif' },
  { midi: 31, file: 'GrandPiano_G0_mf.aif' },
  { midi: 46, file: 'GrandPiano_A#_1_mf.aif' }, // Live "A# 1"
  { midi: 36, file: 'GrandPiano_C1_mf.aif' },
  { midi: 39, file: 'GrandPiano_D#1_mf.aif' },
  { midi: 42, file: 'GrandPiano_F#1_mf.aif' },
  { midi: 45, file: 'GrandPiano_A1_mf.aif' },
  { midi: 48, file: 'GrandPiano_C2_mf.aif' },
  { midi: 51, file: 'GrandPiano_D#2_mf.aif' },
  { midi: 54, file: 'GrandPiano_F#2_mf.aif' },
  { midi: 57, file: 'GrandPiano_A2_mf.aif' },
  { midi: 60, file: 'GrandPiano_C3_mf.aif' }, // middle C
  { midi: 63, file: 'GrandPiano_D#3_mf.aif' },
  { midi: 66, file: 'GrandPiano_F#3_mf.aif' },
  { midi: 69, file: 'GrandPiano_A3_mf.aif' },
  { midi: 72, file: 'GrandPiano_C4_mf.aif' },
  { midi: 75, file: 'GrandPiano_D#4_mf.aif' },
  { midi: 78, file: 'GrandPiano_F#4_mf.aif' },
  { midi: 81, file: 'GrandPiano_A4_mf.aif' },
  { midi: 84, file: 'GrandPiano_C5_mf.aif' },
  { midi: 87, file: 'GrandPiano_D#5_mf.aif' },
  { midi: 90, file: 'GrandPiano_F#5_mf.aif' },
  { midi: 92, file: 'GrandPiano_G#5_mf.aif' },
  { midi: 95, file: 'GrandPiano_B5_mf.aif' },
  { midi: 98, file: 'GrandPiano_D6_mf.aif' },
  { midi: 101, file: 'GrandPiano_F6_mf.aif' },
  { midi: 104, file: 'GrandPiano_G#6_mf.aif' },
  { midi: 107, file: 'GrandPiano_B6_mf.aif' },
].map(({ midi, file }) => ({ midi, url: `/samples/piano/${file}` }))

const WT_URL = '/samples/wt/analog-bd-sin.wav'
const SERUM_FRAME = 2048
const WT_MAX_HARMONICS = 48

const PERC_KEYS = ['sec', 'csc']
const PERC = {
  sec: { sample: 'kick', gain: 0.95 },
  csc: { sample: 'snare', gain: 0.85 },
}
const COOLDOWN = { sec: 0.12, csc: 0.12 }

// Cot closed-hat roll (former tan mapping)
const ROLL_MIN_HZ = 3
const ROLL_MAX_HZ = 32
const ROLL_ABS_FOR_MAX = 8

const ARP_GAIN = { sin: 0.55, tan: 0.42, cos: 0.38 }
const ARP_ATTACK = 0.005
const ARP_DECAY = 1.8
const ARP_MAX_VOICES = 14
/** Root → 3rd → 7th stagger so the shell reads as an arpeggio */
const SHELL_STAGGER = { sin: 0, tan: 0.04, cos: 0.08 }

let ctx = null

/** @type {Record<string, AudioBuffer | null>} */
const buffers = { kick: null, snare: null, hat: null }

/** @type {{ midi: number, buffer: AudioBuffer }[]} sorted by midi */
let pianoZones = []
let pianoReady = false

/** @type {PeriodicWave | null} */
let bdSinWave = null
let bdSinWaves = /** @type {PeriodicWave[]} */ ([])

let loadPromise = null
let samplesReady = false
let tableReady = false

const valleyArmed = { sec: true, csc: true }
const coolUntil = { sec: 0, csc: 0 }
const rollNextAt = { cot: 0 }

/** Shared progression step so the shell fires as one chord */
let lastChordStep = -1
/** Fingerprint of last played voicing (re-fire when user retunes) */
let lastVoicingFp = ''
/** @type {Record<'sin'|'cos'|'tan', ReturnType<typeof arpInfo> | null>} */
const lastArpNote = { sin: null, cos: null, tan: null }

let activeVoices = 0

function ensureCtx() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  return ctx
}

// ——— Wavetable fallback: Analog_BD_Sin ———

function frameToPeriodicWave(audio, samples) {
  const n = samples.length
  const maxH = Math.min(WT_MAX_HARMONICS, Math.floor(n / 2))
  const real = new Float32Array(maxH + 1)
  const imag = new Float32Array(maxH + 1)
  for (let k = 1; k <= maxH; k++) {
    let re = 0
    let im = 0
    const w = (2 * Math.PI * k) / n
    for (let t = 0; t < n; t++) {
      const a = w * t
      const s = samples[t]
      re += s * Math.cos(a)
      im -= s * Math.sin(a)
    }
    real[k] = re / n
    imag[k] = im / n
  }
  return audio.createPeriodicWave(real, imag, { disableNormalization: false })
}

function buildBdSinWaves(audio, buffer) {
  const ch = buffer.getChannelData(0)
  const frameCount = Math.max(1, Math.floor(ch.length / SERUM_FRAME))
  const waves = []
  for (let i = 0; i < frameCount; i++) {
    const samples = new Float32Array(SERUM_FRAME)
    samples.set(ch.subarray(i * SERUM_FRAME, (i + 1) * SERUM_FRAME))
    waves.push(frameToPeriodicWave(audio, samples))
  }
  return waves
}

async function decodeUrl(audio, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  const raw = await res.arrayBuffer()
  return audio.decodeAudioData(raw.slice(0))
}

function nearestPianoZone(midi) {
  if (!pianoZones.length) return null
  let best = pianoZones[0]
  let bestDist = Math.abs(best.midi - midi)
  for (let i = 1; i < pianoZones.length; i++) {
    const z = pianoZones[i]
    const d = Math.abs(z.midi - midi)
    if (d < bestDist) {
      best = z
      bestDist = d
    }
  }
  return best
}

function loadSamples() {
  if (samplesReady && (pianoReady || tableReady)) return Promise.resolve()
  if (loadPromise) return loadPromise
  const audio = ensureCtx()
  if (!audio) return Promise.resolve()

  loadPromise = (async () => {
    await Promise.all([
      ...Object.entries(SAMPLE_URLS).map(async ([key, url]) => {
        try {
          buffers[key] = await decodeUrl(audio, url)
        } catch (err) {
          console.warn('[trigMusic] failed to load', url, err)
          buffers[key] = null
        }
      }),
      (async () => {
        const zones = []
        await Promise.all(
          PIANO_SAMPLE_SPEC.map(async ({ midi, url }) => {
            try {
              const buffer = await decodeUrl(audio, url)
              zones.push({ midi, buffer })
            } catch (err) {
              console.warn('[trigMusic] piano sample failed', url, err)
            }
          })
        )
        zones.sort((a, b) => a.midi - b.midi)
        pianoZones = zones
        pianoReady = zones.length > 0
        if (pianoReady) {
          console.info(
            `[trigMusic] Grand Piano loaded (${zones.length} zones, Ableton Lite mf layer)`
          )
        }
      })(),
      (async () => {
        try {
          const buf = await decodeUrl(audio, WT_URL)
          bdSinWaves = buildBdSinWaves(audio, buf)
          bdSinWave = bdSinWaves[0] ?? null
          tableReady = !!bdSinWave
        } catch (err) {
          console.warn('[trigMusic] Analog_BD_Sin fallback failed', err)
          bdSinWave = null
          bdSinWaves = []
          tableReady = false
        }
      })(),
    ])
    samplesReady = true
  })()
  return loadPromise
}

// ——— One-shot percussion ———

function playSample(name, vel = 1, rate = 1) {
  const audio = ensureCtx()
  const buf = buffers[name]
  if (!audio || !buf || vel < 0.02) return

  const src = audio.createBufferSource()
  const g = audio.createGain()
  src.buffer = buf
  src.playbackRate.value = Math.max(0.5, Math.min(2, rate))
  g.gain.value = Math.min(1.2, Math.max(0, vel))
  src.connect(g)
  g.connect(audio.destination)
  src.start()
}

// ——— Shell-chord note (Grand Piano samples, synth fallback) ———

/**
 * @param {'sin' | 'cos' | 'tan'} voice
 * @param {number} midi
 * @param {number} vel 0..1
 * @param {number} brightness 0..1
 * @param {number} [delay] seconds
 */
function playArpNote(voice, midi, vel, brightness = 0, delay = 0) {
  const audio = ensureCtx()
  if (!audio || vel < 0.03 || activeVoices >= ARP_MAX_VOICES) return

  const m = Math.round(midi)
  if (m < 21 || m > 108) return

  const now = audio.currentTime + Math.max(0, delay)
  const peak =
    (ARP_GAIN[voice] ?? 0.4) * Math.min(1, Math.max(0, vel))

  // Prefer Ableton Grand Piano multisample
  const zone = nearestPianoZone(m)
  if (zone?.buffer) {
    const src = audio.createBufferSource()
    const g = audio.createGain()
    src.buffer = zone.buffer
    // Pitch-shift from sampled note to target
    const rate = Math.pow(2, (m - zone.midi) / 12)
    src.playbackRate.value = Math.max(0.5, Math.min(2.0, rate))

    // Natural piano decay; slight extra fade so polyphony clears
    const dur = Math.min(zone.buffer.duration, 3.5)
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + 0.008)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.55), now + 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.92)

    src.connect(g)
    g.connect(audio.destination)
    activeVoices++
    src.start(now)
    src.stop(now + dur)
    src.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1)
      try {
        src.disconnect()
        g.disconnect()
      } catch {
        /* gone */
      }
    }
    return
  }

  // ——— Fallback: Analog_BD_Sin / pure sine ———
  const freq = midiToFreq(m)
  if (freq < 55 || freq > 4200) return

  const osc = audio.createOscillator()
  const g = audio.createGain()
  const filter = audio.createBiquadFilter()

  if (bdSinWaves.length > 0) {
    const idx = Math.min(
      bdSinWaves.length - 1,
      Math.floor(Math.max(0, Math.min(1, brightness)) * (bdSinWaves.length - 1))
    )
    osc.setPeriodicWave(bdSinWaves[idx])
  } else if (bdSinWave) {
    osc.setPeriodicWave(bdSinWave)
  } else {
    osc.type = 'sine'
  }

  osc.frequency.setValueAtTime(freq, now)
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(1800 + brightness * 2800, now)
  filter.Q.setValueAtTime(0.55, now)

  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.45), now + ARP_ATTACK)
  g.gain.exponentialRampToValueAtTime(0.0001, now + ARP_ATTACK + ARP_DECAY)

  osc.connect(filter)
  filter.connect(g)
  g.connect(audio.destination)

  activeVoices++
  osc.start(now)
  osc.stop(now + ARP_ATTACK + ARP_DECAY + 0.05)
  osc.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1)
    try {
      osc.disconnect()
      filter.disconnect()
      g.disconnect()
    } catch {
      /* already gone */
    }
  }
}

/**
 * Fire shell chord when θ crosses a progression station (or voicing is retuned).
 * @param {number} angleDeg
 * @param {{ sin?: boolean, cos?: boolean, tan?: boolean }} enabled
 * @param {{ sin?: number|null, cos?: number|null, tan?: number|null }} values
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 */
function processShellChord(angleDeg, enabled, values, voicings = null) {
  const any = enabled.sin || enabled.cos || enabled.tan
  if (!any) {
    lastChordStep = -1
    lastVoicingFp = ''
    lastArpNote.sin = null
    lastArpNote.cos = null
    lastArpNote.tan = null
    return
  }

  const step = angleToStep(angleDeg)
  const sinInfo = enabled.sin ? arpInfo(angleDeg, 'sin', voicings) : null
  const tanInfo = enabled.tan ? arpInfo(angleDeg, 'tan', voicings) : null
  const cosInfo = enabled.cos ? arpInfo(angleDeg, 'cos', voicings) : null
  lastArpNote.sin = sinInfo
  lastArpNote.tan = tanInfo
  lastArpNote.cos = cosInfo

  const ch = chordAtAngle(angleDeg, voicings)
  const fp = `${ch.root}:${ch.cos}:${ch.tan}`
  if (step === lastChordStep && fp === lastVoicingFp) return
  lastChordStep = step
  lastVoicingFp = fp

  const velOf = (v) => {
    if (v == null || !Number.isFinite(v)) return 0.55
    return 0.32 + 0.68 * Math.pow(Math.min(1, Math.abs(v)), 0.7)
  }

  if (sinInfo) {
    playArpNote(
      'sin',
      sinInfo.midi,
      velOf(values.sin),
      Math.min(1, Math.abs(values.sin ?? 0.5)),
      SHELL_STAGGER.sin
    )
  }
  if (cosInfo) {
    playArpNote(
      'cos',
      cosInfo.midi,
      velOf(values.cos),
      Math.min(1, Math.abs(values.cos ?? 0.5)),
      SHELL_STAGGER.cos
    )
  }
  if (tanInfo) {
    playArpNote(
      'tan',
      tanInfo.midi,
      velOf(values.tan),
      Math.min(1, Math.abs(values.tan ?? 0.5)),
      SHELL_STAGGER.tan
    )
  }
}

// ——— Kick / snare valleys ———

function shouldValleyStrike(key, value, thresh = 1) {
  if (value == null || !Number.isFinite(value)) {
    valleyArmed[key] = true
    return false
  }
  const abs = Math.abs(value)
  const floor = thresh * 1.12
  const rearm = thresh * 1.55
  if (abs >= rearm) valleyArmed[key] = true
  if (valleyArmed[key] && abs <= floor) {
    valleyArmed[key] = false
    return true
  }
  return false
}

function processPerc(key, entry, now) {
  const cfg = PERC[key]
  if (!cfg) return
  if (!entry?.show) {
    valleyArmed[key] = true
    return
  }
  const value =
    entry.value != null && Number.isFinite(entry.value) ? entry.value : null
  if (shouldValleyStrike(key, value) && now >= coolUntil[key]) {
    playSample(cfg.sample, cfg.gain)
    coolUntil[key] = now + (COOLDOWN[key] ?? 0.12)
  }
}

// ——— Cot: closed-hat roll (tan’s former sample / role) ———

function rollHz(absVal) {
  const t = Math.min(1, absVal / ROLL_ABS_FOR_MAX)
  const shaped = t * t
  return ROLL_MIN_HZ + (ROLL_MAX_HZ - ROLL_MIN_HZ) * shaped
}

function processCotHatRoll(entry, now) {
  if (!entry?.show) {
    rollNextAt.cot = 0
    return
  }
  const value = entry.value
  if (value == null || !Number.isFinite(value)) {
    rollNextAt.cot = 0
    return
  }

  const a = Math.abs(value)
  if (a < 0.12) {
    rollNextAt.cot = Math.max(rollNextAt.cot, now + 0.2)
    return
  }

  const hz = rollHz(a)
  const interval = 1 / hz
  const vel = 0.3 + 0.5 * Math.min(1, a / ROLL_ABS_FOR_MAX)
  const rate = 0.95 + 0.2 * Math.min(1, a / ROLL_ABS_FOR_MAX)

  if (rollNextAt.cot === 0) rollNextAt.cot = now

  let guard = 0
  while (now >= rollNextAt.cot && guard < 4) {
    playSample('hat', vel, rate)
    rollNextAt.cot += interval
    guard++
  }
  if (now >= rollNextAt.cot) {
    rollNextAt.cot = now + interval
  }
}

// ——— Public API ———

export function getLastArpNotes() {
  return { sin: lastArpNote.sin, cos: lastArpNote.cos, tan: lastArpNote.tan }
}

/**
 * @param {boolean} enabled
 * @param {{
 *   angleDeg?: number,
 *   sin?: { show: boolean, value: number | null },
 *   cos?: { show: boolean, value: number | null },
 *   sec?: { show: boolean, value: number | null },
 *   csc?: { show: boolean, value: number | null },
 *   tan?: { show: boolean, value: number | null },
 *   cot?: { show: boolean, value: number | null },
 *   shellVoicings?: (ShellVoicing | null | undefined)[] | null,
 * }} state
 */
export function updateTrigMusic(enabled, state) {
  if (!enabled) {
    muteAll()
    return
  }
  const audio = ensureCtx()
  if (!audio) return

  if (!samplesReady || (!pianoReady && !tableReady)) {
    loadSamples()
  }

  const now = audio.currentTime
  const angleDeg =
    state.angleDeg != null && Number.isFinite(state.angleDeg) ? state.angleDeg : 0

  const sin = state.sin
  const cos = state.cos
  const tan = state.tan
  const voicings = state.shellVoicings ?? null

  // Pitch roles need only the toggle — θ picks progression step
  const wantSin = !!sin?.show
  const wantCos = !!cos?.show
  const wantTan = !!tan?.show

  // Shell: sin=root, tan=3rd, cos=7th (pitches from defaults or staff drag)
  processShellChord(
    angleDeg,
    { sin: wantSin, cos: wantCos, tan: wantTan },
    {
      sin: sin?.value != null && Number.isFinite(sin.value) ? sin.value : 0.55,
      cos: cos?.value != null && Number.isFinite(cos.value) ? cos.value : 0.55,
      tan: tan?.value != null && Number.isFinite(tan.value) ? tan.value : 0.55,
    },
    voicings
  )

  if (!samplesReady) return

  for (const key of PERC_KEYS) {
    processPerc(key, state[key], now)
  }
  processCotHatRoll(state.cot, now)
}

export function muteAll() {
  lastChordStep = -1
  lastVoicingFp = ''
  lastArpNote.sin = null
  lastArpNote.cos = null
  lastArpNote.tan = null
  for (const key of PERC_KEYS) {
    valleyArmed[key] = true
  }
  rollNextAt.cot = 0
}

export function disposeTrigMusic() {
  muteAll()
  for (const key of PERC_KEYS) {
    coolUntil[key] = 0
  }
  activeVoices = 0
}

export const COLOR_BASE_FREQ = {
  sin: midiToFreq(stepToMidi(0)),
  cos: midiToFreq(stepToMidi(0) + 11),
}
