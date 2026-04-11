/**
 * Grenade Training Scenario — Sprint 7 Universal Sim
 *
 * Shorter range, high arc, big splash radius.
 * NN learns movement, throw timing, angle, multi-kill positioning.
 * Fitness rewards splash hits. Enemies shoot back.
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

export interface GrenadeSimState {
  type: 'grenade'
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
  splashHits: number
  justFired: boolean
}

const GRAVITY = 9.0
const THROW_SPEED = 8.0
const COOLDOWN_TIME = 3.0
const SPLASH_RADIUS = 2.0
const GRENADE_DAMAGE = 70

const GRENADE_CONFIG: UniversalSimConfig = {
  maxRange: 10.0,
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

const DEFAULT_BOUNDS: TrainingBounds = { minX: 2, maxX: 7, minZ: -2, maxZ: 2 }

export function initGrenadeSim(bounds?: TrainingBounds): GrenadeSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  // Grenades want clustered enemies for splash kills
  const groups = 1 + Math.floor(Math.random() * 2)
  const enemies: SimEnemy[] = []

  for (let g = 0; g < groups; g++) {
    const gx = b.minX + Math.random() * (b.maxX - b.minX)
    const gz = b.minZ + Math.random() * (b.maxZ - b.minZ)
    const clusterSize = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < clusterSize; i++) {
      const rawEnemies = createSimEnemies(1,
        gx - 0.75, gx + 0.75,
        gz - 0.75, gz + 0.75,
        70,
      )
      enemies.push(...rawEnemies)
    }
  }

  return {
    type: 'grenade',
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
    splashHits: 0,
    justFired: false,
  }
}

export function getGrenadeInputs(state: GrenadeSimState): number[] {
  const cooldownRatio = state.cooldown / COOLDOWN_TIME
  return getUniversalInputs(
    state.soldierX, state.soldierZ,
    state.soldierHealth, state.soldierMaxHealth,
    state.velocityX, state.velocityZ,
    state.enemies, cooldownRatio, GRENADE_CONFIG,
  )
}

export function applyGrenadeOutputs(state: GrenadeSimState, outputs: number[], dt: number): void {
  state.justFired = false

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Movement
  const move = applyInfantryMovement(
    state.soldierX, state.soldierZ,
    state.velocityX, state.velocityZ,
    outputs, state.enemies, dt, GRENADE_CONFIG,
  )
  state.soldierX = move.x
  state.soldierZ = move.z
  state.velocityX = move.vx
  state.velocityZ = move.vz
  state.distanceTraveled += move.distMoved

  if (isInEngagementRange(state.soldierX, state.soldierZ, state.enemies, GRENADE_CONFIG.maxRange)) {
    state.timeInEngagementRange += dt
  }

  // Grenade targets cluster center (via selectTarget for aggression)
  const alive = state.enemies.filter(e => e.alive)
  if (alive.length === 0) return

  // Aim at cluster center of mass
  let cx = 0, cz = 0
  for (const e of alive) { cx += e.x; cz += e.z }
  cx /= alive.length
  cz /= alive.length

  const dx = cx - state.soldierX
  const dz = cz - state.soldierZ
  const baseAngle = Math.atan2(dx, dz)
  const aimCorrection = (outputs[2] ?? 0) * 0.25
  const finalAngle = baseAngle + aimCorrection
  state.soldierRotation = finalAngle

  const dist = Math.sqrt(dx * dx + dz * dz)
  const arg = (GRAVITY * dist) / (THROW_SPEED * THROW_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.7
  const elevationCorrection = (outputs[4] ?? 0) * 0.2
  const finalElevation = Math.max(0.15, idealElevation + elevationCorrection)

  if ((outputs[3] ?? 0) > 0 && state.cooldown <= 0) {
    const cosE = Math.cos(finalElevation)
    state.projectiles.push({
      x: state.soldierX,
      y: 0.8,
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * cosE * THROW_SPEED,
      vy: Math.sin(finalElevation) * THROW_SPEED,
      vz: Math.cos(finalAngle) * cosE * THROW_SPEED,
      age: 0,
      fromEnemy: false,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

export function tickGrenadeProjectiles(state: GrenadeSimState, dt: number): void {
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

    if (p.y <= 0 || p.age > 4) {
      let hitsThisGrenade = 0
      for (const e of state.enemies) {
        if (!e.alive) continue
        const tdx = e.x - p.x
        const tdz = e.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
        if (tdist < SPLASH_RADIUS) {
          e.health -= GRENADE_DAMAGE
          state.totalDamageDealt += GRENADE_DAMAGE
          state.hits++
          hitsThisGrenade++
          if (e.health <= 0) {
            e.alive = false
            state.kills++
          }
        }
      }
      if (hitsThisGrenade > 1) {
        state.splashHits += hitsThisGrenade - 1
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

export function scoreGrenadeFitness(state: GrenadeSimState): number {
  const acc: FitnessAccumulators = {
    kills: state.kills,
    totalDamageDealt: state.totalDamageDealt,
    shotsFired: state.shotsFired,
    hits: state.hits,
    soldierHealth: state.soldierHealth,
    soldierMaxHealth: state.soldierMaxHealth,
    elapsed: state.elapsed,
    simDuration: GRENADE_CONFIG.simDuration,
    timeInEngagementRange: state.timeInEngagementRange,
    distanceTraveled: state.distanceTraveled,
  }

  let fitness = scoreUniversalFitness(acc)

  // Grenade-specific: multi-kill splash bonus
  fitness += state.splashHits * 0.05

  return fitness
}
