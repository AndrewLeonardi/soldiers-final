/**
 * Unit tests for the pure placement-validation math.
 *
 * This module is the single source of truth for "can this building land
 * here?" — both the store's commit path and the ghost preview's coloring
 * call `isValidPlacement`. If the rotation swap is off by a radian, or
 * the AABB overlap drifts, the player will see a green ghost that fails
 * on tap. These tests exist to catch that before it reaches the game.
 */
import { describe, expect, it } from 'vitest'
import type { BaseLayout, Brush } from '@game/stores/baseStore'
import {
  aabbOverlap,
  getBuildingFootprint,
  getWallFootprint,
  isValidPlacement,
  snapToGrid,
  withinTableBounds,
  type FootprintAABB,
} from './footprints'

const TABLE_BOUNDS = { halfWidth: 8, halfDepth: 6 } as const

const EMPTY_LAYOUT: BaseLayout = { buildings: [], walls: [] }

// ── snapToGrid ──────────────────────────────────────────

describe('snapToGrid', () => {
  it('snaps to the nearest 0.5 unit in X and Z', () => {
    expect(snapToGrid([1.23, 0, 4.77])).toEqual([1.0, 0, 5.0])
    expect(snapToGrid([1.25, 0, 1.25])).toEqual([1.5, 0, 1.5])
    // JS `Math.round(-0.2)` returns the signed-zero `-0`, so we assert
    // each axis with `toBeCloseTo` which treats -0 and +0 as equal.
    const neg = snapToGrid([-2.74, 0, -0.1])
    expect(neg[0]).toBe(-2.5)
    expect(neg[1]).toBe(0)
    expect(neg[2]).toBeCloseTo(0)
  })

  it('always returns Y = 0 regardless of input', () => {
    expect(snapToGrid([0, 99, 0])[1]).toBe(0)
    expect(snapToGrid([5, -3.7, 5])[1]).toBe(0)
  })

  it('is idempotent — snapping twice gives the same result', () => {
    const once = snapToGrid([2.34, 1.5, -0.88])
    const twice = snapToGrid(once)
    expect(twice).toEqual(once)
  })
})

// ── aabbOverlap ─────────────────────────────────────────

describe('aabbOverlap', () => {
  const box = (cx: number, cz: number, halfW: number, halfD: number): FootprintAABB => ({
    cx, cz, halfW, halfD,
  })

  it('detects a clear overlap', () => {
    expect(aabbOverlap(box(0, 0, 1, 1), box(0.5, 0.5, 1, 1))).toBe(true)
  })

  it('detects no overlap for well-separated boxes', () => {
    expect(aabbOverlap(box(0, 0, 1, 1), box(5, 5, 1, 1))).toBe(false)
  })

  it('edge-touching does not count as overlap (strict inequality)', () => {
    // Two unit boxes touching at x = 2 — edges coincide, interiors do not
    expect(aabbOverlap(box(0, 0, 1, 1), box(2, 0, 1, 1))).toBe(false)
  })

  it('detects overlap along only the X axis', () => {
    expect(aabbOverlap(box(0, 0, 2, 0.5), box(1, 0, 2, 0.5))).toBe(true)
  })

  it('detects overlap along only the Z axis', () => {
    expect(aabbOverlap(box(0, 0, 0.5, 2), box(0, 1, 0.5, 2))).toBe(true)
  })

  it('non-overlap along Z short-circuits even when X overlaps', () => {
    expect(aabbOverlap(box(0, 0, 2, 0.5), box(0, 5, 2, 0.5))).toBe(false)
  })
})

// ── getBuildingFootprint rotation ──────────────────────

describe('getBuildingFootprint rotation', () => {
  // Training Grounds has an asymmetric wide footprint: halfW=0.95, halfD=0.95
  // (actually square) — so we test vault instead which is 0.6 × 0.45.
  it('returns unrotated extents at 0 radians', () => {
    const fp = getBuildingFootprint('vault', [0, 0, 0], 0)
    expect(fp.halfW).toBeCloseTo(0.6)
    expect(fp.halfD).toBeCloseTo(0.45)
  })

  it('swaps halfW and halfD at 90 degrees (π/2)', () => {
    const fp = getBuildingFootprint('vault', [0, 0, 0], Math.PI / 2)
    expect(fp.halfW).toBeCloseTo(0.45)
    expect(fp.halfD).toBeCloseTo(0.6)
  })

  it('preserves extents at 180 degrees (π)', () => {
    const fp = getBuildingFootprint('vault', [0, 0, 0], Math.PI)
    expect(fp.halfW).toBeCloseTo(0.6)
    expect(fp.halfD).toBeCloseTo(0.45)
  })

  it('swaps extents at 270 degrees (3π/2)', () => {
    const fp = getBuildingFootprint('vault', [0, 0, 0], (3 * Math.PI) / 2)
    expect(fp.halfW).toBeCloseTo(0.45)
    expect(fp.halfD).toBeCloseTo(0.6)
  })

  it('handles negative rotation by normalizing', () => {
    // -π/2 should behave like 3π/2 → swapped extents
    const fp = getBuildingFootprint('vault', [0, 0, 0], -Math.PI / 2)
    expect(fp.halfW).toBeCloseTo(0.45)
    expect(fp.halfD).toBeCloseTo(0.6)
  })

  it('handles rotation > 2π by normalizing', () => {
    // 2π + π/2 should behave like π/2 → swapped
    const fp = getBuildingFootprint('vault', [0, 0, 0], 2 * Math.PI + Math.PI / 2)
    expect(fp.halfW).toBeCloseTo(0.45)
    expect(fp.halfD).toBeCloseTo(0.6)
  })

  it('places footprint center at the XZ of the position argument', () => {
    const fp = getBuildingFootprint('vault', [3.5, 0, -2.25], 0)
    expect(fp.cx).toBe(3.5)
    expect(fp.cz).toBe(-2.25)
  })
})

// ── getWallFootprint ────────────────────────────────────

describe('getWallFootprint rotation', () => {
  it('is long along X and narrow along Z at 0 radians', () => {
    const fp = getWallFootprint([0, 0, 0], 0)
    // Walls are wide (WALL_COLS * BLOCK_W / 2) and thin on Z
    expect(fp.halfW).toBeGreaterThan(fp.halfD)
  })

  it('swaps to long along Z and narrow along X at 90 degrees', () => {
    const fp = getWallFootprint([0, 0, 0], Math.PI / 2)
    expect(fp.halfD).toBeGreaterThan(fp.halfW)
  })
})

// ── withinTableBounds ──────────────────────────────────

describe('withinTableBounds', () => {
  const fp = (cx: number, cz: number): FootprintAABB => ({
    cx, cz, halfW: 0.5, halfD: 0.5,
  })

  it('accepts a footprint well inside the table', () => {
    expect(withinTableBounds(fp(0, 0), TABLE_BOUNDS, 0.3)).toBe(true)
  })

  it('rejects a footprint past the X edge', () => {
    // Table halfWidth = 8, inset = 0.3, halfW = 0.5 → max |cx| = 7.2
    expect(withinTableBounds(fp(7.5, 0), TABLE_BOUNDS, 0.3)).toBe(false)
  })

  it('rejects a footprint past the Z edge', () => {
    // Table halfDepth = 6, inset = 0.3, halfD = 0.5 → max |cz| = 5.2
    expect(withinTableBounds(fp(0, 5.5), TABLE_BOUNDS, 0.3)).toBe(false)
  })

  it('accepts a footprint exactly at the max', () => {
    expect(withinTableBounds(fp(7.2, 0), TABLE_BOUNDS, 0.3)).toBe(true)
  })

  it('rejects a footprint past the negative edge', () => {
    expect(withinTableBounds(fp(-7.5, 0), TABLE_BOUNDS, 0.3)).toBe(false)
  })

  it('bigger insetMargin shrinks the valid area', () => {
    // With inset 1.0, max |cx| = 8 - 1 - 0.5 = 6.5
    expect(withinTableBounds(fp(6.8, 0), TABLE_BOUNDS, 1.0)).toBe(false)
    expect(withinTableBounds(fp(6.4, 0), TABLE_BOUNDS, 1.0)).toBe(true)
  })
})

// ── isValidPlacement ───────────────────────────────────

describe('isValidPlacement', () => {
  const wallBrush: Brush = { kind: 'wall', rotation: 0 }
  const vaultBrush: Brush = { kind: 'building', buildingKind: 'vault', rotation: 0 }

  it('rejects null brush', () => {
    expect(isValidPlacement(null, [0, 0, 0], 0, EMPTY_LAYOUT, TABLE_BOUNDS)).toBe(false)
  })

  it('accepts a wall in the center of an empty base', () => {
    expect(isValidPlacement(wallBrush, [0, 0, 0], 0, EMPTY_LAYOUT, TABLE_BOUNDS)).toBe(true)
  })

  it('rejects a wall placed past the table edge', () => {
    expect(isValidPlacement(wallBrush, [20, 0, 0], 0, EMPTY_LAYOUT, TABLE_BOUNDS)).toBe(false)
  })

  it('rejects a building placed on top of an existing building', () => {
    const layout: BaseLayout = {
      buildings: [{ id: 'v1', kind: 'vault', position: [0, 0, 0], rotation: 0 }],
      walls: [],
    }
    expect(isValidPlacement(vaultBrush, [0, 0, 0], 0, layout, TABLE_BOUNDS)).toBe(false)
  })

  it('accepts a building placed well away from existing buildings', () => {
    const layout: BaseLayout = {
      buildings: [{ id: 'v1', kind: 'vault', position: [-5, 0, 0], rotation: 0 }],
      walls: [],
    }
    expect(isValidPlacement(vaultBrush, [5, 0, 0], 0, layout, TABLE_BOUNDS)).toBe(true)
  })

  it('rejects a wall that overlaps another wall', () => {
    const layout: BaseLayout = {
      buildings: [],
      walls: [{ id: 'w1', position: [0, 0, 0], rotation: 0 }],
    }
    // Two wall footprints at the same spot must overlap
    expect(isValidPlacement(wallBrush, [0, 0, 0], 0, layout, TABLE_BOUNDS)).toBe(false)
  })

  it('accepts a wall placed next to another wall but not overlapping', () => {
    const layout: BaseLayout = {
      buildings: [],
      walls: [{ id: 'w1', position: [0, 0, 0], rotation: 0 }],
    }
    // Walls have halfW ≈ 1.2, so a wall at (3, 0, 0) is cleanly separated
    expect(isValidPlacement(wallBrush, [3, 0, 0], 0, layout, TABLE_BOUNDS)).toBe(true)
  })

  it('rotation matters: a rotated wall overlaps where unrotated does not', () => {
    // Wall at origin, rotation 0 — long along X (halfW ≈ 1.2), thin along Z (halfD ≈ 0.175)
    const layout: BaseLayout = {
      buildings: [],
      walls: [{ id: 'w1', position: [0, 0, 0], rotation: 0 }],
    }
    // A second unrotated wall shifted by dz=0.5 is NOT overlapping
    // (combined halfD = 0.35, dz = 0.5 > 0.35 → no overlap)
    expect(isValidPlacement(wallBrush, [0, 0, 0.5], 0, layout, TABLE_BOUNDS)).toBe(true)
    // But a 90°-rotated wall at dz=0.5 IS overlapping
    // (rotated halfD = 1.2, dz = 0.5 < 1.2 + 0.175 → overlap)
    expect(isValidPlacement(wallBrush, [0, 0, 0.5], Math.PI / 2, layout, TABLE_BOUNDS)).toBe(false)
  })

  it('starter layout positions are all mutually valid', () => {
    // This mirrors the STARTER_LAYOUT in baseStore.ts — if these ever
    // overlap each other, the fresh-install experience is broken.
    const layout: BaseLayout = { buildings: [], walls: [] }
    expect(
      isValidPlacement(
        { kind: 'building', buildingKind: 'vault', rotation: 0 },
        [-5, 0, 0], 0, layout, TABLE_BOUNDS,
      ),
    ).toBe(true)
    const withVault: BaseLayout = {
      buildings: [{ id: 'v1', kind: 'vault', position: [-5, 0, 0], rotation: 0 }],
      walls: [],
    }
    expect(
      isValidPlacement(
        { kind: 'building', buildingKind: 'trainingGrounds', rotation: 0 },
        [0, 0, -1], 0, withVault, TABLE_BOUNDS,
      ),
    ).toBe(true)
    const withTwo: BaseLayout = {
      buildings: [
        { id: 'v1', kind: 'vault', position: [-5, 0, 0], rotation: 0 },
        { id: 't1', kind: 'trainingGrounds', position: [0, 0, -1], rotation: 0 },
      ],
      walls: [],
    }
    expect(
      isValidPlacement(
        { kind: 'building', buildingKind: 'collector', rotation: 0 },
        [4, 0, 2], 0, withTwo, TABLE_BOUNDS,
      ),
    ).toBe(true)
  })
})
