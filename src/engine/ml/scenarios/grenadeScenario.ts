/**
 * Grenade Training Scenario
 *
 * Variant of rocket: shorter range, high arc, big splash radius.
 * NN learns throw timing + angle + when to lob for multi-kills.
 * Fitness rewards splash hits (multiple targets from one grenade).
 */

export interface GrenadeTarget {
  x: number
  z: number
  alive: boolean
}

export interface GrenadeProjectile {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
}

export interface GrenadeSimState {
  type: 'grenade'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  targets: GrenadeTarget[]
  projectiles: GrenadeProjectile[]
  cooldown: number
  elapsed: number
  shotsFired: number
  hits: number
  splashHits: number
  justFired: boolean
}

const GRAVITY = 9.0
const THROW_SPEED = 8.0
const COOLDOWN_TIME = 3.0
const SPLASH_RADIUS = 2.0
const NEAR_MISS_RADIUS = 3.5

export function initGrenadeSim(): GrenadeSimState {
  // Cluster targets closer together to reward splash
  const groups = 1 + Math.floor(Math.random() * 2)
  const targets: GrenadeTarget[] = []

  for (let g = 0; g < groups; g++) {
    const gx = 2 + Math.random() * 5
    const gz = (Math.random() - 0.5) * 4
    const clusterSize = 2 + Math.floor(Math.random() * 2)
    for (let i = 0; i < clusterSize; i++) {
      targets.push({
        x: gx + (Math.random() - 0.5) * 1.5,
        z: gz + (Math.random() - 0.5) * 1.5,
        alive: true,
      })
    }
  }

  return {
    type: 'grenade',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    targets,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    hits: 0,
    splashHits: 0,
    justFired: false,
  }
}

export function getGrenadeInputs(state: GrenadeSimState): number[] {
  const alive = state.targets.filter(t => t.alive)
  if (alive.length === 0) return [0, 0, 0, 0, state.cooldown / COOLDOWN_TIME, 0]

  // Find center of mass of alive targets (grenade wants clusters)
  let cx = 0, cz = 0
  for (const t of alive) { cx += t.x; cz += t.z }
  cx /= alive.length
  cz /= alive.length

  const dx = cx - state.soldierX
  const dz = cz - state.soldierZ
  const dist = Math.sqrt(dx * dx + dz * dz)

  const arg = (GRAVITY * dist) / (THROW_SPEED * THROW_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.7

  return [
    cx / 8,
    cz / 4,
    dist / 8,
    idealElevation / 0.8,
    state.cooldown / COOLDOWN_TIME,
    alive.length / 5,
  ]
}

export function applyGrenadeOutputs(state: GrenadeSimState, outputs: number[], dt: number): void {
  state.justFired = false

  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  const alive = state.targets.filter(t => t.alive)
  if (alive.length === 0) return

  // Aim at cluster center
  let cx = 0, cz = 0
  for (const t of alive) { cx += t.x; cz += t.z }
  cx /= alive.length
  cz /= alive.length

  const dx = cx - state.soldierX
  const dz = cz - state.soldierZ
  const baseAngle = Math.atan2(dx, dz)
  const aimCorrection = outputs[0] * 0.25
  const finalAngle = baseAngle + aimCorrection

  state.soldierRotation = finalAngle

  const dist = Math.sqrt(dx * dx + dz * dz)
  const arg = (GRAVITY * dist) / (THROW_SPEED * THROW_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.7
  const elevationCorrection = outputs[1] * 0.2
  const finalElevation = Math.max(0.15, idealElevation + elevationCorrection)

  if (outputs[2] > 0 && state.cooldown <= 0) {
    const cosE = Math.cos(finalElevation)
    state.projectiles.push({
      x: state.soldierX,
      y: 0.8,
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * cosE * THROW_SPEED,
      vy: Math.sin(finalElevation) * THROW_SPEED,
      vz: Math.cos(finalAngle) * cosE * THROW_SPEED,
      age: 0,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

export function tickGrenadeProjectiles(state: GrenadeSimState, dt: number): void {
  const toRemove: number[] = []

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    p.vy -= GRAVITY * dt
    p.age += dt

    if (p.y <= 0 || p.age > 4) {
      // Splash explosion — check all targets
      let hitsThisGrenade = 0
      for (const t of state.targets) {
        if (!t.alive) continue
        const tdx = t.x - p.x
        const tdz = t.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
        if (tdist < SPLASH_RADIUS) {
          t.alive = false
          state.hits++
          hitsThisGrenade++
        }
      }
      if (hitsThisGrenade > 1) {
        state.splashHits += hitsThisGrenade - 1
      }
      toRemove.push(i)
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    state.projectiles.splice(toRemove[i], 1)
  }
}

export function scoreGrenadeFitness(state: GrenadeSimState): number {
  const destroyed = state.targets.filter(t => !t.alive).length
  const total = state.targets.length

  let fitness = destroyed * 200

  // Multi-kill bonus — the whole point of grenades
  fitness += state.splashHits * 100

  // Accuracy
  if (state.shotsFired > 0) {
    fitness += (state.hits / state.shotsFired) * 40
  }

  // Controlled fire
  fitness += Math.min(state.shotsFired, 3) * 10

  // Spam penalty
  if (state.shotsFired > 5) {
    fitness -= (state.shotsFired - 5) * 15
  }

  const maxExpected = total * 200 + total * 50 + 100
  return Math.max(0, fitness / maxExpected)
}
