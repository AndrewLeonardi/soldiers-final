/**
 * campStore — the persisted game state for the base camp.
 *
 * Sprint 1→3. Zustand store with versioned migration shim.
 * Split by lifetime: this store is persisted (localStorage), while
 * useSceneStore (ephemeral) handles transient scene state.
 *
 * Version 3 adds:
 *   - Per-soldier trainedBrains (multi-weapon brain storage)
 *   - Global weapon unlocks
 *   - Parallel training slot unlocks
 *   - Daily drip tracking
 *   - Starter pack flag
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WEAPON_UNLOCK_COST } from '@config/roster'
import { DAILY_DRIP_AMOUNT, DAILY_DRIP_INTERVAL_MS, DAILY_DRIP_MAX_DAYS } from '@config/store'
import type { WeaponType } from '@config/types'

// ── Soldier record (persisted) ──
export interface SoldierRecord {
  id: string
  name: string
  weapon: string
  trained: boolean
  /** Per-weapon trained brain weights — key is weapon type */
  trainedBrains?: Record<string, number[]>
  /** Best fitness score achieved during training (across any weapon) */
  fitnessScore?: number
  /** Total generations trained (across all weapons) */
  generationsTrained?: number

  // Legacy field — kept for v2→v3 migration, not used in new code
  weights?: number[]
}

// ── State shape ──
interface CampState {
  // Economy
  compute: number
  gold: number

  // Global unlocks
  unlockedWeapons: string[]
  unlockedSlots: number   // 1 = free slot only, 2 = slot 2 unlocked, 3 = all

  // Daily drip
  lastDailyClaimTime: number  // Unix ms, 0 = never claimed

  // Store flags
  starterPackShown: boolean

  // Roster
  soldiers: SoldierRecord[]

  // Battle progress
  battlesCompleted: Record<string, { stars: number }>

  // Settings
  muted: boolean

  // Actions — economy
  setCompute: (value: number) => void
  addCompute: (delta: number) => void
  spendCompute: (amount: number) => boolean
  setGold: (value: number) => void

  // Actions — unlocks
  unlockWeapon: (weapon: WeaponType) => boolean
  unlockSlot: () => boolean

  // Actions — daily drip
  claimDailyCompute: () => { claimed: number; backfillDays: number } | null

  // Actions — roster
  addSoldier: (soldier: SoldierRecord) => void
  updateSoldier: (id: string, updates: Partial<SoldierRecord>) => void
  updateSoldierBrain: (id: string, weapon: string, weights: number[], fitness: number, generations: number) => void

  // Actions — battles
  completeBattle: (battleId: string, stars: number, reward: number) => void

  // Actions — settings
  setMuted: (muted: boolean) => void

  // Actions — store flags
  setStarterPackShown: () => void
}

// Slot unlock costs
const SLOT_UNLOCK_COSTS: Record<number, number> = { 2: 200, 3: 500 }

export const useCampStore = create<CampState>()(
  persist(
    (set, get) => ({
      // Economy
      compute: 500,
      gold: 0,

      // Global unlocks
      unlockedWeapons: ['rifle'],
      unlockedSlots: 1,

      // Daily drip
      lastDailyClaimTime: 0,

      // Store flags
      starterPackShown: false,

      // Roster
      soldiers: [],

      // Battle progress
      battlesCompleted: {},

      // Settings
      muted: false,

      // ── Economy actions ──
      setCompute: (value) => set({ compute: value }),
      addCompute: (delta) => set((s) => ({ compute: s.compute + delta })),
      spendCompute: (amount) => {
        const state = get()
        if (state.compute < amount) return false
        set({ compute: state.compute - amount })
        return true
      },
      setGold: (value) => set({ gold: value }),

      // ── Unlock actions ──
      unlockWeapon: (weapon) => {
        const state = get()
        if (state.unlockedWeapons.includes(weapon)) return true // already unlocked
        const cost = WEAPON_UNLOCK_COST[weapon]
        if (state.compute < cost) return false
        set({
          compute: state.compute - cost,
          unlockedWeapons: [...state.unlockedWeapons, weapon],
        })
        return true
      },

      unlockSlot: () => {
        const state = get()
        const nextSlot = state.unlockedSlots + 1
        const cost = SLOT_UNLOCK_COSTS[nextSlot]
        if (!cost) return false // already at max (3)
        if (state.compute < cost) return false
        set({
          compute: state.compute - cost,
          unlockedSlots: nextSlot,
        })
        return true
      },

      // ── Daily drip ──
      claimDailyCompute: () => {
        const state = get()
        const now = Date.now()
        const last = state.lastDailyClaimTime

        // First ever claim
        if (last === 0) {
          set({
            compute: state.compute + DAILY_DRIP_AMOUNT,
            lastDailyClaimTime: now,
          })
          return { claimed: DAILY_DRIP_AMOUNT, backfillDays: 0 }
        }

        // Not enough time passed
        const elapsed = now - last
        if (elapsed < DAILY_DRIP_INTERVAL_MS) return null

        // Backfill: up to DAILY_DRIP_MAX_DAYS
        const daysMissed = Math.min(
          Math.floor(elapsed / DAILY_DRIP_INTERVAL_MS),
          DAILY_DRIP_MAX_DAYS,
        )
        const totalClaim = DAILY_DRIP_AMOUNT * daysMissed
        set({
          compute: state.compute + totalClaim,
          lastDailyClaimTime: now,
        })
        return { claimed: totalClaim, backfillDays: daysMissed - 1 }
      },

      // ── Roster actions ──
      addSoldier: (soldier) => set((s) => ({ soldiers: [...s.soldiers, soldier] })),

      updateSoldier: (id, updates) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, ...updates } : sol,
        ),
      })),

      /** Write trained brain weights for a specific weapon. */
      updateSoldierBrain: (id, weapon, weights, fitness, generations) => set((s) => ({
        soldiers: s.soldiers.map(sol => {
          if (sol.id !== id) return sol
          const existingBrains = sol.trainedBrains ?? {}
          return {
            ...sol,
            trained: true,
            trainedBrains: { ...existingBrains, [weapon]: weights },
            fitnessScore: Math.max(fitness, sol.fitnessScore ?? 0),
            generationsTrained: (sol.generationsTrained ?? 0) + generations,
          }
        }),
      })),

      // ── Battle progress ──
      completeBattle: (battleId, stars, reward) => {
        const state = get()
        const existing = state.battlesCompleted[battleId]
        // Only update if new star count is higher
        const bestStars = existing ? Math.max(existing.stars, stars) : stars
        set({
          battlesCompleted: { ...state.battlesCompleted, [battleId]: { stars: bestStars } },
          compute: state.compute + reward,
        })
      },

      // ── Settings ──
      setMuted: (muted) => set({ muted }),

      // ── Store flags ──
      setStarterPackShown: () => set({ starterPackShown: true }),
    }),
    {
      name: 'toy-soldiers-camp',
      version: 4,
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
        if (version < 3) {
          // v2 → v3: migrate flat `weights` → `trainedBrains.rifle`
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => {
              const trainedBrains: Record<string, number[]> = {}
              if (s.weights && s.weights.length > 0) {
                trainedBrains['rifle'] = s.weights
              }
              return {
                ...s,
                trainedBrains: Object.keys(trainedBrains).length > 0 ? trainedBrains : undefined,
              }
            })
          }
          // Add new top-level fields with defaults
          state.unlockedWeapons = state.unlockedWeapons ?? ['rifle']
          state.unlockedSlots = state.unlockedSlots ?? 1
          state.lastDailyClaimTime = state.lastDailyClaimTime ?? 0
          state.starterPackShown = state.starterPackShown ?? false
        }
        if (version < 4) {
          // v3 → v4: add battlesCompleted
          const state = persistedState as any
          state.battlesCompleted = state.battlesCompleted ?? {}
        }
        return persistedState as CampState
      },
    },
  ),
)
