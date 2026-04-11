/**
 * weaponShapes — per-weapon neural network topology map.
 *
 * Sprint 7. Universal topology: all weapons share [10, 12, 6].
 *   - 10 inputs: universal observation vector (threat bearing, distance,
 *     elevation, cooldown, enemy count, health, friendly dist, density, velocity)
 *   - 12 hidden: expanded from 8 to handle richer input/output space
 *   - 6 outputs: move_forward, move_lateral, aim_correction, fire_gate,
 *     elevation_adj, aggression (target priority)
 *
 * This file is the single source of truth — campTrainingStore,
 * getEffectiveBrain, and the training spectacle all read from here.
 */
import type { WeaponType } from '@config/types'
import { NeuralNet } from '@engine/ml/neuralNet'

export interface NetworkShape {
  input: number
  hidden: number
  output: number
}

export const WEAPON_NETWORK_SHAPES: Record<WeaponType, NetworkShape> = {
  rifle:          { input: 10, hidden: 12, output: 6 },
  rocketLauncher: { input: 10, hidden: 12, output: 6 },
  grenade:        { input: 10, hidden: 12, output: 6 },
  machineGun:     { input: 10, hidden: 12, output: 6 },
  tank:           { input: 10, hidden: 12, output: 6 },
}

/** Total weight count for a given weapon's network topology. */
export function getWeightCount(weapon: WeaponType): number {
  const shape = WEAPON_NETWORK_SHAPES[weapon]
  return NeuralNet.weightCount(shape.input, shape.hidden, shape.output)
}

/** Get the shape for a weapon, with a safe fallback to rifle. */
export function getWeaponShape(weapon: string): NetworkShape {
  return WEAPON_NETWORK_SHAPES[weapon as WeaponType] ?? WEAPON_NETWORK_SHAPES.rifle
}
