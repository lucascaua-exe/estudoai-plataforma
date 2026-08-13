/** Motion tokens — transitions.dev / Refine (Smooth ease out + duração por uso). */

export const EASE_SMOOTH = [0.22, 1, 0.36, 1] as const
export const EASE_SMOOTH_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Durações em segundos (Motion) / ms (CSS). */
export const MOTION = {
  stagger: { s: 0.04, ms: 40 },
  micro: { s: 0.08, ms: 80 },
  quick: { s: 0.15, ms: 150 },
  fast: { s: 0.25, ms: 250 },
  medium: { s: 0.35, ms: 350 },
  slow: { s: 0.4, ms: 400 },
  verySlow: { s: 0.5, ms: 500 },
} as const

export const SCALE = {
  large: 0.96, // modal
  medium: 0.97, // dropdown
  small: 0.98, // tooltip
  tiny: 0.99, // close
} as const
