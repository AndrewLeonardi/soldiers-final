import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeaponType, SoldierProfile } from '@config/types'
import { STARTER_ROSTER, SOLDIER_RECRUIT_COST, WEAPON_UNLOCK_COST, randomSoldierName } from '@config/roster'
import { useGameStore } from './gameStore'

interface RosterState {
  soldiers: SoldierProfile[]
  selectedSoldierId: string
  detailSoldierId: string | null

  selectSoldier: (id: string) => void
  openDetail: (id: string) => void
  closeDetail: () => void
  equipWeapon: (soldierId: string, weapon: WeaponType) => void
  unlockWeapon: (soldierId: string, weapon: WeaponType) => boolean
  recruitSoldier: (chosenName?: string) => boolean
  getSelectedSoldier: () => SoldierProfile
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
  soldiers: STARTER_ROSTER,
  // STARTER_ROSTER is a non-empty constant (two soldiers seeded in
  // src/config/roster.ts). The `!` is safe and gates the strict
  // noUncheckedIndexedAccess check from the Phase 1b game tsconfig.
  selectedSoldierId: STARTER_ROSTER[0]!.id,
  detailSoldierId: null,

  selectSoldier: (id) => set({ selectedSoldierId: id }),

  openDetail: (id) => set({ detailSoldierId: id, selectedSoldierId: id }),

  closeDetail: () => set({ detailSoldierId: null }),

  equipWeapon: (soldierId, weapon) => set((s) => ({
    soldiers: s.soldiers.map((sol) => {
      if (sol.id !== soldierId) return sol
      if (!sol.unlockedWeapons.includes(weapon)) return sol
      return { ...sol, equippedWeapon: weapon }
    }),
  })),

  unlockWeapon: (soldierId, weapon) => {
    const cost = WEAPON_UNLOCK_COST[weapon]
    if (!useGameStore.getState().spendCompute(cost)) return false
    set((s) => ({
      soldiers: s.soldiers.map((sol) => {
        if (sol.id !== soldierId) return sol
        if (sol.unlockedWeapons.includes(weapon)) return sol
        return {
          ...sol,
          unlockedWeapons: [...sol.unlockedWeapons, weapon],
          equippedWeapon: weapon,
        }
      }),
    }))
    return true
  },

  recruitSoldier: (chosenName) => {
    const gameStore = useGameStore.getState()
    if (!gameStore.spendGold(SOLDIER_RECRUIT_COST)) return false
    const id = `soldier-${Date.now()}`
    const name = chosenName || randomSoldierName()
    // String.split always returns at least one element for any
    // non-empty input; `?? name` is defensive cover for the strict
    // noUncheckedIndexedAccess check.
    const rank = name.split(' ')[0] ?? name
    const newSoldier: SoldierProfile = {
      id,
      name,
      rank,
      equippedWeapon: 'rifle',
      unlockedWeapons: ['rifle'],
      starRating: 1,
      team: 'green',
      trainedBrains: {},
    }
    set((s) => ({
      soldiers: [...s.soldiers, newSoldier],
      selectedSoldierId: id,
    }))
    return true
  },

  getSelectedSoldier: () => {
    const { soldiers, selectedSoldierId } = get()
    // Soldiers is seeded with STARTER_ROSTER (always non-empty) and the
    // only path that removes soldiers is not wired up today. The `!` on
    // `soldiers[0]` satisfies strict noUncheckedIndexedAccess without
    // expanding the return type to include undefined.
    return soldiers.find((s) => s.id === selectedSoldierId) ?? soldiers[0]!
  },
    }),
    {
      name: 'toy-soldiers-roster',
      version: 1,
      partialize: (state) => ({
        soldiers: state.soldiers,
        selectedSoldierId: state.selectedSoldierId,
      }),
      // Re-seed the starter roster if persisted state is empty or
      // malformed. Without this guard, a stale localStorage blob
      // containing `{ soldiers: [] }` (from a previous session that
      // cleared the roster) would override the STARTER_ROSTER default
      // and leave every downstream consumer — including Phase 3a's
      // training store, which looks up PVT ACE by id — staring at an
      // empty soldier list.
      migrate: (persisted, _version) => {
        const maybe = persisted as { soldiers?: SoldierProfile[]; selectedSoldierId?: string } | undefined
        if (!maybe || !Array.isArray(maybe.soldiers) || maybe.soldiers.length === 0) {
          return {
            soldiers: STARTER_ROSTER,
            selectedSoldierId: STARTER_ROSTER[0]!.id,
          }
        }
        return {
          soldiers: maybe.soldiers,
          selectedSoldierId: maybe.selectedSoldierId ?? maybe.soldiers[0]!.id,
        }
      },
    }
  )
)
