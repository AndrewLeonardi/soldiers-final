/**
 * Footprint math and placement validation for the base editor.
 *
 * Pure functions only — zero React, zero Three.js, zero Zustand.
 * This module is the single source of truth for "can this building land
 * here?" logic. Both the store's `placeBuilding`/`placeWall` actions and
 * the ghost preview's live coloring call `isValidPlacement` so the green
 * ghost and the successful commit always agree.
 *
 * Everything is XZ-plane only — we don't care about Y for overlap tests
 * because every buildable thing sits on the table at y=0.
 */
import { BUILDING_FOOTPRINTS } from '@three/models/Defenses'
import type { BuildingKind } from '@game/buildings/types'
import type { BaseLayout, Brush } from '@game/stores/baseStore'

export interface FootprintAABB {
  cx: number
  cz: number
  halfW: number
  halfD: number
}

/**
 * Apply a Y-axis rotation to a building's half-extents. At 0/180° the
 * dimensions are unchanged; at 90/270° the X and Z half-extents swap.
 * For the 90°-snapped rotations the editor uses, this is exact — no sin/cos
 * math needed. For any other angle we fall back to an axis-aligned bounding
 * box that contains the rotated rectangle (conservative — never allows
 * overlap, may reject slightly tight fits).
 */
function rotateHalfExtents(halfW: number, halfD: number, rotation: number): { halfW: number; halfD: number } {
  // Normalize to [0, 2π)
  const twoPi = Math.PI * 2
  let r = rotation % twoPi
  if (r < 0) r += twoPi
  const quarterTol = 0.01
  const isSwapped =
    Math.abs(r - Math.PI / 2) < quarterTol ||
    Math.abs(r - (3 * Math.PI) / 2) < quarterTol
  const isUnchanged =
    r < quarterTol ||
    Math.abs(r - Math.PI) < quarterTol ||
    Math.abs(r - twoPi) < quarterTol
  if (isSwapped) return { halfW: halfD, halfD: halfW }
  if (isUnchanged) return { halfW, halfD }
  // Fallback: conservative bounding AABB for arbitrary rotation.
  const cos = Math.abs(Math.cos(r))
  const sin = Math.abs(Math.sin(r))
  return {
    halfW: halfW * cos + halfD * sin,
    halfD: halfW * sin + halfD * cos,
  }
}

export function getBuildingFootprint(
  kind: BuildingKind,
  position: [number, number, number],
  rotation: number,
): FootprintAABB {
  const base = BUILDING_FOOTPRINTS[kind]
  const rotated = rotateHalfExtents(base.halfW, base.halfD, rotation)
  return {
    cx: position[0],
    cz: position[2],
    halfW: rotated.halfW,
    halfD: rotated.halfD,
  }
}

export function getWallFootprint(
  position: [number, number, number],
  rotation: number,
): FootprintAABB {
  const base = BUILDING_FOOTPRINTS.wall
  const rotated = rotateHalfExtents(base.halfW, base.halfD, rotation)
  return {
    cx: position[0],
    cz: position[2],
    halfW: rotated.halfW,
    halfD: rotated.halfD,
  }
}

/** Standard AABB overlap test. Touching edges do not count as overlap. */
export function aabbOverlap(a: FootprintAABB, b: FootprintAABB): boolean {
  const dx = Math.abs(a.cx - b.cx)
  const dz = Math.abs(a.cz - b.cz)
  return dx < a.halfW + b.halfW && dz < a.halfD + b.halfD
}

/**
 * Table-bounds check. `insetMargin` is how much the footprint must stay
 * away from the edge of the table (to account for border walls and visual
 * comfort).
 */
export function withinTableBounds(
  fp: FootprintAABB,
  tableBounds: { halfWidth: number; halfDepth: number },
  insetMargin: number,
): boolean {
  const maxX = tableBounds.halfWidth - insetMargin - fp.halfW
  const maxZ = tableBounds.halfDepth - insetMargin - fp.halfD
  return (
    fp.cx >= -maxX &&
    fp.cx <= maxX &&
    fp.cz >= -maxZ &&
    fp.cz <= maxZ
  )
}

/**
 * Snap a world position to the placement grid. 0.5 units in X and Z; Y is
 * always 0 for anything placed on the table.
 */
export function snapToGrid(position: [number, number, number]): [number, number, number] {
  return [
    Math.round(position[0] * 2) / 2,
    0,
    Math.round(position[2] * 2) / 2,
  ]
}

const TABLE_INSET = 0.3

/**
 * Full validation — called by both the store (before committing) and the
 * ghost preview (to decide green vs red). The two MUST use identical
 * logic or the player will see a green ghost that fails on tap.
 */
export function isValidPlacement(
  brush: Brush,
  position: [number, number, number],
  rotation: number,
  layout: BaseLayout,
  tableBounds: { halfWidth: number; halfDepth: number },
): boolean {
  if (brush === null) return false

  const fp =
    brush.kind === 'building'
      ? getBuildingFootprint(brush.buildingKind, position, rotation)
      : getWallFootprint(position, rotation)

  if (!withinTableBounds(fp, tableBounds, TABLE_INSET)) return false

  for (const b of layout.buildings) {
    if (aabbOverlap(fp, getBuildingFootprint(b.kind, b.position, b.rotation))) {
      return false
    }
  }
  for (const w of layout.walls) {
    if (aabbOverlap(fp, getWallFootprint(w.position, w.rotation))) {
      return false
    }
  }
  return true
}
