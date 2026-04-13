/**
 * ranks.ts — Soldier rank definitions and XP helpers.
 *
 * Sprint C. Rank is derived from XP at render time (not stored).
 * Single source of truth: only `xp: number` is persisted per soldier.
 */

export interface RankDef {
  name: string
  xp: number
  healthMult: number
  color: string
  badge: string
}

export const RANKS: RankDef[] = [
  { name: 'Recruit',    xp: 0,    healthMult: 1.00, color: '#8a8a8a', badge: '' },
  { name: 'Private',    xp: 100,  healthMult: 1.05, color: '#5a9a5a', badge: '▸' },
  { name: 'Corporal',   xp: 300,  healthMult: 1.10, color: '#4a8acd', badge: '▸▸' },
  { name: 'Sergeant',   xp: 600,  healthMult: 1.15, color: '#c0c0c0', badge: '★' },
  { name: 'Lieutenant', xp: 1000, healthMult: 1.20, color: '#ffd740', badge: '★★' },
  { name: 'Commander',  xp: 2000, healthMult: 1.25, color: '#ce93d8', badge: '★★★' },
]

export const XP_REWARDS = {
  BATTLE_WIN: 50,
  STAR_BONUS: 15,
  TRAINING_COMPLETE: 20,
  FIRST_KILL_BONUS: 10,
}

/** Get the rank for a given XP value */
export function getRank(xp: number): RankDef {
  let rank = RANKS[0]!
  for (const r of RANKS) {
    if (xp >= r.xp) rank = r
    else break
  }
  return rank
}

/** Get the next rank above current XP, or null if maxed */
export function getNextRank(xp: number): RankDef | null {
  for (const r of RANKS) {
    if (r.xp > xp) return r
  }
  return null
}

/** Numeric rank index (0-5) for sorting */
export function rankIndex(xp: number): number {
  let idx = 0
  for (let i = 0; i < RANKS.length; i++) {
    if (xp >= RANKS[i]!.xp) idx = i
    else break
  }
  return idx
}
