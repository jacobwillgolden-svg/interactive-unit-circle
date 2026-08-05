/**
 * Shared physical constants used across the site.
 *
 * Standard acceleration due to gravity (standard gravity gₙ), defined exactly
 * by the BIPM / CIPM as 9.80665 m/s². Prefer this over rounded 9.8 or 9.81 so
 * every page agrees.
 */
export const G_STD = 9.80665

/** Alias for gravity defaults in simulations (same as G_STD). */
export const G0 = G_STD

/** Approximate lunar surface gravity (mean), m/s² — common textbook value. */
export const G_MOON = 1.62

/** Classroom “round g” often used for back-of-envelope problems. */
export const G_ROUND = 10

/** Presets for gravity controls (typable field + chips). */
export const G_PRESETS = [
  { id: 'earth', label: 'Earth', value: G_STD, title: 'Standard gravity gₙ = 9.80665 m/s²' },
  { id: '10', label: '10', value: G_ROUND, title: 'g = 10 m/s² (common homework value)' },
  { id: 'moon', label: 'Moon', value: G_MOON, title: 'Lunar surface g ≈ 1.62 m/s²' },
]
