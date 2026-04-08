/**
 * Steering Behaviors — thin layer on top of flow field navigation.
 *
 * Per-type behavior profiles:
 * - Infantry: uses flow field, seeks cover when under fire, pauses behind cover
 * - Jeep: ignores flow field, wide flanking arc, no cover seeking
 * - Tank: ignores flow field, straight march, crushes obstacles (handled in BattleScene)
 *
 * These modify the desired velocity vector before setLinvel().
 * They don't replace Rapier collision — they guide it.
 */
import type { EnemyType } from '@config/types'

// ── Per-Type Behavior Profiles ──────────────────────────

interface SteeringProfile {
  usesFlowField: boolean
  coverSeeking: boolean
  spreadStrength: number
  flankBias: number       // perpendicular bias toward Intel (jeeps)
  pauseBehindCover: boolean
}

const PROFILES: Record<EnemyType, SteeringProfile> = {
  infantry: {
    usesFlowField: true,
    coverSeeking: true,
    spreadStrength: 0.4,
    flankBias: 0,
    pauseBehindCover: true,
  },
  jeep: {
    usesFlowField: false,
    coverSeeking: false,
    spreadStrength: 0.2,
    flankBias: 0.6,
    pauseBehindCover: false,
  },
  tank: {
    usesFlowField: false,
    coverSeeking: false,
    spreadStrength: 0,
    flankBias: 0,
    pauseBehindCover: false,
  },
}

export function getProfile(type: EnemyType): SteeringProfile {
  return PROFILES[type] ?? PROFILES.infantry
}

// ── Unit & Context Interfaces ───────────────────────────

export interface SteeringUnit {
  position: [number, number, number]
  health: number
  maxHealth: number
  status: string
  id: string
}

export interface ObstacleInfo {
  x: number
  z: number
  halfW: number
  halfD: number
}

export interface SteeringContext {
  /** All units (friend and foe) for spread calculation */
  allUnits: SteeringUnit[]
  /** Is this unit currently being shot at? */
  underFire: boolean
  /** Time stuck against an obstacle (for flanking) */
  stuckTime: number
  /** Enemy type for per-type behaviors */
  enemyType: EnemyType
  /** Nearby obstacles for cover seeking (walls, large props) */
  obstacles?: ObstacleInfo[]
  /** Direction FROM the nearest shooter (for cover seeking) */
  shooterDirX?: number
  shooterDirZ?: number
  /** Spawn Z position (for jeep flank direction) */
  spawnZ?: number
  /** Time paused behind cover so far */
  coverPauseTime?: number
}

// ── Main Steering Function ──────────────────────────────

/**
 * Apply steering behaviors to a desired direction vector.
 * Returns modified direction + a speed multiplier (for cover pause).
 */
export function applySteering(
  dirX: number,
  dirZ: number,
  unit: SteeringUnit,
  ctx: SteeringContext,
): { x: number; z: number; speedMult: number } {
  const profile = getProfile(ctx.enemyType)
  let outX = dirX
  let outZ = dirZ
  let speedMult = 1.0

  // ── SPREAD: avoid clustering with nearby friendly units ──
  if (profile.spreadStrength > 0) {
    for (const other of ctx.allUnits) {
      if (other.id === unit.id) continue
      if (other.status === 'dead') continue
      const dx = unit.position[0] - other.position[0]
      const dz = unit.position[2] - other.position[2]
      const distSq = dx * dx + dz * dz
      const spreadDist = 1.2

      if (distSq < spreadDist * spreadDist && distSq > 0.01) {
        const dist = Math.sqrt(distSq)
        const strength = (spreadDist - dist) / spreadDist * profile.spreadStrength
        outX += (dx / dist) * strength
        outZ += (dz / dist) * strength
      }
    }
  }

  // ── FLANKING (fallback): if stuck, add perpendicular nudge ──
  // Triggers faster (0.8s) and stronger (cap 1.5) than before
  if (ctx.stuckTime > 0.8) {
    const flankSign = (unit.id.charCodeAt(unit.id.length - 1) % 2 === 0) ? 1 : -1
    const flankStrength = Math.min(1.5, (ctx.stuckTime - 0.8) * 0.5)
    outX += -dirZ * flankSign * flankStrength
    outZ += dirX * flankSign * flankStrength
  }

  // ── JEEP FLANKING ARC: strong perpendicular bias ──
  if (profile.flankBias > 0) {
    // Flank direction based on spawn position (positive Z = flank left, negative = flank right)
    const flankSign = (ctx.spawnZ ?? 0) >= 0 ? -1 : 1
    outX += -dirZ * flankSign * profile.flankBias
    outZ += dirX * flankSign * profile.flankBias
  }

  // ── COVER SEEKING: when under fire, duck behind nearest obstacle ──
  if (profile.coverSeeking && ctx.underFire && ctx.obstacles && ctx.obstacles.length > 0
      && ctx.shooterDirX !== undefined && ctx.shooterDirZ !== undefined) {
    let bestCover: ObstacleInfo | null = null
    let bestDist = 3.0 // max cover seeking range

    for (const obs of ctx.obstacles) {
      const dx = obs.x - unit.position[0]
      const dz = obs.z - unit.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < bestDist && dist > 0.3) {
        // Check if obstacle is roughly between us and the shooter
        const toObsX = dx / dist
        const toObsZ = dz / dist
        const dot = toObsX * ctx.shooterDirX + toObsZ * ctx.shooterDirZ
        // dot > 0 means obstacle is between us and the shooter (same direction)
        // We want to run toward obstacles that provide cover from fire
        if (dot > 0.2) {
          bestDist = dist
          bestCover = obs
        }
      }
    }

    if (bestCover) {
      // Move toward the cover obstacle (the far side relative to shooter)
      const dx = bestCover.x - unit.position[0]
      const dz = bestCover.z - unit.position[2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > 0.01) {
        // Bias toward cover with strength 0.6
        outX += (dx / dist) * 0.6
        outZ += (dz / dist) * 0.6
      }
    }
  }

  // ── PAUSE BEHIND COVER: slow down when behind obstacle ──
  if (profile.pauseBehindCover && !ctx.underFire && ctx.coverPauseTime !== undefined) {
    if (ctx.coverPauseTime > 0 && ctx.coverPauseTime < 1.2) {
      speedMult = 0.15 // nearly stopped, peeking
    }
  }

  // ── WOUNDED CAUTION: erratic movement when low health ──
  if (unit.health < unit.maxHealth * 0.3) {
    const wobble = Math.sin(Date.now() * 0.01 + unit.id.charCodeAt(0)) * 0.2
    outX += wobble
    outZ += Math.cos(Date.now() * 0.013 + unit.id.charCodeAt(0)) * 0.15
  }

  // Normalize the direction
  const len = Math.sqrt(outX * outX + outZ * outZ)
  if (len > 0.01) {
    outX /= len
    outZ /= len
  }

  return { x: outX, z: outZ, speedMult }
}

// ── Stuck Detection ─────────────────────────────────────

/**
 * Detect if a unit is "stuck" — moving very slowly despite having velocity set.
 */
export function detectStuck(
  currentVelX: number,
  currentVelZ: number,
  desiredSpeed: number,
): boolean {
  const actualSpeed = Math.sqrt(currentVelX * currentVelX + currentVelZ * currentVelZ)
  return actualSpeed < desiredSpeed * 0.2
}

// ── Cover Detection Helper ──────────────────────────────

/**
 * Check if unit is behind cover relative to nearest player.
 * Returns true if there's an obstacle roughly between the unit and the player direction.
 */
export function isBehindCover(
  unitX: number, unitZ: number,
  playerDirX: number, playerDirZ: number,
  obstacles: ObstacleInfo[],
): boolean {
  for (const obs of obstacles) {
    const dx = obs.x - unitX
    const dz = obs.z - unitZ
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist > 2.5 || dist < 0.2) continue

    // Is the obstacle in the direction of the player?
    const toObsX = dx / dist
    const toObsZ = dz / dist
    const dot = toObsX * playerDirX + toObsZ * playerDirZ
    // dot > 0.5 means obstacle is between us and player (within ~60 degree cone)
    if (dot > 0.5) return true
  }
  return false
}
