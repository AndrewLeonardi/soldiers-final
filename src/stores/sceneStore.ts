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
  setPendingPlacement: (pending: PendingPlacement | null) => void
  setBattlePhase: (phase: 'idle' | 'picking' | 'placing' | 'loading' | 'fighting' | 'result') => void
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

  // Weapon picker
  pendingPlacement: null,

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
  setPendingPlacement: (pending) => set({ pendingPlacement: pending }),
  setBattlePhase: (phase) => set({ battlePhase: phase }),
}))
