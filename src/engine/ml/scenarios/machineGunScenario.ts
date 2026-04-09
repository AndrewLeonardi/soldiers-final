/**
 * Machine Gun Training Scenario
 *
 * Stationary suppression weapon. Fast fire rate, low per-hit damage.
 * NN learns: sweep direction, burst timing, target prioritization.
 * Fitness rewards sustained hits over time, not single kills.
 */

export interface MGTarget {
  x: number
  z: number
  health: number
  maxHealth: number
  alive: boolean
  speed: number
  direction: number
}

export interface Bullet {
  x: number
  z: number
  vx: number
  vz: number
  age: number
}

export interface MGSimState {
  type: 'machineGun'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  targets: MGTarget[]
  projectiles: Bullet[]
  cooldown: number
  elapsed: number
  shotsFired: number
  totalHits: number
  kills: number
  justFired: boolean
}

const BULLET_SPEED = 20.0
const COOLDOWN_TIME = 0.3
const BULLET_HIT_RADIUS = 0.25
const MG_DAMAGE = 15

/** Optional bounds from world config */
export interface TrainingBounds {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

const DEFAULT_BOUNDS: TrainingBounds = { minX: 4, maxX: 10, minZ: -3, maxZ: 3 }

export function initMGSim(bounds?: TrainingBounds): MGSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const count = 3 + Math.floor(Math.random() * 3)
  const targets: MGTarget[] = []
  for (let i = 0; i < count; i++) {
    targets.push({
      x: b.minX + Math.random() * (b.maxX - b.minX),
      z: b.minZ + Math.random() * (b.maxZ - b.minZ),
      health: 40 + Math.floor(Math.random() * 20),
      maxHealth: 60,
      alive: true,
      speed: 0.5 + Math.random() * 1.0,
      direction: Math.random() < 0.5 ? 1 : -1,
    })
  }

  return {
    type: 'machineGun',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    targets,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    totalHits: 0,
    kills: 0,
    justFired: false,
  }
}

export function getMGInputs(state: MGSimState): number[] {
  const alive = state.targets.filter(t => t.alive)
  const first = alive[0]
  if (!first) return [0, 0, 0, 0, state.cooldown / COOLDOWN_TIME, 0]

  // Nearest alive target
  let nearest = first
  let nearestDist = Infinity
  for (const t of alive) {
    const dx = t.x - state.soldierX
    const dz = t.z - state.soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) { nearestDist = d; nearest = t }
  }

  const dx = nearest.x - state.soldierX
  const dz = nearest.z - state.soldierZ
  const angle = Math.atan2(dx, dz)

  return [
    nearest.x / 10,
    nearest.z / 5,
    nearestDist / 10,
    angle / Math.PI,                        // relative angle
    state.cooldown / COOLDOWN_TIME,
    alive.length / 5,
  ]
}

export function applyMGOutputs(state: MGSimState, outputs: number[], dt: number): void {
  state.justFired = false

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Move targets (they strafe back and forth)
  for (const t of state.targets) {
    if (!t.alive) continue
    t.z += t.speed * t.direction * dt
    if (Math.abs(t.z) > 4) t.direction *= -1
  }

  const alive = state.targets.filter(t => t.alive)
  const firstAlive = alive[0]
  if (!firstAlive) return

  // Find nearest
  let nearest = firstAlive
  let nearestDist = Infinity
  for (const t of alive) {
    const dx = t.x - state.soldierX
    const dz = t.z - state.soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) { nearestDist = d; nearest = t }
  }

  const dx = nearest.x - state.soldierX
  const dz = nearest.z - state.soldierZ
  const baseAngle = Math.atan2(dx, dz)

  // NN controls: sweep offset + fire trigger
  const sweepOffset = (outputs[0] ?? 0) * 0.3  // ±0.3 rad sweep
  const finalAngle = baseAngle + sweepOffset

  state.soldierRotation = finalAngle

  // Fire: output[2] > 0 and ready
  if ((outputs[2] ?? 0) > 0 && state.cooldown <= 0) {
    state.projectiles.push({
      x: state.soldierX,
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * BULLET_SPEED,
      vz: Math.cos(finalAngle) * BULLET_SPEED,
      age: 0,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

export function tickMGProjectiles(state: MGSimState, dt: number): void {
  const toRemove: number[] = []

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    if (!p) continue
    p.x += p.vx * dt
    p.z += p.vz * dt
    p.age += dt

    // Check hits on targets
    let hit = false
    for (const t of state.targets) {
      if (!t.alive) continue
      const tdx = t.x - p.x
      const tdz = t.z - p.z
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
      if (tdist < BULLET_HIT_RADIUS) {
        t.health -= MG_DAMAGE
        state.totalHits++
        if (t.health <= 0) {
          t.alive = false
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
  const total = state.targets.length

  let fitness = state.kills * 200

  // Sustained hits bonus (MG is about volume of fire)
  fitness += state.totalHits * 15

  // Accuracy matters — not just spraying
  if (state.shotsFired > 0) {
    const accuracy = state.totalHits / state.shotsFired
    fitness += accuracy * 80
  }

  // Kill speed bonus
  if (state.kills > 0 && state.elapsed > 0) {
    fitness += Math.max(0, (1 - state.elapsed / 5)) * 50
  }

  const maxExpected = total * 200 + total * 15 * 4 + 130
  return Math.max(0, fitness / maxExpected)
}
