/**
 * Steering Behaviors — thin layer on top of march-to-target.
 *
 * These modify the desired velocity vector before setLinvel().
 * They don't replace Rapier collision — they guide it.
 * Each behavior is independent, stackable, and cheap (distance checks only).
 *
 * Layer A (Rapier collision pathfinding) is free — already built.
 * This is Layer B — ~30 lines per behavior, massive feel improvement.
 */
import * as THREE from 'three'

// Reusable temp vectors (no GC pressure)
const _steerA = new THREE.Vector3()
const _steerB = new THREE.Vector3()

interface SteeringUnit {
  position: [number, number, number]
  health: number
  maxHealth: number
  status: string
  id: string
}

interface SteeringContext {
  /** All units (friend and foe) for spread calculation */
  allUnits: SteeringUnit[]
  /** Is this unit currently being shot at? (was hit recently) */
  underFire: boolean
  /** Time stuck against an obstacle (for flanking) */
  stuckTime: number
}

/**
 * Apply steering behaviors to a desired direction vector.
 * Modifies dirX/dirZ in place and returns the result.
 *
 * @param dirX - desired X direction (normalized, toward target)
 * @param dirZ - desired Z direction (normalized, toward target)
 * @param unit - the unit being steered
 * @param ctx - context for behavior decisions
 * @returns modified { x, z } direction (still needs to be normalized)
 */
export function applySteering(
  dirX: number,
  dirZ: number,
  unit: SteeringUnit,
  ctx: SteeringContext,
): { x: number; z: number } {
  let outX = dirX
  let outZ = dirZ

  // ── SPREAD: avoid clustering with nearby friendly units ──
  // If another unit is within 1.2 units, nudge away from them.
  // This prevents clumping (which makes explosions devastating)
  // and creates more natural-looking movement.
  for (const other of ctx.allUnits) {
    if (other.id === unit.id) continue
    if (other.status === 'dead') continue
    const dx = unit.position[0] - other.position[0]
    const dz = unit.position[2] - other.position[2]
    const distSq = dx * dx + dz * dz
    const spreadDist = 1.2

    if (distSq < spreadDist * spreadDist && distSq > 0.01) {
      const dist = Math.sqrt(distSq)
      const strength = (spreadDist - dist) / spreadDist * 0.4
      outX += (dx / dist) * strength
      outZ += (dz / dist) * strength
    }
  }

  // ── FLANKING: if stuck for >1.5 seconds, add perpendicular nudge ──
  // This makes enemies go AROUND obstacles instead of stacking against walls.
  // The nudge alternates direction based on unit ID hash for variety.
  if (ctx.stuckTime > 1.5) {
    const flankSign = (unit.id.charCodeAt(unit.id.length - 1) % 2 === 0) ? 1 : -1
    const flankStrength = Math.min(0.8, (ctx.stuckTime - 1.5) * 0.3)
    // Perpendicular to desired direction
    outX += -dirZ * flankSign * flankStrength
    outZ += dirX * flankSign * flankStrength
  }

  // ── WOUNDED CAUTION: low health = slightly slower, more erratic ──
  // Adds a small random wobble to movement. Not enough to break pathfinding,
  // but enough to make wounded soldiers look "panicked."
  if (unit.health < unit.maxHealth * 0.3) {
    const wobble = Math.sin(Date.now() * 0.01 + unit.id.charCodeAt(0)) * 0.2
    outX += wobble
    outZ += Math.cos(Date.now() * 0.013 + unit.id.charCodeAt(0)) * 0.15
  }

  // Normalize the result
  const len = Math.sqrt(outX * outX + outZ * outZ)
  if (len > 0.01) {
    outX /= len
    outZ /= len
  }

  return { x: outX, z: outZ }
}

/**
 * Detect if a unit is "stuck" — moving very slowly despite having velocity set.
 * Used to trigger flanking behavior.
 */
export function detectStuck(
  currentVelX: number,
  currentVelZ: number,
  desiredSpeed: number,
): boolean {
  const actualSpeed = Math.sqrt(currentVelX * currentVelX + currentVelZ * currentVelZ)
  return actualSpeed < desiredSpeed * 0.2 // moving less than 20% of desired speed
}
