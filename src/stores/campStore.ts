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
import { WEAPON_UNLOCK_COST, SOLDIER_RECRUIT_COST } from '@config/roster'
import { DAILY_DRIP_AMOUNT, DAILY_GOLD_DRIP_AMOUNT, DAILY_DRIP_INTERVAL_MS, DAILY_DRIP_MAX_DAYS, DAILY_STREAK_REWARDS, DAILY_STREAK_FORGIVENESS } from '@config/store'
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

// ── State shape ──
interface CampState {
  // Economy
  compute: number
  gold: number

  // Global unlocks
  unlockedWeapons: string[]
  unlockedSlots: number   // 1 = free slot only, 2 = slot 2 unlocked, 3 = all

  // Daily drip (legacy)
  lastDailyClaimTime: number  // Unix ms, 0 = never claimed
  lastDailyGoldClaimTime: number  // Unix ms, 0 = never claimed

  // Daily streak (Sprint Economy)
  dailyStreak: number            // 0-7, current streak day (0 = never claimed)
  lastDailyClaimDate: string     // ISO date "2026-04-13", '' = never

  // Store flags
  starterPackShown: boolean

  // Roster
  soldiers: SoldierRecord[]

  // Battle progress
  battlesCompleted: Record<string, { stars: number }>

  // Settings
  muted: boolean

  // Tutorial
  tutorialCompleted: boolean

  // Actions — economy
  setCompute: (value: number) => void
  addCompute: (delta: number) => void
  spendCompute: (amount: number) => boolean
  setGold: (value: number) => void
  addGold: (delta: number) => void
  spendGold: (amount: number) => boolean

  // Actions — unlocks
  unlockWeapon: (weapon: WeaponType) => boolean
  unlockSlot: () => boolean

  // Actions — daily drip (legacy)
  claimDailyCompute: () => { claimed: number; backfillDays: number } | null
  claimDailyGold: () => { claimed: number; backfillDays: number } | null

  // Actions — daily streak (Sprint Economy)
  claimDailyReward: () => { compute: number; gold: number; streakDay: number } | null
  canClaimDaily: () => boolean

  // Actions — recruitment
  recruitSoldier: (name: string) => boolean

  // Actions — roster
  addSoldier: (soldier: SoldierRecord) => void
  updateSoldier: (id: string, updates: Partial<SoldierRecord>) => void
  updateSoldierBrain: (id: string, weapon: string, weights: number[], fitness: number, generations: number) => void
  awardSoldierXP: (id: string, amount: number) => void

  // Actions — battles
  completeBattle: (battleId: string, stars: number, reward: number, weaponReward?: string, goldReward?: number) => void

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

// Slot unlock costs
const SLOT_UNLOCK_COSTS: Record<number, number> = { 2: 200, 3: 500 }

export const useCampStore = create<CampState>()(
  persist(
    (set, get) => ({
      // Economy
      compute: 500,
      gold: 600,

      // Global unlocks
      unlockedWeapons: ['rifle'],
      unlockedSlots: 1,

      // Daily drip (legacy)
      lastDailyClaimTime: 0,
      lastDailyGoldClaimTime: 0,

      // Daily streak
      dailyStreak: 0,
      lastDailyClaimDate: '',

      // Store flags
      starterPackShown: false,

      // Roster
      soldiers: [],

      // Battle progress
      battlesCompleted: {},

      // Settings
      muted: false,

      // Tutorial
      tutorialCompleted: false,

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
      addGold: (delta) => set((s) => ({ gold: s.gold + delta })),
      spendGold: (amount) => {
        const state = get()
        if (state.gold < amount) return false
        set({ gold: state.gold - amount })
        return true
      },

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

      // ── Daily gold drip ──
      claimDailyGold: () => {
        const state = get()
        const now = Date.now()
        const last = state.lastDailyGoldClaimTime

        if (last === 0) {
          set({
            gold: state.gold + DAILY_GOLD_DRIP_AMOUNT,
            lastDailyGoldClaimTime: now,
          })
          return { claimed: DAILY_GOLD_DRIP_AMOUNT, backfillDays: 0 }
        }

        const elapsed = now - last
        if (elapsed < DAILY_DRIP_INTERVAL_MS) return null

        const daysMissed = Math.min(
          Math.floor(elapsed / DAILY_DRIP_INTERVAL_MS),
          DAILY_DRIP_MAX_DAYS,
        )
        const totalClaim = DAILY_GOLD_DRIP_AMOUNT * daysMissed
        set({
          gold: state.gold + totalClaim,
          lastDailyGoldClaimTime: now,
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
          compute: state.compute + reward.compute,
          gold: state.gold + reward.gold,
          dailyStreak: newStreak,
          lastDailyClaimDate: today,
        })

        return { compute: reward.compute, gold: reward.gold, streakDay: newStreak }
      },

      canClaimDaily: () => {
        const today = new Date().toISOString().split('T')[0]!
        return get().lastDailyClaimDate !== today
      },

      // ── Recruitment ──
      recruitSoldier: (name) => {
        const state = get()
        if (state.gold < SOLDIER_RECRUIT_COST) return false
        const newSoldier: SoldierRecord = {
          id: `soldier-${Date.now()}`,
          name,
          weapon: 'rifle',
          trained: false,
          xp: 0,
        }
        set({
          gold: state.gold - SOLDIER_RECRUIT_COST,
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

      // ── Battle progress ──
      completeBattle: (battleId, stars, reward, weaponReward, goldReward) => {
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
          compute: state.compute + reward,
          gold: state.gold + (goldReward ?? 0),
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
      version: 11,
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
        if (version < 5) {
          // v4 → v5: add injuredUntil to all soldiers
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              injuredUntil: s.injuredUntil ?? undefined,
            }))
          }
        }
        if (version < 6) {
          // v5 → v6: Sprint 7 topology change [old] → [10,12,6].
          // Wipe trainedBrains (incompatible weight count), archive as legacyBrains.
          // Keep trained:true so player knows soldier WAS trained.
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
          // v6 → v7: Weapon progression overhaul.
          // Soldiers start untrained — wipe all brains, reset weapon to rifle,
          // clear battle progress, reset weapon unlocks to rifle-only.
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
          // v7 → v8: Gold economy + recruitment.
          // Give existing players 600 starter gold (enough for 3 recruits).
          // Clear soldiers — they must now be recruited with gold.
          const state = persistedState as any
          state.gold = 600
          state.soldiers = []
          state.lastDailyGoldClaimTime = 0
          state.battlesCompleted = {}
          state.unlockedWeapons = ['rifle']
        }
        if (version < 9) {
          // v8 → v9: Soldier XP + rank system.
          // Add xp:0 to all existing soldiers.
          const state = persistedState as any
          if (state.soldiers) {
            state.soldiers = state.soldiers.map((s: any) => ({
              ...s,
              xp: s.xp ?? 0,
            }))
          }
        }
        if (version < 10) {
          // v9 → v10: Tutorial system.
          // Existing players have already played — skip tutorial.
          const state = persistedState as any
          state.tutorialCompleted = state.tutorialCompleted ?? true
        }
        if (version < 11) {
          // v10 → v11: Daily streak system (Sprint Economy).
          // Initialize streak fields. Old daily drip fields preserved but unused.
          const state = persistedState as any
          state.dailyStreak = 0
          state.lastDailyClaimDate = ''
        }
        return persistedState as CampState
      },
    },
  ),
)
