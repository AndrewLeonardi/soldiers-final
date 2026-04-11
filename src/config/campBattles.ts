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
}

// Spawn positions — at the table edge so enemies drop onto the map
export const SPAWN_POSITIONS: Record<string, { x: number; z: number }> = {
  right:  { x: 11.5,  z: 0 },
  left:   { x: -11.5, z: 0 },
  back:   { x: 0,     z: -8.5 },
}

export const CAMP_BATTLES: CampBattleConfig[] = [
  {
    id: 'camp-1',
    name: 'First Contact',
    description: 'A small recon squad approaches. Hold the line!',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 5, weapon: 'rifle', spawnSide: 'right' },
        ],
      },
    ],
    reward: 50,
    maxSoldiers: 3,
    weaponReward: 'rocketLauncher',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 30, desc: 'Win in under 30 seconds' },
    },
  },
  {
    id: 'camp-2',
    name: 'Flanking Fire',
    description: 'They\'re coming from two sides. Watch your flanks!',
    requires: 'camp-1',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'right' },
        ],
      },
      {
        delay: 15.0,
        enemies: [
          { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'left' },
          { type: 'jeep', count: 1, spawnSide: 'right' },
        ],
      },
    ],
    reward: 100,
    maxSoldiers: 5,
    weaponReward: 'grenade',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 45, desc: 'Win in under 45 seconds' },
    },
  },
  {
    id: 'camp-3',
    name: 'Full Assault',
    description: 'Everything they\'ve got. Three waves. Survive.',
    requires: 'camp-2',
    waves: [
      {
        delay: 2.0,
        enemies: [
          { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'right' },
          { type: 'infantry', count: 2, weapon: 'rifle', spawnSide: 'left' },
        ],
      },
      {
        delay: 18.0,
        enemies: [
          { type: 'infantry', count: 3, weapon: 'rocketLauncher', spawnSide: 'back' },
          { type: 'jeep', count: 1, spawnSide: 'left' },
        ],
      },
      {
        delay: 35.0,
        enemies: [
          { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
          { type: 'jeep', count: 1, spawnSide: 'back' },
          { type: 'infantry', count: 2, weapon: 'grenade', spawnSide: 'left' },
        ],
      },
    ],
    reward: 200,
    maxSoldiers: 8,
    weaponReward: 'machineGun',
    stars: {
      one: { type: 'win', desc: 'Win the battle' },
      two: { type: 'no_losses', desc: 'No friendly casualties' },
      three: { type: 'time_limit', threshold: 60, desc: 'Win in under 60 seconds' },
    },
  },
]
