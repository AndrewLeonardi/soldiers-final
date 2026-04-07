/**
 * World Engine Type System
 *
 * WorldConfig = the environment (ground, lighting, props, edges)
 * BattleConfig = the gameplay (waves, budget, placement, stars)
 *
 * A world has multiple battles that share the same environment
 * but differ in enemy waves, placement, and active hazards.
 *
 * Adding a new world = one new config file. Nothing else changes.
 */
import type { EnemyType, WeaponType, SlotType } from '@config/types'

// ── Prop System ──────────────────────────────────────

/** Tags determine how props respond to physics forces */
export type PropTag =
  | 'knockable'     // tips/rolls when hit (coffee mug, soda can)
  | 'rollable'      // rolls continuously once moving (dowel, marble)
  | 'destructible'  // shatters into block chunks (cereal box, flower pot)
  | 'explosive'     // detonates at damage/shake threshold (barrel, soda)
  | 'sticky'        // creates slow zone when broken (syrup bottle)
  | 'launcher'      // applies upward impulse (spoon catapult, spring)

export interface PropConfig {
  id: string
  type: string                        // e.g. 'cereal_box', 'coffee_mug'
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  tags: PropTag[]
  health?: number                     // for destructible/explosive props
  params?: Record<string, number>     // type-specific (stickyRadius, shakeThreshold, etc.)
}

// ── World Config ─────────────────────────────────────

export interface WorldTheme {
  groundColor: number
  fogColor: number
  fogNear: number
  fogFar: number
  ambientColor: number
  ambientIntensity: number
  sunColor: number
  sunIntensity: number
  sunPosition: [number, number, number]
  skyColor: number
}

export interface EdgeConfig {
  side: 'front' | 'back' | 'left' | 'right'
  open: boolean                       // true = no wall, soldiers can fall off
  wallHeight?: number                 // height of border wall (if not open)
}

export interface GroundConfig {
  size: [number, number]              // [width, depth]
  tilt?: {
    angle: number                     // radians
    axis: 'x' | 'z'
  }
}

export interface WorldConfig {
  id: string                          // 'kitchen' | 'workshop' | 'backyard'
  name: string                        // "Kitchen Table"
  description: string
  theme: WorldTheme
  ground: GroundConfig
  edges: EdgeConfig[]
  props: PropConfig[]                 // environment objects
  tableFrame: {
    color: number
    thickness: number                 // visual thickness of table edge
  }
}

// ── Battle Config ────────────────────────────────────

export interface WaveConfig {
  delay: number                       // seconds after battle start
  enemies: {
    type: EnemyType
    count: number
    spacing?: number
    weapon?: WeaponType
    spawnSide?: 'right' | 'left' | 'back'
  }[]
}

export interface PlacementZone {
  id: string
  position: [number, number, number]
  size: [number, number]              // [width, depth]
  label?: string                      // "Behind the cereal box"
}

export interface StarCriteria {
  type: 'win' | 'no_losses' | 'time_limit' | 'edge_kills' | 'chain_reactions' | 'unit_limit' | 'no_walls' | 'prop_kills'
  threshold?: number
  desc: string
}

export interface BattleConfig {
  id: string                          // 'kitchen-1', 'kitchen-2'
  worldId: string                     // references WorldConfig.id
  name: string                        // "Breakfast Skirmish"
  description: string
  waves: WaveConfig[]
  budget: number
  maxSoldiers: number                 // 3-5 slots
  placementZones: PlacementZone[]
  stars: {
    one: StarCriteria
    two: StarCriteria
    three: StarCriteria
  }
  restrictions?: {
    bannedWeapons?: WeaponType[]
    bannedDefenses?: ('wall' | 'tower')[]
  }
}

// ── Lookup helpers (implemented in index.ts) ─────────

export interface WorldRegistry {
  worlds: WorldConfig[]
  battles: BattleConfig[]
  getWorld: (id: string) => WorldConfig | undefined
  getBattle: (id: string) => BattleConfig | undefined
  getBattlesForWorld: (worldId: string) => BattleConfig[]
  getWorldForBattle: (battleId: string) => WorldConfig | undefined
  getNextBattle: (currentBattleId: string) => string | null
}
