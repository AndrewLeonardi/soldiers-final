/**
 * Hazard system types and configuration.
 * Hazards are environmental objects that affect BOTH teams — comedy + strategy.
 */

export type HazardType = 'sweeping_arm' | 'spring_launcher' | 'explosive_barrel'

export interface HazardConfig {
  type: HazardType
  position: [number, number, number]
  rotation?: number
  /** Type-specific params (speed, radius, etc.) */
  params?: Record<string, number>
}

/** Runtime state for an active hazard during battle */
export interface HazardState {
  config: HazardConfig
  age: number
  /** For one-shot hazards like barrels */
  triggered: boolean
  /** Cooldown timer for repeating hazards */
  cooldown: number
  /** Health for destructible hazards */
  health: number
}

/** Create initial runtime state from config */
export function createHazardState(config: HazardConfig): HazardState {
  return {
    config,
    age: 0,
    triggered: false,
    cooldown: 0,
    health: config.type === 'explosive_barrel' ? 30 : Infinity,
  }
}
