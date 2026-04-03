/**
 * Rocket Launcher Training Scenario
 *
 * HYBRID NERO APPROACH:
 * - Scripted: auto-target nearest enemy, compute ideal ballistic arc, gravity physics
 * - Neural net learns: aim corrections, elevation corrections, fire timing
 *
 * This is why Gen 1 is already interesting — the soldier aims roughly right
 * from the start. The NN just learns WHEN to fire and how to fine-tune.
 */

export interface Target {
  x: number
  z: number
  alive: boolean
}

export interface Projectile {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
}

export interface RocketSimState {
  type: 'rocket'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  targets: Target[]
  projectiles: Projectile[]
  cooldown: number
  elapsed: number
  shotsFired: number
  hits: number
  nearMisses: number
  justFired: boolean
}

const GRAVITY = 9.0
const ROCKET_SPEED = 12.0
const COOLDOWN_TIME = 2.5
const HIT_RADIUS = 0.3
const SPLASH_RADIUS = 1.5
const NEAR_MISS_RADIUS = 4.0

export function initRocketSim(): RocketSimState {
  // Place 3-5 targets at varied positions in the arena
  const targetCount = 3 + Math.floor(Math.random() * 3)
  const targets: Target[] = []
  for (let i = 0; i < targetCount; i++) {
    targets.push({
      x: 3 + Math.random() * 7,       // 3-10 units ahead
      z: (Math.random() - 0.5) * 6,   // spread across width
      alive: true,
    })
  }

  return {
    type: 'rocket',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    targets,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    hits: 0,
    nearMisses: 0,
    justFired: false,
  }
}

/** Extract 6 sensor inputs for the neural net (all normalized roughly -1 to 1) */
export function getRocketInputs(state: RocketSimState): number[] {
  const alive = state.targets.filter(t => t.alive)
  if (alive.length === 0) return [0, 0, 0, 0, state.cooldown / COOLDOWN_TIME, 0]

  // Find nearest alive target
  let nearest = alive[0]
  let nearestDist = Infinity
  for (const t of alive) {
    const dx = t.x - state.soldierX
    const dz = t.z - state.soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) {
      nearestDist = d
      nearest = t
    }
  }

  const dx = nearest.x - state.soldierX
  const dz = nearest.z - state.soldierZ
  const dist = Math.sqrt(dx * dx + dz * dz)

  // Compute ideal elevation for ballistic arc
  const arg = (GRAVITY * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6

  return [
    nearest.x / 10,                          // target x (normalized)
    nearest.z / 5,                           // target z (normalized)
    dist / 10,                               // distance (normalized)
    idealElevation / 0.8,                    // ideal elevation (normalized)
    state.cooldown / COOLDOWN_TIME,          // cooldown (0=ready, 1=full)
    alive.length / 5,                        // alive count (normalized)
  ]
}

/** Apply NN outputs: aim correction, elevation correction, fire trigger */
export function applyRocketOutputs(
  state: RocketSimState,
  outputs: number[],
  dt: number,
): void {
  state.justFired = false

  // Update cooldown
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  const alive = state.targets.filter(t => t.alive)
  if (alive.length === 0) return

  // Find nearest target — scripted auto-aim
  let nearest = alive[0]
  let nearestDist = Infinity
  for (const t of alive) {
    const dx = t.x - state.soldierX
    const dz = t.z - state.soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) {
      nearestDist = d
      nearest = t
    }
  }

  const dx = nearest.x - state.soldierX
  const dz = nearest.z - state.soldierZ

  // Scripted base angle
  const baseAngle = Math.atan2(dx, dz)
  // NN correction: ±0.2 radians
  const aimCorrection = outputs[0] * 0.2
  const finalAngle = baseAngle + aimCorrection

  // Update soldier rotation to face target (visual feedback)
  state.soldierRotation = finalAngle

  // Scripted ideal elevation
  const dist = Math.sqrt(dx * dx + dz * dz)
  const arg = (GRAVITY * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  const idealElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
  // NN correction: ±0.15 radians
  const elevationCorrection = outputs[1] * 0.15
  const finalElevation = Math.max(0.05, idealElevation + elevationCorrection)

  // Fire trigger: NN output > 0 fires if ready
  if (outputs[2] > 0 && state.cooldown <= 0) {
    const cosE = Math.cos(finalElevation)
    state.projectiles.push({
      x: state.soldierX,
      y: 0.5, // launch height
      z: state.soldierZ,
      vx: Math.sin(finalAngle) * cosE * ROCKET_SPEED,
      vy: Math.sin(finalElevation) * ROCKET_SPEED,
      vz: Math.cos(finalAngle) * cosE * ROCKET_SPEED,
      age: 0,
    })
    state.cooldown = COOLDOWN_TIME
    state.shotsFired++
    state.justFired = true
  }
}

/** Update projectile physics and check hits */
export function tickRocketProjectiles(state: RocketSimState, dt: number): void {
  const toRemove: number[] = []

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    p.vy -= GRAVITY * dt // gravity
    p.age += dt

    // Ground impact
    if (p.y <= 0 || p.age > 5) {
      // Check splash damage on targets
      for (const t of state.targets) {
        if (!t.alive) continue
        const tdx = t.x - p.x
        const tdz = t.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)

        if (tdist < HIT_RADIUS) {
          t.alive = false
          state.hits++
        } else if (tdist < SPLASH_RADIUS) {
          t.alive = false
          state.hits++
        } else if (tdist < NEAR_MISS_RADIUS) {
          state.nearMisses++
        }
      }
      toRemove.push(i)
    }
  }

  // Remove expired projectiles (reverse order to preserve indices)
  for (let i = toRemove.length - 1; i >= 0; i--) {
    state.projectiles.splice(toRemove[i], 1)
  }
}

/** Score fitness after simulation ends */
export function scoreRocketFitness(state: RocketSimState): number {
  const destroyed = state.targets.filter(t => !t.alive).length
  const total = state.targets.length

  // Core reward: hits are everything
  let fitness = destroyed * 200

  // Near miss bonus (encouragement for getting close)
  fitness += state.nearMisses * 8

  // Accuracy bonus/penalty
  if (state.shotsFired > 0) {
    const accuracy = state.hits / state.shotsFired
    fitness += accuracy * 50
  }

  // Controlled fire bonus (not spamming)
  const controlledShots = Math.min(state.shotsFired, 5)
  fitness += controlledShots * 5

  // Spam penalty
  if (state.shotsFired > 7) {
    fitness -= (state.shotsFired - 7) * 10
  }

  // Normalize: max ~1000 (5 targets * 200) + bonuses ≈ 1200
  // Scale to roughly 0-1 for progress bar
  const maxExpected = total * 200 + 100
  return Math.max(0, fitness / maxExpected)
}
