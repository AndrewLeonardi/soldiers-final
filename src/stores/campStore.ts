/**
 * campStore — the persisted game state for the base camp.
 *
 * Zustand store with versioned migration shim. Split by lifetime: this
 * store is persisted (localStorage + Sprint 3 Supabase write-through),
 * while useSceneStore (ephemeral) handles transient scene state.
 *
 * v14 (Production Sprint 2 — Economy Lock):
 *   - Retire daily streak: drop dailyStreak, lastDailyClaimDate,
 *     lastDailyClaimTime. Replace with single lastDailyClaimMs.
 *   - Add SoldierRecord.weaponManualsPurchased for per-soldier rare-weapon
 *     one-time fee tracking. Existing soldiers are grandfathered: any weapon
 *     they already have trainedBrains for counts as manual-paid.
 *   - Starter balance 500 → 200 for brand-new profiles (existing balances
 *     preserved in migration).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { WEAPON_UNLOCK_COST } from '@config/roster'
import { DAILY_GRANT, DAILY_COOLDOWN_MS } from '@config/store'
import type { WeaponType } from '@config/types'
import { queueSync } from '@api/sync'

/**
 * Opts bag for token-affecting mutations. The `reason` tag flows into the
 * sync seam (and later telemetry / server writes). Optional to keep existing
 * callsites working; new callsites should pass a reason.
 */
export interface MutationOpts {
  reason?: string
}

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
  /**
   * Weapons this soldier has paid the one-time training manual for.
   * Added in v14. See `WEAPON_MANUAL_COST` in `@config/roster`.
   * Existing soldiers are grandfathered: any weapon in `trainedBrains`
   * counts as manual-paid (no retroactive charge).
   */
  weaponManualsPurchased?: WeaponType[]

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

  // Daily (v14: flat grant every 24h, no streak)
  lastDailyClaimMs: number  // Unix ms, 0 = never claimed

  // Store flags (local-only UI memory, not server-synced)
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

  // Actions — economy (opts.reason tags the sync payload)
  setTokens: (value: number, opts?: MutationOpts) => void
  addTokens: (delta: number, opts?: MutationOpts) => void
  spendTokens: (amount: number, opts?: MutationOpts) => boolean

  // Actions — unlocks
  unlockWeapon: (weapon: WeaponType) => boolean
  unlockSlot: () => boolean

  // Actions — daily (v14: single flat grant action)
  claimDaily: () => { tokens: number } | null
  canClaimDaily: () => boolean
  msUntilNextDaily: () => number

  // Actions — recruitment
  recruitSoldier: (name: string) => boolean

  // Actions — roster
  addSoldier: (soldier: SoldierRecord) => void
  updateSoldier: (id: string, updates: Partial<SoldierRecord>) => void
  updateSoldierBrain: (id: string, weapon: string, weights: number[], fitness: number, generations: number) => void
  awardSoldierXP: (id: string, amount: number) => void
  /** Pay the one-time per-soldier weapon manual fee. v14. */
  grantWeaponManual: (soldierId: string, weapon: WeaponType) => void

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

// Training slot unlock costs (these are training-parallelism slots, not roster slots).
// Index is the slot number being unlocked (1 = free starter, 2 and 3 cost tokens).
// Exported so UI (TrainingSheet, SoldierSheet) can show the next cost without duplicating.
export const TRAINING_SLOT_UNLOCK_COSTS: readonly [number, number, number] = [0, 200, 500]

export const useCampStore = create<CampState>()(
  persist(
    (set, get) => ({
      // Economy — v14 starter: 200 tokens = 3.3 min of training. Combined
      // with tutorial reward (+100) and day-1 daily (+150), new players
      // land at ~435 tokens on their first real session.
      tokens: 200,

      // Global unlocks
      unlockedWeapons: ['rifle'],
      unlockedSlots: 1,

      // Daily (v14: single lastDailyClaimMs, 24h flat cooldown)
      lastDailyClaimMs: 0,

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
      // All three route through the sync seam so Sprint 3 can swap in a real
      // server write without touching callsites. `reason` defaults here are
      // fallbacks; callers should pass a specific reason when known.
      setTokens: (value, opts) => {
        set({ tokens: value })
        queueSync('tokens', value, { reason: opts?.reason ?? 'set' })
      },
      addTokens: (delta, opts) => {
        const next = get().tokens + delta
        set({ tokens: next })
        queueSync('tokens', next, { reason: opts?.reason ?? (delta >= 0 ? 'add' : 'spend') })
      },
      spendTokens: (amount, opts) => {
        const state = get()
        if (state.tokens < amount) return false
        const next = state.tokens - amount
        set({ tokens: next })
        queueSync('tokens', next, { reason: opts?.reason ?? 'spend' })
        return true
      },

      // ── Unlock actions ──
      unlockWeapon: (weapon) => {
        const state = get()
        if (state.unlockedWeapons.includes(weapon)) return true // already unlocked
        const cost = WEAPON_UNLOCK_COST[weapon]
        if (state.tokens < cost) return false
        const nextTokens = state.tokens - cost
        const nextWeapons = [...state.unlockedWeapons, weapon]
        set({ tokens: nextTokens, unlockedWeapons: nextWeapons })
        queueSync('tokens', nextTokens, { reason: 'weapon-unlock' })
        queueSync('unlockedWeapons', nextWeapons, { reason: 'weapon-unlock' })
        return true
      },

      unlockSlot: () => {
        const state = get()
        const nextSlot = state.unlockedSlots + 1
        const cost = TRAINING_SLOT_UNLOCK_COSTS[nextSlot] ?? 0
        if (!cost) return false // already at max (3)
        if (state.tokens < cost) return false
        const nextTokens = state.tokens - cost
        set({ tokens: nextTokens, unlockedSlots: nextSlot })
        queueSync('tokens', nextTokens, { reason: 'slot-unlock' })
        queueSync('unlockedSlots', nextSlot, { reason: 'slot-unlock' })
        return true
      },

      // ── Daily (v14: flat grant, 24h cooldown, no streak) ──
      claimDaily: () => {
        const state = get()
        const now = Date.now()
        if (now - state.lastDailyClaimMs < DAILY_COOLDOWN_MS) return null

        const nextTokens = state.tokens + DAILY_GRANT
        set({ tokens: nextTokens, lastDailyClaimMs: now })
        queueSync('tokens', nextTokens, { reason: 'daily-claim' })
        queueSync('dailyClaim', now, { reason: 'daily-claim' })
        return { tokens: DAILY_GRANT }
      },

      canClaimDaily: () => {
        return Date.now() - get().lastDailyClaimMs >= DAILY_COOLDOWN_MS
      },

      msUntilNextDaily: () => {
        const remaining = DAILY_COOLDOWN_MS - (Date.now() - get().lastDailyClaimMs)
        return Math.max(0, remaining)
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
          weaponManualsPurchased: [],
        }
        const nextSoldiers = [...state.soldiers, newSoldier]
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'recruit' })
        return true
      },

      // ── Roster actions ──
      addSoldier: (soldier) => {
        const nextSoldiers = [...get().soldiers, soldier]
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'add-soldier' })
      },

      updateSoldier: (id, updates) => {
        const nextSoldiers = get().soldiers.map(sol =>
          sol.id === id ? { ...sol, ...updates } : sol,
        )
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'update-soldier' })
      },

      /** Write trained brain weights for a specific weapon. Also sets equipped weapon. */
      updateSoldierBrain: (id, weapon, weights, fitness, generations) => {
        const nextSoldiers = get().soldiers.map(sol => {
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
        })
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'training-graduate' })
      },

      awardSoldierXP: (id, amount) => {
        const nextSoldiers = get().soldiers.map(sol =>
          sol.id === id ? { ...sol, xp: Math.min(99999, (sol.xp ?? 0) + amount) } : sol,
        )
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'xp-award' })
      },

      /**
       * Mark a weapon manual as purchased for a soldier. Idempotent — if the
       * soldier already has this weapon in their manuals list, this is a
       * no-op. Callers should charge the fee separately via spendTokens; this
       * action only records the entitlement.
       */
      grantWeaponManual: (soldierId, weapon) => {
        const nextSoldiers = get().soldiers.map(sol => {
          if (sol.id !== soldierId) return sol
          const current = sol.weaponManualsPurchased ?? []
          if (current.includes(weapon)) return sol
          return { ...sol, weaponManualsPurchased: [...current, weapon] }
        })
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'weapon-manual' })
      },

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
        const nextBattles = { ...state.battlesCompleted, [battleId]: { stars: bestStars } }
        const nextTokens = state.tokens + tokenReward
        set({
          battlesCompleted: nextBattles,
          tokens: nextTokens,
          unlockedWeapons: weapons,
        })
        queueSync('tokens', nextTokens, { reason: 'battle-reward' })
        queueSync('battlesCompleted', nextBattles, { reason: 'battle-complete' })
        if (weapons !== state.unlockedWeapons) {
          queueSync('unlockedWeapons', weapons, { reason: 'battle-weapon-unlock' })
        }
      },

      // ── Injury / healing ──
      injureSoldier: (id) => {
        const nextSoldiers = get().soldiers.map(sol =>
          sol.id === id ? { ...sol, injuredUntil: Date.now() + HEAL_DURATION_MS } : sol,
        )
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'injure' })
      },

      healSoldier: (id) => {
        const nextSoldiers = get().soldiers.map(sol =>
          sol.id === id ? { ...sol, injuredUntil: undefined } : sol,
        )
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'heal' })
      },

      tickHealing: () => {
        const now = Date.now()
        const state = get()
        const needsHeal = state.soldiers.some(s => s.injuredUntil && s.injuredUntil <= now)
        if (!needsHeal) return
        const nextSoldiers = state.soldiers.map(sol =>
          sol.injuredUntil && sol.injuredUntil <= now
            ? { ...sol, injuredUntil: undefined }
            : sol,
        )
        set({ soldiers: nextSoldiers })
        queueSync('soldiers', nextSoldiers, { reason: 'heal-tick' })
      },

      // ── Settings ──
      setMuted: (muted) => {
        set({ muted })
        queueSync('muted', muted, { reason: 'settings' })
      },

      // ── Store flags (not server-synced — local-only UI memory) ──
      setStarterPackShown: () => set({ starterPackShown: true }),

      // ── Tutorial ──
      completeTutorial: () => {
        set({ tutorialCompleted: true })
        queueSync('tutorialCompleted', true, { reason: 'tutorial-complete' })
      },
    }),
    {
      name: 'toy-soldiers-camp',
      version: 14,
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
        if (version < 13) {
          // v12 → v13: No schema change. Sprint 1 safety landing pad.
          const state = persistedState as any
          state.acknowledgedSlotUnlocks = state.acknowledgedSlotUnlocks ?? []
        }
        if (version < 14) {
          // v13 → v14 (Production Sprint 2 — Economy Lock):
          //   - Retire streak state: drop dailyStreak + lastDailyClaimDate;
          //     converge onto lastDailyClaimMs (carry lastDailyClaimTime if
          //     present — it used the same epoch-ms semantics).
          //   - Grandfather per-soldier weapon manuals: any weapon the soldier
          //     has trained (has trainedBrains entry for) counts as manual-paid.
          //     This prevents retroactive charges on existing rosters.
          //   - Existing token balance is preserved (no retroactive drop to 200).
          const state = persistedState as any
          state.lastDailyClaimMs = state.lastDailyClaimMs ?? state.lastDailyClaimTime ?? 0
          delete state.lastDailyClaimTime
          delete state.lastDailyClaimDate
          delete state.dailyStreak
          if (Array.isArray(state.soldiers)) {
            state.soldiers = state.soldiers.map((s: any) => {
              const manuals: WeaponType[] = Array.isArray(s.weaponManualsPurchased)
                ? s.weaponManualsPurchased
                : []
              const trained = s.trainedBrains && typeof s.trainedBrains === 'object'
                ? Object.keys(s.trainedBrains) as WeaponType[]
                : []
              const merged = Array.from(new Set([...manuals, ...trained]))
              return { ...s, weaponManualsPurchased: merged }
            })
          }
        }
        return persistedState as CampState
      },
    },
  ),
)
