/**
 * Machine Gun Training Scenario — Sprint 7 Universal Sim
 *
 * Fast fire rate, low per-hit damage. Enemies move AND shoot back.
 * NN learns: movement, sweep direction, burst timing, target priority.
 * Fitness rewards sustained hits over time.
 */

import {
  type SimEnemy,
  type SimProjectile,
  type UniversalSimConfig,
  type FitnessAccumulators,
  createSimEnemies,
  getUniversalInputs,
  applyInfantryMovement,
  selectTarget,
  tickEnemyAI,
  isInEngagementRange,
  scoreUniversalFitness,
} from './universalSim'

export interface MGSimState {
  type: 'machineGun'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  velocityX: number
  velocityZ: number
  soldierHealth: number
  soldierMaxHealth: number
  enemies: SimEnemy[]
  projectiles: SimProjectile[]
  cooldown: number
  elapsed: number
  shotsFired: number
  totalHits: number
  kills: number
  totalDamageDealt: number
  distanceTraveled: number
  timeInEngagementRange: number
  justFired: boolean
}

const BULLET_SPEED = 20.0
const COOLDOWN_TIME = 0.3
const BULLET_HIT_RADIUS = 0.25
const MG_DAMAGE = 15

const MG_CONFIG: UniversalSimConfig = {
  maxRange: 12.0,
  maxSpeed: 1.5, // MG soldiers move slower (heavy weapon)
  arenaHalfW: 5,
  arenaHalfD: 5,
  simDuration: 8,
  useElevation: false,
  gravity: 0,
}

export interface TrainingBounds {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

const DEFAULT_BOUNDS: TrainingBounds = { minX: 4, maxX: 10, minZ: -3, maxZ: 3 }

export function initMGSim(bounds?: TrainingBounds): MGSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const count = 3 + Math.floor(Math.random() * 3)
  const enemies = createSimEnemies(count, b.minX, b.maxX, b.minZ, b.maxZ, 50)
  // MG enemies move faster (strafing targets)
  for (const e of enemies) {
    e.speed = 0.5 + Math.random() * 1.0
  }

  return {
    type: 'machineGun',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    velocityX: 0,
    velocityZ: 0,
    soldierHealth: 100,
    soldierMaxHealth: 100,
    enemies,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    totalHits: 0,
    kills: 0,
    totalDamageDealt: 0,
    distanceTraveled: 0,
    timeInEngagementRange: 0,
    justFired: false,
  }
}

export function getMGInputs(state: MGSimState): number[] {
  const cooldownRatio = state.cooldown / COOLDOWN_TIME
  return getUniversalInputs(
    state.soldierX, state.soldierZ,
    state.soldierHealth, state.soldierMaxHealth,
    state.velocityX, state.velocityZ,
    state.enemies, cooldownRatio, MG_CONFIG,
  )
}

export function applyMGOutputs(state: MGSimState, outputs: number[], dt: number): void {
  state.justFired = false

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Movement (slower for MG)
  const move = applyInfantryMovement(
    state.soldierX, state.soldierZ,
    state.velocityX, state.velocityZ,
    outputs, state.enemies, dt, MG_CONFIG,
  )
  state.soldierX = move.x
  state.soldierZ = move.z
  state.velocityX = move.vx
  state.velocityZ = move.vz
  state.distanceTraveled += move.distMoved

  if (isInEngagementRange(state.soldierX, state.soldierZ, state.enemies, MG_CONFIG.maxRange)) {
    state.timeInEngagementRange += dt
  }

  // Target selection
  const target = selectTarget(state.soldierX, state.soldierZ, state.enemies, outputs[5] ?? 0)
  if (!target) return

  const dx = target.x - state.soldierX
  const dz = target.z - state.soldierZ
  const baseAngle = Math.atan2(dx, dz)

  // MG sweep offset from outputs[2]
  const sweepOffset = (outputs[2] ?? 0) * 0.3
  const finalAngle = baseAngle + sweepOffset
  state.soldierRotation = finalAngle

  // Fire: outputs[3] > 0
  if ((outputs[3] ?? 0) > 0 && state.cooldown <= 0) {
    state.projectiles.push({
      x: state.soldierX,
      y: 0.5,
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * BULLET_SPEED,
      vy: 0,
      vz: Math.cos(finalAngle) * BULLET_SPEED,
      age: 0,
      fromEnemy: false,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

export function tickMGProjectiles(state: MGSimState, dt: number): void {
  // Enemy AI return fire
  const healthRef = { value: state.soldierHealth }
  tickEnemyAI(state.enemies, state.soldierX, state.soldierZ, healthRef, dt)
  state.soldierHealth = Math.max(0, healthRef.value)

  // Bullet physics
  const toRemove: number[] = []
  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    if (!p) continue
    p.x += p.vx * dt
    p.z += p.vz * dt
    p.age += dt

    let hit = false
    for (const e of state.enemies) {
      if (!e.alive) continue
      const tdx = e.x - p.x
      const tdz = e.z - p.z
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
      if (tdist < BULLET_HIT_RADIUS) {
        e.health -= MG_DAMAGE
        state.totalDamageDealt += MG_DAMAGE
        state.totalHits++
        if (e.health <= 0) {
          e.alive = false
          state.kills++
        }
        hit = true
        break
      }
    }

    if (hit || p.age > 2 || Math.abs(p.x) > 15 || Math.abs(p.z) > 8) {
      toRemove.push(i)
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const idx = toRemove[i]
    if (idx === undefined) continue
    state.projectiles.splice(idx, 1)
  }
}

export function scoreMGFitness(state: MGSimState): number {
  const acc: FitnessAccumulators = {
    kills: state.kills,
    totalDamageDealt: state.totalDamageDealt,
    shotsFired: state.shotsFired,
    hits: state.totalHits,
    soldierHealth: state.soldierHealth,
    soldierMaxHealth: state.soldierMaxHealth,
    elapsed: state.elapsed,
    simDuration: MG_CONFIG.simDuration,
    timeInEngagementRange: state.timeInEngagementRange,
    distanceTraveled: state.distanceTraveled,
  }

  let fitness = scoreUniversalFitness(acc)

  // MG-specific: sustained fire bonus
  fitness += state.totalHits * 0.01

  return fitness
}
