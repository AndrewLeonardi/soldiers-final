export type WeaponType = 'rifle' | 'rocketLauncher' | 'grenade' | 'machineGun' | 'tank'

export type EnemyType = 'infantry' | 'jeep' | 'tank'

export type SlotType = 'ground' | 'elevated'

export type GamePhase = 'loadout' | 'placement' | 'battle' | 'result' | 'training' | 'levelSelect'

export type Team = 'green' | 'tan'

export type UnitStatus = 'idle' | 'walking' | 'firing' | 'hit' | 'dead'

export interface PlacementSlot {
  id: string
  pos: [number, number, number]
  type: SlotType
  occupied: boolean
}

export interface WaveEnemy {
  type: EnemyType
  count: number
  spacing?: number
  path: string
  weapon?: WeaponType // defaults to 'rifle' if omitted
}

export interface Wave {
  delay: number
  enemies: WaveEnemy[]
}

export interface StarCriteria {
  type: 'survive' | 'budget_remaining' | 'objective'
  threshold?: number
  desc?: string
}

export interface LevelConfig {
  id: string
  theme: string
  name: string
  placement_slots: { id: string; pos: [number, number, number]; type: SlotType }[]
  waves: Wave[]
  available_units: string[]
  budget: number
  stars: {
    one: StarCriteria
    two: StarCriteria
    three: StarCriteria
  }
}

export interface LevelProgress {
  completed: boolean
  bestStars: number // 0-3
}

export interface CampaignProgress {
  currentLevelId: string
  levels: Record<string, LevelProgress>
}

export interface GameUnit {
  id: string
  type: 'soldier' | 'wall' | 'sandbag' | 'tower'
  team: Team
  position: [number, number, number]
  rotation: number
  health: number
  maxHealth: number
  status: UnitStatus
  weapon: WeaponType
  lastFireTime: number
  fireRate: number
  range: number
  damage: number
  speed: number
  profileId?: string // links to SoldierProfile.id for roster soldiers
}

export interface SoldierProfile {
  id: string
  name: string
  rank: string
  equippedWeapon: WeaponType
  unlockedWeapons: WeaponType[]
  trainedBrains?: Partial<Record<WeaponType, number[]>>
  starRating: 1 | 2 | 3
  team: Team
}

export interface Projectile {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  type: 'bullet' | 'rocket' | 'grenade'
  damage: number
  ownerId: string
  team: Team
  age: number
  fuseTime?: number // grenade fuse (explodes at this age)
}
