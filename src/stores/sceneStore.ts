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
}))
