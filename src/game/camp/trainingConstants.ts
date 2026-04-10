/**
 * trainingConstants — frozen config for camp training system.
 *
 * Sprint 2. Compute tiers, training costs, durations, and
 * tier visual config (colors, labels, particle intensity).
 */

/** Compute tier configuration */
export interface ComputeTier {
  tier: number
  label: string
  multiplier: number
  color: string       // CSS color for ring, particles, etc.
  costMultiplier: number
  particleIntensity: number
}

export const COMPUTE_TIERS: readonly ComputeTier[] = Object.freeze([
  { tier: 1, label: 'STANDARD',  multiplier: 1,  color: '#00e5ff', costMultiplier: 1,  particleIntensity: 0.3 },
  { tier: 2, label: 'BOOSTED',   multiplier: 4,  color: '#4488ff', costMultiplier: 2,  particleIntensity: 0.5 },
  { tier: 3, label: 'OVERCLOCKED', multiplier: 16, color: '#aa44ff', costMultiplier: 4,  particleIntensity: 0.8 },
  { tier: 4, label: 'WHITE HOT', multiplier: 64, color: '#ffffff', costMultiplier: 8,  particleIntensity: 1.0 },
])

/** Base compute cost for one training run (Tier 1) */
export const TRAINING_BASE_COST = 50

/** Base training duration in seconds (Tier 1). Scales inversely with tier. */
export const TRAINING_BASE_DURATION = 30

/** Population size for the GA during training */
export const TRAINING_POP_SIZE = 25

/** Elite count for GA */
export const TRAINING_ELITE_COUNT = 5

/** Tournament selection k */
export const TRAINING_TOURNAMENT_K = 3

/** Fitness threshold for early graduation ("breakthrough") */
export const BREAKTHROUGH_THRESHOLD = 0.75

/** Sim duration per individual evaluation (seconds of sim time) */
export const TRAINING_SIM_DURATION = 8

/** Milestones for callout banners */
export const MILESTONES = Object.freeze({
  FIRST_HIT: 'FIRST HIT',
  FIRST_KILL: 'FIRST KILL',
  STREAK_10: '10 IN A ROW',
})
