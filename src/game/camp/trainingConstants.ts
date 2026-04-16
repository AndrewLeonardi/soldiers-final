/**
 * trainingConstants — frozen config for camp training system.
 *
 * Production Sprint 2 — Economy Lock.
 *
 * THE RULE: 1 token = 1 second of training. No exceptions.
 * Every TIME_PACKAGE is strictly 1:1. Sim speed is visual-only (free).
 * Rare-weapon cost is a separate one-time per-soldier manual fee (see
 * `WEAPON_MANUAL_COST` in `@config/roster`), never added to per-second cost.
 *
 * The HUD token counter ticks down 1/sec during training runs so the player
 * literally watches the honesty. See `CurrencyPill.tsx` / `TokenCounter.tsx`.
 */

// ── Time packages: tokens buy seconds of training time (1:1) ──

export interface TimePackage {
  id: string
  label: string
  tokens: number       // cost in tokens — ALWAYS equals `seconds` (1:1 rule)
  seconds: number      // training duration in real seconds
  description: string
}

export const TIME_PACKAGES: readonly TimePackage[] = Object.freeze([
  { id: 'quick',    label: '15s',   tokens: 15,  seconds: 15,  description: 'Quick drill' },
  { id: 'standard', label: '30s',   tokens: 30,  seconds: 30,  description: 'Standard session' },
  { id: 'extended', label: '60s',   tokens: 60,  seconds: 60,  description: 'Deep training' },
  { id: 'marathon', label: '3 MIN', tokens: 180, seconds: 180, description: 'Marathon session' },
])

// ── Sim speed options — visual only, doesn't affect cost ──

export interface SimSpeedOption {
  multiplier: number
  label: string
  color: string
  particleIntensity: number
}

export const SIM_SPEED_OPTIONS: readonly SimSpeedOption[] = Object.freeze([
  { multiplier: 1, label: '1x', color: '#00e5ff', particleIntensity: 0.3 },
  { multiplier: 2, label: '2x', color: '#4488ff', particleIntensity: 0.5 },
  { multiplier: 4, label: '4x', color: '#aa44ff', particleIntensity: 0.8 },
])

/** Population size for the GA during training */
export const TRAINING_POP_SIZE = 25

/** Elite count for GA */
export const TRAINING_ELITE_COUNT = 5

/** Tournament selection k */
export const TRAINING_TOURNAMENT_K = 3

/** Sim duration per individual evaluation (seconds of sim time) */
export const TRAINING_SIM_DURATION = 8

/** Milestones for callout banners */
export const MILESTONES = Object.freeze({
  FIRST_HIT: 'FIRST HIT',
  FIRST_KILL: 'FIRST KILL',
  STREAK_10: '10 IN A ROW',
})
