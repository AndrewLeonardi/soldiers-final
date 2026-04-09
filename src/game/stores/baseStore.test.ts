/**
 * Unit tests for the base editor store — mutation surface + analytics.
 *
 * These tests cover the entire public API of `useBaseStore` (mode toggle,
 * brush lifecycle, building/wall placement, reset) AND assert that every
 * mutating action fires the correctly-shaped analytics event. Without
 * these assertions, a refactor could silently drop a `track()` call and
 * the only signal would be Phase 8 retention numbers going quiet.
 *
 * Storage strategy: we stub `localStorage` with an in-memory Map so the
 * store can persist without needing jsdom. Between tests we reset the
 * store to the starter layout and clear the mock so each case runs on a
 * clean slate.
 *
 * `track` is mocked at the module boundary so we can assert on call
 * shapes without polluting the dev ring buffer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock the analytics module BEFORE importing the store ─────────
//
// vitest hoists vi.mock to the top of the file, so the store's
// `import { track } from '@game/analytics/events'` picks up the mock.

vi.mock('@game/analytics/events', () => ({
  track: vi.fn(),
  readDevEventLog: vi.fn(() => []),
}))

// ── Stub localStorage (node environment has none) ───────────────
//
// Zustand's persist middleware would otherwise either throw or silently
// disable — neither is what we want. An in-memory Map is the smallest
// thing that satisfies the Storage interface for persist's needs.

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  get length(): number {
    return this.store.size
  }
}

vi.stubGlobal('localStorage', new MemoryStorage())

// ── Imports now safe ─────────────────────────────────────────────

import { track } from '@game/analytics/events'
import { useBaseStore } from './baseStore'

const TABLE_BOUNDS = { halfWidth: 8, halfDepth: 6 } as const

// Reference snapshot of the starter layout for resetting between tests.
// We read it lazily on first call so we don't baked-capture a mutated
// version if an earlier test corrupts state.
function freshStarterLayout() {
  return {
    buildings: [
      { id: 'vault-1', kind: 'vault' as const, position: [-5, 0, 0] as [number, number, number], rotation: 0 },
      { id: 'training-grounds-1', kind: 'trainingGrounds' as const, position: [0, 0, -1] as [number, number, number], rotation: 0 },
      { id: 'collector-1', kind: 'collector' as const, position: [4, 0, 2] as [number, number, number], rotation: 0 },
    ],
    walls: [],
  }
}

beforeEach(() => {
  // Wipe the store back to a known state between tests. We can't rely
  // on the starter layout persisting through mutation tests, so we
  // overwrite it directly via setState.
  useBaseStore.setState({
    layout: freshStarterLayout(),
    mode: 'view',
    brush: null,
  })
  vi.mocked(track).mockClear()
})

afterEach(() => {
  vi.mocked(track).mockClear()
})

// ── Mode ─────────────────────────────────────────────────────────

describe('useBaseStore — mode', () => {
  it('starts in view mode with no brush', () => {
    const s = useBaseStore.getState()
    expect(s.mode).toBe('view')
    expect(s.brush).toBeNull()
  })

  it('setMode("build") transitions to build mode and fires analytics', () => {
    useBaseStore.getState().setMode('build')
    expect(useBaseStore.getState().mode).toBe('build')
    expect(track).toHaveBeenCalledWith('base_mode_toggled', { to: 'build' })
  })

  it('setMode("view") while in build clears the brush', () => {
    useBaseStore.getState().setMode('build')
    useBaseStore.getState().selectWallBrush()
    expect(useBaseStore.getState().brush).not.toBeNull()
    useBaseStore.getState().setMode('view')
    expect(useBaseStore.getState().mode).toBe('view')
    expect(useBaseStore.getState().brush).toBeNull()
  })

  it('setMode is a no-op (and silent) when the mode is unchanged', () => {
    // Starts in view; calling setMode('view') should not fire analytics.
    useBaseStore.getState().setMode('view')
    expect(track).not.toHaveBeenCalled()
    // Flip to build, clear the mock, then setMode('build') again.
    useBaseStore.getState().setMode('build')
    vi.mocked(track).mockClear()
    useBaseStore.getState().setMode('build')
    expect(track).not.toHaveBeenCalled()
  })

  it('toggleMode flips view ↔ build and fires analytics each time', () => {
    useBaseStore.getState().toggleMode()
    expect(useBaseStore.getState().mode).toBe('build')
    useBaseStore.getState().toggleMode()
    expect(useBaseStore.getState().mode).toBe('view')
    expect(track).toHaveBeenCalledTimes(2)
    expect(track).toHaveBeenNthCalledWith(1, 'base_mode_toggled', { to: 'build' })
    expect(track).toHaveBeenNthCalledWith(2, 'base_mode_toggled', { to: 'view' })
  })
})

// ── Brush lifecycle ──────────────────────────────────────────────

describe('useBaseStore — brush', () => {
  it('selectBuildingBrush sets a building brush and fires analytics', () => {
    useBaseStore.getState().selectBuildingBrush('vault')
    const b = useBaseStore.getState().brush
    expect(b).toEqual({ kind: 'building', buildingKind: 'vault', rotation: 0 })
    expect(track).toHaveBeenCalledWith('base_brush_selected', { kind: 'vault' })
  })

  it('selecting the already-selected building brush clears it (toggle)', () => {
    useBaseStore.getState().selectBuildingBrush('vault')
    useBaseStore.getState().selectBuildingBrush('vault')
    expect(useBaseStore.getState().brush).toBeNull()
    expect(track).toHaveBeenNthCalledWith(2, 'base_brush_cleared', {})
  })

  it('selectWallBrush sets a wall brush', () => {
    useBaseStore.getState().selectWallBrush()
    expect(useBaseStore.getState().brush).toEqual({ kind: 'wall', rotation: 0 })
    expect(track).toHaveBeenCalledWith('base_brush_selected', { kind: 'wall' })
  })

  it('selecting the already-selected wall brush clears it', () => {
    useBaseStore.getState().selectWallBrush()
    useBaseStore.getState().selectWallBrush()
    expect(useBaseStore.getState().brush).toBeNull()
  })

  it('clearBrush nulls the brush and fires analytics', () => {
    useBaseStore.getState().selectBuildingBrush('collector')
    vi.mocked(track).mockClear()
    useBaseStore.getState().clearBrush()
    expect(useBaseStore.getState().brush).toBeNull()
    expect(track).toHaveBeenCalledWith('base_brush_cleared', {})
  })

  it('rotateBrush advances rotation by 90° and wraps at 360°', () => {
    useBaseStore.getState().selectWallBrush()
    const { rotateBrush } = useBaseStore.getState()
    const getRotation = () => {
      const b = useBaseStore.getState().brush
      return b === null ? null : b.rotation
    }
    expect(getRotation()).toBe(0)
    rotateBrush()
    expect(getRotation()).toBeCloseTo(Math.PI / 2)
    rotateBrush()
    expect(getRotation()).toBeCloseTo(Math.PI)
    rotateBrush()
    expect(getRotation()).toBeCloseTo((3 * Math.PI) / 2)
    rotateBrush()
    expect(getRotation()).toBeCloseTo(0) // wraps
  })

  it('rotateBrush is a no-op when no brush is selected', () => {
    vi.mocked(track).mockClear()
    useBaseStore.getState().rotateBrush()
    expect(useBaseStore.getState().brush).toBeNull()
    expect(track).not.toHaveBeenCalled()
  })
})

// ── Placement — building ─────────────────────────────────────────

describe('useBaseStore — placeBuilding', () => {
  beforeEach(() => {
    // Start from an empty layout so placement tests aren't fighting
    // the starter buildings.
    useBaseStore.setState({ layout: { buildings: [], walls: [] } })
  })

  it('places a building in an empty area and returns true', () => {
    const ok = useBaseStore
      .getState()
      .placeBuilding('vault', [2, 0, 2], 0, TABLE_BOUNDS)
    expect(ok).toBe(true)
    const buildings = useBaseStore.getState().layout.buildings
    expect(buildings).toHaveLength(1)
    expect(buildings[0]?.kind).toBe('vault')
    expect(buildings[0]?.position).toEqual([2, 0, 2])
    expect(track).toHaveBeenCalledWith('base_building_placed', { kind: 'vault', x: 2, z: 2 })
  })

  it('snaps positions to the 0.5 grid before committing', () => {
    const ok = useBaseStore
      .getState()
      .placeBuilding('vault', [2.23, 0, 2.77], 0, TABLE_BOUNDS)
    expect(ok).toBe(true)
    const b = useBaseStore.getState().layout.buildings[0]
    expect(b?.position[0]).toBe(2.0) // 2.23 → 2.0
    expect(b?.position[2]).toBe(3.0) // 2.77 → 3.0
  })

  it('rejects a building placed past the table edge and fires rejection analytics', () => {
    const ok = useBaseStore
      .getState()
      .placeBuilding('vault', [20, 0, 0], 0, TABLE_BOUNDS)
    expect(ok).toBe(false)
    expect(useBaseStore.getState().layout.buildings).toHaveLength(0)
    expect(track).toHaveBeenCalledWith('base_building_place_rejected', { kind: 'vault', x: 20, z: 0 })
  })

  it('rejects a building that overlaps an existing one', () => {
    // Place vault at origin.
    expect(
      useBaseStore.getState().placeBuilding('vault', [0, 0, 0], 0, TABLE_BOUNDS),
    ).toBe(true)
    // Try to place another vault in the same spot.
    expect(
      useBaseStore.getState().placeBuilding('vault', [0, 0, 0], 0, TABLE_BOUNDS),
    ).toBe(false)
    expect(useBaseStore.getState().layout.buildings).toHaveLength(1)
  })

  it('placement gives each building a unique id', () => {
    useBaseStore.getState().placeBuilding('vault', [-3, 0, 0], 0, TABLE_BOUNDS)
    useBaseStore.getState().placeBuilding('collector', [3, 0, 0], 0, TABLE_BOUNDS)
    const ids = useBaseStore.getState().layout.buildings.map((b) => b.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })
})

// ── Placement — wall ─────────────────────────────────────────────

describe('useBaseStore — placeWall', () => {
  beforeEach(() => {
    useBaseStore.setState({ layout: { buildings: [], walls: [] } })
  })

  it('places a wall in an empty area and returns true', () => {
    const ok = useBaseStore.getState().placeWall([3, 0, 3], 0, TABLE_BOUNDS)
    expect(ok).toBe(true)
    const walls = useBaseStore.getState().layout.walls
    expect(walls).toHaveLength(1)
    expect(walls[0]?.rotation).toBe(0)
    expect(track).toHaveBeenCalledWith('base_wall_placed', { x: 3, z: 3 })
  })

  it('rejects a wall past the table edge', () => {
    const ok = useBaseStore.getState().placeWall([20, 0, 0], 0, TABLE_BOUNDS)
    expect(ok).toBe(false)
    expect(useBaseStore.getState().layout.walls).toHaveLength(0)
    expect(track).toHaveBeenCalledWith('base_wall_place_rejected', { x: 20, z: 0 })
  })

  it('respects rotation — a wall that fits unrotated may not fit rotated near an obstacle', () => {
    // Place vault at (5, 0, 0).
    useBaseStore.getState().placeBuilding('vault', [5, 0, 0], 0, TABLE_BOUNDS)
    // An unrotated wall at (5, 0, 2) should clear the vault.
    expect(useBaseStore.getState().placeWall([5, 0, 2], 0, TABLE_BOUNDS)).toBe(true)
    // A 90°-rotated wall at the same spot (long axis along Z) will
    // extend toward the vault and overlap.
    useBaseStore.setState({ layout: { buildings: useBaseStore.getState().layout.buildings, walls: [] } })
    expect(
      useBaseStore.getState().placeWall([5, 0, 0.8], Math.PI / 2, TABLE_BOUNDS),
    ).toBe(false)
  })
})

// ── Reset ────────────────────────────────────────────────────────

describe('useBaseStore — resetToStarterLayout', () => {
  it('restores the 3-building starter layout and clears the brush', () => {
    useBaseStore.setState({
      layout: { buildings: [], walls: [{ id: 'w-rogue', position: [0, 0, 0], rotation: 0 }] },
      brush: { kind: 'wall', rotation: 0 },
    })
    useBaseStore.getState().resetToStarterLayout()
    const { layout, brush } = useBaseStore.getState()
    expect(brush).toBeNull()
    expect(layout.buildings).toHaveLength(3)
    expect(layout.walls).toHaveLength(0)
    const kinds = layout.buildings.map((b) => b.kind).sort()
    expect(kinds).toEqual(['collector', 'trainingGrounds', 'vault'])
    expect(track).toHaveBeenCalledWith('base_reset_to_starter', {})
  })
})
