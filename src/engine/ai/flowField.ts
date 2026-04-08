/**
 * Flow Field Navigation — BFS-based pathfinding for enemy soldiers.
 *
 * 3-layer system:
 * 1. Cost field: each cell is passable (1) or blocked (255)
 * 2. Integration field: BFS from Intel, each cell = distance to Intel
 * 3. Flow field: each cell = direction vector toward Intel
 *
 * Enemies sample the flow field at their position to get movement direction.
 * Rebuilds when walls are destroyed (<1ms for our grid sizes).
 *
 * Cell size 0.5 units → Kitchen (16×12) = 32×24 = 768 cells.
 */

const BLOCKED = 255
const MAX_INTEGRATION = 65535

// ── Types ────────────────────────────────────────────────

export interface FlowField {
  /** Grid width in cells */
  width: number
  /** Grid height in cells */
  height: number
  /** World units per cell */
  cellSize: number
  /** World X of the grid origin (left edge) */
  originX: number
  /** World Z of the grid origin (top/front edge) */
  originZ: number
  /** Cost per cell: 1=passable, 255=blocked */
  cost: Uint8Array
  /** Integration field: distance from target (via BFS) */
  integration: Uint16Array
  /** Flow direction X per cell (normalized) */
  flowX: Float32Array
  /** Flow direction Z per cell (normalized) */
  flowZ: Float32Array
}

/** Obstacle definition for marking cells as blocked */
export interface FlowObstacle {
  /** Center position in world space */
  x: number
  z: number
  /** Half-extents (axis-aligned bounding box) */
  halfW: number
  halfD: number
  /** Rotation in radians (Y-axis) */
  rotation: number
}

// ── 4-directional BFS neighbors (cardinal only for clean paths) ──
const DIRS_4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

// ── 8-directional neighbors for flow computation ──
const DIRS_8: [number, number, number][] = [
  [-1, -1, 1.414], [-1, 0, 1], [-1, 1, 1.414],
  [0, -1, 1],                   [0, 1, 1],
  [1, -1, 1.414],  [1, 0, 1],  [1, 1, 1.414],
]

// ── Create ───────────────────────────────────────────────

/** Create an empty flow field for a given world size. */
export function createFlowField(
  worldSize: [number, number],
  cellSize = 0.5,
): FlowField {
  const width = Math.ceil(worldSize[0] / cellSize)
  const height = Math.ceil(worldSize[1] / cellSize)
  const total = width * height

  return {
    width,
    height,
    cellSize,
    originX: -worldSize[0] / 2,
    originZ: -worldSize[1] / 2,
    cost: new Uint8Array(total).fill(1), // all passable
    integration: new Uint16Array(total).fill(MAX_INTEGRATION),
    flowX: new Float32Array(total),
    flowZ: new Float32Array(total),
  }
}

// ── Coordinate helpers ───────────────────────────────────

/** World position → grid cell indices */
function worldToCell(field: FlowField, wx: number, wz: number): [number, number] {
  const col = Math.floor((wx - field.originX) / field.cellSize)
  const row = Math.floor((wz - field.originZ) / field.cellSize)
  return [col, row]
}

/** Grid cell → world center position */
function cellToWorld(field: FlowField, col: number, row: number): [number, number] {
  const wx = field.originX + (col + 0.5) * field.cellSize
  const wz = field.originZ + (row + 0.5) * field.cellSize
  return [wx, wz]
}

function inBounds(field: FlowField, col: number, row: number): boolean {
  return col >= 0 && col < field.width && row >= 0 && row < field.height
}

function idx(field: FlowField, col: number, row: number): number {
  return row * field.width + col
}

// ── Obstacle Marking ─────────────────────────────────────

/** Clear the cost field (all passable). */
export function clearCost(field: FlowField): void {
  field.cost.fill(1)
}

/** Mark a rectangular obstacle as blocked.
 *  Handles rotation by computing the rotated AABB. */
function markRect(
  field: FlowField,
  cx: number, cz: number,
  halfW: number, halfD: number,
  rotation: number,
): void {
  // For rotation, compute the bounding box of the rotated rectangle
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  // Four corners of the unrotated rectangle
  const corners = [
    [-halfW, -halfD], [halfW, -halfD],
    [halfW, halfD], [-halfW, halfD],
  ]

  let minX = Infinity, maxX = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  for (const [lx, lz] of corners) {
    const wx = cx + lx * cos - lz * sin
    const wz = cz + lx * sin + lz * cos
    minX = Math.min(minX, wx)
    maxX = Math.max(maxX, wx)
    minZ = Math.min(minZ, wz)
    maxZ = Math.max(maxZ, wz)
  }

  // Add a small buffer so soldiers don't graze edges
  const buffer = field.cellSize * 0.3
  minX -= buffer
  maxX += buffer
  minZ -= buffer
  maxZ += buffer

  // Mark all cells overlapping this AABB
  const [colMin, rowMin] = worldToCell(field, minX, minZ)
  const [colMax, rowMax] = worldToCell(field, maxX, maxZ)

  for (let r = Math.max(0, rowMin); r <= Math.min(field.height - 1, rowMax); r++) {
    for (let c = Math.max(0, colMin); c <= Math.min(field.width - 1, colMax); c++) {
      field.cost[idx(field, c, r)] = BLOCKED
    }
  }
}

/** Mark all obstacles as blocked cells in the cost field. */
export function markObstacles(field: FlowField, obstacles: FlowObstacle[]): void {
  for (const obs of obstacles) {
    markRect(field, obs.x, obs.z, obs.halfW, obs.halfD, obs.rotation)
  }
}

/** Mark border walls (closed edges) as blocked.
 *  Positions match WorldGround.tsx physics colliders (inset from world edge). */
export function markBorders(
  field: FlowField,
  worldSize: [number, number],
  edges: { side: string; open: boolean }[],
): void {
  const hw = worldSize[0] / 2
  const hd = worldSize[1] / 2
  // Border thickness matches the physics collider inset from world edge
  const wallThick = 0.15
  const halfThick = wallThick / 2

  for (const edge of edges) {
    if (edge.open) continue
    switch (edge.side) {
      case 'front':
        // Physics wall at z = -hd + halfThick, spans full width
        markRect(field, 0, -hd + halfThick, hw, halfThick + 0.1, 0)
        break
      case 'back':
        markRect(field, 0, hd - halfThick, hw, halfThick + 0.1, 0)
        break
      case 'left':
        markRect(field, -hw + halfThick, 0, halfThick + 0.1, hd, 0)
        break
      case 'right':
        markRect(field, hw - halfThick, 0, halfThick + 0.1, hd, 0)
        break
    }
  }
}

// ── Integration Field (BFS) ──────────────────────────────

/** Compute the integration field via BFS from a target world position.
 *  Each cell gets its "distance" to the target, accounting for blocked cells. */
export function computeIntegration(
  field: FlowField,
  targetX: number,
  targetZ: number,
): void {
  field.integration.fill(MAX_INTEGRATION)

  const [tc, tr] = worldToCell(field, targetX, targetZ)
  if (!inBounds(field, tc, tr)) return

  // BFS queue (flat array of col, row pairs for zero-alloc performance)
  const queue: number[] = []
  let head = 0

  const tIdx = idx(field, tc, tr)
  field.integration[tIdx] = 0
  queue.push(tc, tr)

  while (head < queue.length) {
    const cc = queue[head++]
    const cr = queue[head++]
    const cIdx = idx(field, cc, cr)
    const cCost = field.integration[cIdx]

    for (const [dc, dr] of DIRS_4) {
      const nc = cc + dc
      const nr = cr + dr
      if (!inBounds(field, nc, nr)) continue

      const nIdx = idx(field, nc, nr)
      if (field.cost[nIdx] === BLOCKED) continue

      const newCost = cCost + field.cost[nIdx]
      if (newCost < field.integration[nIdx]) {
        field.integration[nIdx] = newCost
        queue.push(nc, nr)
      }
    }
  }
}

// ── Flow Field (Direction Vectors) ───────────────────────

/** Compute flow direction for each cell by looking at 8 neighbors
 *  and pointing toward the one with the lowest integration value. */
export function computeFlow(field: FlowField): void {
  for (let r = 0; r < field.height; r++) {
    for (let c = 0; c < field.width; c++) {
      const i = idx(field, c, r)

      // Blocked or unreachable cells get zero vector
      if (field.cost[i] === BLOCKED || field.integration[i] === MAX_INTEGRATION) {
        field.flowX[i] = 0
        field.flowZ[i] = 0
        continue
      }

      let bestVal = field.integration[i]
      let bestWeight = 999
      let bestDx = 0
      let bestDz = 0

      for (const [dc, dr, weight] of DIRS_8) {
        const nc = c + dc
        const nr = r + dr
        if (!inBounds(field, nc, nr)) continue

        const nIdx = idx(field, nc, nr)
        const nVal = field.integration[nIdx]
        // Prefer lower integration values; break ties with cardinal dirs (weight=1 < diagonal=1.414)
        if (nVal < bestVal || (nVal === bestVal && weight < bestWeight)) {
          bestVal = nVal
          bestWeight = weight
          bestDx = dc
          bestDz = dr
        }
      }

      // Normalize
      const len = Math.sqrt(bestDx * bestDx + bestDz * bestDz)
      if (len > 0.01) {
        field.flowX[i] = bestDx / len
        field.flowZ[i] = bestDz / len
      } else {
        field.flowX[i] = 0
        field.flowZ[i] = 0
      }
    }
  }
}

// ── Query ────────────────────────────────────────────────

/** Sample the flow field at a world position.
 *  Returns a direction vector {x, z} pointing toward Intel.
 *  Uses bilinear interpolation for smooth movement between cells. */
export function getFlowDirection(
  field: FlowField,
  worldX: number,
  worldZ: number,
): { x: number; z: number } {
  // Convert to continuous cell coordinates
  const fcol = (worldX - field.originX) / field.cellSize - 0.5
  const frow = (worldZ - field.originZ) / field.cellSize - 0.5

  const c0 = Math.floor(fcol)
  const r0 = Math.floor(frow)
  const c1 = c0 + 1
  const r1 = r0 + 1

  const tx = fcol - c0
  const tz = frow - r0

  // Sample 4 corners (clamped to bounds)
  const sample = (c: number, r: number): [number, number] => {
    const cc = Math.max(0, Math.min(field.width - 1, c))
    const rr = Math.max(0, Math.min(field.height - 1, r))
    const i = idx(field, cc, rr)
    return [field.flowX[i], field.flowZ[i]]
  }

  const [x00, z00] = sample(c0, r0)
  const [x10, z10] = sample(c1, r0)
  const [x01, z01] = sample(c0, r1)
  const [x11, z11] = sample(c1, r1)

  // Bilinear interpolation
  const x = (x00 * (1 - tx) + x10 * tx) * (1 - tz) + (x01 * (1 - tx) + x11 * tx) * tz
  const z = (z00 * (1 - tx) + z10 * tx) * (1 - tz) + (z01 * (1 - tx) + z11 * tx) * tz

  // Normalize (interpolation can de-normalize)
  const len = Math.sqrt(x * x + z * z)
  if (len > 0.01) {
    return { x: x / len, z: z / len }
  }

  // Fallback: no flow at this position — head straight for Intel
  return { x: 0, z: 0 }
}

/** Check if a world position has a valid flow direction (reachable). */
export function hasFlow(field: FlowField, worldX: number, worldZ: number): boolean {
  const [c, r] = worldToCell(field, worldX, worldZ)
  if (!inBounds(field, c, r)) return false
  return field.integration[idx(field, c, r)] < MAX_INTEGRATION
}

// ── Convenience ──────────────────────────────────────────

/** Full rebuild: clear costs, mark obstacles + borders, compute integration + flow. */
export function rebuildField(
  field: FlowField,
  obstacles: FlowObstacle[],
  borders: { side: string; open: boolean }[],
  worldSize: [number, number],
  targetX: number,
  targetZ: number,
): void {
  clearCost(field)
  markObstacles(field, obstacles)
  markBorders(field, worldSize, borders)
  computeIntegration(field, targetX, targetZ)
  computeFlow(field)
}
