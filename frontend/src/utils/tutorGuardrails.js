/**
 * Client-side tutor guardrails (UX + last-line tool clamps).
 * The backend is the source of truth; this mirrors safe ranges so
 * a bad Gemini tool call cannot divide-by-zero the physics page.
 */

import { HISTORY_NAME_RE, resolveHistoryFigure } from './historyFigures.js'

export const MAX_MESSAGE_CHARS = 4000
export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024

export const STUDIO_PATHS = [
  '/',
  '/waves',
  '/pendulums',
  '/physics',
  '/helix',
  '/history',
  '/cheat-sheet',
]

export const WAVE_FNS = [
  'sin',
  'cos',
  'tan',
  'csc',
  'sec',
  'cot',
  'asin',
  'acos',
  'atan',
  'acsc',
  'asec',
  'acot',
]

export const IDENTITY_IDS = [
  'core-trig-defs',
  'core-trig-pythag',
  'core-trig-ranges',
  'core-trig-even-odd',
  'core-trig-sum-diff',
  'core-trig-double',
  'core-trig-laws',
  'thales-roll',
  'thales-why',
  'eratosthenes-earth',
  'first-principles-def',
  'first-principles-x2',
  'liate-formula',
  'liate-order',
  'close-points-tests',
  'close-points-check',
  'close-points-indet',
  'logs-bases',
  'euler-formula',
  'unit-circle-pi',
  'euler-identity',
  'calc-bridge-deriv',
  'calc-bridge-integrals',
  'calc-bridge-limits',
  'inverse-trig-terms',
  'inverse-trig-how',
  'inverse-trig-three',
  'inverse-trig-cycle',
  'pendulums-isochronism',
  'pendulums-fbd',
  'pendulums-analogy',
  'pendulums-small-angle',
  'pendulums-multi',
  'pendulums-toolkit',
  'atwood-idea',
  'atwood-newton',
  'atwood-derive',
  'atwood-lab',
  'atwood-ladder',
  'atwood-toolkit',
  'number-types-map',
  'constants-e',
  'constants-pi',
  'bonus-phi',
  'bonus-angle',
  'bonus-fib',
]

const IDENTITY_SET = new Set(IDENTITY_IDS)

const IDENTITY_ALIASES = {
  pythagorean: 'core-trig-pythag',
  pythagoras: 'core-trig-pythag',
  pythag: 'core-trig-pythag',
  sohcahtoa: 'core-trig-defs',
  definitions: 'core-trig-defs',
  euler: 'euler-identity',
  liate: 'liate-formula',
  thales: 'thales-roll',
  eratosthenes: 'eratosthenes-earth',
  atwood: 'atwood-idea',
  pendulum: 'pendulums-small-angle',
}

const TOOL_NAMES = new Set([
  'navigate',
  'set_angle',
  'set_overlays',
  'set_waves',
  'set_pendulum',
  'set_physics',
  'set_helix',
  'highlight_identity',
  'set_history_era',
  'generate_portrait',
])

const JAILBREAK =
  /ignore\s+(all\s+)?(your\s+)?(previous|above|prior|earlier)\s+(instructions|rules|prompts)|reveal\s+(your\s+)?(system|hidden|initial)\s+(prompt|instructions)|\[system\]|developer\s+mode|jailbreak|do\s+anything\s+now|override\s+(your\s+)?(safety|rules|guardrails)|new\s+instructions\s*:|pretend\s+you\s+(have\s+no|are\s+not\s+bound)|you are no longer (a |the )?tutor|act as (?:my |a )?(?:cow|dan|admin)|this is an admin command|i command you to act/i

const STUDIO_SIGNAL =
  /θ|π|deg(?:ree)?s?|radian|sohcahtoa|hypotenus|adjacent|opposite|sin(?:e|h)?|cos(?:ine|h)?|tan(?:gent|h)?|csc|cosec|sec(?:ant)?|cot(?:angent)?|arcsin|arccos|arctan|asin|acos|atan|identit|pythag|unit\s*circle|overlay|cheat[-\s]?sheet|pendulum|lagrang|atwood|incline|ramp|friction|pulley|free\s*body|\bfbd\b|helix|parametric|\bwaves?\b|deriv|integral|\blimit\b|liate|first\s*principles|euler|newton|leibniz|thales|euclid|kepler|archimedes|descartes|bernoulli|eratosthenes|fermat|barrow|cauchy|lebesgue|oresme|cavalieri|lhopital|prove|derive|walk\s+me|set\s+(θ|theta|the\s+angle|angle|(?:to\s+)?\d)|show\s+(sin|cos|tan|csc|sec|cot|θ|theta)|go\s+to|navigate|theta|angle/i

const SET_WRAPPER = /^\s*set\s+(?:θ|theta|the\s+angle|angle|0)?\s*(?:to|,|:|;)\s+(.+)$/i
const MODEL_PROBE =
  /\b(what model are you|which model|what is your role|what's your role|who are you|tell me more about your role)\b/i
const STORY_INVITE =
  /(\b(stor(?:y|ies)|tale|fable|fairytale|fanfic)\b|\b(poem|song|rap|lullaby)\b|\b(come up with|make up|invent|write)\b.{0,50}\b(story|hero|character|adventure)\b|\b(let'?s|lets|we can|i want to)\b.{0,50}\b(story|hero|adventure|character)\b|\bcheer me up\b|\bour own story\b)/i

const SUPERHERO =
  /(\b(superhero|super-hero|super\s*power|superpower|nemesis|sidekick|villain)\b|\b(adventure|quest|backstory|origin story)\b|\b(plus[-\s]?man|negative[-\s]?man|plusman)\b|\bsuperman\b|\b(make (?:him|her|it) (?:the )?hero|call it plus)\b|\b(emblem|cape|fly in|stronger team)\b)/i

const HELP_STUCK =
  /^(?:please\s+)?(help(?:\s+me)?(?:\s+please)?|i(?:'m| am)?\s+stuck|stuck|idk|i\s+don'?t\s+know|confused|lost|what(?:'s| is) this|what am i looking at|explain this)[?.!\s]*$/i

const GREETING =
  /^(?:hi|hey|hello|yo|sup|hiya|howdy|good\s+(?:morning|afternoon|evening)|what'?s\s+up)[\s!.]*$/i

const HARD_INAPPROPRIATE =
  /\b(porn(?:o|ographic)?|xxx|nudes?|naked|nsfw|hentai|onlyfans|sexual|sexy|horny|orgasm|masturbat\w*|blow\s*job|hand\s*job|vagina|penis|\bdick\b|\bcock\b|\bpussy\b|\bcunt\b|dildo|semen|\bcum\b|whore|slut|milf|boobs?|\btits?\b|rape(?:s|d|ing)?|incest|pedo(?:phile)?|nigg(?:er|a)s?|faggot|\bfag\b|kike|spic|chink|tranny|kill\s+your\s*self|\bkys\b|\bkms\b|suicide|self[-\s]?harm|kill\s+myself|want\s+to\s+die|i\s+will\s+kill|shoot\s+up)\b/i

const CASUAL_SWEAR =
  /\b(f+u+c+k(?:ing|ed|er|s)?|motherfucker|shit(?:ty|s)?|bullshit|damn(?:ed|it)?|dammit|bitch(?:es|y)?|\bass\b|asshole|crap|piss(?:ed)?|\bhell\b|bastard|dickhead|stfu|wtf|f+\*+c*k(?:ing)?|sh[i1!]t)\b/i

const CRISIS =
  /\b(suicide|kill\s+(?:my|your)\s*self|want\s+to\s+die|self[-\s]?harm|cut(?:ting)?\s+myself|kys|kms|i(?:'m| am)\s+(?:very\s+)?depressed)\b/i

const KEYBOARD_SMASH = /(.)\1{5,}|asdf+|qwer(?:ty)?|zxcv+|hjkl|jkl;/i

const MSG = {
  inappropriate:
    "I can't help with that language. Ask a studio question — an angle, an identity, or the figure on screen.",
  offTopic:
    "I only tutor this studio. Try “set θ to 45°,” walk an identity, or snap a worksheet.",
  gibberish:
    "I didn’t catch a math question. Try “set θ to 45° and show tan,” or snap a worksheet.",
  greeting:
    "Hi — I can move the live figures. Ask me to set θ, rebuild a ramp problem, or walk an identity.",
  crisis:
    "I can't help with that. If you're in crisis, talk to a trusted adult or local emergency services. I can help with a studio math question when you're ready.",
  tutorId:
    "I'm the RADIANT studio tutor. I move the live figures and walk identities — I don't switch roles or talk about the underlying model. Ask me to open a history era or set θ.",
  fiction:
    "I don't write stories or characters here — only the live studio. Ask me to set θ, open a history era, or walk an identity.",
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

export function wrapDegrees(n) {
  return ((n % 360) + 360) % 360
}

export function parseDegrees(value) {
  if (typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  let s = value
    .trim()
    .toLowerCase()
    .replace(/°/g, '')
    .replace(/degrees?/g, '')
    .replace(/deg/g, '')
    .replace(/π/g, 'pi')
    .replace(/\s+/g, '')
  if (!s) return null
  if (/^[-+]?\d+(\.\d+)?$/.test(s)) return Number(s)
  const m = /^([-+]?)(\d+(?:\.\d+)?)?pi(?:\/(\d+(?:\.\d+)?))?$/.exec(s)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  const num = m[2] ? Number(m[2]) : 1
  const den = m[3] ? Number(m[3]) : 1
  if (!den) return null
  return (sign * num * 180) / den
}

function finite(value) {
  if (typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return parseDegrees(value)
  return null
}

export function resolveIdentityId(raw) {
  if (typeof raw !== 'string') return null
  const key = raw.trim()
  if (!key) return null
  if (IDENTITY_SET.has(key)) return key
  const low = key.toLowerCase().replace(/_/g, '-')
  if (IDENTITY_SET.has(low)) return low
  if (IDENTITY_ALIASES[low] || IDENTITY_ALIASES[low.replace(/-/g, ' ')]) {
    return IDENTITY_ALIASES[low] || IDENTITY_ALIASES[low.replace(/-/g, ' ')]
  }
  if (low.length >= 5) {
    return IDENTITY_IDS.find((id) => id.split('-').includes(low)) || null
  }
  return null
}

function peelSetWrapper(text) {
  const compact = String(text || '').trim()
  const m = SET_WRAPPER.exec(compact)
  if (!m) return compact
  const rest = (m[1] || '').trim()
  if (!rest) return compact
  const head = rest.split(/\s+/)[0].replace(/[,.;:]+$/, '')
  const deg = parseDegrees(head)
  if (deg != null && !/[A-Za-z]{4,}/.test(rest)) return compact
  if (deg != null && STUDIO_SIGNAL.test(rest)) return compact
  return rest
}

function hasStudioSignal(text) {
  const compact = String(text || '').trim()
  if (!compact) return false
  if (HISTORY_NAME_RE.test(compact) || resolveHistoryFigure(compact)) return true
  if (STUDIO_SIGNAL.test(compact)) return true
  const deg = parseDegrees(compact)
  return deg != null && Math.abs(deg) <= 720
}

function looksNonsense(text) {
  const compact = String(text || '').trim()
  if (!compact) return true
  if (hasStudioSignal(compact)) return false
  if (KEYBOARD_SMASH.test(compact.replace(/\s+/g, ''))) return true
  const letters = (compact.match(/[A-Za-z]/g) || []).join('')
  if (!letters) return true
  if (letters.length >= 8) {
    const vowels = (letters.match(/[aeiouy]/gi) || []).length
    if (vowels / letters.length < 0.18) return true
  }
  return false
}

export function validateUserInput(text, extra = {}) {
  const line = String(text || '').trim()
  if (line.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      message: `That question is too long (max ${MAX_MESSAGE_CHARS} characters).`,
    }
  }
  if (!line && !extra.image) {
    return { ok: false, message: 'Type a question or attach a worksheet photo.' }
  }
  if (!line && extra.image) return { ok: true, text: '' }

  const peeled = peelSetWrapper(line)

  if (JAILBREAK.test(line) || JAILBREAK.test(peeled)) {
    return {
      ok: false,
      message:
        'I only tutor this studio — I won’t switch roles or drop these rules. Ask about an angle, identity, pendulum, or ramp problem.',
    }
  }
  if (CRISIS.test(line) || CRISIS.test(peeled)) return { ok: false, message: MSG.crisis }
  if (HARD_INAPPROPRIATE.test(line) || HARD_INAPPROPRIATE.test(peeled)) {
    return { ok: false, message: MSG.inappropriate }
  }
  if (MODEL_PROBE.test(peeled) && !HISTORY_NAME_RE.test(peeled)) {
    return { ok: false, message: MSG.tutorId }
  }
  const fiction =
    SUPERHERO.test(line) ||
    SUPERHERO.test(peeled) ||
    ((STORY_INVITE.test(line) || STORY_INVITE.test(peeled)) &&
      !HISTORY_NAME_RE.test(peeled) &&
      !/\bhistory of\b/i.test(peeled))
  if (fiction) {
    return { ok: false, message: MSG.fiction }
  }

  const swore = CASUAL_SWEAR.test(peeled)
  const cleaned = swore ? peeled.replace(CASUAL_SWEAR, ' ').replace(/\s+/g, ' ').trim() : peeled
  if (swore && !cleaned) return { ok: false, message: MSG.inappropriate }

  const body = cleaned || peeled
  if (GREETING.test(body)) return { ok: false, message: MSG.greeting }
  if (!extra.image && looksNonsense(body)) return { ok: false, message: MSG.gibberish }
  if (extra.image || hasStudioSignal(body) || HELP_STUCK.test(body)) {
    return { ok: true, text: body }
  }
  if (swore) return { ok: false, message: MSG.inappropriate }
  return { ok: false, message: MSG.offTopic }
}

export function validateImageFile(file) {
  if (!file) return { ok: false, message: 'No file selected.' }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return { ok: false, message: 'That photo is too large (max 8 MB). Crop to the problem.' }
  }
  const type = String(file.type || '')
  if (type && !type.startsWith('image/')) {
    return { ok: false, message: 'Upload a PNG, JPEG, or WebP of the worksheet.' }
  }
  return { ok: true }
}

export function sanitizeToolCall(name, args = {}) {
  if (!TOOL_NAMES.has(name)) {
    return { ok: false, error: `unknown tool ${name}` }
  }
  const raw = args && typeof args === 'object' ? args : {}
  const out = {}
  const notes = []

  if (name === 'navigate') {
    if (!STUDIO_PATHS.includes(raw.path)) {
      return { ok: false, error: 'path is not a studio route' }
    }
    out.path = raw.path
  }

  if (name === 'set_angle') {
    const deg = parseDegrees(raw.degrees)
    if (deg == null) return { ok: false, error: 'degrees must be a finite number' }
    out.degrees = wrapDegrees(deg)
    if ('animate' in raw) out.animate = Boolean(raw.animate)
  }

  if (name === 'set_overlays') {
    for (const key of [
      'showSin',
      'showCos',
      'showTan',
      'showSohcahtoa',
      'showLabels',
      'labelsInRadians',
      'showCoords',
      'coordsInRadians',
    ]) {
      if (key in raw) out[key] = Boolean(raw[key])
    }
  }

  if (name === 'set_waves') {
    if (Array.isArray(raw.functions)) {
      out.functions = raw.functions.filter((f) => WAVE_FNS.includes(f))
    }
    if ('replace' in raw) out.replace = Boolean(raw.replace)
    if ('playing' in raw) out.playing = Boolean(raw.playing)
    if ('musicOn' in raw) out.musicOn = Boolean(raw.musicOn)
    const deg = parseDegrees(raw.degrees)
    if (deg != null) out.degrees = wrapDegrees(deg)
  }

  if (name === 'set_pendulum') {
    const n = Number(raw.nLinks)
    if (n === 1 || n === 2 || n === 3) out.nLinks = n
    const g = finite(raw.g)
    if (g != null) out.g = clamp(g, 0.1, 30)
    const d = finite(raw.damping)
    if (d != null) out.damping = clamp(d, 0, 2)
    for (const key of ['playing', 'trailOn', 'reset']) {
      if (key in raw) out[key] = Boolean(raw[key])
    }
  }

  if (name === 'set_physics') {
    if (raw.mode === 'single' || raw.mode === 'hang' || raw.mode === 'atwood') {
      out.mode = raw.mode
    }
    const bounds = {
      thetaDeg: [0.5, 89.5],
      m1: [0.05, 100],
      m2: [0.05, 100],
      muS: [0, 2],
      muK: [0, 2],
      Fapp: [-200, 200],
      g: [0.1, 30],
    }
    for (const [key, [lo, hi]] of Object.entries(bounds)) {
      if (!(key in raw)) continue
      const n = key === 'thetaDeg' ? parseDegrees(raw[key]) : finite(raw[key])
      if (n == null) continue
      out[key] = clamp(n, lo, hi)
    }
    for (const key of ['frictionOn', 'showComponents', 'showNet', 'playing']) {
      if (key in raw) out[key] = Boolean(raw[key])
    }
  }

  if (name === 'set_helix') {
    const t = finite(raw.t)
    if (t != null) out.t = clamp(t, -40, 40)
    for (const key of ['showTangent', 'showDerivative', 'autoSpin']) {
      if (key in raw) out[key] = Boolean(raw[key])
    }
  }

  if (name === 'highlight_identity') {
    const id = resolveIdentityId(raw.id)
    if (!id) return { ok: false, error: 'unknown identity id' }
    out.id = id
    if (id !== raw.id) notes.push(`mapped ${raw.id} → ${id}`)
  }

  if (name === 'set_history_era') {
    const hit = resolveHistoryFigure(raw.figure, raw.index)
    if (!hit) return { ok: false, error: 'unknown history figure' }
    out.figure = hit.name
    out.index = hit.index
    out.slug = hit.slug
  }

  if (name === 'generate_portrait') {
    if (typeof raw.figure !== 'string' || !raw.figure.trim()) {
      return { ok: false, error: 'figure is required' }
    }
    const hit = resolveHistoryFigure(raw.figure)
    out.figure = hit ? hit.name : raw.figure.trim().slice(0, 80)
    if (hit) {
      out.slug = hit.slug
      out.index = hit.index
    }
    if (typeof raw.style === 'string' && raw.style.trim()) {
      out.style = raw.style.trim().slice(0, 400)
    }
  }

  return { ok: true, name, arguments: out, notes }
}
