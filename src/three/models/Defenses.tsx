import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import {
  BLOCK_W, BLOCK_H, BLOCK_D, WALL_COLS, WALL_ROWS,
  BLOCK_GRAVITY, BLOCK_DAMPING, BLOCK_GROUND_BOUNCE_VY,
  BLOCK_GROUND_FRICTION, BLOCK_SETTLE_SPEED, BLOCK_SUPPORT_OVERLAP,
  ROW_COLLAPSE_THRESHOLD,
} from '@engine/physics/battlePhysics'
import { GROUP_WALL } from '@three/physics/collisionGroups'

// ── Wall Segment (destructible brick grid — denser, punchier) ──
const blockGeo = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.35, metalness: 0.02 })

export interface WallBlock {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  alive: boolean
  settled: boolean
  homePos: THREE.Vector3
  row: number
  col: number
}

interface DefenseProps {
  position: [number, number, number]
  rotation?: number
}

interface WallProps extends DefenseProps {
  wallBlocksRef?: React.MutableRefObject<Map<string, WallBlock[]>>
  wallId?: string
}

export function WallDefense({ position, rotation = 0, wallBlocksRef, wallId }: WallProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const initialized = useRef(false)

  const blocks = useMemo(() => {
    const arr: WallBlock[] = []
    for (let row = 0; row < WALL_ROWS; row++) {
      for (let col = 0; col < WALL_COLS; col++) {
        const mesh = new THREE.Mesh(blockGeo, wallMat)
        // Staggered brick pattern
        const offsetX = row % 2 === 0 ? 0 : BLOCK_W * 0.5
        const x = col * BLOCK_W - (WALL_COLS * BLOCK_W) / 2 + BLOCK_W / 2 + offsetX
        const y = row * BLOCK_H + BLOCK_H / 2
        mesh.position.set(x, y, 0)
        mesh.castShadow = true
        mesh.receiveShadow = true
        arr.push({
          mesh,
          velocity: new THREE.Vector3(),
          alive: true,
          settled: true,
          homePos: new THREE.Vector3(x, y, 0),
          row,
          col,
        })
      }
    }
    return arr
  }, [])

  // Register blocks for collision detection
  useMemo(() => {
    if (wallBlocksRef?.current && wallId) {
      wallBlocksRef.current.set(wallId, blocks)
    }
  }, [blocks, wallId, wallBlocksRef])

  const integrityTimer = useRef(0)
  // Track pending row collapses for staggered cascade effect
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
        // Collapse all alive blocks in this row
        for (const b of blocks) {
          if (b.row === pc.row && b.alive && b.settled) {
            b.settled = false
            b.velocity.y = -0.8
            b.velocity.x += (Math.random() - 0.5) * 0.5
            b.velocity.z += (Math.random() - 0.5) * 0.3
          }
        }
        pendingCollapses.current.splice(i, 1)
      }
    }

    // ── Structural integrity: unsupported blocks fall ──
    integrityTimer.current += delta
    if (integrityTimer.current > 0.1) {
      integrityTimer.current = 0

      for (let row = 1; row < WALL_ROWS; row++) {
        const rowBlocks = blocks.filter(b => b.row === row)
        const aliveInRow = rowBlocks.filter(b => b.alive)

        // Check if row has lost >40% — if so, cascade collapse the whole row
        const destroyedFrac = 1 - aliveInRow.length / WALL_COLS
        if (destroyedFrac >= ROW_COLLAPSE_THRESHOLD && aliveInRow.some(b => b.settled)) {
          const alreadyPending = pendingCollapses.current.some(pc => pc.row === row)
          if (!alreadyPending) {
            pendingCollapses.current.push({ row, delay: 0.033 * (row - 1) })
          }
          continue
        }

        // Per-block support check: need STRONG support (>50% overlap), not just touching
        for (const block of aliveInRow) {
          if (!block.settled) continue

          const belowRow = row - 1
          if (belowRow < 0) continue

          // Count how many support blocks exist below
          let totalSupport = 0
          const bx = block.mesh.position.x
          for (const belowBlock of blocks) {
            if (belowBlock.row !== belowRow) continue
            // Block must be alive AND either settled or just displaced
            if (!belowBlock.alive) continue
            const overlap = BLOCK_W - Math.abs(bx - belowBlock.mesh.position.x)
            if (overlap > BLOCK_W * 0.15) {
              totalSupport += overlap / BLOCK_W
            }
          }

          // Need at least 40% total overlap support to stay up
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
    for (const b of blocks) {
      if (!b.alive) continue
      const speed = b.velocity.length()

      if (speed < BLOCK_SETTLE_SPEED && b.mesh.position.y <= b.homePos.y + 0.01) {
        b.settled = true
        b.velocity.set(0, 0, 0)
        continue
      }

      b.settled = false
      b.velocity.y += BLOCK_GRAVITY * delta
      b.mesh.position.add(b.velocity.clone().multiplyScalar(delta))

      // Ground collision
      if (b.mesh.position.y < BLOCK_H / 2) {
        b.mesh.position.y = BLOCK_H / 2
        b.velocity.y *= BLOCK_GROUND_BOUNCE_VY
        b.velocity.x *= BLOCK_GROUND_FRICTION
        b.velocity.z *= BLOCK_GROUND_FRICTION
        if (Math.abs(b.velocity.y) < 0.3) b.velocity.y = 0
      }

      // Tumble when moving fast
      if (speed > 0.5) {
        b.mesh.rotation.x += b.velocity.z * delta * 2
        b.mesh.rotation.z -= b.velocity.x * delta * 2
      }

      b.velocity.multiplyScalar(BLOCK_DAMPING)
    }
  })

  // Track how many blocks remain alive for collider sizing
  const [wallIntact, setWallIntact] = useState(true)
  const wallCheckTimer = useRef(0)

  // Check periodically if wall is mostly destroyed (remove collider)
  useFrame((_, rawDelta) => {
    wallCheckTimer.current += Math.min(rawDelta, 0.05)
    if (wallCheckTimer.current > 0.3) {
      wallCheckTimer.current = 0
      const aliveCount = blocks.filter(b => b.alive).length
      const totalCount = WALL_COLS * WALL_ROWS
      if (aliveCount < totalCount * 0.3 && wallIntact) {
        setWallIntact(false)
      }
    }
  })

  // Wall dimensions: WALL_COLS * BLOCK_W wide, WALL_ROWS * BLOCK_H tall, BLOCK_D deep
  const wallHalfW = (WALL_COLS * BLOCK_W) / 2
  const wallHalfH = (WALL_ROWS * BLOCK_H) / 2
  const wallHalfD = BLOCK_D / 2

  return (
    <>
      <group ref={groupRef} />
      {wallIntact && (
        <RigidBody
          type="fixed"
          position={[position[0], position[1] + wallHalfH, position[2]]}
          rotation={[0, rotation, 0]}
          collisionGroups={GROUP_WALL}
          colliders={false}
        >
          <CuboidCollider args={[wallHalfW, wallHalfH, wallHalfD + 0.1]} />
        </RigidBody>
      )}
    </>
  )
}

// ── Sandbag Bunker ──────────────────────────────────────
const sandbagGeo = new THREE.BoxGeometry(0.3, 0.14, 0.18)
const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xA89070, roughness: 0.85 })

export function SandbagDefense({ position, rotation = 0 }: DefenseProps) {
  return (
    <>
      <group position={position} rotation-y={rotation}>
        {/* Front row */}
        {[...Array(5)].map((_, i) => (
          <mesh key={`f-${i}`} geometry={sandbagGeo} material={sandbagMat}
            position={[(i - 2) * 0.32, 0.07, 0.3]}
            rotation={[0, (i % 2) * 0.1, 0]}
            castShadow receiveShadow
          />
        ))}
        {/* Second row offset */}
        {[...Array(4)].map((_, i) => (
          <mesh key={`s-${i}`} geometry={sandbagGeo} material={sandbagMat}
            position={[(i - 1.5) * 0.32, 0.21, 0.3]}
            rotation={[0, (i % 2) * -0.1, 0]}
            castShadow receiveShadow
          />
        ))}
        {/* Side walls */}
        {[-0.65, 0.65].map((x, idx) => (
          <group key={`side-${idx}`}>
            <mesh geometry={sandbagGeo} material={sandbagMat}
              position={[x, 0.07, 0]} rotation={[0, Math.PI / 2, 0]}
              castShadow receiveShadow
            />
            <mesh geometry={sandbagGeo} material={sandbagMat}
              position={[x, 0.21, 0]} rotation={[0, Math.PI / 2, 0]}
              castShadow receiveShadow
            />
          </group>
        ))}
        {/* Top row */}
        {[...Array(3)].map((_, i) => (
          <mesh key={`t-${i}`} geometry={sandbagGeo} material={sandbagMat}
            position={[(i - 1) * 0.32, 0.35, 0.3]}
            castShadow receiveShadow
          />
        ))}
      </group>
      <RigidBody type="fixed" position={position} rotation={[0, rotation, 0]} collisionGroups={GROUP_WALL} colliders={false}>
        <CuboidCollider args={[0.55, 0.25, 0.25]} position={[0, 0.2, 0.15]} />
      </RigidBody>
    </>
  )
}

// ── Watch Tower ─────────────────────────────────────────
export function WatchTower({ position, rotation = 0 }: DefenseProps) {
  return (
    <group position={position} rotation-y={rotation}>
      {/* 4 legs */}
      {[[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.9, z]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 1.8, 6]} />
          <meshStandardMaterial color={0x6b4226} roughness={0.7} />
        </mesh>
      ))}
      {/* Cross braces */}
      {[[-0.4, 0], [0.4, 0], [0, -0.4], [0, 0.4]].map(([x, z], i) => (
        <mesh key={`brace-${i}`} position={[x, 0.5, z]}
          rotation={[0, 0, i < 2 ? 0.4 : 0]}
          castShadow>
          <boxGeometry args={[i < 2 ? 0.04 : 0.84, 0.04, i < 2 ? 0.84 : 0.04]} />
          <meshStandardMaterial color={0x5a3a1a} roughness={0.7} />
        </mesh>
      ))}
      {/* Platform */}
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 0.08, 1.1]} />
        <meshStandardMaterial color={0x6b4226} roughness={0.6} />
      </mesh>
      {/* Railings */}
      {[
        { pos: [0, 2.0, -0.52] as [number, number, number], size: [1.08, 0.32, 0.05] as [number, number, number] },
        { pos: [-0.52, 2.0, 0] as [number, number, number], size: [0.05, 0.32, 1.08] as [number, number, number] },
        { pos: [0.52, 2.0, 0] as [number, number, number], size: [0.05, 0.32, 1.08] as [number, number, number] },
      ].map((wall, i) => (
        <mesh key={`rail-${i}`} position={wall.pos} castShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial color={0x3d6b4f} roughness={0.5} />
        </mesh>
      ))}
      {/* Front rail (lower) */}
      <mesh position={[0, 1.94, 0.52]} castShadow>
        <boxGeometry args={[1.08, 0.2, 0.05]} />
        <meshStandardMaterial color={0x3d6b4f} roughness={0.5} />
      </mesh>
      {/* Corner posts */}
      {[[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, 2.1, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.52, 6]} />
          <meshStandardMaterial color={0x5a3a1a} roughness={0.7} />
        </mesh>
      ))}
      {/* Ladder */}
      <group position={[0.55, 0.9, 0]}>
        <mesh position={[0, 0, -0.08]} castShadow>
          <boxGeometry args={[0.04, 1.8, 0.04]} />
          <meshStandardMaterial color={0x6b4226} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.08]} castShadow>
          <boxGeometry args={[0.04, 1.8, 0.04]} />
          <meshStandardMaterial color={0x6b4226} roughness={0.7} />
        </mesh>
        {[...Array(6)].map((_, i) => (
          <mesh key={`rung-${i}`} position={[0, -0.6 + i * 0.3, 0]} castShadow>
            <boxGeometry args={[0.03, 0.03, 0.2]} />
            <meshStandardMaterial color={0x5a3a1a} roughness={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
