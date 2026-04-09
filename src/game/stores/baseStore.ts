/**
 * useBaseStore — persistent state for the player's command base.
 *
 * Owns both the persisted base layout (buildings + walls) and the
 * session-only edit mode (view/build mode + current brush selection).
 * Only `layout` is written to localStorage; mode and brush are always
 * reset to defaults on reload because no one wants to open the app in
 * BUILD mode with a half-selected brush.
 *
 * Follows the persist-migration template from `src/stores/gameStore.ts`:
 * version + migrate + partialize. First-time users get seeded with the
 * Phase 1a starter layout so the base feels populated before they build
 * anything of their own.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BuildingInstance, BuildingKind } from '@game/buildings/types'
import { isValidPlacement, snapToGrid } from '@game/base/footprints'
import { track } from '@game/analytics/events'

// ── Types ────────────────────────────────────────────────

export interface WallInstance {
  id: string
  position: [number, number, number]
  rotation: number
}

export interface BaseLayout {
  buildings: BuildingInstance[]
  walls: WallInstance[]
}

export type BuildMode = 'view' | 'build'

export type Brush =
  | { kind: 'building'; buildingKind: BuildingKind; rotation: number }
  | { kind: 'wall'; rotation: number }
  | null

interface BaseState {
  /** Persisted: the player's actual base layout. */
  layout: BaseLayout

  /** Session-only: editor mode. Always resets to 'view' on reload. */
  mode: BuildMode

  /** Session-only: what the player is about to place, if anything. */
  brush: Brush

  // Mode actions
  setMode: (mode: BuildMode) => void
  toggleMode: () => void

  // Brush actions
  selectBuildingBrush: (kind: BuildingKind) => void
  selectWallBrush: () => void
  clearBrush: () => void
  rotateBrush: () => void

  // Placement actions — return true on success, false if validation failed
  placeBuilding: (
    kind: BuildingKind,
    position: [number, number, number],
    rotation: number,
    tableBounds: { halfWidth: number; halfDepth: number },
  ) => boolean
  placeWall: (
    position: [number, number, number],
    rotation: number,
    tableBounds: { halfWidth: number; halfDepth: number },
  ) => boolean

  // Dev reset
  resetToStarterLayout: () => void
}

// ── Starter layout (seed for first-time users) ──────────

const STARTER_LAYOUT: BaseLayout = {
  buildings: [
    { id: 'vault-1', kind: 'vault', position: [-5, 0, 0], rotation: 0 },
    { id: 'training-grounds-1', kind: 'trainingGrounds', position: [0, 0, -1], rotation: 0 },
    { id: 'collector-1', kind: 'collector', position: [4, 0, 2], rotation: 0 },
  ],
  walls: [],
}

// ── ID generation ────────────────────────────────────────

let _nextBuildingSeq = 1
let _nextWallSeq = 1

function nextBuildingId(kind: BuildingKind): string {
  return `${kind}-${Date.now()}-${_nextBuildingSeq++}`
}

function nextWallId(): string {
  return `wall-${Date.now()}-${_nextWallSeq++}`
}

// ── Store ────────────────────────────────────────────────

export const useBaseStore = create<BaseState>()(
  persist(
    (set, get) => ({
      layout: STARTER_LAYOUT,
      mode: 'view',
      brush: null,

      setMode: (mode) => {
        // Leaving build mode always clears the brush so the player isn't
        // stuck with a phantom selection on return.
        if (mode === 'view') {
          set({ mode, brush: null })
        } else {
          set({ mode })
        }
        track('base_mode_toggled', { to: mode })
      },

      toggleMode: () => {
        const current = get().mode
        get().setMode(current === 'view' ? 'build' : 'view')
      },

      selectBuildingBrush: (kind) => {
        const current = get().brush
        // Tapping the already-selected brush clears it (toggle).
        if (current?.kind === 'building' && current.buildingKind === kind) {
          set({ brush: null })
          track('base_brush_cleared', {})
          return
        }
        set({ brush: { kind: 'building', buildingKind: kind, rotation: 0 } })
        track('base_brush_selected', { kind })
      },

      selectWallBrush: () => {
        const current = get().brush
        if (current?.kind === 'wall') {
          set({ brush: null })
          track('base_brush_cleared', {})
          return
        }
        set({ brush: { kind: 'wall', rotation: 0 } })
        track('base_brush_selected', { kind: 'wall' })
      },

      clearBrush: () => {
        set({ brush: null })
        track('base_brush_cleared', {})
      },

      rotateBrush: () => {
        const b = get().brush
        if (!b) return
        const nextRotation = (b.rotation + Math.PI / 2) % (Math.PI * 2)
        set({ brush: { ...b, rotation: nextRotation } })
        track('base_brush_rotated', { rotation: nextRotation })
      },

      placeBuilding: (kind, position, rotation, tableBounds) => {
        const snapped = snapToGrid(position)
        const { layout } = get()
        const brush: Brush = { kind: 'building', buildingKind: kind, rotation }
        if (!isValidPlacement(brush, snapped, rotation, layout, tableBounds)) {
          track('base_building_place_rejected', { kind, x: snapped[0], z: snapped[2] })
          return false
        }
        const newBuilding: BuildingInstance = {
          id: nextBuildingId(kind),
          kind,
          position: snapped,
          rotation,
        }
        set({
          layout: {
            ...layout,
            buildings: [...layout.buildings, newBuilding],
          },
        })
        track('base_building_placed', { kind, x: snapped[0], z: snapped[2] })
        return true
      },

      placeWall: (position, rotation, tableBounds) => {
        const snapped = snapToGrid(position)
        const { layout } = get()
        const brush: Brush = { kind: 'wall', rotation }
        if (!isValidPlacement(brush, snapped, rotation, layout, tableBounds)) {
          track('base_wall_place_rejected', { x: snapped[0], z: snapped[2] })
          return false
        }
        const newWall: WallInstance = {
          id: nextWallId(),
          position: snapped,
          rotation,
        }
        set({
          layout: {
            ...layout,
            walls: [...layout.walls, newWall],
          },
        })
        track('base_wall_placed', { x: snapped[0], z: snapped[2] })
        return true
      },

      resetToStarterLayout: () => {
        set({ layout: STARTER_LAYOUT, brush: null })
        track('base_reset_to_starter', {})
      },
    }),
    {
      name: 'toy-soldiers-base',
      version: 1,
      partialize: (state) => ({ layout: state.layout }),
      migrate: (persisted, version) => {
        // First-time users or pre-v1 data get the starter layout.
        if (version < 1 || !persisted) {
          return { layout: STARTER_LAYOUT }
        }
        return persisted as { layout: BaseLayout }
      },
    },
  ),
)
