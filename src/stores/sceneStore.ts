/**
 * sceneStore — ephemeral scene state (not persisted).
 *
 * Sprint 1, Subsystem 4. Transient state that resets on page reload:
 * selected soldier, hover state, UI panels open/closed.
 *
 * Zustand stores split by lifetime (V3 pattern):
 *   useCampStore  → persisted (economy, roster, settings)
 *   useSceneStore → ephemeral (selection, UI, transient)
 */
import { create } from 'zustand'
import type { SoldierRecord } from './campStore'
import type { WeaponType } from '@config/types'

export interface PendingPlacement {
  soldier: SoldierRecord
  position: [number, number, number]
}

interface SceneState {
  // Selection
  selectedSoldierId: string | null
  hoveredSoldierId: string | null

  // UI panels
  settingsOpen: boolean
  trainingSheetOpen: boolean
  storeSheetOpen: boolean
  rosterSheetOpen: boolean
  computeModalOpen: boolean
  medicalSheetOpen: boolean
  recruitSheetOpen: boolean

  // Soldier sheet
  soldierSheetId: string | null
  preselectedTrainingSoldierId: string | null

  // Training observation
  observingSlotIndex: number | null

  // Battle phase
  battlePhase: 'idle' | 'picking' | 'placing' | 'loading' | 'fighting' | 'result'

  // Weapon picker (pending placement for multi-brain soldiers)
  pendingPlacement: PendingPlacement | null

  // Firing range (weapon testing)
  firingRangeSoldierId: string | null
  firingRangeWeapon: WeaponType | null

  // Tutorial (ephemeral — resets on reload)
  tutorialActive: boolean
  tutorialStep: number

  // Armory
  armorySheetOpen: boolean
  armoryScrollToItem: string | null

  // Daily reward
  dailyRewardOpen: boolean

  // Actions
  selectSoldier: (id: string | null) => void
  hoverSoldier: (id: string | null) => void
  toggleSettings: () => void
  setSettingsOpen: (open: boolean) => void
  toggleTrainingSheet: () => void
  setTrainingSheetOpen: (open: boolean) => void
  setStoreSheetOpen: (open: boolean) => void
  setRosterSheetOpen: (open: boolean) => void
  setComputeModalOpen: (open: boolean) => void
  setMedicalSheetOpen: (open: boolean) => void
  setRecruitSheetOpen: (open: boolean) => void
  setSoldierSheetId: (id: string | null) => void
  setPreselectedTrainingSoldierId: (id: string | null) => void
  setObservingSlotIndex: (index: number | null) => void
  setFiringRange: (soldierId: string | null, weapon: WeaponType | null) => void
  setPendingPlacement: (pending: PendingPlacement | null) => void
  setTutorialStep: (step: number) => void
  startTutorial: () => void
  endTutorial: () => void
  setBattlePhase: (phase: 'idle' | 'picking' | 'placing' | 'loading' | 'fighting' | 'result') => void
  setArmorySheetOpen: (open: boolean) => void
  setArmoryScrollToItem: (id: string | null) => void
  setDailyRewardOpen: (open: boolean) => void
}

export const useSceneStore = create<SceneState>()((set) => ({
  // Selection
  selectedSoldierId: null,
  hoveredSoldierId: null,

  // UI panels
  settingsOpen: false,
  trainingSheetOpen: false,
  storeSheetOpen: false,
  rosterSheetOpen: false,
  computeModalOpen: false,
  medicalSheetOpen: false,
  recruitSheetOpen: false,

  // Soldier sheet
  soldierSheetId: null,
  preselectedTrainingSoldierId: null,

  // Training observation
  observingSlotIndex: null,

  // Battle phase
  battlePhase: 'idle' as const,

  // Firing range
  firingRangeSoldierId: null,
  firingRangeWeapon: null,

  // Weapon picker
  pendingPlacement: null,

  // Tutorial
  tutorialActive: false,
  tutorialStep: 0,

  // Armory
  armorySheetOpen: false,
  armoryScrollToItem: null,

  // Daily reward
  dailyRewardOpen: false,

  // Actions
  selectSoldier: (id) => set({ selectedSoldierId: id }),
  hoverSoldier: (id) => set({ hoveredSoldierId: id }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleTrainingSheet: () => set((s) => ({ trainingSheetOpen: !s.trainingSheetOpen })),
  setTrainingSheetOpen: (open) => set({ trainingSheetOpen: open }),
  setStoreSheetOpen: (open) => set({ storeSheetOpen: open }),
  setRosterSheetOpen: (open) => set({ rosterSheetOpen: open }),
  setComputeModalOpen: (open) => set({ computeModalOpen: open }),
  setMedicalSheetOpen: (open) => set({ medicalSheetOpen: open }),
  setRecruitSheetOpen: (open) => set({ recruitSheetOpen: open }),
  setSoldierSheetId: (id) => set({ soldierSheetId: id }),
  setPreselectedTrainingSoldierId: (id) => set({ preselectedTrainingSoldierId: id }),
  setObservingSlotIndex: (index) => set({ observingSlotIndex: index }),
  setFiringRange: (soldierId, weapon) => set({ firingRangeSoldierId: soldierId, firingRangeWeapon: weapon }),
  setPendingPlacement: (pending) => set({ pendingPlacement: pending }),
  setTutorialStep: (step) => set({ tutorialStep: step }),
  startTutorial: () => set({ tutorialActive: true, tutorialStep: 0 }),
  endTutorial: () => set({ tutorialActive: false, tutorialStep: 0 }),
  setBattlePhase: (phase) => set({ battlePhase: phase }),
  setArmorySheetOpen: (open) => set({ armorySheetOpen: open }),
  setArmoryScrollToItem: (id) => set({ armoryScrollToItem: id }),
  setDailyRewardOpen: (open) => set({ dailyRewardOpen: open }),
}))
