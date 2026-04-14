/**
 * campStore — the persisted game state for the base camp.
 *
 * Sprint 1→3. Zustand store with versioned migration shim.
 * Split by lifetime: this store is persisted (localStorage), while
 * useSceneStore (ephemeral) handles transient scene state.
 *
 * Version 12 adds:
 *   - Rename compute → tokens
 *   - Remove gold currency entirely
 *   - Soldier slots system (derived from level)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WEAPON_UNLOCK_COST } from '@config/roster'
import { DAILY_DRIP_AMOUNT, DAILY_DRIP_INTERVAL_MS, DAILY_DRIP_MAX_DAYS, DAILY_STREAK_REWARDS, DAILY_STREAK_FORGIVENESS } from '@config/store'
import type { WeaponType } from '@config/types'

// ── Soldier record (persisted) ──
export interface SoldierRecord {
  id: string
  name: string
  weapon: string
  trained: boolean
  /** Per-weapon trained brain weights — key is weapon type */
  trainedBrains?: Record<string, number[]>
  /** Pre-Sprint 7 brains (topology incompatible) — triggers "re-train recommended" UI */
  legacyBrains?: Record<string, number[]>
  /** Best fitness score achieved during training (across any weapon) */
  fitnessScore?: number
  /** Total generations trained (across all weapons) */
  generationsTrained?: number
  /** Epoch ms when healing completes — undefined = healthy */
  injuredUntil?: number
  /** Cumulative experience points — rank derived from this at render time */
  xp?: number

  // Legacy field — kept for v2→v3 migration, not used in new code
  weights?: number[]
}

/** Healing cooldown: 60 seconds */
const HEAL_DURATION_MS = 60 * 1000

// ── Soldier slot milestones ──
/** Level → max soldier slots at that level */
export const SLOT_MILESTONES: Record<number, number> = { 2: 3, 4: 4, 6: 5, 8: 6 }

/** Derive max soldier slots from player level */
export function getMaxSoldierSlots(battlesCompleted: Record<string, { stars: number }>): number {
  const level = Object.keys(battlesCompleted).length + 1
  let slots = 2 // base
  for (const [lvl, count] of Object.entries(SLOT_MILESTONES)) {
    if (level >= Number(lvl)) slots = count
  }
  return slots
}

// ── State shape ──
interface CampState {
  // Economy
  tokens: number

  // Global unlocks
  unlockedWeapons: string[]
  unlockedSlots: number   // 1 = free slot only, 2 = slot 2 unlocked, 3 = all (training slots)

  // Daily drip (legacy)
  lastDailyClaimTime: number  // Unix ms, 0 = never claimed

  // Daily streak (Sprint Economy)
  dailyStreak: number            // 0-7, current streak day (0 = never claimed)
  lastDailyClaimDate: string     // ISO date "2026-04-13", '' = never

  // Store flags
  starterPackShown: boolean

  // Roster
  soldiers: SoldierRecord[]

  // Soldier slot unlock acknowledgments
  acknowledgedSlotUnlocks: number[]

  // Battle progress
  battlesCompleted: Record<string, { stars: number }>

  // Settings
  muted: boolean

  // Tutorial
  tutorialCompleted: boolean

  // Actions — economy
  setTokens: (value: number) => void
  addTokens: (delta: number) => void
  spendTokens: (amount: number) => boolean

  // Actions — unlocks
  unlockWeapon: (weapon: WeaponType) => boolean
  unlockSlot: () => boolean

  // Actions — daily drip (legacy)
  claimDailyTokens: () => { claimed: number; backfillDays: number } | null

  // Actions — daily streak (Sprint Economy)
  claimDailyReward: () => { tokens: number; streakDay: number } | null
  canClaimDaily: () => boolean

  // Actions — recruitment
  recruitSoldier: (name: string) => boolean

  // Actions — roster
  addSoldier: (soldier: SoldierRecord) => void
  updateSoldier: (id: string, updates: Partial<SoldierRecord>) => void
  updateSoldierBrain: (id: string, weapon: string, weights: number[], fitness: number, generations: number) => void
  awardSoldierXP: (id: string, amount: number) => void

  // Actions — slot unlock acknowledgment
  acknowledgeSlotUnlock: (level: number) => void

  // Actions — battles
  completeBattle: (battleId: string, stars: number, tokenReward: number, weaponReward?: string) => void

  // Actions — injury / healing
  injureSoldier: (id: string) => void
  healSoldier: (id: string) => void
  tickHealing: () => void

  // Actions — settings
  setMuted: (muted: boolean) => void

  // Actions — store flags
  setStarterPackShown: () => void

  // Actions — tutorial
  completeTutorial: () => void
}

// Training slot unlock costs (these are training-parallelism slots, not roster slots)
const TRAINING_SLOT_UNLOCK_COSTS: Record<number, number> = { 2: 200, 3: 500 }

export const useCampStore = create<CampState>()(
  persist(
    (set, get) => ({
      // Economy
      tokens: 500,

      // Global unlocks
      unlockedWeapons: ['rifle'],
      unlockedSlots: 1,

      // Daily drip (legacy)
      lastDailyClaimTime: 0,

      // Daily streak
      dailyStreak: 0,
      lastDailyClaimDate: '',

      // Store flags
      starterPackShown: false,

      // Roster
      soldiers: [],

      // Slot unlock acknowledgments
      acknowledgedSlotUnlocks: [],

      // Battle progress
      battlesCompleted: {},

      // Settings
      muted: false,

      // Tutorial
      tutorialCompleted: false,

      // ── Economy actions ──
      setTokens: (value) => set({ tokens: value }),
      addTokens: (delta) => set((s) => ({ tokens: s.tokens + delta })),
      spendTokens: (amount) => {
        const state = get()
        if (state.tokens < amount) return false
        set({ tokens: state.tokens - amount })
        return true
      },

      // ── Unlock actions ──
      unlockWeapon: (weapon) => {
        const state = get()
        if (state.unlockedWeapons.includes(weapon)) return true // already unlocked
        const cost = WEAPON_UNLOCK_COST[weapon]
        if (state.tokens < cost) return false
        set({
          tokens: state.tokens - cost,
          unlockedWeapons: [...state.unlockedWeapons, weapon],
        })
        return true
      },

      unlockSlot: () => {
        const state = get()
        const nextSlot = state.unlockedSlots + 1
        const cost = TRAINING_SLOT_UNLOCK_COSTS[nextSlot]
        if (!cost) return false // already at max (3)
        if (state.tokens < cost) return false
        set({
          tokens: state.tokens - cost,
          unlockedSlots: nextSlot,
        })
        return true
      },

      // ── Daily drip (legacy) ──
      claimDailyTokens: () => {
        const state = get()
        const now = Date.now()
        const last = state.lastDailyClaimTime

        // First ever claim
        if (last === 0) {
          set({
            tokens: state.tokens + DAILY_DRIP_AMOUNT,
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
          tokens: state.tokens + totalClaim,
          lastDailyClaimTime: now,
        })
        return { claimed: totalClaim, backfillDays: daysMissed - 1 }
      },

      // ── Daily streak (Sprint Economy) ──
      claimDailyReward: () => {
        const state = get()
        const today = new Date().toISOString().split('T')[0]!

        // Already claimed today
        if (state.lastDailyClaimDate === today) return null

        // Calculate streak
        let newStreak: number
        if (state.lastDailyClaimDate) {
          const lastDate = new Date(state.lastDailyClaimDate)
          const todayDate = new Date(today)
          const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))

          if (daysDiff <= DAILY_STREAK_FORGIVENESS) {
            // Continue streak (wrap 7 -> 1)
            newStreak = (state.dailyStreak % 7) + 1
          } else {
            // Streak broken
            newStreak = 1
          }
        } else {
          // First ever claim
          newStreak = 1
        }

        const reward = DAILY_STREAK_REWARDS[newStreak - 1]
        if (!reward) return null

        set({
          tokens: state.tokens + reward.tokens,
          dailyStreak: newStreak,
          lastDailyClaimDate: today,
        })

        return { tokens: reward.tokens, streakDay: newStreak }
      },

      canClaimDaily: () => {
        const today = new Date().toISOString().split('T')[0]!
        return get().lastDailyClaimDate !== today
      },

      // ── Recruitment (slot-gated, free) ──
      recruitSoldier: (name) => {
        const state = get()
        const maxSlots = getMaxSoldierSlots(state.battlesCompleted)
        if (state.soldiers.length >= maxSlots) return false
        const newSoldier: SoldierRecord = {
          id: `soldier-${Date.now()}`,
          name,
          weapon: 'rifle',
          trained: false,
          xp: 0,
        }
        set({
          soldiers: [...state.soldiers, newSoldier],
        })
        return true
      },

      // ── Roster actions ──
      addSoldier: (soldier) => set((s) => ({ soldiers: [...s.soldiers, soldier] })),

      updateSoldier: (id, updates) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, ...updates } : sol,
        ),
      })),

      /** Write trained brain weights for a specific weapon. Also sets equipped weapon. */
      updateSoldierBrain: (id, weapon, weights, fitness, generations) => set((s) => ({
        soldiers: s.soldiers.map(sol => {
          if (sol.id !== id) return sol
          const existingBrains = sol.trainedBrains ?? {}
          return {
            ...sol,
            trained: true,
            weapon, // equip the weapon they just trained
            trainedBrains: { ...existingBrains, [weapon]: weights },
            fitnessScore: Math.max(fitness, sol.fitnessScore ?? 0),
            generationsTrained: (sol.generationsTrained ?? 0) + generations,
          }
        }),
      })),

      awardSoldierXP: (id, amount) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, xp: Math.min(99999, (sol.xp ?? 0) + amount) } : sol,
        ),
      })),

      // ── Slot unlock acknowledgments ──
      acknowledgeSlotUnlock: (level) => set((s) => ({
        acknowledgedSlotUnlocks: [...s.acknowledgedSlotUnlocks, level],
      })),

      // ── Battle progress ──
      completeBattle: (battleId, stars, tokenReward, weaponReward) => {
        const state = get()
        const existing = state.battlesCompleted[battleId]
        // Only update if new star count is higher
        const bestStars = existing ? Math.max(existing.stars, stars) : stars
        // Unlock weapon if earned and not already unlocked
        const weapons = weaponReward && !state.unlockedWeapons.includes(weaponReward)
          ? [...state.unlockedWeapons, weaponReward]
          : state.unlockedWeapons
        set({
          battlesCompleted: { ...state.battlesCompleted, [battleId]: { stars: bestStars } },
          tokens: state.tokens + tokenReward,
          unlockedWeapons: weapons,
        })
      },

      // ── Injury / healing ──
      injureSoldier: (id) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, injuredUntil: Date.now() + HEAL_DURATION_MS } : sol,
        ),
      })),

      healSoldier: (id) => set((s) => ({
        soldiers: s.soldiers.map(sol =>
          sol.id === id ? { ...sol, injuredUntil: undefined } : sol,
        ),
      })),

      tickHealing: () => {
        const now = Date.now()
        const state = get()
        const needsHeal = state.soldiers.some(s => s.injuredUntil && s.injuredUntil <= now)
        if (!needsHeal) return
        set({
          soldiers: state.soldiers.map(sol =>
            sol.injuredUntil && sol.injuredUntil <= now
              ? { ...sol, injuredUntil: undefined }
              : sol,
          ),
        })
      },

      // ── Settings ──
      setMuted: (muted) => set({ muted }),

      // ── Store flags ──
      setStarterPackShown: () => set({ starterPackShown: true }),

      // ── Tutorial ──
      completeTutorial: () => set({ tutorialCompleted: true }),
    }),
    {
      name: 'toy-soldiers-camp',
      version: 12,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
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
          state.unlockedWeapons = state.unlockedWeapons ?? ['rifle']
          state.unlockedSlots = state.unlockedSlots ?? 1
          state.lastDailyClaimTime = state.lastDailyClaimTime ?? 0
          state.starterPackShown = state.starterPackShown ?? false
        }
        if (version < 4) {
          const state = persistedState as any
          state.battlesCompleted = state.battlesCompleted ?? {}
        }
        if (version < 5) {
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              injuredUntil: s.injuredUntil ?? undefined,
            }))
          }
        }
        if (version < 6) {
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              legacyBrains: s.trainedBrains ?? undefined,
              trainedBrains: undefined,
            }))
          }
        }
        if (version < 7) {
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              trained: false,
              trainedBrains: undefined,
              legacyBrains: undefined,
              weapon: 'rifle',
              fitnessScore: undefined,
              generationsTrained: undefined,
            }))
          }
          state.unlockedWeapons = ['rifle']
          state.battlesCompleted = {}
        }
        if (version < 8) {
          const state = persistedState as any
          state.gold = 600
          state.soldiers = []
          state.lastDailyGoldClaimTime = 0
          state.battlesCompleted = {}
          state.unlockedWeapons = ['rifle']
        }
        if (version < 9) {
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              xp: s.xp ?? 0,
            }))
          }
        }
        if (version < 10) {
          const state = persistedState as any
          state.tutorialCompleted = state.tutorialCompleted ?? true
        }
        if (version < 11) {
          const state = persistedState as any
          state.dailyStreak = 0
          state.lastDailyClaimDate = ''
        }
        if (version < 12) {
          // v11 → v12: Rename compute → tokens, remove gold entirely.
          // Convert remaining gold to bonus tokens at 4:1 ratio.
          const state = persistedState as any
          state.tokens = (state.compute ?? 500) + Math.floor((state.gold ?? 0) / 4)
          delete state.compute
          delete state.gold
          delete state.lastDailyGoldClaimTime
          state.acknowledgedSlotUnlocks = []
        }
        return persistedState as CampState
      },
    },
  ),
)
