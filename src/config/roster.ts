import type { WeaponType, SoldierProfile } from './types'

/** Weapon unlock costs — all 0 because weapons are now unlocked by winning battles. */
export const WEAPON_UNLOCK_COST: Record<WeaponType, number> = {
  rifle: 0,
  rocketLauncher: 0,
  grenade: 0,
  machineGun: 0,
  tank: 0,
}

export const SOLDIER_RECRUIT_COST = 200

export const WEAPON_DISPLAY: Record<WeaponType, { name: string; desc: string }> = {
  rifle: {
    name: 'Rifle',
    desc: 'Reliable all-rounder. Medium range, medium damage.',
  },
  rocketLauncher: {
    name: 'Rocket',
    desc: 'Explosive punch. High damage, slow reload.',
  },
  grenade: {
    name: 'Grenade',
    desc: 'Area splash. Short range, kills groups.',
  },
  machineGun: {
    name: 'Machine Gun',
    desc: 'Bullet hose. Low damage, insane fire rate.',
  },
  tank: {
    name: 'Tank',
    desc: 'Armored vehicle. Cannon + treads. Drive & destroy.',
  },
}

export const WEAPON_TRAINING: Partial<Record<WeaponType, {
  fitnessThreshold: number
  simDuration: number
  computeCost: number
}>> = {
  rocketLauncher: { fitnessThreshold: 0.6, simDuration: 6, computeCost: 100 },
  grenade: { fitnessThreshold: 0.55, simDuration: 5, computeCost: 100 },
  machineGun: { fitnessThreshold: 0.65, simDuration: 5, computeCost: 200 },
  tank: { fitnessThreshold: 0.4, simDuration: 8, computeCost: 300 },
}

const SOLDIER_NAMES = [
  'CPL DUKE', 'PVT BLAZE', 'SGT IRON', 'PVT GRIT',
  'CPL HAWK', 'PVT STORM', 'SGT FLINT', 'PVT BOLT',
  'CPL TANK', 'PVT WOLF', 'SGT STEEL', 'PVT RAZOR',
  'CPL VIPER', 'PVT GHOST', 'SGT COBRA', 'PVT RAVEN',
  'CPL FANG', 'PVT SPARK', 'SGT TITAN', 'PVT SHADE',
]

let _nameIdx = 0

export function randomSoldierName(): string {
  // SOLDIER_NAMES is a non-empty constant literal, so the modulo index
  // is always in bounds; the `?? 'PVT RECRUIT'` fallback exists purely
  // for the strict noUncheckedIndexedAccess check.
  const name = SOLDIER_NAMES[_nameIdx % SOLDIER_NAMES.length] ?? 'PVT RECRUIT'
  _nameIdx++
  return name
}

/** Get 3 random name options for recruit selection */
export function getRecruitNameOptions(): string[] {
  const shuffled = [...SOLDIER_NAMES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3)
}

/** Starter roster — soldiers begin completely untrained (no weapon brains). */
export const STARTER_ROSTER: SoldierProfile[] = [
  {
    id: 'soldier-1',
    name: 'SGT RICO',
    rank: 'SGT',
    equippedWeapon: 'rifle',
    unlockedWeapons: [],
    starRating: 2,
    team: 'green',
    trainedBrains: {},
  },
  {
    id: 'soldier-2',
    name: 'PVT ACE',
    rank: 'PVT',
    equippedWeapon: 'rifle',
    unlockedWeapons: [],
    starRating: 1,
    team: 'green',
    trainedBrains: {},
  },
]
