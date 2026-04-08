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
export type DefenseStyle = 'wall' | 'sandbag' | 'tower'

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
  for (let i = 0; i < 4; i++) {
    legIndices.push(specs.length)
    specs.push({
      position: legPositions[i],
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

function buildBlocks(style: DefenseStyle): BlockSpec[] {
  switch (style) {
    case 'wall': return buildWallBlocks()
    case 'sandbag': return buildSandbagBlocks()
    case 'tower': return buildTowerBlocks()
  }
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
  }
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
