import { create } from 'zustand'
import type { GamePhase, GameUnit, PlacementSlot, Projectile, LevelConfig } from '@config/types'

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

  // Actions
  loadLevel: (config: LevelConfig) => void
  setPhase: (phase: GamePhase) => void
  addPlayerUnit: (unit: GameUnit) => void
  occupySlot: (slotId: string) => void
  freeSlot: (slotId: string) => void
  spendGold: (amount: number) => boolean
  addGold: (amount: number) => void
  setResult: (result: 'victory' | 'defeat', stars: number) => void
  startBattle: () => void
  resetLevel: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'placement',
  gold: 500,
  compute: 100,
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
    phase: 'placement',
  }),

  setPhase: (phase) => set({ phase }),

  addPlayerUnit: (unit) => set((s) => ({
    playerUnits: [...s.playerUnits, unit],
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

  addGold: (amount) => set((s) => ({ gold: s.gold + amount })),

  setResult: (result, stars) => set({ result, starsEarned: stars, phase: 'result' }),

  startBattle: () => set({ phase: 'battle', currentWave: 0, waveTimer: 0 }),

  resetLevel: () => {
    const { level } = get()
    if (level) get().loadLevel(level)
  },
}))
