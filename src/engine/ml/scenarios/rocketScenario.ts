/**
 * Rocket Launcher Training Scenario — Sprint 7 Universal Sim
 *
 * HYBRID NERO + ADVERSARIAL:
 * - Scripted: auto-target, compute ideal ballistic arc, gravity physics
 * - Neural net learns: movement, aim/elevation corrections, fire timing, target priority
 * - Enemies shoot back for survival pressure
 *
 * Projectile physics preserved from Sprint 2. Movement added via universal sim.
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

export interface RocketSimState {
  type: 'rocket'
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
  hits: number
  kills: number
  totalDamageDealt: number
  distanceTraveled: number
  timeInEngagementRange: number
  nearMisses: number
  justFired: boolean
}

const GRAVITY = 9.0
const ROCKET_SPEED = 12.0
const COOLDOWN_TIME = 2.5
const HIT_RADIUS = 0.3
const SPLASH_RADIUS = 1.5
const NEAR_MISS_RADIUS = 4.0
const ROCKET_DAMAGE = 80

const ROCKET_CONFIG: UniversalSimConfig = {
  maxRange: 12.0,
  maxSpeed: 2.0,
  arenaHalfW: 5,
  arenaHalfD: 5,
  simDuration: 10,
  useElevation: true,
  gravity: GRAVITY,
}

export interface TrainingBounds {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

const DEFAULT_BOUNDS: TrainingBounds = { minX: 2, maxX: 8, minZ: -3, maxZ: 3 }

export function initRocketSim(bounds?: TrainingBounds): RocketSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const enemyCount = 3 + Math.floor(Math.random() * 2)
  const enemies = createSimEnemies(enemyCount, b.minX, b.maxX, b.minZ, b.maxZ, 80)

  return {
    type: 'rocket',
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
    hits: 0,
    kills: 0,
    totalDamageDealt: 0,
    distanceTraveled: 0,
    timeInEngagementRange: 0,
    nearMisses: 0,
    justFired: false,
  }
}

export function getRocketInputs(state: RocketSimState): number[] {
  const cooldownRatio = state.cooldown / COOLDOWN_TIME
  return getUniversalInputs(
    state.soldierX, state.soldierZ,
    state.soldierHealth, state.soldierMaxHealth,
    state.velocityX, state.velocityZ,
    state.enemies, cooldownRatio, ROCKET_CONFIG,
  )
}

export function applyRocketOutputs(
  state: RocketSimState,
  outputs: number[],
  dt: number,
): void {
  state.justFired = false

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Movement
  const move = applyInfantryMovement(
    state.soldierX, state.soldierZ,
    state.velocityX, state.velocityZ,
    outputs, state.enemies, dt, ROCKET_CONFIG,
  )
  state.soldierX = move.x
  state.soldierZ = move.z
  state.velocityX = move.vx
  state.velocityZ = move.vz
  state.distanceTraveled += move.distMoved

  if (isInEngagementRange(state.soldierX, state.soldierZ, state.enemies, ROCKET_CONFIG.maxRange)) {
    state.timeInEngagementRange += dt
  }

  // Target selection
  const target = selectTarget(state.soldierX, state.soldierZ, state.enemies, outputs[5] ?? 0)
  if (!target) return

  const dx = target.x - state.soldierX
  const dz = target.z - state.soldierZ
  const dist = Math.sqrt(dx * dx + dz * dz)

  // Scripted base angle + NN correction (outputs[2])
  const baseAngle = Math.atan2(dx, dz)
  const aimCorrection = (outputs[2] ?? 0) * 0.2
  const finalAngle = baseAngle + aimCorrection
  state.soldierRotation = finalAngle

  // Scripted ideal elevation + NN correction (outputs[4])
  const arg = (GRAVITY * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
  const elevationCorrection = (outputs[4] ?? 0) * 0.15
  const finalElevation = Math.max(0.05, idealElevation + elevationCorrection)

  // Fire gate: outputs[3] > 0
  if ((outputs[3] ?? 0) > 0 && state.cooldown <= 0) {
    const cosE = Math.cos(finalElevation)
    state.projectiles.push({
      x: state.soldierX,
      y: 0.5,
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * cosE * ROCKET_SPEED,
      vy: Math.sin(finalElevation) * ROCKET_SPEED,
      vz: Math.cos(finalAngle) * cosE * ROCKET_SPEED,
      age: 0,
      fromEnemy: false,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

export function tickRocketProjectiles(state: RocketSimState, dt: number): void {
  // Enemy AI return fire
  const healthRef = { value: state.soldierHealth }
  tickEnemyAI(state.enemies, state.soldierX, state.soldierZ, healthRef, dt)
  state.soldierHealth = Math.max(0, healthRef.value)

  // Projectile physics
  const toRemove: number[] = []
  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    if (!p) continue
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    p.vy -= GRAVITY * dt
    p.age += dt

    if (p.y <= 0 || p.age > 5) {
      for (const e of state.enemies) {
        if (!e.alive) continue
        const tdx = e.x - p.x
        const tdz = e.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)

        if (tdist < SPLASH_RADIUS) {
          const damage = tdist < HIT_RADIUS ? ROCKET_DAMAGE : ROCKET_DAMAGE * 0.5
          e.health -= damage
          state.totalDamageDealt += damage
          state.hits++
          if (e.health <= 0) {
            e.alive = false
            state.kills++
          }
        } else if (tdist < NEAR_MISS_RADIUS) {
          state.nearMisses++
        }
      }
      toRemove.push(i)
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    const idx = toRemove[i]
    if (idx === undefined) continue
    state.projectiles.splice(idx, 1)
  }
}

export function scoreRocketFitness(state: RocketSimState): number {
  const acc: FitnessAccumulators = {
    kills: state.kills,
    totalDamageDealt: state.totalDamageDealt,
    shotsFired: state.shotsFired,
    hits: state.hits,
    soldierHealth: state.soldierHealth,
    soldierMaxHealth: state.soldierMaxHealth,
    elapsed: state.elapsed,
    simDuration: ROCKET_CONFIG.simDuration,
    timeInEngagementRange: state.timeInEngagementRange,
    distanceTraveled: state.distanceTraveled,
  }

  let fitness = scoreUniversalFitness(acc)

  // Rocket-specific: near miss encouragement
  fitness += state.nearMisses * 0.005

  return fitness
}
