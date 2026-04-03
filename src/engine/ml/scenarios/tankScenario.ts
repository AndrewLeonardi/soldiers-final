/**
 * Tank Training Scenario
 *
 * NERO HYBRID: Turret auto-tracks nearest target (scripted).
 * NN learns: steering, throttle, fire timing.
 *
 * Gen 1 = tank spinning in circles. Gen 20+ = tank navigates to targets,
 * positions itself, and fires accurately.
 */

export interface TankTarget {
  x: number
  z: number
  alive: boolean
}

export interface Shell {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
}

export interface TankSimState {
  type: 'tank'
  tankX: number
  tankZ: number
  tankAngle: number
  tankSpeed: number
  turretAngle: number
  targets: TankTarget[]
  projectiles: Shell[]
  cooldown: number
  elapsed: number
  shellsFired: number
  shellsHit: number
  kills: number
  totalDistance: number
  justFired: boolean
  soldierX: number  // alias for compatibility
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

export function initTankSim(): TankSimState {
  const count = 3 + Math.floor(Math.random() * 3)
  const targets: TankTarget[] = []
  for (let i = 0; i < count; i++) {
    targets.push({
      x: 3 + Math.random() * 7,
      z: (Math.random() - 0.5) * 8,
      alive: true,
    })
  }

  return {
    type: 'tank',
    tankX: 0,
    tankZ: 0,
    tankAngle: 0,
    tankSpeed: 0,
    turretAngle: 0,
    targets,
    projectiles: [],
    cooldown: 0,
    elapsed: 0,
    shellsFired: 0,
    shellsHit: 0,
    kills: 0,
    totalDistance: 0,
    justFired: false,
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
  }
}

export function getTankInputs(state: TankSimState): number[] {
  const alive = state.targets.filter(t => t.alive)
  if (alive.length === 0) return [0, 0, 0, state.cooldown / COOLDOWN_TIME, 0, state.elapsed / 8]

  let nearest = alive[0]
  let nearestDist = Infinity
  for (const t of alive) {
    const dx = t.x - state.tankX
    const dz = t.z - state.tankZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) { nearestDist = d; nearest = t }
  }

  const dx = nearest.x - state.tankX
  const dz = nearest.z - state.tankZ
  const angleToTarget = Math.atan2(dx, dz)

  // Relative angle (how far off the tank is pointing from the target)
  let relAngle = angleToTarget - state.tankAngle
  while (relAngle > Math.PI) relAngle -= 2 * Math.PI
  while (relAngle < -Math.PI) relAngle += 2 * Math.PI

  return [
    relAngle / Math.PI,                     // relative angle (-1 to 1)
    nearestDist / 10,                        // distance (normalized)
    state.tankSpeed / TANK_MAX_SPEED,        // current speed (-1 to 1)
    state.cooldown / COOLDOWN_TIME,          // cooldown
    alive.length / 5,                        // alive count
    state.elapsed / 8,                       // elapsed time
  ]
}

export function applyTankOutputs(state: TankSimState, outputs: number[], dt: number): void {
  state.justFired = false

  // Steering
  state.tankAngle += outputs[0] * TANK_TURN_SPEED * dt

  // Throttle: accelerate/decelerate
  state.tankSpeed += outputs[1] * TANK_ACCEL * dt
  state.tankSpeed = Math.max(-TANK_MAX_SPEED, Math.min(TANK_MAX_SPEED, state.tankSpeed))
  state.tankSpeed *= TANK_FRICTION

  // Move tank
  const moveX = Math.sin(state.tankAngle) * state.tankSpeed * dt
  const moveZ = Math.cos(state.tankAngle) * state.tankSpeed * dt
  state.tankX += moveX
  state.tankZ += moveZ
  state.totalDistance += Math.abs(moveX) + Math.abs(moveZ)

  // Clamp to arena
  state.tankX = Math.max(-4, Math.min(10, state.tankX))
  state.tankZ = Math.max(-5, Math.min(5, state.tankZ))

  // Sync aliases
  state.soldierX = state.tankX
  state.soldierZ = state.tankZ
  state.soldierRotation = state.tankAngle

  // Scripted turret auto-tracks nearest target
  const alive = state.targets.filter(t => t.alive)
  if (alive.length > 0) {
    let nearest = alive[0]
    let nearestDist = Infinity
    for (const t of alive) {
      const dx = t.x - state.tankX
      const dz = t.z - state.tankZ
      const d = Math.sqrt(dx * dx + dz * dz)
      if (d < nearestDist) { nearestDist = d; nearest = t }
    }
    state.turretAngle = Math.atan2(nearest.x - state.tankX, nearest.z - state.tankZ)
  }

  // Cooldown
  if (state.cooldown > 0) {
    state.cooldown = Math.max(0, state.cooldown - dt)
  }

  // Fire: NN decides when
  if (outputs[2] > 0 && state.cooldown <= 0 && alive.length > 0) {
    // Fire in turret direction
    const dist = Math.sqrt(
      (alive[0].x - state.tankX) ** 2 + (alive[0].z - state.tankZ) ** 2
    )
    const arg = (SHELL_GRAVITY * dist) / (SHELL_SPEED * SHELL_SPEED)
    const elevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.5

    const cosE = Math.cos(elevation)
    state.projectiles.push({
      x: state.tankX,
      y: 0.4,
      z: state.tankZ,
      vx: Math.sin(state.turretAngle) * cosE * SHELL_SPEED,
      vy: Math.sin(elevation) * SHELL_SPEED,
      vz: Math.cos(state.turretAngle) * cosE * SHELL_SPEED,
      age: 0,
    })
    state.cooldown = COOLDOWN_TIME
    state.shellsFired++
    state.justFired = true
  }
}

export function tickTankProjectiles(state: TankSimState, dt: number): void {
  const toRemove: number[] = []

  for (let i = 0; i < state.projectiles.length; i++) {
    const p = state.projectiles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.z += p.vz * dt
    p.vy -= SHELL_GRAVITY * dt
    p.age += dt

    if (p.y <= 0 || p.age > 5) {
      for (const t of state.targets) {
        if (!t.alive) continue
        const tdx = t.x - p.x
        const tdz = t.z - p.z
        const tdist = Math.sqrt(tdx * tdx + tdz * tdz)
        if (tdist < HIT_RADIUS) {
          t.alive = false
          state.kills++
          state.shellsHit++
        }
      }
      toRemove.push(i)
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    state.projectiles.splice(toRemove[i], 1)
  }
}

export function scoreTankFitness(state: TankSimState): number {
  const total = state.targets.length

  let fitness = state.kills * 200

  // Movement bonus — reward exploration
  fitness += Math.min(state.totalDistance, 10) * 5

  // Approach bonus
  for (const t of state.targets) {
    const dx = t.x - state.tankX
    const dz = t.z - state.tankZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < 4) fitness += (4 - dist) * 8
  }

  // Accuracy
  if (state.shellsFired > 0) {
    fitness += (state.shellsHit / state.shellsFired) * 60
  }

  // Fire control
  fitness += Math.min(state.shellsFired, 5) * 5
  if (state.shellsFired > 8) {
    fitness -= (state.shellsFired - 8) * 10
  }

  const maxExpected = total * 200 + 120
  return Math.max(0, fitness / maxExpected)
}
