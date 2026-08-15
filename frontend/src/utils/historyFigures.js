/**
 * History-timeline catalog + resolver.
 * Matches last names, full names, and aliases (Archimedes of Syracuse, René…).
 * Do not substring-match short tokens ("roll" must not become Thales's Roll).
 */

export const HISTORY_ERAS = [
  { index: 0, slug: 'thales', name: 'Thales', aliases: ['thales of miletus'] },
  { index: 1, slug: 'pythagoras', name: 'Pythagoras', aliases: ['pythagorean'] },
  { index: 2, slug: 'euclid', name: 'Euclid', aliases: ['euclid of alexandria'] },
  {
    index: 3,
    slug: 'eratosthenes',
    name: 'Eratosthenes',
    aliases: ['eratosthenes of cyrene'],
  },
  {
    index: 4,
    slug: 'archimedes',
    name: 'Archimedes',
    aliases: ['archimedes of syracuse'],
  },
  {
    index: 5,
    slug: 'kepler',
    name: 'Kepler',
    aliases: ['johannes kepler', 'oresme', 'nicole oresme', 'cavalieri'],
  },
  {
    index: 6,
    slug: 'descartes',
    name: 'Descartes',
    aliases: ['rene descartes', 'rené descartes'],
  },
  {
    index: 7,
    slug: 'fermat',
    name: 'Fermat',
    aliases: ['pierre de fermat', 'pierre fermat'],
  },
  { index: 8, slug: 'barrow', name: 'Barrow', aliases: ['isaac barrow'] },
  {
    index: 9,
    slug: 'newton',
    name: 'Newton',
    aliases: ['isaac newton', 'fluxions', 'fluxion'],
  },
  {
    index: 10,
    slug: 'leibniz',
    name: 'Leibniz',
    aliases: ['gottfried leibniz', 'gottfried wilhelm leibniz'],
  },
  {
    index: 11,
    slug: 'priority',
    name: 'Newton',
    aliases: ['priority dispute', 'calculus priority'],
  },
  {
    index: 12,
    slug: 'bernoulli',
    name: 'Bernoulli',
    aliases: [
      'jacob bernoulli',
      'johann bernoulli',
      "l'hopital",
      'lhopital',
      'lhospital',
      "l'hôpital",
    ],
  },
  { index: 13, slug: 'euler', name: 'Euler', aliases: ['leonhard euler'] },
  {
    index: 14,
    slug: 'cauchy',
    name: 'Cauchy',
    aliases: ['augustin-louis cauchy', 'augustin louis cauchy'],
  },
  {
    index: 15,
    slug: 'lebesgue',
    name: 'Lebesgue',
    aliases: ['henri lebesgue'],
  },
]

export const HISTORY_FIGURE_NAMES = [
  ...new Set(HISTORY_ERAS.map((e) => e.name)),
]

const STOP = new Set(['the', 'and', 'of', 'de', 'von', 'van', 'la', 'le'])

export function foldName(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokens(s) {
  return foldName(s)
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
}

/**
 * Resolve a user/model figure string or era index to a catalog row.
 * Prefers exact slug/name, then last-name tokens of length >= 4.
 */
export function resolveHistoryFigure(query, index) {
  if (Number.isInteger(index) || (typeof index === 'number' && Number.isFinite(index))) {
    const i = Math.trunc(index)
    if (i >= 0 && i < HISTORY_ERAS.length) return HISTORY_ERAS[i]
  }
  if (typeof query !== 'string' || !query.trim()) return null
  const q = foldName(query)
  if (!q) return null

  const exact = HISTORY_ERAS.find(
    (e) =>
      e.slug === q ||
      foldName(e.name) === q ||
      e.aliases.some((a) => foldName(a) === q),
  )
  if (exact) return exact

  const qTokens = tokens(query)
  const scored = []
  for (const e of HISTORY_ERAS) {
    const hay = [e.slug, foldName(e.name), ...e.aliases.map(foldName)]
    if (hay.some((h) => h && (q === h || (q.length >= 5 && (h.includes(q) || q.includes(h)))))) {
      scored.push(e)
      continue
    }
    const eraToks = new Set([e.slug, ...tokens(e.name), ...e.aliases.flatMap(tokens)])
    if (qTokens.some((t) => t.length >= 4 && eraToks.has(t))) scored.push(e)
  }
  if (!scored.length) return null
  // Prefer the earliest era unless they asked for the priority dispute.
  if (q.includes('priority') || q.includes('dispute')) {
    return scored.find((e) => e.slug === 'priority') || scored[0]
  }
  return scored.find((e) => e.slug !== 'priority') || scored[0]
}

export function historyNamePattern() {
  const names = new Set()
  for (const e of HISTORY_ERAS) {
    names.add(foldName(e.name))
    names.add(e.slug)
    for (const a of e.aliases) {
      const f = foldName(a)
      if (f.length >= 5) names.add(f)
    }
  }
  const alt = [...names].filter((n) => n.length >= 4).sort((a, b) => b.length - a.length)
  return new RegExp(`\\b(?:${alt.join('|')})\\b`, 'i')
}

export const HISTORY_NAME_RE = historyNamePattern()
