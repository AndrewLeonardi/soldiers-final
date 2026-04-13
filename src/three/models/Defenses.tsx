/**
 * Unified destructible defenses — wall, sandbag mound, watchtower.
 *
 * All three share the same physics simulation: each defense is a collection
 * of "blocks" with per-block velocity, ground collision, support checking,
 * and cascade collapse. The only thing that differs is the initial layout
 * (positions, sizes, colors) and the support topology (row-based vs explicit).
 */
import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import {
  BLOCK_W, BLOCK_H, BLOCK_D, WALL_COLS, WALL_ROWS,
  BLOCK_GRAVITY, BLOCK_DAMPING, BLOCK_GROUND_BOUNCE_VY,
  BLOCK_GROUND_FRICTION, BLOCK_SETTLE_SPEED,
  ROW_COLLAPSE_THRESHOLD,
} from '@engine/physics/battlePhysics'
import { GROUP_WALL } from '@three/physics/collisionGroups'

// ── Block shared caches ──
const geoCache = new Map<string, THREE.BoxGeometry>()
const matCache = new Map<number, THREE.MeshStandardMaterial>()
function getBlockGeo(size: [number, number, number]): THREE.BoxGeometry {
  const key = `${size[0]}_${size[1]}_${size[2]}`
  let g = geoCache.get(key)
  if (!g) { g = new THREE.BoxGeometry(...size); geoCache.set(key, g) }
  return g
}
function getBlockMat(color: number): THREE.MeshStandardMaterial {
  let m = matCache.get(color)
  if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02 }); matCache.set(color, m) }
  return m
}

// ── Block runtime state ──
export interface WallBlock {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  alive: boolean
  settled: boolean
  homePos: THREE.Vector3
  row: number
  col: number
  size: [number, number, number]
  /** Indices of blocks that support this one. Empty = use row-based overlap check. */
  supportedBy: number[]
  /** If true, this block sits on the ground and never falls from integrity checks. */
  groundSupported: boolean
}

// ── Layout spec (what buildXBlocks returns) ──
interface BlockSpec {
  position: [number, number, number]
  size: [number, number, number]
  color: number
  row: number
  col: number
  supportedBy?: number[]
  groundSupported?: boolean
}

// ── Layout builders ──────────────────────────────────────
export type DefenseStyle =
  | 'wall' | 'sandbag' | 'tower' | 'barbedWire' // combat defenses
  | 'vault' | 'trainingGrounds' | 'collector'    // base buildings (Phase 1a+)

function buildWallBlocks(): BlockSpec[] {
  const specs: BlockSpec[] = []
  const color = 0x4a6b3a
  for (let row = 0; row < WALL_ROWS; row++) {
    for (let col = 0; col < WALL_COLS; col++) {
      const offsetX = row % 2 === 0 ? 0 : BLOCK_W * 0.5
      const x = col * BLOCK_W - (WALL_COLS * BLOCK_W) / 2 + BLOCK_W / 2 + offsetX
      const y = row * BLOCK_H + BLOCK_H / 2
      specs.push({
        position: [x, y, 0],
        size: [BLOCK_W, BLOCK_H, BLOCK_D],
        color,
        row,
        col,
        groundSupported: row === 0,
      })
    }
  }
  return specs
}

function buildSandbagBlocks(): BlockSpec[] {
  const specs: BlockSpec[] = []
  const color = 0xA89070
  const sbSize: [number, number, number] = [0.3, 0.14, 0.18]
  const sbSizeRot: [number, number, number] = [0.18, 0.14, 0.3]

  // Front row (5 bags, bottom)
  for (let i = 0; i < 5; i++) {
    specs.push({
      position: [(i - 2) * 0.32, 0.07, 0.3],
      size: sbSize, color, row: 0, col: i,
      groundSupported: true,
    })
  }
  // Second row (4 bags offset)
  for (let i = 0; i < 4; i++) {
    specs.push({
      position: [(i - 1.5) * 0.32, 0.21, 0.3],
      size: sbSize, color, row: 1, col: i,
    })
  }
  // Top row (3 bags)
  for (let i = 0; i < 3; i++) {
    specs.push({
      position: [(i - 1) * 0.32, 0.35, 0.3],
      size: sbSize, color, row: 2, col: i,
    })
  }
  // Side walls — 2 stacks of 2 bags, perpendicular
  for (const x of [-0.65, 0.65]) {
    const colIdx = x < 0 ? 10 : 11
    specs.push({
      position: [x, 0.07, 0],
      size: sbSizeRot, color, row: 0, col: colIdx,
      groundSupported: true,
    })
    specs.push({
      position: [x, 0.21, 0],
      size: sbSizeRot, color, row: 1, col: colIdx,
    })
  }
  return specs
}

function buildTowerBlocks(): BlockSpec[] {
  const specs: BlockSpec[] = []
  const legColor = 0x6b4226
  const platformColor = 0x6b4226
  const railColor = 0x3d6b4f

  // 4 legs — box approximations of cylinders, ground-supported
  const legPositions: [number, number, number][] = [
    [-0.4, 0.9, -0.4], [0.4, 0.9, -0.4], [-0.4, 0.9, 0.4], [0.4, 0.9, 0.4],
  ]
  const legIndices: number[] = []
  for (let i = 0; i < legPositions.length; i++) {
    const legPos = legPositions[i]
    if (!legPos) continue
    legIndices.push(specs.length)
    specs.push({
      position: legPos,
      size: [0.1, 1.8, 0.1],
      color: legColor,
      row: 0, col: i,
      groundSupported: true,
    })
  }
  // Platform — supported by ALL 4 legs
  const platformIndex = specs.length
  specs.push({
    position: [0, 1.85, 0],
    size: [1.1, 0.08, 1.1],
    color: platformColor,
    row: 1, col: 0,
    supportedBy: legIndices,
  })
  // 3 back/side railings
  specs.push({
    position: [0, 2.02, -0.52],
    size: [1.08, 0.32, 0.05],
    color: railColor,
    row: 2, col: 0,
    supportedBy: [platformIndex],
  })
  specs.push({
    position: [-0.52, 2.02, 0],
    size: [0.05, 0.32, 1.08],
    color: railColor,
    row: 2, col: 1,
    supportedBy: [platformIndex],
  })
  specs.push({
    position: [0.52, 2.02, 0],
    size: [0.05, 0.32, 1.08],
    color: railColor,
    row: 2, col: 2,
    supportedBy: [platformIndex],
  })
  // Front rail (lower)
  specs.push({
    position: [0, 1.96, 0.52],
    size: [1.08, 0.2, 0.05],
    color: railColor,
    row: 2, col: 3,
    supportedBy: [platformIndex],
  })
  return specs
}

// ── Base buildings (Phase 1a+) ──
// These three styles back the player's command base. They share the same
// destructible physics as walls/sandbags/towers — every base building can
// be torn apart block by block. Layouts are chunky toy-box quality and can
// be iterated as rivals start actually attacking them.

function buildVaultBlocks(): BlockSpec[] {
  // Chunky armored strongbox. Steel body with a brass lid.
  const specs: BlockSpec[] = []
  const bodyColor = 0x3a4550     // dark steel-blue
  const lidColor = 0x8B6914      // brass
  const size: [number, number, number] = [0.3, 0.3, 0.3]
  const cols = 4    // X
  const rows = 3    // Y (height)
  const depth = 3   // Z
  const totalW = cols * size[0]
  const totalD = depth * size[2]

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let d = 0; d < depth; d++) {
        const x = col * size[0] - totalW / 2 + size[0] / 2
        const y = row * size[1] + size[1] / 2
        const z = d * size[2] - totalD / 2 + size[2] / 2
        const isLid = row === rows - 1
        specs.push({
          position: [x, y, z],
          size,
          color: isLid ? lidColor : bodyColor,
          row,
          // Encode depth into col so row-collapse counting stays sensible
          // (unique (row, col) per block in this row).
          col: col * depth + d,
          groundSupported: row === 0,
        })
      }
    }
  }
  return specs
}

function buildTrainingGroundsBlocks(): BlockSpec[] {
  // Military training camp: entrance arch, three-sided sandbag perimeter,
  // two target post+board pairs at the back, and a corner flag pole.
  // The front face (x ≈ +0.8) is open — this is the shooting lane that
  // faces the parade strip where TrainingGroundsInterior places the trainee.
  //
  // Support topology:
  //   - All ground-level pieces are groundSupported (never fall from integrity).
  //   - Upper pieces (crossbeam, target boards, flag pennant) use explicit
  //     `supportedBy` so a rival shot that drops a post also drops what rests on it.
  const specs: BlockSpec[] = []
  const woodColor   = 0x5a3416   // dark walnut post/beam
  const sandbagColor = 0xA89070  // tan sandbag (matches existing sandbag defense)
  const targetRed   = 0xCC2222   // shooting-target red
  const flagGreen   = 0x4a7a2e   // olive-drab pennant

  // ── ENTRANCE ARCH (front face, x = +0.8, open shooting lane) ──────────
  const archL = specs.length
  specs.push({ position: [0.8, 0.55, -0.55], size: [0.12, 1.1, 0.12], color: woodColor,    row: 0, col: 0,  groundSupported: true })
  const archR = specs.length
  specs.push({ position: [0.8, 0.55,  0.55], size: [0.12, 1.1, 0.12], color: woodColor,    row: 0, col: 1,  groundSupported: true })
  // Horizontal crossbeam bridging the arch posts
  specs.push({ position: [0.8, 1.15,  0   ], size: [0.12, 0.10, 1.22], color: woodColor,   row: 1, col: 0,  supportedBy: [archL, archR] })

  // ── BACK SANDBAG WALL (x = −0.8, the back-stop) ───────────────────────
  // Bottom row: three bags spanning z = −0.35 → +0.35
  const sbW: [number, number, number] = [0.14, 0.17, 0.30]
  const b0 = specs.length
  specs.push({ position: [-0.8, 0.085, -0.35], size: sbW, color: sandbagColor, row: 0, col: 5,  groundSupported: true })
  const b1 = specs.length
  specs.push({ position: [-0.8, 0.085,  0.0 ], size: sbW, color: sandbagColor, row: 0, col: 6,  groundSupported: true })
  const b2 = specs.length
  specs.push({ position: [-0.8, 0.085,  0.35], size: sbW, color: sandbagColor, row: 0, col: 7,  groundSupported: true })
  // Second row: two offset bags
  const br0 = specs.length
  specs.push({ position: [-0.8, 0.255, -0.175], size: sbW, color: sandbagColor, row: 1, col: 5, supportedBy: [b0, b1] })
  const br1 = specs.length
  specs.push({ position: [-0.8, 0.255,  0.175], size: sbW, color: sandbagColor, row: 1, col: 6, supportedBy: [b1, b2] })
  // Top row: one cap bag
  specs.push({ position: [-0.8, 0.425,  0    ], size: sbW, color: sandbagColor, row: 2, col: 5, supportedBy: [br0, br1] })

  // ── LEFT SIDE SANDBAG WALL (z = −0.8) — four bags running x: −0.55 → +0.5 ─
  const sbS: [number, number, number] = [0.30, 0.17, 0.14]  // rotated bag
  specs.push({ position: [-0.55, 0.085, -0.8], size: sbS, color: sandbagColor, row: 0, col: 10, groundSupported: true })
  specs.push({ position: [-0.2,  0.085, -0.8], size: sbS, color: sandbagColor, row: 0, col: 11, groundSupported: true })
  specs.push({ position: [ 0.15, 0.085, -0.8], size: sbS, color: sandbagColor, row: 0, col: 12, groundSupported: true })
  specs.push({ position: [ 0.5,  0.085, -0.8], size: sbS, color: sandbagColor, row: 0, col: 13, groundSupported: true })

  // ── RIGHT SIDE SANDBAG WALL (z = +0.8) ────────────────────────────────
  specs.push({ position: [-0.55, 0.085,  0.8], size: sbS, color: sandbagColor, row: 0, col: 20, groundSupported: true })
  specs.push({ position: [-0.2,  0.085,  0.8], size: sbS, color: sandbagColor, row: 0, col: 21, groundSupported: true })
  specs.push({ position: [ 0.15, 0.085,  0.8], size: sbS, color: sandbagColor, row: 0, col: 22, groundSupported: true })
  specs.push({ position: [ 0.5,  0.085,  0.8], size: sbS, color: sandbagColor, row: 0, col: 23, groundSupported: true })

  // ── TARGET POSTS + BOARDS (inside camp, near back wall) ───────────────
  // Left target: post then flat red board mounted at eye height
  const tpL = specs.length
  specs.push({ position: [-0.25, 0.50, -0.35], size: [0.08, 1.0, 0.08], color: woodColor,  row: 0, col: 30, groundSupported: true })
  specs.push({ position: [-0.21, 0.97, -0.35], size: [0.04, 0.40, 0.40], color: targetRed, row: 1, col: 30, supportedBy: [tpL] })

  // Right target: same, mirrored in z
  const tpR = specs.length
  specs.push({ position: [-0.25, 0.50,  0.35], size: [0.08, 1.0, 0.08], color: woodColor,  row: 0, col: 31, groundSupported: true })
  specs.push({ position: [-0.21, 0.97,  0.35], size: [0.04, 0.40, 0.40], color: targetRed, row: 1, col: 31, supportedBy: [tpR] })

  // ── FLAG POLE + PENNANT (front-left corner for visual polish) ──────────
  const fpole = specs.length
  specs.push({ position: [0.6, 0.72, -0.65], size: [0.06, 1.44, 0.06],  color: woodColor,  row: 0, col: 40, groundSupported: true })
  specs.push({ position: [0.6, 1.32, -0.49], size: [0.05, 0.20, 0.28],  color: flagGreen,  row: 1, col: 40, supportedBy: [fpole] })

  return specs
}

function buildCollectorBlocks(): BlockSpec[] {
  // Small compute generator — a squat toy tank with a glowing pipe on top.
  const specs: BlockSpec[] = []
  const bodyColor = 0x3a5a6a     // compute blue-gray
  const accentColor = 0x4ADE80   // green (matches --green)
  const bodySize: [number, number, number] = [0.25, 0.25, 0.25]
  const cols = 3    // X
  const rows = 2    // Y
  const depth = 2   // Z
  const totalW = cols * bodySize[0]
  const totalD = depth * bodySize[2]

  const topRowFirstIdx = depth * cols // index of the first block in row 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let d = 0; d < depth; d++) {
        const x = col * bodySize[0] - totalW / 2 + bodySize[0] / 2
        const y = row * bodySize[1] + bodySize[1] / 2
        const z = d * bodySize[2] - totalD / 2 + bodySize[2] / 2
        specs.push({
          position: [x, y, z],
          size: bodySize,
          color: bodyColor,
          row,
          col: col * depth + d,
          groundSupported: row === 0,
        })
      }
    }
  }

  // ── Glowing pipe on top (row 2) ──
  // Supported by a center-top body block. If that block is destroyed, the
  // pipe drops.
  const pipeSupport = topRowFirstIdx + 1 * depth + 0 // row 1, col 1, d 0
  specs.push({
    position: [0, 0.6, 0],
    size: [0.1, 0.18, 0.1],
    color: accentColor,
    row: 2,
    col: 0,
    supportedBy: [pipeSupport],
  })
  specs.push({
    position: [0, 0.77, 0],
    size: [0.14, 0.06, 0.14],
    color: accentColor,
    row: 2,
    col: 1,
    supportedBy: [pipeSupport],
  })

  return specs
}

function buildBarbedWireBlocks(): BlockSpec[] {
  // Low coiled-wire obstacle — collapses sideways instead of crumbling down.
  // Two wooden posts with thin wire coils strung between them.
  const specs: BlockSpec[] = []
  const postColor = 0x5a3416   // dark walnut
  const wireColor = 0x888888   // steel grey

  // Two end posts — ground-supported
  const postL = specs.length
  specs.push({
    position: [-0.8, 0.2, 0], size: [0.08, 0.4, 0.08],
    color: postColor, row: 0, col: 0, groundSupported: true,
  })
  const postR = specs.length
  specs.push({
    position: [0.8, 0.2, 0], size: [0.08, 0.4, 0.08],
    color: postColor, row: 0, col: 1, groundSupported: true,
  })

  // Wire coils between posts — small thin boxes representing coiled wire
  // Staggered z-offsets to give a tangled look. All supported by both posts.
  const coilCount = 6
  for (let i = 0; i < coilCount; i++) {
    const t = (i / (coilCount - 1)) * 2 - 1 // -1 to 1
    const x = t * 0.65
    const zOff = (i % 2 === 0 ? 0.06 : -0.06)
    const yOff = 0.15 + (i % 3) * 0.04
    specs.push({
      position: [x, yOff, zOff],
      size: [0.22, 0.06, 0.12],
      color: wireColor,
      row: 1, col: i,
      supportedBy: [postL, postR],
    })
  }
  return specs
}

function buildBlocks(style: DefenseStyle): BlockSpec[] {
  switch (style) {
    case 'wall': return buildWallBlocks()
    case 'sandbag': return buildSandbagBlocks()
    case 'tower': return buildTowerBlocks()
    case 'vault': return buildVaultBlocks()
    case 'trainingGrounds': return buildTrainingGroundsBlocks()
    case 'collector': return buildCollectorBlocks()
    case 'barbedWire': return buildBarbedWireBlocks()
  }
}

/**
 * XZ-plane footprint half-extents for each destructible style, at 0° rotation.
 * Derived from the same data the static Rapier collider uses in
 * `getStaticCollider` below, but stripped to the 2D top-down footprint that
 * placement validation cares about.
 *
 * Consumers: `src/game/base/footprints.ts` for overlap checks and ghost
 * preview sizing. When a new DefenseStyle is added, add it here too — the
 * TypeScript `Record<DefenseStyle, ...>` type makes omissions a compile error.
 */
export const BUILDING_FOOTPRINTS: Record<DefenseStyle, { halfW: number; halfD: number }> = {
  wall: { halfW: (WALL_COLS * BLOCK_W) / 2, halfD: BLOCK_D / 2 + 0.1 },
  sandbag: { halfW: 0.9, halfD: 0.25 },
  tower: { halfW: 0.55, halfD: 0.55 },
  vault: { halfW: 0.6, halfD: 0.45 },
  trainingGrounds: { halfW: 0.95, halfD: 0.95 },
  collector: { halfW: 0.4, halfD: 0.25 },
  barbedWire: { halfW: 0.85, halfD: 0.15 },
}

// ── Static collider footprint per style ──
function getStaticCollider(style: DefenseStyle): { half: [number, number, number]; offset: [number, number, number] } {
  switch (style) {
    case 'wall': {
      const hw = (WALL_COLS * BLOCK_W) / 2
      const hh = (WALL_ROWS * BLOCK_H) / 2
      const hd = BLOCK_D / 2 + 0.1
      return { half: [hw, hh, hd], offset: [0, hh, 0] }
    }
    case 'sandbag':
      return { half: [0.9, 0.25, 0.25], offset: [0, 0.2, 0.15] }
    case 'tower':
      return { half: [0.55, 0.9, 0.55], offset: [0, 0.9, 0] }
    case 'vault':
      // Footprint: 4 × 0.3 wide, 3 × 0.3 tall, 3 × 0.3 deep → 1.2 × 0.9 × 0.9
      return { half: [0.6, 0.45, 0.45], offset: [0, 0.45, 0] }
    case 'trainingGrounds':
      // Footprint: 1.9 × 1.2 tall × 1.9 → half extents with a little inset
      return { half: [0.95, 0.6, 0.95], offset: [0, 0.6, 0] }
    case 'collector':
      // Footprint: 3 × 0.25 wide × 0.5 tall × 2 × 0.25 deep → 0.75 × 0.5 × 0.5
      return { half: [0.4, 0.25, 0.25], offset: [0, 0.25, 0] }
    case 'barbedWire':
      // Low obstacle: ~1.7 wide, ~0.4 tall, ~0.3 deep
      return { half: [0.85, 0.2, 0.15], offset: [0, 0.2, 0] }
  }
}

// ── Static display factory (no physics / R3F context needed) ─────
/**
 * Create a standalone THREE.Group of static meshes for display in the Armory.
 * Same geometry as the destructible version, but no physics, no useFrame.
 * Normalized to fit within roughly ±0.5 so it looks right in small Canvases.
 */
export function createDisplayDefense(style: DefenseStyle): THREE.Group {
  const specs = buildBlocks(style)
  const grp = new THREE.Group()

  // Compute bounding box to normalize scale + centering
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const s of specs) {
    minX = Math.min(minX, s.position[0] - s.size[0] / 2)
    maxX = Math.max(maxX, s.position[0] + s.size[0] / 2)
    minY = Math.min(minY, s.position[1] - s.size[1] / 2)
    maxY = Math.max(maxY, s.position[1] + s.size[1] / 2)
    minZ = Math.min(minZ, s.position[2] - s.size[2] / 2)
    maxZ = Math.max(maxZ, s.position[2] + s.size[2] / 2)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
  const displayScale = span > 0 ? 0.9 / span : 1

  for (const spec of specs) {
    const mesh = new THREE.Mesh(getBlockGeo(spec.size), getBlockMat(spec.color))
    mesh.position.set(
      (spec.position[0] - cx) * displayScale,
      (spec.position[1] - cy) * displayScale,
      (spec.position[2] - cz) * displayScale,
    )
    mesh.scale.setScalar(displayScale)
    mesh.castShadow = true
    grp.add(mesh)
  }
  return grp
}

// ── Unified DestructibleDefense ──────────────────────────
const FALL_VOID_Y = -8

interface DefenseProps {
  position: [number, number, number]
  rotation?: number
  style?: DefenseStyle
  wallBlocksRef?: React.MutableRefObject<Map<string, WallBlock[]>>
  wallId?: string
  tableBounds?: { halfWidth: number; halfDepth: number }
}

export function DestructibleDefense({
  position,
  rotation = 0,
  style = 'wall',
  wallBlocksRef,
  wallId,
  tableBounds,
}: DefenseProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const initialized = useRef(false)

  const blocks = useMemo(() => {
    const specs = buildBlocks(style)
    const arr: WallBlock[] = []
    for (const spec of specs) {
      const mesh = new THREE.Mesh(getBlockGeo(spec.size), getBlockMat(spec.color))
      mesh.position.set(...spec.position)
      mesh.castShadow = true
      mesh.receiveShadow = true
      arr.push({
        mesh,
        velocity: new THREE.Vector3(),
        alive: true,
        settled: true,
        homePos: new THREE.Vector3(...spec.position),
        row: spec.row,
        col: spec.col,
        size: spec.size,
        supportedBy: spec.supportedBy ?? [],
        groundSupported: spec.groundSupported ?? false,
      })
    }
    return arr
  }, [style])

  // Register blocks for collision detection
  useMemo(() => {
    if (wallBlocksRef?.current && wallId) {
      wallBlocksRef.current.set(wallId, blocks)
    }
  }, [blocks, wallId, wallBlocksRef])

  const integrityTimer = useRef(0)
  const pendingCollapses = useRef<{ row: number; delay: number }[]>([])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    if (groupRef.current && !initialized.current) {
      groupRef.current.position.set(...position)
      groupRef.current.rotation.y = rotation
      for (const b of blocks) groupRef.current.add(b.mesh)
      initialized.current = true
    }

    // Process pending cascade collapses with stagger delay
    for (let i = pendingCollapses.current.length - 1; i >= 0; i--) {
      const pc = pendingCollapses.current[i]
      if (!pc) continue
      pc.delay -= delta
      if (pc.delay <= 0) {
        for (const b of blocks) {
          if (b.row === pc.row && b.alive && b.settled && !b.groundSupported) {
            b.settled = false
            b.velocity.y = -0.8
            b.velocity.x += (Math.random() - 0.5) * 0.5
            b.velocity.z += (Math.random() - 0.5) * 0.3
          }
        }
        pendingCollapses.current.splice(i, 1)
      }
    }

    // ── Structural integrity ──
    integrityTimer.current += delta
    if (integrityTimer.current > 0.1) {
      integrityTimer.current = 0

      // Group blocks by row for row-based cascade check
      const rowGroups = new Map<number, WallBlock[]>()
      for (const b of blocks) {
        if (b.groundSupported) continue // never part of cascade triggering
        let list = rowGroups.get(b.row)
        if (!list) { list = []; rowGroups.set(b.row, list) }
        list.push(b)
      }

      for (const [row, rowBlocks] of rowGroups) {
        const aliveInRow = rowBlocks.filter(b => b.alive)
        if (aliveInRow.length === 0) continue

        // Row cascade: if too much of this row is gone, drop what's left
        const destroyedFrac = 1 - aliveInRow.length / rowBlocks.length
        if (destroyedFrac >= ROW_COLLAPSE_THRESHOLD && aliveInRow.some(b => b.settled)) {
          const alreadyPending = pendingCollapses.current.some(pc => pc.row === row)
          if (!alreadyPending) {
            pendingCollapses.current.push({ row, delay: 0.033 * row })
          }
          continue
        }

        // Per-block support check
        for (const block of aliveInRow) {
          if (!block.settled) continue

          // Explicit support: block falls if MORE THAN HALF of its explicit supports are dead
          if (block.supportedBy.length > 0) {
            const aliveSupports = block.supportedBy.filter(idx => blocks[idx]?.alive).length
            if (aliveSupports <= block.supportedBy.length / 2) {
              block.settled = false
              block.velocity.y = -0.8 - Math.random() * 0.5
              block.velocity.x += (Math.random() - 0.5) * 0.5
              block.velocity.z += (Math.random() - 0.5) * 0.3
            }
            continue
          }

          // Row-based support: need >40% overlap with blocks in row-1
          const belowRow = row - 1
          if (belowRow < 0) continue
          let totalSupport = 0
          const bx = block.mesh.position.x
          const blockW = block.size[0]
          for (const below of blocks) {
            if (below.row !== belowRow || !below.alive) continue
            const overlap = blockW - Math.abs(bx - below.mesh.position.x)
            if (overlap > blockW * 0.15) {
              totalSupport += overlap / blockW
            }
          }
          if (totalSupport < 0.4) {
            block.settled = false
            block.velocity.y = -0.8 - Math.random() * 0.5
            block.velocity.x += (Math.random() - 0.5) * 0.5
            block.velocity.z += (Math.random() - 0.5) * 0.3
          }
        }
      }
    }

    // ── Block physics ──
    const _wp = new THREE.Vector3()
    const isOverTable = (block: WallBlock): boolean => {
      if (!tableBounds) return true
      block.mesh.getWorldPosition(_wp)
      return Math.abs(_wp.x) <= tableBounds.halfWidth && Math.abs(_wp.z) <= tableBounds.halfDepth
    }

    for (const b of blocks) {
      if (!b.mesh.visible) continue
      const blockHalfH = b.size[1] / 2

      // Dead blocks animate as debris until they settle or fall off
      if (!b.alive) {
        const speed = b.velocity.length()
        if (b.mesh.position.y < FALL_VOID_Y) {
          b.mesh.visible = false
          continue
        }
        if (speed < BLOCK_SETTLE_SPEED && b.mesh.position.y <= blockHalfH + 0.01 && isOverTable(b)) {
          b.mesh.visible = false
          continue
        }
        b.velocity.y += BLOCK_GRAVITY * delta
        b.mesh.position.add(b.velocity.clone().multiplyScalar(delta))
        if (b.mesh.position.y < blockHalfH && isOverTable(b)) {
          b.mesh.position.y = blockHalfH
          b.velocity.y *= BLOCK_GROUND_BOUNCE_VY
          b.velocity.x *= BLOCK_GROUND_FRICTION
          b.velocity.z *= BLOCK_GROUND_FRICTION
          if (Math.abs(b.velocity.y) < 0.3) b.velocity.y = 0
        }
        if (speed > 0.5) {
          b.mesh.rotation.x += b.velocity.z * delta * 2
          b.mesh.rotation.z -= b.velocity.x * delta * 2
        }
        b.velocity.multiplyScalar(BLOCK_DAMPING)
        continue
      }

      // Alive blocks settle at home position
      const speed = b.velocity.length()
      if (speed < BLOCK_SETTLE_SPEED && b.mesh.position.y <= b.homePos.y + 0.01) {
        b.settled = true
        b.velocity.set(0, 0, 0)
        continue
      }

      if (b.mesh.position.y < FALL_VOID_Y) {
        b.alive = false
        b.mesh.visible = false
        continue
      }

      b.settled = false
      b.velocity.y += BLOCK_GRAVITY * delta
      b.mesh.position.add(b.velocity.clone().multiplyScalar(delta))

      if (b.mesh.position.y < blockHalfH && isOverTable(b)) {
        b.mesh.position.y = blockHalfH
        b.velocity.y *= BLOCK_GROUND_BOUNCE_VY
        b.velocity.x *= BLOCK_GROUND_FRICTION
        b.velocity.z *= BLOCK_GROUND_FRICTION
        if (Math.abs(b.velocity.y) < 0.3) b.velocity.y = 0
      }

      if (speed > 0.5) {
        b.mesh.rotation.x += b.velocity.z * delta * 2
        b.mesh.rotation.z -= b.velocity.x * delta * 2
      }

      b.velocity.multiplyScalar(BLOCK_DAMPING)
    }
  })

  // Remove the static collider once the defense is mostly destroyed
  const [intact, setIntact] = useState(true)
  const checkTimer = useRef(0)
  useFrame((_, rawDelta) => {
    checkTimer.current += Math.min(rawDelta, 0.05)
    if (checkTimer.current > 0.3) {
      checkTimer.current = 0
      const aliveCount = blocks.filter(b => b.alive).length
      if (aliveCount < blocks.length * 0.3 && intact) {
        setIntact(false)
      }
    }
  })

  const collider = getStaticCollider(style)

  return (
    <>
      <group ref={groupRef} />
      {intact && (
        <RigidBody
          type="fixed"
          position={[position[0] + collider.offset[0], position[1] + collider.offset[1], position[2] + collider.offset[2]]}
          rotation={[0, rotation, 0]}
          collisionGroups={GROUP_WALL}
          colliders={false}
        >
          <CuboidCollider args={collider.half} />
        </RigidBody>
      )}
    </>
  )
}

// ── Backwards-compatible wrappers (all destructible now) ─
export function WallDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="wall" />
}
export function SandbagDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="sandbag" />
}
export function WatchTower(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="tower" />
}

// ── Base building wrappers (Phase 1a+) ───────────────────
// Symmetry with the combat-defense wrappers above. Each base building gets
// its own named export so consumers in `src/game/buildings/*` can import a
// semantically-named component rather than dealing with a style string.
export function VaultDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="vault" />
}
export function TrainingGroundsDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="trainingGrounds" />
}
export function CollectorDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="collector" />
}
export function BarbedWireDefense(props: Omit<DefenseProps, 'style'>) {
  return <DestructibleDefense {...props} style="barbedWire" />
}
