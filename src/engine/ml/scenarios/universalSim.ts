/**
 * Universal Simulation Foundation — shared primitives for all weapon scenarios.
 *
 * Sprint 7. Provides adversarial training with enemies that shoot back,
 * movement physics, target selection, and multi-objective fitness scoring.
 * Each weapon scenario is a thin wrapper around these shared functions.
 *
 * Universal Observation Vector [10 inputs]:
 *   [0] threat_bearing / π          — ego-centric direction to primary threat
 *   [1] threat_distance / MAX_RANGE — normalized distance (0=on top, 1=max)
 *   [2] threat_elevation / 0.8      — ballistic hint (0 for hitscan)
 *   [3] cooldown_ratio              — 0=ready, 1=just fired
 *   [4] enemy_count / 6             — living enemies normalized
 *   [5] own_health / max_health     — self-preservation signal
 *   [6] nearest_friendly_dist / 8   — spacing/formation signal
 *   [7] threat_density / 4          — enemies in forward cone
 *   [8] own_velocity_x / maxSpeed   — lateral velocity feedback
 *   [9] own_velocity_z / maxSpeed   — forward velocity feedback
 *
 * Universal Action Vector [6 outputs]:
 *   [0] move_forward  [-1,1]  — advance/retreat relative to threat
 *   [1] move_lateral  [-1,1]  — strafe left/right relative to threat
 *   [2] aim_correction [-1,1] — fine-tune auto-aim
 *   [3] fire_gate     [-1,1]  — >0 = fire when cooldown ready
 *   [4] elevation_adj [-1,1]  — ballistic arc correction
 *   [5] aggression    [-1,1]  — target priority (-1=nearest, +1=weakest)
 */

// ── Sim Enemy (scripted adversarial targets) ──

export interface SimEnemy {
  x: number
  z: number
  health: number
  maxHealth: number
  alive: boolean
  /** Enemies fire back at the soldier */
  fireCooldown: number
  fireRate: number
  accuracy: number
  damage: number
  /** Optional lateral movement */
  speed: number
  direction: number
}

// ── Sim Projectile (both sides) ──

export interface SimProjectile {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  age: number
  fromEnemy: boolean
}

// ── Weapon-specific config passed into shared functions ──

export interface UniversalSimConfig {
  maxRange: number
  maxSpeed: number          // max infantry speed (units/s)
  arenaHalfW: number        // X clamp
  arenaHalfD: number        // Z clamp
  simDuration: number
  /** 0 for hitscan weapons, >0 for ballistic */
  useElevation: boolean
  /** Gravity for ballistic weapons */
  gravity: number
}

// ── Default enemy factory ──

export function createSimEnemies(
  count: number,
  minX: number, maxX: number,
  minZ: number, maxZ: number,
  health: number = 60,
): SimEnemy[] {
  const enemies: SimEnemy[] = []
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: minX + Math.random() * (maxX - minX),
      z: minZ + Math.random() * (maxZ - minZ),
      health,
      maxHealth: health,
      alive: true,
      fireCooldown: 1.0 + Math.random() * 1.5, // stagger first shots
      fireRate: 1.5,
      accuracy: 0.30,
      damage: 10,
      speed: 0.3 + Math.random() * 0.5,
      direction: Math.random() < 0.5 ? 1 : -1,
    })
  }
  return enemies
}

// ── Universal Observation Vector ──

export function getUniversalInputs(
  soldierX: number,
  soldierZ: number,
  soldierHealth: number,
  soldierMaxHealth: number,
  velocityX: number,
  velocityZ: number,
  enemies: SimEnemy[],
  cooldownRatio: number,
  config: UniversalSimConfig,
): number[] {
  const alive = enemies.filter(e => e.alive)
  if (alive.length === 0) {
    return [0, 0, 0, cooldownRatio, 0, soldierHealth / soldierMaxHealth, 1, 0,
      velocityX / config.maxSpeed, velocityZ / config.maxSpeed]
  }

  // Find primary threat (nearest alive enemy)
  let nearest = alive[0]!
  let nearestDist = Infinity
  for (const e of alive) {
    const dx = e.x - soldierX
    const dz = e.z - soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) {
      nearestDist = d
      nearest = e
    }
  }

  const tdx = nearest.x - soldierX
  const tdz = nearest.z - soldierZ
  const threatBearing = Math.atan2(tdx, tdz)

  // Ideal elevation for ballistic weapons
  let threatElevation = 0
  if (config.useElevation && config.gravity > 0) {
    // Simplified ballistic hint
    const arg = (config.gravity * nearestDist) / (config.maxRange * config.maxRange * 0.5)
    threatElevation = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
  }

  // Threat density: count enemies in a forward 60° cone
  let threatDensity = 0
  for (const e of alive) {
    const edx = e.x - soldierX
    const edz = e.z - soldierZ
    const eAngle = Math.atan2(edx, edz)
    let angleDiff = eAngle - threatBearing
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
    if (Math.abs(angleDiff) < Math.PI / 3) threatDensity++
  }

  return [
    threatBearing / Math.PI,                     // [0] threat bearing
    Math.min(1, nearestDist / config.maxRange),  // [1] threat distance
    threatElevation / 0.8,                       // [2] elevation hint
    cooldownRatio,                               // [3] cooldown
    alive.length / 6,                            // [4] enemy count
    soldierHealth / soldierMaxHealth,             // [5] own health
    1.0,                                         // [6] friendly dist (1=solo in training)
    Math.min(1, threatDensity / 4),              // [7] threat density
    velocityX / config.maxSpeed,                 // [8] velocity X
    velocityZ / config.maxSpeed,                 // [9] velocity Z
  ]
}

// ── Movement Physics (infantry) ──

const MAX_INFANTRY_SPEED = 2.0

export function applyInfantryMovement(
  soldierX: number,
  soldierZ: number,
  velocityX: number,
  velocityZ: number,
  outputs: number[],
  enemies: SimEnemy[],
  dt: number,
  config: UniversalSimConfig,
): { x: number; z: number; vx: number; vz: number; distMoved: number } {
  const alive = enemies.filter(e => e.alive)
  if (alive.length === 0) {
    return { x: soldierX, z: soldierZ, vx: 0, vz: 0, distMoved: 0 }
  }

  // Find nearest threat for bearing
  let nearest = alive[0]!
  let nearestDist = Infinity
  for (const e of alive) {
    const dx = e.x - soldierX
    const dz = e.z - soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) { nearestDist = d; nearest = e }
  }

  const threatDx = nearest.x - soldierX
  const threatDz = nearest.z - soldierZ
  const threatAngle = Math.atan2(threatDx, threatDz)

  // outputs[0] = forward/retreat, outputs[1] = lateral strafe
  const moveForward = outputs[0] ?? 0
  const moveLateral = outputs[1] ?? 0

  // Move angle: threat direction + lateral offset (±60°)
  const moveAngle = threatAngle + moveLateral * (Math.PI / 3)
  const speed = Math.abs(moveForward) * MAX_INFANTRY_SPEED
  const sign = moveForward >= 0 ? 1 : -1

  const newVx = Math.sin(moveAngle) * speed * sign
  const newVz = Math.cos(moveAngle) * speed * sign

  let newX = soldierX + newVx * dt
  let newZ = soldierZ + newVz * dt

  // Clamp to arena
  newX = Math.max(-config.arenaHalfW, Math.min(config.arenaHalfW, newX))
  newZ = Math.max(-config.arenaHalfD, Math.min(config.arenaHalfD, newZ))

  const distMoved = Math.sqrt((newX - soldierX) ** 2 + (newZ - soldierZ) ** 2)

  return { x: newX, z: newZ, vx: newVx, vz: newVz, distMoved }
}

// ── Target Selection ──

export function selectTarget(
  soldierX: number,
  soldierZ: number,
  enemies: SimEnemy[],
  aggressionOutput: number,
): SimEnemy | null {
  const alive = enemies.filter(e => e.alive)
  if (alive.length === 0) return null

  // aggression [-1,1]: -1 = nearest, +1 = weakest (lowest health)
  const aggression = (aggressionOutput + 1) / 2  // remap to [0,1]

  // Find nearest
  let nearest = alive[0]!
  let nearestDist = Infinity
  for (const e of alive) {
    const dx = e.x - soldierX
    const dz = e.z - soldierZ
    const d = Math.sqrt(dx * dx + dz * dz)
    if (d < nearestDist) { nearestDist = d; nearest = e }
  }

  // Find weakest
  let weakest = alive[0]!
  let lowestHealth = Infinity
  for (const e of alive) {
    if (e.health < lowestHealth) { lowestHealth = e.health; weakest = e }
  }

  // Interpolate: low aggression → nearest, high → weakest
  if (aggression < 0.3) return nearest
  if (aggression > 0.7) return weakest
  // Middle range: 50/50 chance
  return Math.random() < aggression ? weakest : nearest
}

// ── Enemy AI (scripted return fire) ──

export function tickEnemyAI(
  enemies: SimEnemy[],
  soldierX: number,
  soldierZ: number,
  soldierHealth: { value: number },
  dt: number,
): void {
  for (const e of enemies) {
    if (!e.alive) continue

    // Optional lateral movement
    e.z += e.speed * e.direction * dt
    if (Math.abs(e.z) > 4) e.direction *= -1

    // Fire cooldown
    e.fireCooldown -= dt
    if (e.fireCooldown <= 0) {
      e.fireCooldown = e.fireRate

      // Fire at soldier with accuracy check
      if (Math.random() < e.accuracy) {
        soldierHealth.value -= e.damage
      }
    }
  }
}

// ── Check Engagement Range ──

export function isInEngagementRange(
  soldierX: number,
  soldierZ: number,
  enemies: SimEnemy[],
  maxRange: number,
): boolean {
  for (const e of enemies) {
    if (!e.alive) continue
    const dx = e.x - soldierX
    const dz = e.z - soldierZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist <= maxRange) return true
  }
  return false
}

// ── Universal Fitness Function ──

export interface FitnessAccumulators {
  kills: number
  totalDamageDealt: number
  shotsFired: number
  hits: number
  soldierHealth: number
  soldierMaxHealth: number
  elapsed: number
  simDuration: number
  timeInEngagementRange: number
  distanceTraveled: number
}

export function scoreUniversalFitness(acc: FitnessAccumulators): number {
  let fitness = 0

  // Incremental damage signal (gradient before kills)
  fitness += acc.totalDamageDealt * 3.0

  // Kill reward — big prize
  fitness += acc.kills * 200

  // Accuracy bonus
  if (acc.shotsFired > 0) {
    fitness += (acc.hits / acc.shotsFired) * 80
  }

  // SURVIVAL — the key driver for movement emergence
  fitness += (acc.soldierHealth / acc.soldierMaxHealth) * 150

  // Time alive bonus
  fitness += (acc.elapsed / acc.simDuration) * 50

  // Engagement range reward (prevents pure retreat)
  fitness += acc.timeInEngagementRange * 10

  // Spam penalty — excessive shots
  const maxReasonableShots = Math.max(acc.kills + 5, 8)
  if (acc.shotsFired > maxReasonableShots) {
    fitness -= (acc.shotsFired - maxReasonableShots) * 5
  }

  // Zero penalty — did literally nothing
  if (acc.shotsFired === 0 && acc.distanceTraveled < 0.5) {
    fitness = 0
  }

  // Normalize to roughly 0-1
  const maxExpected = 1200 + 150 + 80 + 50
  return Math.max(0, fitness / maxExpected)
}
