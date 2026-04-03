/**
 * Simulation runner — dispatches to weapon-specific scenarios.
 * Runs the core loop: get inputs → NN forward → apply outputs → tick physics.
 */

import { NeuralNet } from './neuralNet'
import type { RocketSimState } from './scenarios/rocketScenario'
import {
  initRocketSim,
  getRocketInputs,
  applyRocketOutputs,
  tickRocketProjectiles,
  scoreRocketFitness,
} from './scenarios/rocketScenario'
import type { GrenadeSimState } from './scenarios/grenadeScenario'
import {
  initGrenadeSim,
  getGrenadeInputs,
  applyGrenadeOutputs,
  tickGrenadeProjectiles,
  scoreGrenadeFitness,
} from './scenarios/grenadeScenario'
import type { MGSimState } from './scenarios/machineGunScenario'
import {
  initMGSim,
  getMGInputs,
  applyMGOutputs,
  tickMGProjectiles,
  scoreMGFitness,
} from './scenarios/machineGunScenario'
import type { TankSimState } from './scenarios/tankScenario'
import {
  initTankSim,
  getTankInputs,
  applyTankOutputs,
  tickTankProjectiles,
  scoreTankFitness,
} from './scenarios/tankScenario'

export type SimState = RocketSimState | GrenadeSimState | MGSimState | TankSimState

export interface SimConfig {
  weaponType: string
  simDuration: number
}

export function initSim(config: SimConfig): SimState {
  switch (config.weaponType) {
    case 'tank': return initTankSim()
    case 'machineGun': return initMGSim()
    case 'grenade': return initGrenadeSim()
    default: return initRocketSim()
  }
}

export function getInputs(state: SimState, config: SimConfig): number[] {
  switch (config.weaponType) {
    case 'tank': return getTankInputs(state as TankSimState)
    case 'machineGun': return getMGInputs(state as MGSimState)
    case 'grenade': return getGrenadeInputs(state as GrenadeSimState)
    default: return getRocketInputs(state as RocketSimState)
  }
}

export function applyOutputs(state: SimState, outputs: number[], dt: number, config: SimConfig): void {
  switch (config.weaponType) {
    case 'tank': return applyTankOutputs(state as TankSimState, outputs, dt)
    case 'machineGun': return applyMGOutputs(state as MGSimState, outputs, dt)
    case 'grenade': return applyGrenadeOutputs(state as GrenadeSimState, outputs, dt)
    default: return applyRocketOutputs(state as RocketSimState, outputs, dt)
  }
}

export function tickProjectiles(state: SimState, dt: number, config: SimConfig): void {
  switch (config.weaponType) {
    case 'tank': return tickTankProjectiles(state as TankSimState, dt)
    case 'machineGun': return tickMGProjectiles(state as MGSimState, dt)
    case 'grenade': return tickGrenadeProjectiles(state as GrenadeSimState, dt)
    default: return tickRocketProjectiles(state as RocketSimState, dt)
  }
}

export function scoreFitness(state: SimState, config: SimConfig): number {
  switch (config.weaponType) {
    case 'tank': return scoreTankFitness(state as TankSimState)
    case 'machineGun': return scoreMGFitness(state as MGSimState)
    case 'grenade': return scoreGrenadeFitness(state as GrenadeSimState)
    default: return scoreRocketFitness(state as RocketSimState)
  }
}

/** Run one tick of the simulation: inputs → NN → outputs → physics */
export function simTick(state: SimState, nn: NeuralNet, dt: number, config: SimConfig): void {
  const inputs = getInputs(state, config)
  const outputs = nn.forward(inputs)
  applyOutputs(state, outputs, dt, config)
  tickProjectiles(state, dt, config)
  state.elapsed += dt
}
