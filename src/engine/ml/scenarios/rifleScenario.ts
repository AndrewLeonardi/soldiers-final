/**
 * Rifle Training Scenario — Sprint 7 Universal Sim
 *
 * HYBRID NERO APPROACH + ADVERSARIAL TRAINING:
 * - Scripted: auto-target selection, compute facing angle
 * - Neural net learns: movement, aim corrections, fire timing, target priority
 * - Enemies shoot back — survival pressure drives movement emergence
 *
 * Hitscan weapon — no projectile physics. Instant raycast on fire.
 * Tight hit radius (0.15) rewards precision over spam.
 * 0.4s cooldown between shots.
 *
 * Network shape: [10, 12, 6] (universal)
 */

import {
  type SimEnemy,
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

export interface RifleSimState {
  type: 'rifle'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  velocityX: number
  velocityZ: number
  soldierHealth: number
  soldierMaxHealth: number
  enemies: SimEnemy[]
  cooldown: number
  elapsed: number
  shotsFired: number
  hits: number
  kills: number
  totalDamageDealt: number
  distanceTraveled: number
  timeInEngagementRange: number
  consecutiveHits: number
  bestStreak: number
  justFired: boolean
  lastHit: boolean
}

const COOLDOWN_TIME = 0.4
const HIT_RADIUS = 0.15
const MAX_RANGE = 10.0
const RIFLE_DAMAGE = 60  // one-shot kill on 60hp enemies

const RIFLE_CONFIG: UniversalSimConfig = {
  maxRange: MAX_RANGE,
  maxSpeed: 2.0,
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

const DEFAULT_BOUNDS: TrainingBounds = { minX: 1.5, maxX: 7, minZ: -3, maxZ: 3 }

export function initRifleSim(bounds?: TrainingBounds): RifleSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const enemyCount = 3 + Math.floor(Math.random() * 2) // 3-4 enemies
  const enemies = createSimEnemies(enemyCount, b.minX, b.maxX, b.minZ, b.maxZ, 60)

  return {
    type: 'rifle',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    velocityX: 0,
    velocityZ: 0,
    soldierHealth: 100,
    soldierMaxHealth: 100,
    enemies,
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    hits: 0,
    kills: 0,
    totalDamageDealt: 0,
    distanceTraveled: 0,
    timeInEngagementRange: 0,
    consecutiveHits: 0,
    bestStreak: 0,
    justFired: false,
    lastHit: false,
  }
}

/** Extract 10 sensor inputs for the universal neural net */
export function getRifleInputs(state: RifleSimState): number[] {
  const cooldownRatio = state.cooldown / COOLDOWN_TIME
  return getUniversalInputs(
    state.soldierX, state.soldierZ,
    state.soldierHealth, state.soldierMaxHealth,
    state.velocityX, state.velocityZ,
    state.enemies, cooldownRatio, RIFLE_CONFIG,
  )
}

/** Apply NN outputs: movement, aim correction, fire trigger, target selection */
export function applyRifleOutputs(
  state: RifleSimState,
  outputs: number[],
  dt: number,
): void {
  state.justFired = false
  state.lastHit = false

  // Update cooldown
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Apply movement from outputs[0-1]
  const move = applyInfantryMovement(
    state.soldierX, state.soldierZ,
    state.velocityX, state.velocityZ,
    outputs, state.enemies, dt, RIFLE_CONFIG,
  )
  state.soldierX = move.x
  state.soldierZ = move.z
  state.velocityX = move.vx
  state.velocityZ = move.vz
  state.distanceTraveled += move.distMoved

  // Track engagement range
  if (isInEngagementRange(state.soldierX, state.soldierZ, state.enemies, MAX_RANGE)) {
    state.timeInEngagementRange += dt
  }

  // Target selection via outputs[5] (aggression)
  const target = selectTarget(state.soldierX, state.soldierZ, state.enemies, outputs[5] ?? 0)
  if (!target) return

  // Scripted auto-aim toward selected target
  const dx = target.x - state.soldierX
  const dz = target.z - state.soldierZ
  const baseAngle = Math.atan2(dx, dz)

  // NN aim correction from outputs[2] (±0.3 rad for hitscan precision)
  const aimCorrection = (outputs[2] ?? 0) * 0.3
  const finalAngle = baseAngle + aimCorrection

  state.soldierRotation = finalAngle

  // Fire gate: outputs[3] > 0 fires if ready
  if ((outputs[3] ?? 0) > 0 && state.cooldown <= 0) {
    state.justFired = true
    state.shotsFired++
    state.cooldown = COOLDOWN_TIME

    // Hitscan: instant raycast from soldier toward finalAngle
    const dist = Math.sqrt(dx * dx + dz * dz)
    const hitX = state.soldierX + Math.sin(finalAngle) * dist
    const hitZ = state.soldierZ + Math.cos(finalAngle) * dist

    // Check hit against all alive enemies
    let hitEnemy = false
    for (const e of state.enemies) {
      if (!e.alive) continue
      const edx = e.x - hitX
      const edz = e.z - hitZ
      const edist = Math.sqrt(edx * edx + edz * edz)

      if (edist < HIT_RADIUS) {
        e.health -= RIFLE_DAMAGE
        state.totalDamageDealt += RIFLE_DAMAGE
        state.hits++
        state.consecutiveHits++
        state.bestStreak = Math.max(state.bestStreak, state.consecutiveHits)
        state.lastHit = true
        hitEnemy = true
        if (e.health <= 0) {
          e.alive = false
          state.kills++
        }
        break
      }
    }

    if (!hitEnemy) {
      state.consecutiveHits = 0
    }
  }
}

/** Enemy AI + return fire — enemies shoot back at soldier */
export function tickRifleProjectiles(state: RifleSimState, dt: number): void {
  const healthRef = { value: state.soldierHealth }
  tickEnemyAI(state.enemies, state.soldierX, state.soldierZ, healthRef, dt)
  state.soldierHealth = Math.max(0, healthRef.value)
}

/** Score fitness after simulation ends */
export function scoreRifleFitness(state: RifleSimState): number {
  const acc: FitnessAccumulators = {
    kills: state.kills,
    totalDamageDealt: state.totalDamageDealt,
    shotsFired: state.shotsFired,
    hits: state.hits,
    soldierHealth: state.soldierHealth,
    soldierMaxHealth: state.soldierMaxHealth,
    elapsed: state.elapsed,
    simDuration: RIFLE_CONFIG.simDuration,
    timeInEngagementRange: state.timeInEngagementRange,
    distanceTraveled: state.distanceTraveled,
  }

  let fitness = scoreUniversalFitness(acc)

  // Rifle-specific: streak bonus for consistent accuracy
  fitness += (state.bestStreak * 0.02)

  return fitness
}
