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

interface GameState {
  phase: GamePhase
  gold: number
  compute: number

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
  spendGold: (amount: number) => boolean
  spendCompute: (amount: number) => boolean
  addGold: (amount: number) => void
  addCompute: (amount: number) => void
  claimDailyCompute: () => boolean
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
  gold: 0,
  compute: 500,

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

  loadLevel: (config) => set({
    level: config,
    slots: config.placement_slots.map((s) => ({ ...s, occupied: false })),
    gold: config.budget,
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

  spendGold: (amount) => {
    const { gold } = get()
    if (gold < amount) return false
    set({ gold: gold - amount })
    return true
  },

  spendCompute: (amount) => {
    const { compute } = get()
    if (compute < amount) return false
    set({ compute: compute - amount })
    return true
  },

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

  addCompute: (amount) => set((s) => ({ compute: s.compute + amount })),

  claimDailyCompute: () => {
    const now = Date.now()
    const last = get().lastDailyClaimTime
    const DAY_MS = 24 * 60 * 60 * 1000
    const elapsed = now - last
    if (elapsed < DAY_MS) return false
    // Award 50 per unclaimed day, capped at 3 days (150 max)
    const daysMissed = Math.min(Math.floor(elapsed / DAY_MS), 3)
    const reward = daysMissed * 50
    set((s) => ({ compute: s.compute + reward, lastDailyClaimTime: now }))
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
    const cost = 100

    if (!state.spendGold(cost)) return

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
    const costs: Record<string, number> = { wall: 50, sandbag: 75, tower: 200 }
    const cost = costs[type] ?? 0
    const healthMap: Record<string, number> = { wall: 200, sandbag: 150, tower: 300 }

    if (!state.spendGold(cost)) return

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
      selectedPlacement: null,
    })
  },

  removePlayerUnit: (unitId) => set((s) => {
    const unit = s.playerUnits.find((u) => u.id === unitId)
    if (!unit) return s
    const newGold = s.gold + 100
    return {
      playerUnits: s.playerUnits.filter((u) => u.id !== unitId),
      placedSoldierIds: unit.profileId
        ? s.placedSoldierIds.filter((sid) => sid !== unit.profileId)
        : s.placedSoldierIds,
      gold: newGold,
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
      budget: battle.budget,
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
      version: 3,
      migrate: (persisted: any, version: number) => {
        if (version < 2) {
          return {
            gold: persisted?.gold ?? 0,
            compute: persisted?.compute ?? 500,
            lastDailyClaimTime: 0,
          }
        }
        if (version < 3) {
          return {
            ...persisted,
            lastDailyClaimTime: 0,
          }
        }
        return persisted as any
      },
      partialize: (state) => ({
        gold: state.gold,
        compute: state.compute,
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
