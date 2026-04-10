/**
 * campStore — the persisted game state for the base camp.
 *
 * Sprint 1, Subsystem 4. Zustand store with versioned migration shim.
 * Split by lifetime: this store is persisted (localStorage), while
 * useSceneStore (ephemeral) handles transient scene state.
 *
 * Version 1 schema locks the shape so sprint 2's training data
 * doesn't force a save-wipe.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Soldier record (persisted) ──
export interface SoldierRecord {
  id: string
  name: string
  weapon: string
  trained: boolean
  /** Trained brain weights — undefined if untrained */
  weights?: number[]
  /** Best fitness score achieved during training */
  fitnessScore?: number
  /** Number of generations trained */
  generationsTrained?: number
}

// ── State shape ──
interface CampState {
  // Economy
  compute: number
  gold: number

  // Roster
  soldiers: SoldierRecord[]

  // Settings
  muted: boolean

  // Actions
  setCompute: (value: number) => void
  addCompute: (delta: number) => void
  spendCompute: (amount: number) => boolean
  setGold: (value: number) => void
  setMuted: (muted: boolean) => void
  addSoldier: (soldier: SoldierRecord) => void
  updateSoldier: (id: string, updates: Partial<SoldierRecord>) => void
}

export const useCampStore = create<CampState>()(
  persist(
    (set, get) => ({
      // Economy
      compute: 500,
      gold: 0,

      // Roster
      soldiers: [],

      // Settings
      muted: false,

      // Actions
      setCompute: (value) => set({ compute: value }),
      addCompute: (delta) => set((s) => ({ compute: s.compute + delta })),
      spendCompute: (amount) => {
        const state = get()
        if (state.compute < amount) return false
        set({ compute: state.compute - amount })
        return true
      },
      setGold: (value) => set({ gold: value }),
      setMuted: (muted) => set({ muted }),
      addSoldier: (soldier) => set((s) => ({ soldiers: [...s.soldiers, soldier] })),
      updateSoldier: (id, updates) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, ...updates } : sol,
        ),
      })),
    }),
    {
      name: 'toy-soldiers-camp',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // v1 → v2: network shape changed from [6,12,4] to [7,8,4].
          // Wipe any stale trained weights since they're the wrong size.
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              weights: undefined,
              fitnessScore: undefined,
              generationsTrained: undefined,
              trained: false,
            }))
          }
        }
        return persistedState as CampState
      },
    },
  ),
)
