/**
 * Graph-tied kit:
 *   Piano (4-note shells) — sine & cosine family (Grand Piano or Electric):
 *     sin → root · cos → 3rd · −sin → 5th · −cos → 7th
 *   Hats — tan & cot family (Cymatics closed hi-hats):
 *     tan / cot / tan⁻¹ / cot⁻¹ → distinct closed hats
 *   Kick & perc — csc & sec family:
 *     sec / sec⁻¹ → kicks · csc / csc⁻¹ → percs
 *
 *   Graph keys: asin/acos = phase flips −sin/−cos; atan/acot/asec/acsc = true inverse trig.
 *
 *   Opening Giant Steps excerpt (4 bars · 4/4 · 2 chords/bar). Staff editable;
 *   key signature manual; time 4/4 fixed.
 *   Colour: one key colour for pure I–IV–V (no key-sig change); CoF rainbow when
 *   roots travel / modulate (e.g. C–F–G–D–Em adds F♯ territory).
 *
 * Samples: Ableton grand multi + MPC F9 Uber Tines + Cymatics drums
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
 * cosInt / asinInt / acosInt = semitones above root for piano voices.
 *   sin   = root
 *   cos   = 3rd
 *   asin  = 5th   (−sin voice)
 *   acos  = 7th   (−cos voice)  — or octave (12) for plain triads
 */
export const GIANT_STEPS = [
  { pc: 11, quality: 'maj7', cosInt: 4, asinInt: 7, acosInt: 11, suffix: '' }, // B
  { pc: 2, quality: 'dom7', cosInt: 4, asinInt: 7, acosInt: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', cosInt: 4, asinInt: 7, acosInt: 11, suffix: '' }, // G
  { pc: 10, quality: 'dom7', cosInt: 4, asinInt: 7, acosInt: 10, suffix: '7' }, // B♭7
  { pc: 3, quality: 'maj7', cosInt: 4, asinInt: 7, acosInt: 11, suffix: '' }, // E♭
  { pc: 9, quality: 'm7', cosInt: 3, asinInt: 7, acosInt: 10, suffix: 'm7' }, // Am7
  { pc: 2, quality: 'dom7', cosInt: 4, asinInt: 7, acosInt: 10, suffix: '7' }, // D7
  { pc: 7, quality: 'maj7', cosInt: 4, asinInt: 7, acosInt: 11, suffix: '' }, // G
]

/** Maximum stations per θ revolution (hard cap). */
export const MAX_PROGRESSION_STEPS = 8
/**
 * Default step count when no custom progression is set (= Giant Steps length).
 * Prefer getActiveStepCount(voicings) for the live length (1…MAX).
 */
export const ARP_STEPS_PER_REV = GIANT_STEPS.length

/** @deprecated alias — older Spectrum Cycle name */
export const SPECTRUM_CYCLE = GIANT_STEPS

/** True if override is a complete 4-note shell. */
export function isShellVoicing(v) {
  return !!(
    v &&
    Number.isFinite(v.root) &&
    Number.isFinite(v.cos) &&
    Number.isFinite(v.asin) &&
    Number.isFinite(v.acos)
  )
}

/**
 * Active progression length: 1…MAX.
 * - All slots empty → default Giant Steps length (8)
 * - Custom slots set → last contiguous filled slot from the left (no minimum)
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 */
export function getActiveStepCount(voicings = null) {
  if (!voicings || !voicings.length) return ARP_STEPS_PER_REV
  let last = -1
  const lim = Math.min(MAX_PROGRESSION_STEPS, Math.max(voicings.length, ARP_STEPS_PER_REV))
  for (let i = 0; i < lim; i++) {
    if (isShellVoicing(voicings[i])) last = i
  }
  if (last < 0) return ARP_STEPS_PER_REV
  return last + 1
}

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
      asinInt: 7,
      acosInt: 12,
    }
  }
  const pcs = [...new Set(raw.map((m) => ((m % 12) + 12) % 12))]
  const bassPc = ((Math.min(...raw) % 12) + 12) % 12

  /** @type {{ score: number, rootPc: number, quality: string, suffix: string, cosInt: number, asinInt: number, acosInt: number } | null} */
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

    /** cos=3rd, asin=5th, acos=7th|octave (semitones from root) */
    /** @type {{ quality: string, suffix: string, score: number, cosInt: number, asinInt: number, acosInt: number }[]} */
    const cands = []
    // Prefer full 4-note 7ths; triads use octave as 4th voice
    if (has4 && has7 && has11)
      cands.push({ quality: 'maj7', suffix: 'maj7', score: 16, cosInt: 4, asinInt: 7, acosInt: 11 })
    if (has4 && has7 && has10)
      cands.push({ quality: 'dom7', suffix: '7', score: 16, cosInt: 4, asinInt: 7, acosInt: 10 })
    if (has3 && has7 && has10)
      cands.push({ quality: 'm7', suffix: 'm7', score: 16, cosInt: 3, asinInt: 7, acosInt: 10 })
    if (has3 && has7 && has11)
      cands.push({ quality: 'm(maj7)', suffix: 'm(maj7)', score: 15, cosInt: 3, asinInt: 7, acosInt: 11 })
    if (has3 && has6 && has10)
      cands.push({ quality: 'ø7', suffix: 'ø7', score: 14, cosInt: 3, asinInt: 6, acosInt: 10 })
    if (has4 && has7)
      cands.push({ quality: 'maj', suffix: '', score: 13, cosInt: 4, asinInt: 7, acosInt: 12 })
    if (has3 && has7)
      cands.push({ quality: 'min', suffix: 'm', score: 13, cosInt: 3, asinInt: 7, acosInt: 12 })
    if (has4 && has11)
      cands.push({ quality: 'maj7', suffix: 'maj7', score: 12, cosInt: 4, asinInt: 7, acosInt: 11 })
    if (has4 && has10)
      cands.push({ quality: 'dom7', suffix: '7', score: 12, cosInt: 4, asinInt: 7, acosInt: 10 })
    if (has3 && has10)
      cands.push({ quality: 'm7', suffix: 'm7', score: 12, cosInt: 3, asinInt: 7, acosInt: 10 })
    if (has3 && has6 && !has10)
      cands.push({ quality: 'dim', suffix: 'dim', score: 8, cosInt: 3, asinInt: 6, acosInt: 9 })
    if (has4 && has8)
      cands.push({ quality: 'aug', suffix: 'aug', score: 7, cosInt: 4, asinInt: 8, acosInt: 12 })
    if (has4 && !has3 && !has10 && !has11 && !has7)
      cands.push({ quality: 'maj?', suffix: '', score: 3, cosInt: 4, asinInt: 7, acosInt: 12 })
    if (has3 && !has4 && !has10 && !has11 && !has7)
      cands.push({ quality: 'min?', suffix: 'm', score: 3, cosInt: 3, asinInt: 7, acosInt: 12 })
    if (cands.length === 0)
      cands.push({ quality: 'pc', suffix: '', score: 1, cosInt: 4, asinInt: 7, acosInt: 12 })

    for (const c of cands) {
      let score = c.score
      if (rootPc === bassPc) score += 2.5
      if (pcs.length >= 3 && (c.suffix.includes('7') || c.suffix === 'maj7')) score += 0.5
      if (pcs.length >= 4) score += 1
      if (!best || score > best.score) {
        best = {
          score,
          rootPc,
          quality: c.quality,
          suffix: c.suffix,
          cosInt: c.cosInt,
          asinInt: c.asinInt,
          acosInt: c.acosInt,
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
    asinInt: best?.asinInt ?? 7,
    acosInt: best?.acosInt ?? 12,
    /** @deprecated use acosInt */
    tanInt: best?.acosInt ?? 12,
  }
}

/**
 * Parse a typed chord symbol → root + 3rd/5th/7th intervals.
 * Robust for simple triads: C, Am, F, G, Bb, C#, "C major", "D minor".
 * Sevenths: D7, Gmaj7, Am7, etc. Four-note shells always.
 *
 * @param {string} text
 * @returns {{ rootPc: number, cosInt: number, asinInt: number, acosInt: number, quality: string, suffix: string, symbol: string } | null}
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

  /** @type {{ cosInt: number, asinInt: number, acosInt: number, quality: string, suffix: string }} */
  let spec
  switch (qual) {
    case 'maj':
      spec = { cosInt: 4, asinInt: 7, acosInt: 12, quality: 'maj', suffix: '' }
      break
    case 'm':
      spec = { cosInt: 3, asinInt: 7, acosInt: 12, quality: 'min', suffix: 'm' }
      break
    case 'maj7':
      spec = { cosInt: 4, asinInt: 7, acosInt: 11, quality: 'maj7', suffix: 'maj7' }
      break
    case '7':
      spec = { cosInt: 4, asinInt: 7, acosInt: 10, quality: 'dom7', suffix: '7' }
      break
    case 'm7':
      spec = { cosInt: 3, asinInt: 7, acosInt: 10, quality: 'm7', suffix: 'm7' }
      break
    case 'mmaj7':
      spec = { cosInt: 3, asinInt: 7, acosInt: 11, quality: 'm(maj7)', suffix: 'm(maj7)' }
      break
    case 'm7b5':
      spec = { cosInt: 3, asinInt: 6, acosInt: 10, quality: 'ø7', suffix: 'ø7' }
      break
    case 'dim':
    case 'dim7':
      spec = { cosInt: 3, asinInt: 6, acosInt: 9, quality: 'dim7', suffix: 'dim7' }
      break
    case 'aug':
      spec = { cosInt: 4, asinInt: 8, acosInt: 12, quality: 'aug', suffix: 'aug' }
      break
    case '6':
      spec = { cosInt: 4, asinInt: 7, acosInt: 9, quality: '6', suffix: '6' }
      break
    case 'm6':
      spec = { cosInt: 3, asinInt: 7, acosInt: 9, quality: 'm6', suffix: 'm6' }
      break
    case '5':
      spec = { cosInt: 7, asinInt: 12, acosInt: 19, quality: '5', suffix: '5' }
      break
    default:
      // Unknown tail → still major triad so typing never "does nothing"
      spec = { cosInt: 4, asinInt: 7, acosInt: 12, quality: 'maj', suffix: '' }
  }

  const preferFlats = acc === 'b' || [1, 3, 6, 8, 10].includes(rootPc)
  const rootName = pcToName(rootPc, preferFlats && acc !== '#')
  const symbol = spec.suffix === '' ? rootName : `${rootName}${spec.suffix}`

  return {
    rootPc,
    cosInt: spec.cosInt,
    asinInt: spec.asinInt,
    acosInt: spec.acosInt,
    /** @deprecated use acosInt */
    tanInt: spec.acosInt,
    quality: spec.quality,
    suffix: spec.suffix,
    symbol,
  }
}

/**
 * Strict root-position 4-note voicing: root < 3rd < 5th < 7th|octave.
 * sin=root, cos=3rd, asin=5th, acos=7th.
 *
 * @param {number} rootPc
 * @param {number} cosInt
 * @param {number} asinInt
 * @param {number} [acosInt]
 * @returns {ShellVoicing}
 */
export function buildShellVoicing(rootPc, cosInt, asinInt, acosInt = 12) {
  // Backward compat: old call buildShellVoicing(pc, cosInt, tanInt) with 3 args
  // when third arg was tanInt (7th) and fourth omitted — treat third as acos if it looks like 7th
  let third = cosInt
  let fifth = asinInt
  let seventh = acosInt
  if (arguments.length === 3 && (asinInt === 10 || asinInt === 11 || asinInt === 9)) {
    // Legacy (rootPc, cosInt, tanInt) without 5th
    fifth = 7
    seventh = asinInt
  }

  const pc = ((rootPc % 12) + 12) % 12
  let root = ARP_ROOT_BASE + pc // C3 + pc
  if (root < 48) root += 12
  let cos = root + third
  let asin = root + fifth
  let acos = root + seventh
  // Guarantee ascending root < cos < asin < acos
  while (cos <= root) cos += 12
  while (asin <= cos) asin += 12
  while (acos <= asin) acos += 12
  // Cap top note for speakers / staff
  while (acos > 88 && root > 48) {
    root -= 12
    cos -= 12
    asin -= 12
    acos -= 12
  }
  return { root, cos, asin, acos }
}

/**
 * Parse a whole progression string into up to N chord symbols.
 * Accepts: "C Am F G" | "C | Am | F | G" | "C, Am, F, G"
 * @param {string} text
 * @param {number} [max]
 * @returns {ReturnType<typeof parseChordSymbol>[]}
 */
export function parseProgressionString(text, max = MAX_PROGRESSION_STEPS) {
  if (!text || typeof text !== 'string') return []
  const parts = text
    .split(/[|,\n\t]+|\s{2,}/)
    .flatMap((p) => p.trim().split(/\s+/))
    .map((p) => p.trim())
    .filter(Boolean)
  const out = []
  const cap = Math.max(1, Math.min(MAX_PROGRESSION_STEPS, max || MAX_PROGRESSION_STEPS))
  for (const part of parts) {
    if (out.length >= cap) break
    const parsed = parseChordSymbol(part)
    if (parsed) out.push(parsed)
  }
  return out
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

/** Diatonic pitch classes of a major key. */
function majorDiatonicPcs(tonic) {
  const t = ((tonic % 12) + 12) % 12
  return new Set([0, 2, 4, 5, 7, 9, 11].map((d) => (t + d) % 12))
}

/** Scale degree 0–11 of root relative to tonic. */
function scaleDegree(rootPc, tonic) {
  return (((rootPc % 12) + 12) % 12 - ((tonic % 12) + 12) % 12 + 12) % 12
}

function isDom7Quality(q) {
  return q === 'dom7' || q === '7'
}
function isMajorish(q) {
  return (
    q === 'maj' ||
    q === 'maj7' ||
    q === 'maj?' ||
    q === 'dom7' ||
    q === '6' ||
    q === 'aug' ||
    q === '' ||
    q === 'pc'
  )
}
function isMinorish(q) {
  return q === 'min' || q === 'm7' || q === 'm(maj7)' || q === 'min?' || q === 'm' || q === 'ø7' || q === 'dim'
}

/**
 * Does this chord (root + quality) sit diatonically in major key `tonic`?
 * Major triads only on I/IV/V; minor on ii/iii/vi; V7 allowed on V.
 */
function chordFitsMajorKey(rootPc, quality, tonic) {
  const scale = majorDiatonicPcs(tonic)
  const r = ((rootPc % 12) + 12) % 12
  if (!scale.has(r)) return false
  const deg = scaleDegree(r, tonic)
  if (isDom7Quality(quality)) return deg === 7
  if (isMinorish(quality)) return deg === 2 || deg === 4 || deg === 9 || deg === 11
  if (isMajorish(quality)) return deg === 0 || deg === 5 || deg === 7
  return true
}

/**
 * Collect { rootPc, quality } for each active step.
 * @param {(ShellVoicing | null | undefined)[] | null} voicings
 */
export function progressionChordSpecs(voicings = null) {
  const specs = []
  const n = getActiveStepCount(voicings)
  for (let i = 0; i < n; i++) {
    const v = resolveShellVoicing(i, voicings?.[i])
    const a = analyzeChordFromMidis([v.root, v.cos, v.asin, v.acos])
    specs.push({ rootPc: a.rootPc, quality: a.quality, suffix: a.suffix })
  }
  return specs
}

/**
 * Collect root PCs from progression defaults + voicing overrides.
 * @param {(ShellVoicing | null | undefined)[] | null} voicings
 */
export function progressionRootPcs(voicings = null) {
  return progressionChordSpecs(voicings).map((s) => s.rootPc)
}

/**
 * Colour = CoF colour of each chord’s *key centre* (not raw root).
 *
 * Examples:
 *   C G7 C G D Em D7 G     → centres C then G → 2 colours
 *   C G7 C G D7 G D A7 D   → centres C, G, D → 3 colours
 *   C Am F G               → all C → 1 colour
 *
 * Rules (left→right):
 *   1. Dominant 7th → centre = resolution tonic (root − 7)  e.g. D7 → G
 *   2. Else if chord fits previous centre diatonically → keep previous
 *   3. Else major triad as V of (root−7) one fifth away from prev → that target
 *   4. Else major → centre = root (new I); minor → relative major
 *
 * @param {(ShellVoicing | null | undefined)[] | number[] | null} voicingsOrRoots
 * @returns {{
 *   mode: 'IVV' | 'cof',
 *   tonic: number,
 *   centres: number[],
 *   uniqueCentres: number[],
 *   keyCount: number,
 *   keySigFifths: number,
 * }}
 */
export function detectProgressionHarmony(voicingsOrRoots = null) {
  /** @type {{ rootPc: number, quality: string }[]} */
  let specs
  if (Array.isArray(voicingsOrRoots) && voicingsOrRoots.length > 0 && typeof voicingsOrRoots[0] === 'number') {
    // Legacy: bare root PCs (quality unknown → treat as major-ish)
    specs = voicingsOrRoots.map((r) => ({
      rootPc: ((r % 12) + 12) % 12,
      quality: 'maj',
    }))
  } else {
    specs = progressionChordSpecs(voicingsOrRoots)
  }

  if (specs.length === 0) {
    return {
      mode: 'cof',
      tonic: 0,
      centres: [],
      uniqueCentres: [],
      keyCount: 0,
      keySigFifths: 0,
    }
  }

  /** @type {number[]} */
  const centres = []
  let prev = /** @type {number | null} */ (null)

  for (const s of specs) {
    const root = ((s.rootPc % 12) + 12) % 12
    const q = s.quality || 'maj'
    let centre

    if (isDom7Quality(q)) {
      // V7 → centre is the tonic it tonicizes
      centre = (root - 7 + 12) % 12
    } else if (prev != null && chordFitsMajorKey(root, q, prev)) {
      centre = prev
    } else if (isMajorish(q) && !isDom7Quality(q)) {
      // Major triad that doesn't fit prev: prefer secondary-dominant (as V) if
      // that lands one fifth up the CoF from prev (C→G→D…)
      const asVtarget = (root - 7 + 12) % 12
      if (prev != null) {
        const prevFifths = pitchClassToFifthsIndex(prev)
        const tgtFifths = pitchClassToFifthsIndex(asVtarget)
        const dist = (tgtFifths - prevFifths + 12) % 12
        // One step sharpward on CoF (C→G→D→A…)
        if (dist === 1) centre = asVtarget
        else centre = root // new I
      } else {
        centre = root
      }
    } else if (isMinorish(q)) {
      // Relative major as default centre, unless prev still fits
      if (prev != null && chordFitsMajorKey(root, q, prev)) centre = prev
      else centre = (root + 3) % 12
    } else {
      centre = prev != null ? prev : root
    }

    centres.push(centre)
    prev = centre
  }

  const uniqueCentres = [...new Set(centres)]
  const tonic = centres[0] ?? 0
  const keyCount = uniqueCentres.length
  // 'IVV' = single key centre (1 colour); 'cof' = multiple centres
  const mode = keyCount <= 1 ? 'IVV' : 'cof'

  return {
    mode,
    tonic,
    centres,
    uniqueCentres,
    keyCount,
    keySigFifths: majorKeyToFifths(tonic),
  }
}

/**
 * Colour for a progression step (preferred) or root PC (fallback).
 * @param {number} rootPc
 * @param {{ mode?: string, tonic?: number, centres?: number[] }} harmony
 * @param {number} [step] step index for multi-key colouring
 */
export function colorForProgressionRoot(rootPc, harmony, step = null) {
  if (
    step != null &&
    harmony?.centres &&
    Number.isFinite(harmony.centres[step])
  ) {
    const c = ((harmony.centres[step] % 12) + 12) % 12
    return COF_RAINBOW[pitchClassToFifthsIndex(c)] ?? '#94a3b8'
  }
  // Single-key: whole progression uses tonic colour
  if (harmony?.mode === 'IVV' && Number.isFinite(harmony.tonic)) {
    const tonic = ((harmony.tonic % 12) + 12) % 12
    return COF_RAINBOW[pitchClassToFifthsIndex(tonic)] ?? '#94a3b8'
  }
  // Fallback: colour by root on CoF
  const pc = ((rootPc % 12) + 12) % 12
  return COF_RAINBOW[pitchClassToFifthsIndex(pc)] ?? '#94a3b8'
}

/** Colour for a key-centre pitch class. */
export function colorForKeyCentre(centrePc) {
  const c = ((centrePc % 12) + 12) % 12
  return COF_RAINBOW[pitchClassToFifthsIndex(c)] ?? '#94a3b8'
}

/**
 * Key-signature fifths: -7…+7 (negative = flats, positive = sharps).
 * 0 = C major / A minor (no accidentals).
 */
export const KEY_SIG_MIN = -7
export const KEY_SIG_MAX = 7

/** Fixed time signature for Music score (not editable). */
export const SCORE_TIME_SIG = { beats: 4, unit: 4 }
/** Default bars per θ revolution when using full Giant Steps (8 changes). */
export const SCORE_BARS_PER_REV = 4
export const SCORE_CHORDS_PER_BAR = 2
/** Max chords per θ turn (no minimum — 1 chord is allowed). */
export const MAX_CHORDS_PER_REV = MAX_PROGRESSION_STEPS

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

/**
 * θ → progression step index.
 * @param {number} angleDeg
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings] for active length
 */
export function angleToStep(angleDeg, voicings = null) {
  const n = Math.max(1, getActiveStepCount(voicings))
  const t = ((angleDeg % 360) + 360) % 360
  return Math.floor((t / 360) * n) % n
}

/**
 * MIDI voicing for four piano voices:
 *   root → sin, cos → 3rd, asin → 5th, acos → 7th
 * @typedef {{ root: number, cos: number, asin: number, acos: number }} ShellVoicing
 */

/**
 * Default voicing for a progression step (treble-friendly register).
 * @param {number} step
 * @returns {ShellVoicing}
 */
export function defaultShellVoicing(step) {
  const k =
    ((Math.floor(step) % GIANT_STEPS.length) + GIANT_STEPS.length) %
    GIANT_STEPS.length
  const spec = GIANT_STEPS[k] ?? GIANT_STEPS[0]
  const rootPc = ((spec.pc % 12) + 12) % 12
  let root = ARP_ROOT_BASE + rootPc
  let cos = root + spec.cosInt
  let asin = root + (spec.asinInt ?? 7)
  let acos = root + (spec.acosInt ?? 11)
  while (root < 55) {
    root += 12
    cos += 12
    asin += 12
    acos += 12
  }
  while (acos > 86) {
    root -= 12
    cos -= 12
    asin -= 12
    acos -= 12
  }
  return { root, cos, asin, acos }
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
    Number.isFinite(override.asin) &&
    Number.isFinite(override.acos)
  ) {
    return {
      root: Math.round(override.root),
      cos: Math.round(override.cos),
      asin: Math.round(override.asin),
      acos: Math.round(override.acos),
    }
  }
  // Migrate legacy 3-note { root, cos, tan }
  if (
    override &&
    Number.isFinite(override.root) &&
    Number.isFinite(override.cos) &&
    Number.isFinite(/** @type {any} */ (override).tan) &&
    !Number.isFinite(override.asin)
  ) {
    const root = Math.round(override.root)
    const cos = Math.round(override.cos)
    const tan = Math.round(/** @type {any} */ (override).tan)
    const tanIv = ((tan - root) % 12 + 12) % 12
    let asin
    let acos
    if (tanIv === 10 || tanIv === 11 || tanIv === 9) {
      asin = root + 7
      while (asin <= cos) asin += 12
      acos = tan
      while (acos <= asin) acos += 12
    } else {
      asin = tan
      while (asin <= cos) asin += 12
      acos = root + 12
      while (acos <= asin) acos += 12
    }
    return { root, cos, asin, acos }
  }
  // Migrate legacy { third, seventh }
  if (
    override &&
    Number.isFinite(override.root) &&
    Number.isFinite(/** @type {any} */ (override).third) &&
    Number.isFinite(/** @type {any} */ (override).seventh)
  ) {
    const root = Math.round(override.root)
    const cos = Math.round(/** @type {any} */ (override).third)
    let asin = root + 7
    while (asin <= cos) asin += 12
    let acos = Math.round(/** @type {any} */ (override).seventh)
    while (acos <= asin) acos += 12
    return { root, cos, asin, acos }
  }
  return defaultShellVoicing(step)
}

/**
 * @param {number} angleDeg
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 * @param {number} [keySigFifths]
 */
export function chordAtAngle(angleDeg, voicings = null, keySigFifths = 0) {
  const step = angleToStep(angleDeg, voicings)
  const spec = GIANT_STEPS[step % GIANT_STEPS.length] ?? GIANT_STEPS[0]
  const chartRootPc = ((spec.pc % 12) + 12) % 12
  const rad = (angleDeg * Math.PI) / 180
  const s = Math.sin(rad)
  const c = Math.cos(rad)
  const v = resolveShellVoicing(step, voicings?.[step])
  const harmony = detectProgressionHarmony(voicings)
  const analyzed = analyzeChordFromMidis([v.root, v.cos, v.asin, v.acos], {
    preferFlats: preferFlatsFromKeySig(keySigFifths),
    colorForRoot: (pc) => colorForProgressionRoot(pc, harmony, step),
  })
  const rootPc = analyzed.rootPc
  const fifthsIndex = analyzed.fifthsIndex

  return {
    step,
    rootPc,
    chartRootPc,
    root: v.root,
    cos: v.cos,
    asin: v.asin,
    acos: v.acos,
    /** @deprecated alias for acos */
    tan: v.acos,
    cosInt: spec.cosInt,
    asinInt: spec.asinInt ?? 7,
    acosInt: spec.acosInt ?? 11,
    tanInt: spec.acosInt ?? 11,
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
 * @param {'sin' | 'cos' | 'asin' | 'acos'} voice
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 * @param {number} [keySigFifths]
 */
export function arpInfo(angleDeg, voice = 'sin', voicings = null, keySigFifths = 0) {
  const ch = chordAtAngle(angleDeg, voicings, keySigFifths)
  const role = voice === 'sin' ? 'root' : voice
  let midi = ch.root
  if (voice === 'cos') midi = ch.cos
  else if (voice === 'asin') midi = ch.asin
  else if (voice === 'acos' || voice === 'tan') midi = ch.acos
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
    asin: ch.asin,
    acos: ch.acos,
    tan: ch.acos,
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
  playArpNote('sin', Math.round(midi), 0.45, 0.4, 0, pianoInstrument)
}

export function isInstrumentReady(id) {
  return !!instReady[id] && zonesFor(id).length > 0
}

/** Root MIDI at progression step (for legacy helpers). */
export function stepToMidi(step) {
  const k =
    ((Math.floor(step) % GIANT_STEPS.length) + GIANT_STEPS.length) %
    GIANT_STEPS.length
  const pc = ((GIANT_STEPS[k]?.pc ?? 0) % 12 + 12) % 12
  return ARP_ROOT_BASE + pc
}

// ——— Percussion samples (Cymatics Terror drum rack) ———

const SAMPLE_URLS = {
  // Closed hats — tan / cot family
  'hat-tan': '/samples/hat-tan.wav',
  'hat-cot': '/samples/hat-cot.wav',
  'hat-atan': '/samples/hat-atan.wav',
  'hat-acot': '/samples/hat-acot.wav',
  hat: '/samples/hat.wav',
  // Kicks — sec family
  'kick-sec': '/samples/kick-sec.wav',
  'kick-asec': '/samples/kick-asec.wav',
  kick: '/samples/kick.wav',
  // Perc — csc family
  'perc-csc': '/samples/perc-csc.wav',
  'perc-acsc': '/samples/perc-acsc.wav',
  snare: '/samples/snare.wav',
}

/**
 * Shell instruments — multisamples only:
 *
 *   grand    ← Ableton Live Grand Piano (mf multi) — warmer than F9 Club Piano X
 *   electric ← MPC F9 “Uber Tines” soft layer (vel 068) — best EP multi on this machine
 *
 * Club Piano X (MPC) is denser but bright/upright; soft Ableton grand sits better
 * for jazz shells. AIR Electric “El Piano 1” is DSP-only (.xpl, no WAVs).
 */
/** @typedef {'grand' | 'electric'} PianoInstrumentId */

/** @type {PianoInstrumentId} */
let pianoInstrument = 'grand'

/** Build zone list from sequential MIDI numbers → /samples/mpc/<folder>/<midi>.wav */
function zonesFromMidis(folder, midis) {
  return midis.map((midi) => ({
    midi,
    url: `/samples/mpc/${folder}/${String(midi).padStart(3, '0')}.wav`,
  }))
}

// Uber Tines soft layer: even MIDI 36…72
const UBER_TINES_MIDIS = Array.from({ length: 19 }, (_, i) => 36 + i * 2)

/** @type {Record<PianoInstrumentId, { midi: number, url: string }[]>} */
const INSTRUMENT_SPECS = {
  // Ableton Core Library Grand Piano mf — less “honky-tonk” than Club Piano X
  grand: [
    { midi: 25, file: 'GrandPiano_C#0_mf.aif' },
    { midi: 28, file: 'GrandPiano_E0_mf.aif' },
    { midi: 31, file: 'GrandPiano_G0_mf.aif' },
    { midi: 33, file: 'GrandPiano_A0_mf.aif' },
    { midi: 36, file: 'GrandPiano_C1_mf.aif' },
    { midi: 39, file: 'GrandPiano_D#1_mf.aif' },
    { midi: 42, file: 'GrandPiano_F#1_mf.aif' },
    { midi: 45, file: 'GrandPiano_A1_mf.aif' },
    { midi: 46, file: 'GrandPiano_A#_1_mf.aif' },
    { midi: 48, file: 'GrandPiano_C2_mf.aif' },
    { midi: 51, file: 'GrandPiano_D#2_mf.aif' },
    { midi: 54, file: 'GrandPiano_F#2_mf.aif' },
    { midi: 57, file: 'GrandPiano_A2_mf.aif' },
    { midi: 60, file: 'GrandPiano_C3_mf.aif' },
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
  ].map(({ midi, file }) => ({
    midi,
    url: `/samples/piano/${encodeURIComponent(file)}`,
  })),
  electric: zonesFromMidis('uber-tines', UBER_TINES_MIDIS),
}

/** Valley-triggered one-shots: kicks + percs */
const PERC_KEYS = ['sec', 'asec', 'csc', 'acsc']
const PERC = {
  sec: { sample: 'kick-sec', gain: 0.95 },
  asec: { sample: 'kick-asec', gain: 0.9 },
  csc: { sample: 'perc-csc', gain: 0.85 },
  acsc: { sample: 'perc-acsc', gain: 0.8 },
}
const COOLDOWN = { sec: 0.12, asec: 0.12, csc: 0.12, acsc: 0.12 }

/** Closed-hat rolls — tan / cot family */
const HAT_ROLL_KEYS = ['tan', 'cot', 'atan', 'acot']
const HAT_ROLL = {
  tan: { sample: 'hat-tan', gain: 0.55 },
  cot: { sample: 'hat-cot', gain: 0.5 },
  atan: { sample: 'hat-atan', gain: 0.48 },
  acot: { sample: 'hat-acot', gain: 0.48 },
}
const ROLL_MIN_HZ = 3
const ROLL_MAX_HZ = 32
const ROLL_ABS_FOR_MAX = 8

/** Piano shell gains / stagger: sin root → cos 3rd → asin 5th → acos 7th */
const ARP_GAIN = { sin: 0.52, cos: 0.42, asin: 0.38, acos: 0.4 }
const ARP_ATTACK = 0.005
const ARP_DECAY = 1.8
const ARP_MAX_VOICES = 18
const SHELL_STAGGER = { sin: 0, cos: 0.03, asin: 0.06, acos: 0.09 }

let ctx = null

/** @type {Record<string, AudioBuffer | null>} */
const buffers = Object.fromEntries(
  Object.keys(SAMPLE_URLS).map((k) => [k, null])
)

/**
 * @typedef {{ midi: number, buffer: AudioBuffer }} SampleZone
 * @type {Record<PianoInstrumentId, SampleZone[]>}
 */
const zonesByInst = { grand: [], electric: [] }
/** @type {Record<PianoInstrumentId, boolean>} */
const instReady = { grand: false, electric: false }

let loadPromise = null
let samplesReady = false
/** @type {Record<PianoInstrumentId, Promise<void> | null>} */
const instLoadPromise = { grand: null, electric: null }

function zonesFor(id) {
  return zonesByInst[id] ?? []
}

const valleyArmed = { sec: true, asec: true, csc: true, acsc: true }
const coolUntil = { sec: 0, asec: 0, csc: 0, acsc: 0 }
/** @type {Record<string, number>} */
const rollNextAt = { tan: 0, cot: 0, atan: 0, acot: 0 }

/** Shared progression step so the shell fires as one chord */
let lastChordStep = -1
/** Fingerprint of last played voicing (re-fire when user retunes) */
let lastVoicingFp = ''
/** @type {Record<'sin'|'cos'|'asin'|'acos', ReturnType<typeof arpInfo> | null>} */
const lastArpNote = { sin: null, cos: null, asin: null, acos: null }

let activeVoices = 0
/** @type {{ stop: () => void }[]} live shell sources (grand buffers + BD-sin oscs) */
let liveShellNodes = []

function trackShellNode(node) {
  liveShellNodes.push(node)
  // prune finished quietly
  if (liveShellNodes.length > 64) {
    liveShellNodes = liveShellNodes.slice(-32)
  }
}

/** Hard-stop every shell voice (needed when switching Grand ↔ BD Sin). */
export function stopAllShellVoices() {
  for (const n of liveShellNodes) {
    try {
      n.stop()
    } catch {
      /* already stopped */
    }
  }
  liveShellNodes = []
  activeVoices = 0
}

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

async function decodeUrl(audio, url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  const raw = await res.arrayBuffer()
  return audio.decodeAudioData(raw.slice(0))
}

/**
 * @param {number} midi
 * @param {PianoInstrumentId} id
 */
function nearestZone(midi, id) {
  const zones = zonesFor(id)
  if (!zones.length) return null
  let best = zones[0]
  let bestDist = Math.abs(best.midi - midi)
  for (let i = 1; i < zones.length; i++) {
    const z = zones[i]
    const d = Math.abs(z.midi - midi)
    if (d < bestDist) {
      best = z
      bestDist = d
    }
  }
  return best
}

/**
 * @param {AudioContext} audio
 * @param {PianoInstrumentId} id
 */
async function loadInstrumentZones(audio, id) {
  if (zonesByInst[id].length > 0) {
    instReady[id] = true
    return
  }
  if (instLoadPromise[id]) return instLoadPromise[id]
  const spec = INSTRUMENT_SPECS[id]
  if (!spec?.length) {
    instReady[id] = false
    return
  }
  instLoadPromise[id] = (async () => {
    const zones = []
    await Promise.all(
      spec.map(async ({ midi, url }) => {
        try {
          const buffer = await decodeUrl(audio, url)
          zones.push({ midi, buffer })
        } catch (err) {
          console.warn(`[trigMusic] ${id} sample failed`, url, err)
        }
      })
    )
    zones.sort((a, b) => a.midi - b.midi)
    zonesByInst[id] = zones
    instReady[id] = zones.length > 0
    const label =
      id === 'grand' ? 'Ableton Grand Piano (mf)' : 'MPC F9 Uber Tines soft (vel 068)'
    if (instReady[id]) {
      console.info(`[trigMusic] ${label} loaded (${zones.length} zone(s))`)
    } else {
      console.warn(`[trigMusic] ${label}: 0 zones — check public/samples/`)
    }
    instLoadPromise[id] = null
  })()
  return instLoadPromise[id]
}

function loadSamples() {
  const needGrand = !instReady.grand
  const needEp = !instReady.electric
  if (samplesReady && !needGrand && !needEp) return Promise.resolve()
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
      loadInstrumentZones(audio, 'grand'),
      loadInstrumentZones(audio, 'electric'),
    ])
    samplesReady = true
    loadPromise = null
  })()
  return loadPromise
}

/** @returns {PianoInstrumentId} */
export function getPianoInstrument() {
  return pianoInstrument
}

/**
 * Switch shell instrument: Grand Piano multi ↔ E-Piano samples.
 * Stops hanging notes; does NOT play an extra audition chord (avoids double-fire).
 * @param {PianoInstrumentId} id
 */
export function setPianoInstrument(id) {
  if (id !== 'grand' && id !== 'electric') return pianoInstrument
  const changed = pianoInstrument !== id
  pianoInstrument = id
  lastChordStep = -1
  lastVoicingFp = ''
  if (changed) stopAllShellVoices()
  const audio = ensureCtx()
  if (audio && !zonesFor(id).length) {
    loadInstrumentZones(audio, id)
  } else if (!samplesReady) {
    loadSamples()
  }
  return pianoInstrument
}

/** Reset chord gate so the next processShellChord fires once. */
export function retriggerShellChord() {
  lastChordStep = -1
  lastVoicingFp = ''
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

// ——— Shell-chord note ———

/**
 * Play one shell voice from the active sample bank (Grand multi or E-Piano one-shots).
 * @param {'sin' | 'cos' | 'asin' | 'acos'} voice
 * @param {number} midi
 * @param {number} vel 0..1
 * @param {number} brightness 0..1
 * @param {number} [delay] seconds
 * @param {PianoInstrumentId} [instrument]
 */
function playArpNote(
  voice,
  midi,
  vel,
  brightness = 0,
  delay = 0,
  instrument = pianoInstrument
) {
  const audio = ensureCtx()
  if (!audio || vel < 0.03 || activeVoices >= ARP_MAX_VOICES) return

  const m = Math.round(midi)
  if (m < 21 || m > 108) return

  const now = audio.currentTime + Math.max(0, delay)
  const peak =
    (ARP_GAIN[voice] ?? 0.4) * Math.min(1, Math.max(0, vel))

  // Ensure bank is loading
  if (!zonesFor(instrument).length) {
    loadInstrumentZones(audio, instrument)
  }

  const zone = nearestZone(m, instrument)
  if (zone?.buffer) {
    const src = audio.createBufferSource()
    const g = audio.createGain()
    const filter = audio.createBiquadFilter()
    src.buffer = zone.buffer
    // Dense multis — small pitch shifts only
    const rate = Math.pow(2, (m - zone.midi) / 12)
    src.playbackRate.value = Math.max(0.5, Math.min(2.0, rate))

    // Tone: grand slightly warmed; EP soft layer + darker LPF (less brittle tines)
    filter.type = 'lowpass'
    if (instrument === 'electric') {
      filter.frequency.setValueAtTime(2400 + brightness * 1800, now)
      filter.Q.setValueAtTime(0.45, now)
    } else {
      filter.frequency.setValueAtTime(4200 + brightness * 2200, now)
      filter.Q.setValueAtTime(0.35, now)
    }

    const maxDur = instrument === 'electric' ? 3.0 : 3.8
    const dur = Math.min(zone.buffer.duration, maxDur)
    const attack = instrument === 'electric' ? 0.004 : 0.007
    const sustain = instrument === 'electric' ? 0.42 : 0.55
    g.gain.setValueAtTime(0.0001, now)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), now + attack)
    g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * sustain), now + 0.3)
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.88)

    src.connect(filter)
    filter.connect(g)
    g.connect(audio.destination)
    activeVoices++
    trackShellNode(src)
    src.start(now)
    src.stop(now + dur)
    src.onended = () => {
      activeVoices = Math.max(0, activeVoices - 1)
      try {
        src.disconnect()
        filter.disconnect()
        g.disconnect()
      } catch {
        /* gone */
      }
    }
    return
  }

  // Soft placeholder until samples decode (should be rare after first load)
  const freq = midiToFreq(m)
  if (freq < 55 || freq > 4200) return
  const osc = audio.createOscillator()
  const g = audio.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, now)
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.25), now + ARP_ATTACK)
  g.gain.exponentialRampToValueAtTime(0.0001, now + ARP_ATTACK + 0.6)
  osc.connect(g)
  g.connect(audio.destination)
  activeVoices++
  trackShellNode(osc)
  osc.start(now)
  osc.stop(now + 0.7)
  osc.onended = () => {
    activeVoices = Math.max(0, activeVoices - 1)
    try {
      osc.disconnect()
      g.disconnect()
    } catch {
      /* */
    }
  }
}

/**
 * Fire 4-note shell when θ crosses a progression station (or voicing is retuned).
 * Piano voices: sin=root, cos=3rd, asin=5th, acos=7th.
 * @param {number} angleDeg
 * @param {{ sin?: boolean, cos?: boolean, asin?: boolean, acos?: boolean }} enabled
 * @param {{ sin?: number|null, cos?: number|null, asin?: number|null, acos?: number|null }} values
 * @param {(ShellVoicing | null | undefined)[] | null} [voicings]
 */
function processShellChord(angleDeg, enabled, values, voicings = null) {
  const any = enabled.sin || enabled.cos || enabled.asin || enabled.acos
  if (!any) {
    lastChordStep = -1
    lastVoicingFp = ''
    lastArpNote.sin = null
    lastArpNote.cos = null
    lastArpNote.asin = null
    lastArpNote.acos = null
    return
  }

  const inst = pianoInstrument
  if (!zonesFor(inst).length) {
    const audio = ensureCtx()
    if (audio) loadInstrumentZones(audio, inst)
  }

  const step = angleToStep(angleDeg, voicings)
  const sinInfo = enabled.sin ? arpInfo(angleDeg, 'sin', voicings) : null
  const cosInfo = enabled.cos ? arpInfo(angleDeg, 'cos', voicings) : null
  const asinInfo = enabled.asin ? arpInfo(angleDeg, 'asin', voicings) : null
  const acosInfo = enabled.acos ? arpInfo(angleDeg, 'acos', voicings) : null
  lastArpNote.sin = sinInfo
  lastArpNote.cos = cosInfo
  lastArpNote.asin = asinInfo
  lastArpNote.acos = acosInfo

  const ch = chordAtAngle(angleDeg, voicings)
  const nSteps = getActiveStepCount(voicings)
  // Include instrument + length so bank/progression changes re-fire once
  const fp = `${ch.root}:${ch.cos}:${ch.asin}:${ch.acos}:${inst}:${zonesFor(inst).length}:${nSteps}`
  if (step === lastChordStep && fp === lastVoicingFp) return
  lastChordStep = step
  lastVoicingFp = fp

  const velOf = (v) => {
    if (v == null || !Number.isFinite(v)) return 0.55
    return 0.32 + 0.68 * Math.pow(Math.min(1, Math.abs(v)), 0.7)
  }

  /** @type {const} */
  const voices = [
    ['sin', sinInfo, values.sin],
    ['cos', cosInfo, values.cos],
    ['asin', asinInfo, values.asin],
    ['acos', acosInfo, values.acos],
  ]
  for (const [voice, info, val] of voices) {
    if (!info) continue
    playArpNote(
      voice,
      info.midi,
      velOf(val),
      Math.min(1, Math.abs(val ?? 0.5)),
      SHELL_STAGGER[voice] ?? 0,
      inst
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

// ——— Closed-hat rolls (tan / cot / tan⁻¹ / cot⁻¹) ———

function rollHz(absVal) {
  const t = Math.min(1, absVal / ROLL_ABS_FOR_MAX)
  const shaped = t * t
  return ROLL_MIN_HZ + (ROLL_MAX_HZ - ROLL_MIN_HZ) * shaped
}

/**
 * @param {'tan'|'cot'|'atan'|'acot'} key
 * @param {{ show?: boolean, value?: number|null } | undefined} entry
 * @param {number} now
 */
function processHatRoll(key, entry, now) {
  const cfg = HAT_ROLL[key]
  if (!cfg) return
  if (!entry?.show) {
    rollNextAt[key] = 0
    return
  }
  const value = entry.value
  if (value == null || !Number.isFinite(value)) {
    rollNextAt[key] = 0
    return
  }

  const a = Math.abs(value)
  if (a < 0.12) {
    rollNextAt[key] = Math.max(rollNextAt[key], now + 0.2)
    return
  }

  const hz = rollHz(a)
  const interval = 1 / hz
  const vel =
    (cfg.gain ?? 0.5) * (0.55 + 0.45 * Math.min(1, a / ROLL_ABS_FOR_MAX))
  const rate = 0.92 + 0.22 * Math.min(1, a / ROLL_ABS_FOR_MAX)

  if (rollNextAt[key] === 0) rollNextAt[key] = now

  let guard = 0
  while (now >= rollNextAt[key] && guard < 4) {
    playSample(cfg.sample, vel, rate)
    rollNextAt[key] += interval
    guard++
  }
  if (now >= rollNextAt[key]) {
    rollNextAt[key] = now + interval
  }
}

// ——— Public API ———

export function getLastArpNotes() {
  return {
    sin: lastArpNote.sin,
    cos: lastArpNote.cos,
    asin: lastArpNote.asin,
    acos: lastArpNote.acos,
  }
}

/**
 * @param {boolean} enabled
 * @param {{
 *   angleDeg?: number,
 *   sin?: { show: boolean, value: number | null },
 *   cos?: { show: boolean, value: number | null },
 *   asin?: { show: boolean, value: number | null },
 *   acos?: { show: boolean, value: number | null },
 *   sec?: { show: boolean, value: number | null },
 *   asec?: { show: boolean, value: number | null },
 *   csc?: { show: boolean, value: number | null },
 *   acsc?: { show: boolean, value: number | null },
 *   tan?: { show: boolean, value: number | null },
 *   atan?: { show: boolean, value: number | null },
 *   cot?: { show: boolean, value: number | null },
 *   acot?: { show: boolean, value: number | null },
 *   shellVoicings?: (ShellVoicing | null | undefined)[] | null,
 *   instrument?: PianoInstrumentId,
 * }} state
 */
export function updateTrigMusic(enabled, state) {
  if (!enabled) {
    muteAll()
    return
  }
  const audio = ensureCtx()
  if (!audio) return

  // React UI is source of truth for instrument (keeps toggle in sync)
  if (state.instrument === 'grand' || state.instrument === 'electric') {
    if (pianoInstrument !== state.instrument) {
      pianoInstrument = state.instrument
      lastChordStep = -1
      lastVoicingFp = ''
      stopAllShellVoices()
    }
  }

  if (!samplesReady || !instReady.grand || !instReady.electric) {
    loadSamples()
  }

  const now = audio.currentTime
  const angleDeg =
    state.angleDeg != null && Number.isFinite(state.angleDeg) ? state.angleDeg : 0

  const sin = state.sin
  const cos = state.cos
  const asin = state.asin
  const acos = state.acos
  const voicings = state.shellVoicings ?? null

  // Piano: sin=root, cos=3rd, asin=5th, acos=7th
  processShellChord(
    angleDeg,
    {
      sin: !!sin?.show,
      cos: !!cos?.show,
      asin: !!asin?.show,
      acos: !!acos?.show,
    },
    {
      sin: sin?.value != null && Number.isFinite(sin.value) ? sin.value : 0.55,
      cos: cos?.value != null && Number.isFinite(cos.value) ? cos.value : 0.55,
      asin:
        asin?.value != null && Number.isFinite(asin.value) ? asin.value : 0.55,
      acos:
        acos?.value != null && Number.isFinite(acos.value) ? acos.value : 0.55,
    },
    voicings
  )

  if (!samplesReady) return

  for (const key of PERC_KEYS) {
    processPerc(key, state[key], now)
  }
  for (const key of HAT_ROLL_KEYS) {
    processHatRoll(key, state[key], now)
  }
}

export function muteAll() {
  lastChordStep = -1
  lastVoicingFp = ''
  lastArpNote.sin = null
  lastArpNote.cos = null
  lastArpNote.asin = null
  lastArpNote.acos = null
  for (const key of PERC_KEYS) {
    valleyArmed[key] = true
  }
  for (const key of HAT_ROLL_KEYS) {
    rollNextAt[key] = 0
  }
}

export function disposeTrigMusic() {
  muteAll()
  stopAllShellVoices()
  for (const key of PERC_KEYS) {
    coolUntil[key] = 0
  }
}

export const COLOR_BASE_FREQ = {
  sin: midiToFreq(stepToMidi(0)),
  cos: midiToFreq(stepToMidi(0) + 11),
}
