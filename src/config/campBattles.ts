/**
 * campBattles — battle configs for the /camp route.
 *
 * Sprint 4. 3 escalating battles that take place on the camp diorama.
 * Enemies spawn from edges and march toward camp center.
 */
import type { EnemyType, WeaponType } from './types'

export interface CampWaveEnemy {
  type: EnemyType
  count: number
  weapon?: WeaponType
  spawnSide: 'right' | 'left' | 'back'
}

export interface CampWave {
  delay: number  // seconds after battle start
  enemies: CampWaveEnemy[]
}

export interface CampStarCriteria {
  type: 'win' | 'no_losses' | 'time_limit'
  threshold?: number
  desc: string
}

export interface CampBattleConfig {
  id: string
  name: string
  description: string
  waves: CampWave[]
  reward: number         // compute earned on victory
  goldReward: number     // gold earned on victory
  maxSoldiers: number    // max soldiers player can place
  stars: {
    one: CampStarCriteria
    two: CampStarCriteria
    three: CampStarCriteria
  }
  /** Weapon unlocked on first victory */
  weaponReward?: WeaponType
  /** Previous battle ID that must be completed to unlock this one (null = always unlocked) */
  requires?: string
  /** Level number (Sprint 8 — procedural levels) */
  level?: number
  /** Theme ID for diorama/loading screen visuals (Sprint 8) */
  themeId?: string
}

// Spawn positions — at the table edge so enemies drop onto the map
export const SPAWN_POSITIONS: Record<string, { x: number; z: number }> = {
  right:  { x: 11.5,  z: 0 },
  left:   { x: -11.5, z: 0 },
  back:   { x: 0,     z: -8.5 },
}

export const CAMP_BATTLES: CampBattleConfig[] = [
  // ─── Battle 1: prove your rifle training works ───
  {
    id: 'camp-1',
    name: 'First Contact',
    description: 'A small recon squad approaches. Your soldiers need rifle training to fight!',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
        ],
      },
    ],
    reward: 100,
    goldReward: 100,
    maxSoldiers: 3,
    weaponReward: 'machineGun',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 30, desc: 'Win in under 30 seconds' },
    },
  },
  // ─── Battle 2: swarm — machine gun's fire rate is essential ───
  {
    id: 'camp-2',
    name: 'Swarm Tactics',
    description: 'They\'re sending waves from both sides. You\'ll need that machine gun!',
    requires: 'camp-1',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 5, weapon: 'rifle', spawnSide: 'right' },
          { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'left' },
        ],
      },
      {
        delay: 14.0,
        enemies: [
          { type: 'infantry', count: 6, weapon: 'rifle', spawnSide: 'left' },
          { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'right' },
        ],
      },
    ],
    reward: 150,
    goldReward: 150,
    maxSoldiers: 4,
    weaponReward: 'rocketLauncher',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 40, desc: 'Win in under 40 seconds' },
    },
  },
  // ─── Battle 3: armor — rockets needed to crack vehicles ───
  {
    id: 'camp-3',
    name: 'Armor Column',
    description: 'Jeeps and heavy armor incoming. Rockets will punch through!',
    requires: 'camp-2',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
          { type: 'jeep', count: 2, spawnSide: 'left' },
        ],
      },
      {
        delay: 16.0,
        enemies: [
          { type: 'jeep', count: 2, spawnSide: 'right' },
          { type: 'infantry', count: 4, weapon: 'machineGun', spawnSide: 'back' },
        ],
      },
      {
        delay: 30.0,
        enemies: [
          { type: 'tank', count: 1, spawnSide: 'back' },
          { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'left' },
        ],
      },
    ],
    reward: 200,
    goldReward: 200,
    maxSoldiers: 6,
    weaponReward: 'grenade',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 55, desc: 'Win in under 55 seconds' },
    },
  },
]
