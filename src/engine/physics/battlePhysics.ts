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
export const INTEL_POS_ARRAY: [number, number, number] = [-7, 0, 0]
export const LOSE_THRESHOLD = 1.5
export const SPAWN_X = 8
export const TABLE_EDGE_X = 8.5     // right edge (ground plane is ±10, but tighter for gameplay)
export const TABLE_EDGE_Z = 6.0    // front/back edges (ground is ±7)
export const TABLE_EDGE_LEFT = -9.0 // left edge
export const FALL_DEATH_Y = -2      // Y threshold for fall-off-table death

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

// ── Blast physics (ported from sandbox — much punchier) ──
export const BLAST = {
  GRENADE: {
    radius: 3.5,
    damage: 60,
    unitForce: 8,        // horizontal knockback on units
    unitYBias: 4,        // upward knockback on units
    blockForce: 14,      // horizontal force on wall blocks
    blockYBias: 10,      // upward force on wall blocks (dramatic launches)
    fuseTime: 1.3,
    destroyThreshold: 0.12, // force > this destroys block (lower = more destruction)
    shakeThreshold: 0.05,   // force > this shakes block loose
  },
  ROCKET: {
    radius: 3.6,
    damage: 90,
    unitForce: 10,
    unitYBias: 5,
    blockForce: 16,
    blockYBias: 12,
    destroyThreshold: 0.1,  // rockets are more destructive
    shakeThreshold: 0.04,
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
export const RAGDOLL = {
  GROUND_BOUNCE_VY: -0.2,
  GROUND_FRICTION: 0.8,
  SPIN_DAMPING: 0.7,
  AIR_DRAG: 0.993,
  // Variation ranges for comedy
  FORCE_VARIANCE_MIN: 0.6,
  FORCE_VARIANCE_MAX: 1.8,
  LAUNCH_Y_MIN: 3,
  LAUNCH_Y_MAX: 7,
  TUMBLE_SPIN_MIN: 2,
  TUMBLE_SPIN_MAX: 8,
  LATERAL_OFFSET_MAX: 0.4, // random perpendicular kick
} as const

// ── Screen shake per event ────────────────────────────────
export const SHAKE = {
  BULLET_IMPACT: 0.03,
  GRENADE: 0.12,
  ROCKET: 0.18,
  BARREL: 0.25,
  MULTI_KILL: 0.3,
  DEFEAT: 0.3,
} as const

// ── Helpers ───────────────────────────────────────────────

/** Compute ideal ballistic elevation for a given distance */
export function idealElevation(dist: number): number {
  const arg = (ROCKET_GRAV * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  return Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
}

/** Random float in [min, max] */
export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Pick "launch" or "tumble" death type randomly */
export function randomDeathType(): 'launch' | 'tumble' {
  return Math.random() > 0.45 ? 'launch' : 'tumble'
}
