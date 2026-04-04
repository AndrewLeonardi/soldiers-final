import { create } from 'zustand'
import type { GamePhase, GameUnit, PlacementSlot, Projectile, LevelConfig } from '@config/types'
import { useRosterStore } from './rosterStore'
import { WEAPON_STATS } from '@config/units'

let _unitId = 0
function nextUnitId() { return `u-${++_unitId}` }

interface GameState {
  phase: GamePhase
  gold: number
  compute: number
  round: number

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

  // Placement state
  selectedPlacement: string | null // soldier ID like "s1" or defense type like "wall"
  placementRotation: number
  placedSoldierIds: string[] // track which roster soldiers are already placed

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
  setResult: (result: 'victory' | 'defeat', stars: number) => void
  startBattle: () => void
  resetLevel: () => void
  nextRound: () => void
  selectPlacement: (type: string | null) => void
  rotatePlacement: () => void
  placeSoldier: (soldierId: string, position: [number, number, number]) => void
  placeDefense: (type: 'wall' | 'sandbag' | 'tower', position: [number, number, number]) => void
  removePlayerUnit: (unitId: string) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'placement',
  gold: 10000,
  compute: 10000,
  round: 1,

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

  setResult: (result, stars) => set({ result, starsEarned: stars, phase: 'result' }),

  startBattle: () => set({ phase: 'battle', currentWave: 0, waveTimer: 0, battleStartTime: 0, selectedPlacement: null }),

  resetLevel: () => {
    const { level } = get()
    if (level) get().loadLevel(level)
  },

  nextRound: () => {
    const state = get()
    const nextRoundNum = state.round + 1
    const goldReward = 200 + state.round * 50

    // Keep surviving soldiers (heal them, reset state)
    const surviving = state.playerUnits
      .filter((u) => u.status !== 'dead')
      .map((u) => ({
        ...u,
        health: u.maxHealth,
        status: 'idle' as const,
        lastFireTime: 0,
      }))

    set({
      phase: 'placement',
      round: nextRoundNum,
      gold: state.gold + goldReward,
      playerUnits: surviving,
      enemyUnits: [],
      projectiles: [],
      result: null,
      starsEarned: 0,
      currentWave: 0,
      waveTimer: 0,
      battleStartTime: 0,
      selectedPlacement: null,
      placementRotation: 0,
      // Keep placedSoldierIds for surviving soldiers
      placedSoldierIds: surviving
        .filter((u) => u.profileId)
        .map((u) => u.profileId!),
    })
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
    // Refund gold
    const newGold = s.gold + 100
    return {
      playerUnits: s.playerUnits.filter((u) => u.id !== unitId),
      placedSoldierIds: unit.profileId
        ? s.placedSoldierIds.filter((sid) => sid !== unit.profileId)
        : s.placedSoldierIds,
      gold: newGold,
    }
  }),
}))

// Dev testing helper (remove in production)
if (typeof window !== 'undefined') {
  ;(window as any).__gameStore = useGameStore
}
