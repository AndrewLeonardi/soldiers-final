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
  recruitSoldier: () => boolean
  getSelectedSoldier: () => SoldierProfile
}

export const useRosterStore = create<RosterState>()(
  persist(
    (set, get) => ({
  soldiers: STARTER_ROSTER,
  selectedSoldierId: STARTER_ROSTER[0].id,
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

  recruitSoldier: () => {
    const gameStore = useGameStore.getState()
    if (!gameStore.spendGold(SOLDIER_RECRUIT_COST)) return false
    const id = `soldier-${Date.now()}`
    const name = randomSoldierName()
    const rank = name.split(' ')[0]
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
    return soldiers.find((s) => s.id === selectedSoldierId) ?? soldiers[0]
  },
    }),
    {
      name: 'toy-soldiers-roster',
      version: 1,
      partialize: (state) => ({
        soldiers: state.soldiers,
        selectedSoldierId: state.selectedSoldierId,
      }),
    }
  )
)
