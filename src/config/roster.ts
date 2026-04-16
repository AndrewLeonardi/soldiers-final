import type { WeaponType, SoldierProfile } from './types'

/** Weapon unlock costs — all 0 because weapons are now unlocked by winning battles. */
export const WEAPON_UNLOCK_COST: Record<WeaponType, number> = {
  rifle: 0,
  rocketLauncher: 0,
  grenade: 0,
  machineGun: 0,
  tank: 0,
}

/**
 * WEAPON_MANUAL_COST — per-soldier one-time fee to "buy the training manual"
 * for a rare weapon. Charged ONCE per soldier the first time they train on
 * that weapon. After that, future training runs on the same weapon for the
 * same soldier are strict 1:1 token-per-second.
 *
 * This is the only place rare weapons cost more than rifle — we preserve
 * the 1:1 per-second rule by putting the premium on a one-time unlock fee
 * rather than a per-second multiplier. See production-plan.md Subsystem 2.2.
 *
 * Battle-victory unlocks the weapon AT THE ACCOUNT LEVEL (so it shows up in
 * the carousel). The manual fee is per-soldier — each new soldier learning
 * grenade pays 80 tokens, not free-after-first.
 */
export const WEAPON_MANUAL_COST: Record<WeaponType, number> = {
  rifle: 0,            // starter — no manual needed
  grenade: 80,
  rocketLauncher: 150,
  machineGun: 150,
  tank: 300,
}

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
