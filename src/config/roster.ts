import type { WeaponType, SoldierProfile } from './types'

export const WEAPON_UNLOCK_COST: Record<WeaponType, number> = {
  rifle: 0,
  rocketLauncher: 100,
  grenade: 100,
  machineGun: 200,
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
