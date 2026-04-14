import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GamePhase, GameUnit, PlacementSlot, Projectile, LevelConfig } from '@config/types'
import { worldRegistry } from '@config/worlds'
import { useRosterStore } from './rosterStore'
import { WEAPON_STATS } from '@config/units'

let _unitId = Date.now()
function nextUnitId() { return `u-${++_unitId}` }

interface WorldProgress {
  battles: Record<string, { completed: boolean; bestStars: number }>
}

/** Max defenses per type per battle */
const MAX_DEFENSES: Record<string, number> = { wall: 3, sandbag: 2, tower: 1 }

interface GameState {
  phase: GamePhase
  tokens: number

  // World/Battle navigation
  currentWorldId: string | null
  currentBattleId: string | null
  worldProgress: Record<string, WorldProgress>

  // Store / Economy
  lastDailyClaimTime: number  // Unix timestamp (ms)
  showStore: boolean

  level: LevelConfig | null
  slots: PlacementSlot[]
  playerUnits: GameUnit[]
  enemyUnits: GameUnit[]
  projectiles: Projectile[]

  currentWave: number
  waveTimer: number
  result: 'victory' | 'defeat' | null
  starsEarned: number
  battleStartTime: number

  // Battle HUD (updated every ~100ms during combat)
  battleHUD: {
    enemiesAlive: number
    currentWave: number
    totalWaves: number
    elapsedTime: number
  }

  // Placement state
  selectedPlacement: string | null
  placementRotation: number
  placedSoldierIds: string[]
  placedDefenseCounts: Record<string, number>

  // Actions
  loadLevel: (config: LevelConfig) => void
  setPhase: (phase: GamePhase) => void
  addPlayerUnit: (unit: GameUnit) => void
  addEnemyUnit: (unit: GameUnit) => void
  updateUnit: (id: string, updates: Partial<GameUnit>) => void
  addProjectile: (proj: Projectile) => void
  removeProjectile: (id: string) => void
  occupySlot: (slotId: string) => void
  freeSlot: (slotId: string) => void
  spendTokens: (amount: number) => boolean
  addTokens: (amount: number) => void
  claimDailyTokens: () => boolean
  openStore: () => void
  closeStore: () => void
  setResult: (result: 'victory' | 'defeat', stars: number) => void
  startBattle: () => void
  resetLevel: () => void
  selectPlacement: (type: string | null) => void
  rotatePlacement: () => void
  placeSoldier: (soldierId: string, position: [number, number, number]) => void
  placeDefense: (type: 'wall' | 'sandbag' | 'tower', position: [number, number, number]) => void
  removePlayerUnit: (unitId: string) => void
  // Battle HUD
  updateBattleHUD: (data: { enemiesAlive: number; currentWave: number; totalWaves: number; elapsedTime: number }) => void

  // World/Battle navigation
  selectBattle: (battleId: string) => void
  completeBattle: (battleId: string, stars: number) => void
  goToWorldSelect: () => void
  nextBattle: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  phase: 'worldSelect' as GamePhase,
  currentWorldId: null,
  currentBattleId: null,
  worldProgress: {},
  tokens: 500,

  lastDailyClaimTime: 0,
  showStore: false,

  level: null,
  slots: [],
  playerUnits: [],
  enemyUnits: [],
  projectiles: [],

  currentWave: 0,
  waveTimer: 0,
  result: null,
  starsEarned: 0,
  battleStartTime: 0,
  battleHUD: { enemiesAlive: 0, currentWave: 0, totalWaves: 0, elapsedTime: 0 },

  selectedPlacement: null,
  placementRotation: 0,
  placedSoldierIds: [],
  placedDefenseCounts: {},

  loadLevel: (config) => set({
    level: config,
    slots: config.placement_slots.map((s) => ({ ...s, occupied: false })),
    playerUnits: [],
    enemyUnits: [],
    projectiles: [],
    currentWave: 0,
    waveTimer: 0,
    result: null,
    starsEarned: 0,
    battleStartTime: 0,
    phase: 'loadout',
    selectedPlacement: null,
    placementRotation: 0,
    placedSoldierIds: [],
    placedDefenseCounts: {},
  }),

  setPhase: (phase) => set({ phase }),

  addPlayerUnit: (unit) => set((s) => ({
    playerUnits: [...s.playerUnits, unit],
  })),

  addEnemyUnit: (unit) => set((s) => ({
    enemyUnits: [...s.enemyUnits, unit],
  })),

  updateUnit: (id, updates) => set((s) => ({
    playerUnits: s.playerUnits.map((u) =>
      u.id === id ? { ...u, ...updates } : u
    ),
    enemyUnits: s.enemyUnits.map((u) =>
      u.id === id ? { ...u, ...updates } : u
    ),
  })),

  addProjectile: (proj) => set((s) => ({
    projectiles: [...s.projectiles, proj],
  })),

  removeProjectile: (id) => set((s) => ({
    projectiles: s.projectiles.filter((p) => p.id !== id),
  })),

  occupySlot: (slotId) => set((s) => ({
    slots: s.slots.map((slot) =>
      slot.id === slotId ? { ...slot, occupied: true } : slot
    ),
  })),

  freeSlot: (slotId) => set((s) => ({
    slots: s.slots.map((slot) =>
      slot.id === slotId ? { ...slot, occupied: false } : slot
    ),
  })),

  spendTokens: (amount) => {
    const { tokens } = get()
    if (tokens < amount) return false
    set({ tokens: tokens - amount })
    return true
  },

  addTokens: (amount) => set((s) => ({ tokens: s.tokens + amount })),

  claimDailyTokens: () => {
    const now = Date.now()
    const last = get().lastDailyClaimTime
    const DAY_MS = 24 * 60 * 60 * 1000
    const elapsed = now - last
    if (elapsed < DAY_MS) return false
    // Award 50 per unclaimed day, capped at 3 days (150 max)
    const daysMissed = Math.min(Math.floor(elapsed / DAY_MS), 3)
    const reward = daysMissed * 50
    set((s) => ({ tokens: s.tokens + reward, lastDailyClaimTime: now }))
    return true
  },

  openStore: () => set({ showStore: true }),
  closeStore: () => set({ showStore: false }),

  setResult: (result, stars) => set({ result, starsEarned: stars, phase: 'result' }),

  startBattle: () => set({ phase: 'battle', currentWave: 0, waveTimer: 0, battleStartTime: 0, selectedPlacement: null }),

  resetLevel: () => {
    const { level } = get()
    if (level) get().loadLevel(level)
  },

  selectPlacement: (type) => set({ selectedPlacement: type }),

  rotatePlacement: () => set((s) => ({
    placementRotation: (s.placementRotation + Math.PI / 2) % (Math.PI * 2),
  })),

  placeSoldier: (soldierId, position) => {
    const state = get()
    const roster = useRosterStore.getState()
    const profile = roster.soldiers.find((s) => s.id === soldierId)
    if (!profile) return

    // Already placed this soldier
    if (state.placedSoldierIds.includes(soldierId)) return

    const weaponKey = profile.equippedWeapon
    const stats = WEAPON_STATS[weaponKey]

    // Free placement — no gold cost

    const unit: GameUnit = {
      id: nextUnitId(),
      type: 'soldier',
      team: 'green',
      position,
      rotation: state.placementRotation || Math.PI / 2,
      health: stats.health,
      maxHealth: stats.health,
      status: 'idle',
      weapon: weaponKey,
      lastFireTime: 0,
      fireRate: stats.fireRate,
      range: stats.range,
      damage: stats.damage,
      speed: stats.speed,
      profileId: soldierId,
    }

    set({
      playerUnits: [...state.playerUnits, unit],
      placedSoldierIds: [...state.placedSoldierIds, soldierId],
      selectedPlacement: null, // deselect after placing
    })
  },

  placeDefense: (type, position) => {
    const state = get()
    const healthMap: Record<string, number> = { wall: 200, sandbag: 150, tower: 300 }

    // Count-based defense limits (no gold cost)
    const currentCount = state.placedDefenseCounts[type] ?? 0
    const maxCount = MAX_DEFENSES[type] ?? 0
    if (currentCount >= maxCount) return

    const unit: GameUnit = {
      id: nextUnitId(),
      type: type as any,
      team: 'green',
      position,
      rotation: state.placementRotation,
      health: healthMap[type] ?? 200,
      maxHealth: healthMap[type] ?? 200,
      status: 'idle',
      weapon: 'rifle',
      lastFireTime: 0,
      fireRate: 0,
      range: 0,
      damage: 0,
      speed: 0,
    }

    set({
      playerUnits: [...state.playerUnits, unit],
      placedDefenseCounts: {
        ...state.placedDefenseCounts,
        [type]: currentCount + 1,
      },
      selectedPlacement: null,
    })
  },

  removePlayerUnit: (unitId) => set((s) => {
    const unit = s.playerUnits.find((u) => u.id === unitId)
    if (!unit) return s
    // Decrement defense count if it's a defense
    const isDefense = ['wall', 'sandbag', 'tower'].includes(unit.type)
    const newDefenseCounts = isDefense
      ? { ...s.placedDefenseCounts, [unit.type]: Math.max(0, (s.placedDefenseCounts[unit.type] ?? 0) - 1) }
      : s.placedDefenseCounts
    return {
      playerUnits: s.playerUnits.filter((u) => u.id !== unitId),
      placedSoldierIds: unit.profileId
        ? s.placedSoldierIds.filter((sid) => sid !== unit.profileId)
        : s.placedSoldierIds,
      placedDefenseCounts: newDefenseCounts,
    }
  }),

  // ── Battle HUD ──
  updateBattleHUD: (data) => set({ battleHUD: data }),

  // ── World/Battle Navigation ──

  selectBattle: (battleId) => {
    const battle = worldRegistry.getBattle(battleId)
    if (!battle) return
    const world = worldRegistry.getWorld(battle.worldId)
    if (!world) return

    // Convert BattleConfig to LevelConfig shape for compatibility
    const levelConfig = {
      id: battle.id,
      theme: world.id,
      name: battle.name,
      placement_slots: battle.placementZones.map(z => ({
        id: z.id,
        pos: z.position,
        type: 'ground' as const,
      })),
      waves: battle.waves.map(w => ({
        delay: w.delay,
        enemies: w.enemies.map(e => ({
          type: e.type,
          count: e.count,
          spacing: e.spacing,
          path: 'default',
          weapon: e.weapon,
          spawnSide: e.spawnSide,
        })),
      })),
      available_units: ['rifle', 'rocketLauncher', 'grenade', 'machineGun', 'tank'],
      budget: 0, // no gold budget
      stars: battle.stars,
    }

    set({
      currentWorldId: world.id,
      currentBattleId: battle.id,
    })
    get().loadLevel(levelConfig)
  },

  completeBattle: (battleId, stars) => set((s) => {
    const battle = worldRegistry.getBattle(battleId)
    if (!battle) return {}
    const worldId = battle.worldId
    const prev = s.worldProgress[worldId]?.battles[battleId]
    return {
      worldProgress: {
        ...s.worldProgress,
        [worldId]: {
          battles: {
            ...(s.worldProgress[worldId]?.battles ?? {}),
            [battleId]: {
              completed: true,
              bestStars: Math.max(prev?.bestStars ?? 0, stars),
            },
          },
        },
      },
    }
  }),

  goToWorldSelect: () => set({ phase: 'worldSelect', currentWorldId: null, currentBattleId: null }),

  nextBattle: () => {
    const { currentBattleId } = get()
    if (!currentBattleId) return
    const nextId = worldRegistry.getNextBattle(currentBattleId)
    if (nextId) {
      get().selectBattle(nextId)
    } else {
      get().goToWorldSelect()
    }
  },
    }),
    {
      name: 'toy-soldiers-game',
      version: 4,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          return {
            tokens: persisted?.compute ?? persisted?.tokens ?? 500,
            lastDailyClaimTime: 0,
          }
        }
        if (version < 3) {
          return {
            ...persisted,
            lastDailyClaimTime: 0,
          }
        }
        if (version < 4) {
          // v3 → v4: Rename compute → tokens, remove gold
          const state = { ...persisted }
          state.tokens = state.compute ?? state.tokens ?? 500
          delete state.compute
          delete state.gold
          return state
        }
        return persisted as any
      },
      partialize: (state) => ({
        tokens: state.tokens,
        lastDailyClaimTime: state.lastDailyClaimTime,
        worldProgress: state.worldProgress,
      }),
    }
  )
)

// Dev testing helper
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  ;(window as any).__gameStore = useGameStore
}
