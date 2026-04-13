/**
 * Centralized physics constants and helpers for the battle system.
 * All tuning values live here — no magic numbers in BattleScene.
 */

// ── Movement & Gravity ────────────────────────────────────
export const GRAVITY = -15          // unit gravity (soldiers, ragdoll)
export const BLOCK_GRAVITY = -12    // wall block gravity
export const PROJECTILE_GRAVITY = -6 // rocket/grenade vy per frame

// ── Projectile speeds ─────────────────────────────────────
export const BULLET_SPEED = 20
export const ROCKET_SPEED = 12
export const GRENADE_SPEED = 6
export const MG_BULLET_SPEED = 20
export const ROCKET_GRAV = 9.0      // for ballistic calc (positive = downward)

// ── Projectile limits ─────────────────────────────────────
export const PROJECTILE_MAX_AGE = 4
export const HIT_RADIUS = 0.5
export const WALL_HIT_RADIUS = 0.3

// ── Map geometry ──────────────────────────────────────────
export const FALL_DEATH_Y = -2      // Y threshold for fall-off-table death
export const LOSE_THRESHOLD = 1.5

/** Computed boundaries derived from a world's ground.size */
export interface WorldBounds {
  tableEdgeRight: number
  tableEdgeLeft: number
  tableEdgeZ: number       // symmetric: ±this value for front/back
  spawnRight: number       // right-side spawn X
  spawnLeft: number        // left-side spawn X
  spawnBack: number        // back spawn Z
  spawnFront: number       // front spawn Z
  intelX: number           // Intel position X
  intelPos: [number, number, number]
}

/** Derive all boundary constants from a world's ground size.
 *  The 0.5 inset keeps spawns/intel off the very edge. */
export function getWorldBounds(groundSize: [number, number]): WorldBounds {
  const hw = groundSize[0] / 2
  const hd = groundSize[1] / 2
  const edgeInset = 0.5
  const spawnInset = 1.5
  const intelInset = 2.0

  const tableEdgeRight = hw - edgeInset
  const tableEdgeLeft = -(hw - edgeInset)
  const tableEdgeZ = hd - edgeInset
  const intelX = -(hw - intelInset)

  return {
    tableEdgeRight,
    tableEdgeLeft,
    tableEdgeZ,
    spawnRight: tableEdgeRight - 0.5,
    spawnLeft: tableEdgeLeft + 0.5,
    spawnBack: tableEdgeZ - 0.5,
    spawnFront: -(tableEdgeZ - 0.5),
    intelX,
    intelPos: [intelX, 0, 0],
  }
}

// Legacy constants — kept for backward compat in code that hasn't been migrated yet
// Kitchen (16x12) defaults:
export const INTEL_POS_ARRAY: [number, number, number] = [-6, 0, 0]
export const SPAWN_X = 6.5
export const TABLE_EDGE_X = 7.5
export const TABLE_EDGE_Z = 5.5
export const TABLE_EDGE_LEFT = -7.5

// ── Wall blocks (ported from sandbox — smaller = more granular) ──
export const BLOCK_W = 0.3
export const BLOCK_H = 0.15
export const BLOCK_D = 0.15
export const WALL_COLS = 8          // more columns to fill same width
export const WALL_ROWS = 7          // more rows for same height
export const BLOCK_DAMPING = 0.993
export const BLOCK_GROUND_BOUNCE_VY = -0.25
export const BLOCK_GROUND_FRICTION = 0.6
export const BLOCK_SETTLE_SPEED = 0.01
export const BLOCK_SUPPORT_OVERLAP = 0.25 // fraction of block width
export const ROW_COLLAPSE_THRESHOLD = 0.4 // if >40% of row destroyed, whole row falls

// ── Blast physics ──
// Walls survive multiple hits — a rocket punches a HOLE (3-8 blocks),
// then the cascade-collapse system finishes the job over the next second.
// Damage is tuned so explosions wound but don't insta-wipe a 100hp soldier.
export const BLAST = {
  GRENADE: {
    radius: 3.5,
    damage: 40,           // wound, don't one-shot (was 60)
    unitForce: 6,
    unitYBias: 2.5,
    blockForce: 11,       // punchy — blocks fly dramatically when destroyed
    blockYBias: 7,        // high arcs on debris
    fuseTime: 1.3,
    destroyThreshold: 0.30, // ~1/3 of blocks in blast get destroyed (was 0.10)
    shakeThreshold: 0.10,   // outer ring gets shaken loose for cascade
  },
  ROCKET: {
    radius: 3.6,
    damage: 75,           // 2 rockets to kill at center (was 130, one-shot kill)
    unitForce: 8,
    unitYBias: 3,
    blockForce: 14,       // dramatic launches when destroyed
    blockYBias: 9,
    destroyThreshold: 0.22, // ~1/2 of blocks in blast get destroyed (was 0.08)
    shakeThreshold: 0.08,   // outer blocks shaken loose
  },
} as const

// ── Debris ────────────────────────────────────────────────
export const DEBRIS = {
  PER_BULLET_HIT: 3,
  PER_EXPLOSION: 14,
  LIFETIME_MIN: 1.0,
  LIFETIME_MAX: 2.0,
  SPEED_MIN: 2,
  SPEED_MAX: 7,
  UP_SPEED_MIN: 2,
  UP_SPEED_MAX: 6,
  GRAVITY_SCALE: 0.8,  // lighter than blocks
} as const

// ── Ragdoll ───────────────────────────────────────────────
// All deaths tumble — soldiers stay grounded, spin sideways, no upward launches.
export const RAGDOLL = {
  GROUND_BOUNCE_VY: -0.2,
  GROUND_FRICTION: 0.8,
  SPIN_DAMPING: 0.7,
  AIR_DRAG: 0.993,
  FORCE_VARIANCE_MIN: 0.6,
  FORCE_VARIANCE_MAX: 1.8,
  TUMBLE_SPIN_MIN: 2,
  TUMBLE_SPIN_MAX: 8,
  LATERAL_OFFSET_MAX: 0.4,
} as const

// ── Screen shake per event ────────────────────────────────
export const SHAKE = {
  BULLET_IMPACT: 0.03,
  GRENADE: 0.12,
  ROCKET: 0.18,
  BARREL: 0.25,
  MULTI_KILL: 0.3,
  DEFEAT: 0.3,
  // Fire shake — triggered when soldier fires (not on impact)
  FIRE_RIFLE: 0.015,
  FIRE_MG: 0.01,
  FIRE_ROCKET: 0.08,
  FIRE_GRENADE: 0.02,
  FIRE_TANK: 0.10,
} as const

// ── Rapier material properties ────────────────────────────
// Tuned for comedy physics, not realism
export const RAPIER_SOLDIER = {
  RESTITUTION: 0.3,       // bouncy ragdolls
  FRICTION: 0.8,          // grip the ground
  LINEAR_DAMPING: 2.0,    // stops sliding quickly
  ANGULAR_DAMPING: 1.5,   // ragdoll spin decays
} as const

export const RAPIER_BLOCK = {
  RESTITUTION: 0.15,      // low bounce for wall chunks
  FRICTION: 0.6,
  LINEAR_DAMPING: 0.5,
} as const

// ── Stagger / hit recovery ───────────────────────────────
export const STAGGER = {
  BULLET_RECOVERY: 0.4,      // seconds to recover from bullet hit
  EXPLOSION_RECOVERY: 0.8,   // seconds to recover from explosion hit
} as const

// ── Helpers ───────────────────────────────────────────────

/** Compute ideal ballistic elevation for a given distance.
 *  Minimum 0.15 rad (~8.6 degrees) so close-range rockets don't fly flat over enemies. */
export function idealElevation(dist: number): number {
  const arg = (ROCKET_GRAV * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  const raw = Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
  return Math.max(0.15, raw)
}

/** Random float in [min, max] */
export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Death type — only 'tumble' now (launch flying-into-air removed for visual clarity) */
export function randomDeathType(): 'tumble' {
  return 'tumble'
}
