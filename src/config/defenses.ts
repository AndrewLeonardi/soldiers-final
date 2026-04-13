/**
 * defenses — centralized defense registry (pure data, no side effects).
 *
 * Single source of truth for all defense types. Adding a new defense
 * means adding one entry here + one in defenseRendering.ts + the 3D component.
 *
 * No THREE.js or React imports — this file is safe for stores, tests, SSR.
 */

export type DefenseType = 'wall' | 'sandbag' | 'tower'

export interface DefenseDef {
  type: DefenseType
  label: string
  cost: number
  icon: string
  /** Collision half-extents for battle loop wall avoidance + hit detection */
  halfExtents: { halfW: number; halfD: number }
}

export const DEFENSE_REGISTRY: DefenseDef[] = [
  {
    type: 'wall',
    label: 'WALL',
    cost: 50,
    icon: '\u2588\u2588',
    halfExtents: { halfW: 1.2, halfD: 0.35 },
  },
  {
    type: 'sandbag',
    label: 'BAGS',
    cost: 75,
    icon: '\u25AC\u25AC',
    halfExtents: { halfW: 0.9, halfD: 0.35 },
  },
  {
    type: 'tower',
    label: 'TOWER',
    cost: 200,
    icon: '\u2AFF',
    halfExtents: { halfW: 0.45, halfD: 0.45 },
  },
]

// ── Derived lookups (computed once at module load) ───────────────

/** Cost per defense type — used by placement UI + store gold deductions */
export const DEFENSE_COSTS = Object.fromEntries(
  DEFENSE_REGISTRY.map(d => [d.type, d.cost])
) as Record<DefenseType, number>

/** Collision half-extents per defense type — used by CampBattleLoop */
export const DEFENSE_HALF_EXTENTS = Object.fromEntries(
  DEFENSE_REGISTRY.map(d => [d.type, d.halfExtents])
) as Record<DefenseType, { halfW: number; halfD: number }>

/** UI card data for the placement tray */
export const DEFENSE_OPTIONS = DEFENSE_REGISTRY.map(d => ({
  type: d.type,
  label: d.label,
  cost: d.cost,
  icon: d.icon,
}))
