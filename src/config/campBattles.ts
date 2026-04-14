/**
 * campBattles — battle configs for the /camp route.
 *
 * Sprint 5 (battle rework). Player soldiers attack an enemy base to capture Intel.
 * Enemies are pre-placed defenders. Defenses belong to the enemy.
 * Player places soldiers in a spawn zone and assigns action verbs.
 */
import type { EnemyType, WeaponType, ActionVerb } from './types'
import type { DefenseType } from './defenses'

// ── Enemy soldier placement ──

export interface CampEnemyPlacement {
  type: EnemyType
  weapon: WeaponType
  position: [number, number, number]
  facingAngle?: number   // radians, defaults to facing left (toward player spawn)
  elevated?: boolean     // on a tower — Y=1.5, +30% range, no strafing
}

// ── Enemy defense placement ──

export interface CampEnemyDefense {
  type: DefenseType
  position: [number, number, number]
  rotation: number  // radians
}

// ── Player spawn zone ──

export interface SpawnZone {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

// ── Star criteria ──

export interface CampStarCriteria {
  type: 'win' | 'no_losses' | 'time_limit'
  threshold?: number
  desc: string
}

// ── Wave config (legacy, optional for backwards compat) ──

export interface CampWaveEnemy {
  type: EnemyType
  count: number
  weapon?: WeaponType
  spawnSide: 'right' | 'left' | 'back'
}

export interface CampWave {
  delay: number
  enemies: CampWaveEnemy[]
}

// ── Battle config ──

export interface CampBattleConfig {
  id: string
  name: string
  description: string
  reward: number         // tokens earned on victory
  maxSoldiers: number    // max soldiers player can place

  /** Intel briefcase position — the objective (new-style battles) */
  intelPosition?: [number, number, number]

  /** Pre-placed enemy soldiers defending the Intel (new-style battles) */
  enemySoldiers?: CampEnemyPlacement[]

  /** Pre-placed enemy defenses (walls, sandbags, towers) (new-style battles) */
  enemyDefenses?: CampEnemyDefense[]

  /** Rectangular zone where player can place soldiers (new-style battles) */
  playerSpawnZone?: SpawnZone

  stars: {
    one: CampStarCriteria
    two: CampStarCriteria
    three: CampStarCriteria
  }

  /** Weapon unlocked on first victory */
  weaponReward?: WeaponType

  /** Previous battle ID that must be completed to unlock this one */
  requires?: string

  /** Legacy wave spawning (not used in new-style battles) */
  waves?: CampWave[]

  /** Level number (procedural levels) */
  level?: number
  /** Theme ID for diorama/loading screen visuals */
  themeId?: string
}

// ── Legacy spawn positions (used by CampBattleLoop until Sprint 3 rewrite) ──
export const SPAWN_POSITIONS: Record<string, { x: number; z: number }> = {
  right:  { x: 11.5,  z: 0 },
  left:   { x: -11.5, z: 0 },
  back:   { x: 0,     z: -8.5 },
}

// ── Battles ──

export const CAMP_BATTLES: CampBattleConfig[] = [
  // ─── Battle 1: First Contact — prove your rifle training works ───
  {
    id: 'camp-1',
    name: 'First Contact',
    description: 'A small recon outpost. Capture the Intel to prove your squad is ready.',
    intelPosition: [8, 0, 0],
    playerSpawnZone: { minX: -11, maxX: -7, minZ: -6, maxZ: 6 },
    enemySoldiers: [
      { type: 'infantry', weapon: 'rifle', position: [6, 0, -2], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [7, 0, 1], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [5, 0, 0], facingAngle: Math.PI },
    ],
    enemyDefenses: [
      { type: 'sandbag', position: [5.5, 0, 0], rotation: 0 },
    ],
    reward: 100,
    maxSoldiers: 3,
    weaponReward: 'machineGun',
    stars: {
      one: { type: 'win', desc: 'Capture the Intel' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 30, desc: 'Capture in under 30 seconds' },
    },
  },

  // ─── Battle 2: Swarm Tactics — machine gun's fire rate is essential ───
  {
    id: 'camp-2',
    name: 'Swarm Tactics',
    description: 'A fortified position with multiple defenders. Use that machine gun!',
    requires: 'camp-1',
    intelPosition: [9, 0, 0],
    playerSpawnZone: { minX: -11, maxX: -7, minZ: -6, maxZ: 6 },
    enemySoldiers: [
      { type: 'infantry', weapon: 'rifle', position: [5, 0, -3], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [5, 0, 3], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [7, 0, -1], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [7, 0, 1], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'machineGun', position: [8, 0, 0], facingAngle: Math.PI },
    ],
    enemyDefenses: [
      { type: 'wall', position: [6, 0, 0], rotation: 0 },
      { type: 'sandbag', position: [4, 0, -3], rotation: Math.PI / 2 },
      { type: 'sandbag', position: [4, 0, 3], rotation: Math.PI / 2 },
    ],
    reward: 150,
    maxSoldiers: 4,
    weaponReward: 'rocketLauncher',
    stars: {
      one: { type: 'win', desc: 'Capture the Intel' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 40, desc: 'Capture in under 40 seconds' },
    },
  },

  // ─── Battle 3: Armor Column — rockets needed to crack fortifications ───
  {
    id: 'camp-3',
    name: 'Fortified Base',
    description: 'Heavy fortifications and a sniper tower. Rockets will punch through!',
    requires: 'camp-2',
    intelPosition: [9.5, 0, 0],
    playerSpawnZone: { minX: -11, maxX: -7, minZ: -6, maxZ: 6 },
    enemySoldiers: [
      { type: 'infantry', weapon: 'rifle', position: [4, 0, -4], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [4, 0, 4], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'machineGun', position: [7, 0, -2], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'machineGun', position: [7, 0, 2], facingAngle: Math.PI },
      { type: 'infantry', weapon: 'rifle', position: [8, 0, 0], facingAngle: Math.PI, elevated: true },
      { type: 'infantry', weapon: 'rocketLauncher', position: [9, 0, 0], facingAngle: Math.PI },
    ],
    enemyDefenses: [
      { type: 'wall', position: [5, 0, -2], rotation: 0 },
      { type: 'wall', position: [5, 0, 2], rotation: 0 },
      { type: 'sandbag', position: [7, 0, 0], rotation: Math.PI / 2 },
      { type: 'tower', position: [8, 0, 0], rotation: 0 },
    ],
    reward: 200,
    maxSoldiers: 6,
    weaponReward: 'grenade',
    stars: {
      one: { type: 'win', desc: 'Capture the Intel' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 55, desc: 'Capture in under 55 seconds' },
    },
  },
]
