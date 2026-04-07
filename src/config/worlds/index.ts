/**
 * World Registry — all worlds and battles in one place.
 * Adding a new world = import it here and add to the arrays.
 */
import type { WorldConfig, BattleConfig, WorldRegistry } from './types'
import { kitchenWorld, kitchenBattle1, kitchenBattle2 } from './kitchen'
import { workshopWorld, workshopBattle1, workshopBattle2 } from './workshop'

// ── All worlds and battles ───────────────────────────

const WORLDS: WorldConfig[] = [
  kitchenWorld,
  workshopWorld,
  // backyardWorld,   -- Phase 3
]

const BATTLES: BattleConfig[] = [
  kitchenBattle1,
  kitchenBattle2,
  workshopBattle1,
  workshopBattle2,
  // backyardBattle1, backyardBattle2,   -- Phase 3
]

// ── Lookup maps (built once) ─────────────────────────

const WORLD_MAP = new Map<string, WorldConfig>()
for (const w of WORLDS) WORLD_MAP.set(w.id, w)

const BATTLE_MAP = new Map<string, BattleConfig>()
for (const b of BATTLES) BATTLE_MAP.set(b.id, b)

// ── Registry ─────────────────────────────────────────

export const worldRegistry: WorldRegistry = {
  worlds: WORLDS,
  battles: BATTLES,

  getWorld: (id) => WORLD_MAP.get(id),
  getBattle: (id) => BATTLE_MAP.get(id),

  getBattlesForWorld: (worldId) =>
    BATTLES.filter(b => b.worldId === worldId),

  getWorldForBattle: (battleId) => {
    const battle = BATTLE_MAP.get(battleId)
    return battle ? WORLD_MAP.get(battle.worldId) : undefined
  },

  getNextBattle: (currentBattleId) => {
    const idx = BATTLES.findIndex(b => b.id === currentBattleId)
    if (idx < 0 || idx >= BATTLES.length - 1) return null
    return BATTLES[idx + 1].id
  },
}

// Re-export types for convenience
export type { WorldConfig, BattleConfig, PropConfig, PropTag, WorldTheme, EdgeConfig, GroundConfig, WaveConfig, PlacementZone, StarCriteria } from './types'
