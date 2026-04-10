/**
 * weaponShapes — per-weapon neural network topology map.
 *
 * Sprint 3, Phase 0a. Each weapon type has its own NN input shape
 * because different scenarios feed different sensor vectors:
 *   - Rifle: 7 inputs (target_x, target_z, distance, angle, cooldown, alive_count, accuracy)
 *   - All others: 6 inputs (target_x, target_z, distance, angle, cooldown, alive_count)
 *
 * Hidden and output layers are consistent across all weapons (8, 4).
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
  rifle:          { input: 7, hidden: 8, output: 4 },
  rocketLauncher: { input: 6, hidden: 8, output: 4 },
  grenade:        { input: 6, hidden: 8, output: 4 },
  machineGun:     { input: 6, hidden: 8, output: 4 },
  tank:           { input: 6, hidden: 8, output: 4 },
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
