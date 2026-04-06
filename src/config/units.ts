import type { EnemyType, WeaponType } from './types'

export interface UnitStats {
  health: number
  speed: number
  range: number
  damage: number
  fireRate: number
}

export const WEAPON_STATS: Record<WeaponType, UnitStats> = {
  rifle: { health: 100, speed: 1.5, range: 6, damage: 15, fireRate: 1.2 },
  rocketLauncher: { health: 100, speed: 1.2, range: 9, damage: 60, fireRate: 2.5 },
  grenade: { health: 100, speed: 1.5, range: 5, damage: 40, fireRate: 3.0 },
  machineGun: { health: 100, speed: 1.0, range: 7, damage: 10, fireRate: 0.3 },
  tank: { health: 400, speed: 0.8, range: 10, damage: 80, fireRate: 3.0 },
}

export const ENEMY_STATS: Record<EnemyType, UnitStats> = {
  infantry: { health: 80, speed: 1.8, range: 5, damage: 12, fireRate: 1.5 },
  jeep: { health: 150, speed: 3.5, range: 4, damage: 15, fireRate: 1.0 },
  tank: { health: 400, speed: 0.8, range: 8, damage: 50, fireRate: 3.0 },
}

// Waves are defined per-level in src/config/levels/*.json
// Tutorial battle uses a hardcoded 2-infantry wave in BattleScene.tsx
