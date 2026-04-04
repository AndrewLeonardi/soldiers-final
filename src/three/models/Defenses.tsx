import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Wall Segment (destructible brick grid) ──────────────
const BLOCK_W = 0.4
const BLOCK_H = 0.2
const BLOCK_D = 0.2
const WALL_COLS = 6
const WALL_ROWS = 5
const BLOCK_GRAVITY = -12

const blockGeo = new THREE.BoxGeometry(BLOCK_W, BLOCK_H, BLOCK_D)
const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a6b3a, roughness: 0.35, metalness: 0.02 })

export interface WallBlock {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  alive: boolean
  settled: boolean
  homePos: THREE.Vector3
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

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    if (groupRef.current && !initialized.current) {
      groupRef.current.position.set(...position)
      groupRef.current.rotation.y = rotation
      for (const b of blocks) groupRef.current.add(b.mesh)
      initialized.current = true
    }

    // Structural integrity: unsupported blocks fall
    integrityTimer.current += delta
    if (integrityTimer.current > 0.15) {
      integrityTimer.current = 0
      for (let row = 1; row < WALL_ROWS; row++) {
        for (let col = 0; col < WALL_COLS; col++) {
          const idx = row * WALL_COLS + col
          const block = blocks[idx]
          if (!block.alive || !block.settled) continue

          const belowRow = row - 1
          let hasSupport = false

          if (belowRow < 0) { hasSupport = true; continue }

          const bx = block.mesh.position.x
          for (let bc = 0; bc < WALL_COLS; bc++) {
            const belowIdx = belowRow * WALL_COLS + bc
            const belowBlock = blocks[belowIdx]
            if (!belowBlock.alive || !belowBlock.settled) continue
            const overlap = BLOCK_W - Math.abs(bx - belowBlock.mesh.position.x)
            if (overlap > BLOCK_W * 0.25) {
              hasSupport = true
              break
            }
          }

          if (!hasSupport) {
            block.settled = false
            block.velocity.y = -0.5
            block.velocity.x += (Math.random() - 0.5) * 0.3
          }
        }
      }
    }

    // Block physics
    for (const b of blocks) {
      if (!b.alive) continue
      const speed = b.velocity.length()

      if (speed < 0.01 && b.mesh.position.y <= b.homePos.y + 0.01) {
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
        b.velocity.y *= -0.25
        b.velocity.x *= 0.6
        b.velocity.z *= 0.6
        if (Math.abs(b.velocity.y) < 0.3) b.velocity.y = 0
      }

      // Tumble when moving
      if (speed > 0.5) {
        b.mesh.rotation.x += b.velocity.z * delta * 2
        b.mesh.rotation.z -= b.velocity.x * delta * 2
      }

      b.velocity.multiplyScalar(0.993)
    }
  })

  return <group ref={groupRef} />
}

// ── Sandbag Bunker ──────────────────────────────────────
const sandbagGeo = new THREE.BoxGeometry(0.3, 0.14, 0.18)
const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xA89070, roughness: 0.85 })

export function SandbagDefense({ position, rotation = 0 }: DefenseProps) {
  return (
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
