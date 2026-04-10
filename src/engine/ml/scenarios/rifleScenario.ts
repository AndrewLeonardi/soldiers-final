/**
 * Rifle Training Scenario
 *
 * HYBRID NERO APPROACH:
 * - Scripted: auto-target nearest enemy, compute facing angle
 * - Neural net learns: aim corrections, lateral offset, fire timing
 *
 * Hitscan weapon — no projectile physics. Instant raycast on fire.
 * Tight hit radius (0.15) rewards precision over spam.
 * 0.4s cooldown between shots.
 *
 * Network shape: [7, 8, 4]
 *   Inputs [7]: target_x, target_z, distance, angle_to_target,
 *               cooldown_norm, alive_count, accuracy_so_far
 *   Outputs [4]: aim_correction, move_offset, fire_trigger, unused
 */

export interface RifleTarget {
  x: number
  z: number
  alive: boolean
}

export interface RifleSimState {
  type: 'rifle'
  soldierX: number
  soldierZ: number
  soldierRotation: number
  targets: RifleTarget[]
  cooldown: number
  elapsed: number
  shotsFired: number
  hits: number
  consecutiveHits: number
  bestStreak: number
  justFired: boolean
  lastHit: boolean
}

const COOLDOWN_TIME = 0.4
const HIT_RADIUS = 0.15
const MAX_RANGE = 10.0

/** Optional bounds for target placement */
export interface TrainingBounds {
  minX: number; maxX: number
  minZ: number; maxZ: number
}

const DEFAULT_BOUNDS: TrainingBounds = { minX: 1.5, maxX: 5, minZ: -2, maxZ: 2 }

export function initRifleSim(bounds?: TrainingBounds): RifleSimState {
  const b = bounds ?? DEFAULT_BOUNDS
  const targetCount = 3 + Math.floor(Math.random() * 3) // 3-5 targets
  const targets: RifleTarget[] = []
  for (let i = 0; i < targetCount; i++) {
    targets.push({
      x: b.minX + Math.random() * (b.maxX - b.minX),
      z: b.minZ + Math.random() * (b.maxZ - b.minZ),
      alive: true,
    })
  }

  return {
    type: 'rifle',
    soldierX: 0,
    soldierZ: 0,
    soldierRotation: 0,
    targets,
    cooldown: 0,
    elapsed: 0,
    shotsFired: 0,
    hits: 0,
    consecutiveHits: 0,
    bestStreak: 0,
    justFired: false,
    lastHit: false,
  }
}

/** Extract 7 sensor inputs for the neural net (all normalized roughly -1 to 1) */
export function getRifleInputs(state: RifleSimState): number[] {
  const alive = state.targets.filter(t => t.alive)
  const first = alive[0]
  if (!first) return [0, 0, 0, 0, state.cooldown / COOLDOWN_TIME, 0, 0]

  // Find nearest alive target
  let nearest = first
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

  // Angle from soldier to target
  const angleToTarget = Math.atan2(dx, dz)

  // Accuracy so far (0 if no shots)
  const accuracy = state.shotsFired > 0 ? state.hits / state.shotsFired : 0

  return [
    nearest.x / 5,                          // target x (normalized)
    nearest.z / 3,                           // target z (normalized)
    dist / MAX_RANGE,                        // distance (normalized)
    angleToTarget / Math.PI,                 // angle to target (normalized -1 to 1)
    state.cooldown / COOLDOWN_TIME,          // cooldown (0=ready, 1=full)
    alive.length / 5,                        // alive count (normalized)
    accuracy,                                // accuracy so far (0 to 1)
  ]
}

/** Apply NN outputs: aim correction, lateral offset, fire trigger */
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

  const alive = state.targets.filter(t => t.alive)
  const first = alive[0]
  if (!first) return

  // Find nearest target — scripted auto-aim
  let nearest = first
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
  // NN correction: ±0.3 radians (tighter than rocket since hitscan)
  const aimCorrection = (outputs[0] ?? 0) * 0.3
  const finalAngle = baseAngle + aimCorrection

  // Update soldier rotation to face target
  state.soldierRotation = finalAngle

  // NN lateral offset: soldier can sidestep slightly
  const moveOffset = (outputs[1] ?? 0) * 0.5
  state.soldierX += Math.cos(finalAngle) * moveOffset * dt
  // Clamp soldier to reasonable bounds
  state.soldierX = Math.max(-2, Math.min(2, state.soldierX))
  state.soldierZ = Math.max(-3, Math.min(3, state.soldierZ))

  // Fire trigger: NN output > 0 fires if ready
  if ((outputs[2] ?? 0) > 0 && state.cooldown <= 0) {
    state.justFired = true
    state.shotsFired++
    state.cooldown = COOLDOWN_TIME

    // Hitscan: instant raycast from soldier toward finalAngle
    const hitX = state.soldierX + Math.sin(finalAngle) * nearestDist
    const hitZ = state.soldierZ + Math.cos(finalAngle) * nearestDist

    // Check hit against all alive targets
    let hitTarget = false
    for (const t of alive) {
      const tdx = t.x - hitX
      const tdz = t.z - hitZ
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz)

      if (tdist < HIT_RADIUS) {
        t.alive = false
        state.hits++
        state.consecutiveHits++
        state.bestStreak = Math.max(state.bestStreak, state.consecutiveHits)
        state.lastHit = true
        hitTarget = true
        break // One hit per shot
      }
    }

    if (!hitTarget) {
      state.consecutiveHits = 0
    }
  }
}

/** Rifle has no projectile physics — this is a no-op for interface compatibility */
export function tickRifleProjectiles(_state: RifleSimState, _dt: number): void {
  // Hitscan weapon — no projectiles to tick
}

/** Score fitness after simulation ends */
export function scoreRifleFitness(state: RifleSimState): number {
  const destroyed = state.targets.filter(t => !t.alive).length
  const total = state.targets.length

  // Core reward: kills are everything
  let fitness = destroyed * 250

  // Accuracy bonus — reward precision
  if (state.shotsFired > 0) {
    const accuracy = state.hits / state.shotsFired
    fitness += accuracy * 100
  }

  // Streak bonus — consistent accuracy
  fitness += state.bestStreak * 30

  // Controlled fire bonus (not spamming)
  const controlledShots = Math.min(state.shotsFired, total + 2)
  fitness += controlledShots * 10

  // Spam penalty — rifles should be deliberate
  if (state.shotsFired > total * 2 + 3) {
    fitness -= (state.shotsFired - total * 2 - 3) * 15
  }

  // Did-nothing penalty — encourage shooting at all
  if (state.shotsFired === 0) {
    fitness = 0
  }

  // Normalize: max ~1500 (5 targets * 250) + bonuses ≈ 1800
  // Scale to roughly 0-1 for progress tracking
  const maxExpected = total * 250 + 200
  return Math.max(0, fitness / maxExpected)
}
