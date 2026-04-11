/**
 * Tank Training Scenario — Sprint 7 Universal Sim
 *
 * NERO HYBRID: Turret auto-tracks selected target (scripted).
 * NN learns: steering (outputs[0→1]), throttle (outputs[0]), fire timing,
 * target priority. Tank already had movement — now adds health,
 * adversarial enemies that shoot back, and multi-objective fitness.
 *
 * outputs[0] = throttle (forward/reverse) — maps to tank accel
 * outputs[1] = steering rate — maps to tank turn
 * outputs[2-5] = aim correction, fire gate, elevation, aggression
 */

import {
  type SimEnemy,
  type SimProjectile,
  type UniversalSimConfig,
  type FitnessAccumulators,
  createSimEnemies,
  getUniversalInputs,
  selectTarget,
  tickEnemyAI,
  isInEngagementRange,
  scoreUniversalFitness,
} from './universalSim'

export interface TankSimState {
  type: 'tank'
  tankX: number
  tankZ: number
  tankAngle: number
  tankSpeed: number
  turretAngle: number
  velocityX: number
  velocityZ: number
  soldierHealth: number
  soldierMaxHealth: number
  enemies: SimEnemy[]
  projectiles: SimProjectile[]
  cooldown: number
  elapsed: number
  shellsFired: number
  shellsHit: number
  kills: number
  totalDamageDealt: number
  totalDistance: number
  distanceTraveled: number
  timeInEngagementRange: number
  justFired: boolean
  // Aliases for universal sim compatibility
  soldierX: number
  soldierZ: number
  soldierRotation: number
}

const SHELL_SPEED = 14.0
const SHELL_GRAVITY = 6.0
const COOLDOWN_TIME = 2.0
const TANK_TURN_SPEED = 2.0
const TANK_MAX_SPEED = 2.5
const TANK_ACCEL = 4.0
const TANK_FRICTION = 0.92
const HIT_RADIUS = 0.4
const TANK_SHELL_DAMAGE = 100

const TANK_CONFIG: UniversalSimConfig = {
  maxRange: 12.0,
  maxSpeed: TANK_MAX_SPEED,
  arenaHalfW: 6,
  arenaHalfD: 5,
  simDuration: 10,
  useElevation: true,
  gravity: SHELL_GRAVITY,
}

export interface TrainingBounds {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

const DEFAULT_BOUNDS: TrainingBounds = { minX: 3, maxX: 10, minZ: -4, maxZ: 4 }

export function initTankSim(bounds?: TrainingBounds): TankSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const count = 3 + Math.floor(Math.random() * 3)
  const enemies = createSimEnemies(count, b.minX, b.maxX, b.minZ, b.maxZ, 100)

  return {
    type: 'tank',
    tankX: 0,
    tankZ: 0,
    tankAngle: 0,
    tankSpeed: 0,
    turretAngle: 0,
    velocityX: 0,
    velocityZ: 0,
    soldierHealth: 200,
    soldierMaxHealth: 200,
    enemies,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shellsFired: 0,
    shellsHit: 0,
    kills: 0,
    totalDamageDealt: 0,
    totalDistance: 0,
    distanceTraveled: 0,
    timeInEngagementRange: 0,
    justFired: false,
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
  }
}

export function getTankInputs(state: TankSimState): number[] {
  const cooldownRatio = state.cooldown / COOLDOWN_TIME
  return getUniversalInputs(
    state.tankX, state.tankZ,
    state.soldierHealth, state.soldierMaxHealth,
    state.velocityX, state.velocityZ,
    state.enemies, cooldownRatio, TANK_CONFIG,
  )
}

export function applyTankOutputs(state: TankSimState, outputs: number[], dt: number): void {
  state.justFired = false

  // Tank movement: outputs[0] = throttle, outputs[1] = steering
  // (Different from infantry — vehicle physics)
  state.tankAngle += (outputs[1] ?? 0) * TANK_TURN_SPEED * dt

  state.tankSpeed += (outputs[0] ?? 0) * TANK_ACCEL * dt
  state.tankSpeed = Math.max(-TANK_MAX_SPEED, Math.min(TANK_MAX_SPEED, state.tankSpeed))
  state.tankSpeed *= TANK_FRICTION

  const moveX = Math.sin(state.tankAngle) * state.tankSpeed * dt
  const moveZ = Math.cos(state.tankAngle) * state.tankSpeed * dt
  state.tankX += moveX
  state.tankZ += moveZ
  state.totalDistance += Math.abs(moveX) + Math.abs(moveZ)
  state.distanceTraveled += Math.sqrt(moveX * moveX + moveZ * moveZ)

  // Track velocity for observation feedback
  state.velocityX = Math.sin(state.tankAngle) * state.tankSpeed
  state.velocityZ = Math.cos(state.tankAngle) * state.tankSpeed

  // Clamp to arena
  state.tankX = Math.max(-TANK_CONFIG.arenaHalfW, Math.min(TANK_CONFIG.arenaHalfW + 4, state.tankX))
  state.tankZ = Math.max(-TANK_CONFIG.arenaHalfD, Math.min(TANK_CONFIG.arenaHalfD, state.tankZ))

  // Sync aliases
  state.soldierX = state.tankX
  state.soldierZ = state.tankZ
  state.soldierRotation = state.tankAngle

  // Track engagement range
  if (isInEngagementRange(state.tankX, state.tankZ, state.enemies, TANK_CONFIG.maxRange)) {
    state.timeInEngagementRange += dt
  }

  // Target selection via outputs[5] (aggression)
  const target = selectTarget(state.tankX, state.tankZ, state.enemies, outputs[5] ?? 0)
  if (target) {
    state.turretAngle = Math.atan2(target.x - state.tankX, target.z - state.tankZ)
  }

  // Cooldown
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Fire gate: outputs[3] > 0
  if ((outputs[3] ?? 0) > 0 && state.cooldown <= 0 && target) {
    const dist = Math.sqrt((target.x - state.tankX) ** 2 + (target.z - state.tankZ) ** 2)
    const arg = (SHELL_GRAVITY * dist) / (SHELL_SPEED * SHELL_SPEED)
    const idealElev = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.5
    const elevCorrection = (outputs[4] ?? 0) * 0.15
    const elevation = Math.max(0.05, idealElev + elevCorrection)

    const cosE = Math.cos(elevation)
    state.projectiles.push({
      x: state.tankX,
      y: 0.4,
      z: state.tankZ,
      vx: Math.sin(state.turretAngle) * cosE * SHELL_SPEED,
      vy: Math.sin(elevation) * SHELL_SPEED,
      vz: Math.cos(state.turretAngle) * cosE * SHELL_SPEED,
      age: 0,
      fromEnemy: false,
    })
    state.cooldown = COOLDOWN_TIME
    state.shellsFired++
    state.justFired = true
  }
}

export function tickTankProjectiles(state: TankSimState, dt: number): void {
  // Enemy AI return fire (tanks take reduced damage)
  const healthRef = { value: state.soldierHealth }
  tickEnemyAI(state.enemies, state.tankX, state.tankZ, healthRef, dt)
  state.soldierHealth = Math.max(0, healthRef.value)

  // Shell physics
  const toRemove: number[] = []
  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    if (!p) continue
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    p.vy -= SHELL_GRAVITY * dt
    p.age += dt

    if (p.y <= 0 || p.age > 5) {
      for (const e of state.enemies) {
        if (!e.alive) continue
        const tdx = e.x - p.x
        const tdz = e.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
        if (tdist < HIT_RADIUS) {
          e.health -= TANK_SHELL_DAMAGE
          state.totalDamageDealt += TANK_SHELL_DAMAGE
          state.shellsHit++
          if (e.health <= 0) {
            e.alive = false
            state.kills++
          }
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

export function scoreTankFitness(state: TankSimState): number {
  const acc: FitnessAccumulators = {
    kills: state.kills,
    totalDamageDealt: state.totalDamageDealt,
    shotsFired: state.shellsFired,
    hits: state.shellsHit,
    soldierHealth: state.soldierHealth,
    soldierMaxHealth: state.soldierMaxHealth,
    elapsed: state.elapsed,
    simDuration: TANK_CONFIG.simDuration,
    timeInEngagementRange: state.timeInEngagementRange,
    distanceTraveled: state.distanceTraveled,
  }

  let fitness = scoreUniversalFitness(acc)

  // Tank-specific: approach bonus (get close to enemies)
  for (const e of state.enemies) {
    const dx = e.x - state.tankX
    const dz = e.z - state.tankZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < 4) fitness += (4 - dist) * 0.005
  }

  return fitness
}
