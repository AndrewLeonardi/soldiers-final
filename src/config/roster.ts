import type { WeaponType, SoldierProfile } from './types'

export const WEAPON_UNLOCK_COST: Record<WeaponType, number> = {
  rifle: 0,
  rocketLauncher: 100,
  grenade: 100,
  machineGun: 200,
  tank: 300,
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
  'CPL TANK', 'PVT WOLF', 'SGT STEEL', 'PVT ACE',
]

let _nameIdx = 0

export function randomSoldierName(): string {
  const name = SOLDIER_NAMES[_nameIdx % SOLDIER_NAMES.length]
  _nameIdx++
  return name
}

export const STARTER_ROSTER: SoldierProfile[] = [
  {
    id: 'soldier-1',
    name: 'SGT RICO',
    rank: 'SGT',
    equippedWeapon: 'rifle',
    unlockedWeapons: ['rifle'],
    starRating: 2,
    team: 'green',
  },
  {
    id: 'soldier-2',
    name: 'PVT ACE',
    rank: 'PVT',
    equippedWeapon: 'rocketLauncher',
    unlockedWeapons: ['rifle', 'rocketLauncher'],
    starRating: 1,
    team: 'green',
  },
]
