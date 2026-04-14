/**
 * trainingConstants — frozen config for camp training system.
 *
 * Sprint Economy. Time-based token pricing + sim speed options.
 * Tokens buy training SECONDS. Sim speed is visual only (free).
 */

// ── Time packages: tokens buy seconds of training time ──

export interface TimePackage {
  id: string
  label: string
  tokens: number       // cost in tokens
  seconds: number      // training duration in real seconds
  description: string
}

export const TIME_PACKAGES: readonly TimePackage[] = Object.freeze([
  { id: 'quick',    label: '10s',   tokens: 50,  seconds: 10,  description: 'Quick drill' },
  { id: 'standard', label: '25s',   tokens: 100, seconds: 25,  description: 'Standard session' },
  { id: 'extended', label: '60s',   tokens: 200, seconds: 60,  description: 'Deep training' },
  { id: 'marathon', label: '3 MIN', tokens: 500, seconds: 180, description: 'Marathon session' },
])

/** Tutorial-only training package: short + cheap for onboarding */
export const TUTORIAL_TIME_PACKAGE: TimePackage = Object.freeze({
  id: 'tutorial', label: '15s', tokens: 30, seconds: 15, description: 'Tutorial training',
})

// ── Sim speed options — visual only, doesn't affect cost ──

export interface SimSpeedOption {
  multiplier: number
  label: string
  color: string
  particleIntensity: number
}

export const SIM_SPEED_OPTIONS: readonly SimSpeedOption[] = Object.freeze([
  { multiplier: 1,  label: '1x',  color: '#00e5ff', particleIntensity: 0.3 },
  { multiplier: 2,  label: '2x',  color: '#4488ff', particleIntensity: 0.5 },
  { multiplier: 4,  label: '4x',  color: '#aa44ff', particleIntensity: 0.8 },
])

/** @deprecated — use TIME_PACKAGES instead. Kept for legacy compat. */
export interface ComputeTier {
  tier: number
  label: string
  multiplier: number
  color: string
  costMultiplier: number
  particleIntensity: number
}

/** @deprecated — use TIME_PACKAGES + SIM_SPEED_OPTIONS instead */
export const COMPUTE_TIERS: readonly ComputeTier[] = Object.freeze([
  { tier: 1, label: 'STANDARD',  multiplier: 1,  color: '#00e5ff', costMultiplier: 1,  particleIntensity: 0.3 },
  { tier: 2, label: 'BOOSTED',   multiplier: 4,  color: '#4488ff', costMultiplier: 2,  particleIntensity: 0.5 },
  { tier: 3, label: 'OVERCLOCKED', multiplier: 16, color: '#aa44ff', costMultiplier: 4,  particleIntensity: 0.8 },
  { tier: 4, label: 'WHITE HOT', multiplier: 64, color: '#ffffff', costMultiplier: 8,  particleIntensity: 1.0 },
])

/** @deprecated — use TIME_PACKAGES[].tokens instead */
export const TRAINING_BASE_COST = 50

/** @deprecated — use TIME_PACKAGES[].seconds instead */
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
