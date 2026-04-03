import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier'
import * as THREE from 'three'

// ── TABLE FRAME ─────────────────────────────────────────
// Wooden edges that establish "this is a sandbox on a table"

export function TableFrame() {
  const woodColor = 0x6b4226
  const woodDark = 0x4a2e1a

  return (
    <group>
      {/* Front edge (near camera, visible) */}
      <RigidBody type="fixed" position={[0, -0.15, 7.2]}>
        <mesh castShadow>
          <boxGeometry args={[22, 0.5, 0.6]} />
          <meshStandardMaterial color={woodColor} roughness={0.7} />
        </mesh>
        <CuboidCollider args={[11, 0.25, 0.3]} />
      </RigidBody>

      {/* Back edge */}
      <RigidBody type="fixed" position={[0, -0.15, -7.2]}>
        <mesh castShadow>
          <boxGeometry args={[22, 0.5, 0.6]} />
          <meshStandardMaterial color={woodColor} roughness={0.7} />
        </mesh>
        <CuboidCollider args={[11, 0.25, 0.3]} />
      </RigidBody>

      {/* Left edge */}
      <RigidBody type="fixed" position={[-10.5, -0.15, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.5, 15]} />
          <meshStandardMaterial color={woodColor} roughness={0.7} />
        </mesh>
        <CuboidCollider args={[0.3, 0.25, 7.5]} />
      </RigidBody>

      {/* Right edge -- LOWER so things can fall off! */}
      <mesh position={[10.5, -0.25, 0]} castShadow>
        <boxGeometry args={[0.6, 0.3, 15]} />
        <meshStandardMaterial color={woodDark} roughness={0.7} />
      </mesh>

      {/* Visible table leg at front-right corner */}
      <mesh position={[10.3, -2.5, 6.8]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 5, 8]} />
        <meshStandardMaterial color={woodDark} roughness={0.6} />
      </mesh>

      {/* Table surface under the sand (visible at edges) */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[22, 0.1, 15]} />
        <meshStandardMaterial color={woodDark} roughness={0.8} />
      </mesh>
    </group>
  )
}

// ── GIANT HOUSEHOLD OBJECTS (scale contrast humor) ──────

export function CoffeeMug() {
  return (
    <RigidBody type="fixed" position={[12, 0, -3]}>
      <group>
        {/* Mug body */}
        <mesh castShadow position={[0, 1.5, 0]}>
          <cylinderGeometry args={[1.0, 0.9, 3.0, 16]} />
          <meshStandardMaterial color={0xcc3333} roughness={0.3} metalness={0} />
        </mesh>
        {/* Handle */}
        <mesh castShadow position={[1.1, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.5, 0.12, 8, 16, Math.PI]} />
          <meshStandardMaterial color={0xcc3333} roughness={0.3} />
        </mesh>
        {/* Coffee inside (dark circle at top) */}
        <mesh position={[0, 2.95, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.85, 16]} />
          <meshStandardMaterial color={0x2a1a0a} roughness={0.95} />
        </mesh>
      </group>
      <CylinderCollider args={[1.5, 1.0]} position={[0, 1.5, 0]} />
    </RigidBody>
  )
}

export function GiantPencil() {
  return (
    <RigidBody type="fixed" position={[8, 0.15, 6]} rotation={[0, -0.3, 0]}>
      <group rotation={[0, 0, Math.PI / 2]}>
        {/* Body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.15, 8, 6]} />
          <meshStandardMaterial color={0xFFDD44} roughness={0.4} />
        </mesh>
        {/* Tip */}
        <mesh castShadow position={[0, 4.2, 0]}>
          <coneGeometry args={[0.15, 0.5, 6]} />
          <meshStandardMaterial color={0xd4b06a} roughness={0.5} />
        </mesh>
        {/* Graphite point */}
        <mesh position={[0, 4.5, 0]}>
          <coneGeometry args={[0.05, 0.15, 6]} />
          <meshStandardMaterial color={0x222222} roughness={0.3} />
        </mesh>
        {/* Eraser */}
        <mesh castShadow position={[0, -4.2, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.4, 8]} />
          <meshStandardMaterial color={0xdd8899} roughness={0.6} />
        </mesh>
        {/* Metal ferrule */}
        <mesh position={[0, -3.95, 0]}>
          <cylinderGeometry args={[0.17, 0.16, 0.2, 8]} />
          <meshStandardMaterial color={0xccccaa} roughness={0.2} metalness={0.5} />
        </mesh>
      </group>
    </RigidBody>
  )
}

// ── MILITARY BATTLEFIELD PROPS ──────────────────────────

export function SandbagWall({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const tan = 0xa89070

  return (
    <RigidBody type="fixed" position={position} rotation={[0, rotation, 0]}>
      <group>
        {/* Bottom row - 3 bags */}
        {[-0.4, 0, 0.4].map((x, i) => (
          <mesh key={`bottom-${i}`} castShadow position={[x, 0.12, 0]}>
            <boxGeometry args={[0.35, 0.2, 0.25]} />
            <meshStandardMaterial color={tan} roughness={0.8} />
          </mesh>
        ))}
        {/* Top row - 2 bags (staggered) */}
        {[-0.2, 0.2].map((x, i) => (
          <mesh key={`top-${i}`} castShadow position={[x, 0.32, 0]}>
            <boxGeometry args={[0.35, 0.18, 0.25]} />
            <meshStandardMaterial color={tan} roughness={0.8} />
          </mesh>
        ))}
      </group>
      <CuboidCollider args={[0.55, 0.25, 0.15]} position={[0, 0.2, 0]} />
    </RigidBody>
  )
}

export function FlagPole({ position, color = 0x8b2020 }: { position: [number, number, number]; color?: number }) {
  const flagRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.15
    }
  })

  return (
    <group position={position}>
      {/* Pole */}
      <mesh castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.5, 6]} />
        <meshStandardMaterial color={0x888888} roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Flag */}
      <mesh ref={flagRef} castShadow position={[0.2, 0.55, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Ball finial */}
      <mesh position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={0xd4aa40} roughness={0.2} metalness={0.3} />
      </mesh>
    </group>
  )
}

export function AmmoCrate({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <RigidBody type="fixed" position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.4, 0.25, 0.3]} />
        <meshStandardMaterial color={0x2d5a3f} roughness={0.6} />
      </mesh>
      {/* Lid stripe */}
      <mesh position={[0, 0.126, 0]}>
        <boxGeometry args={[0.42, 0.02, 0.15]} />
        <meshStandardMaterial color={0x3d6b4f} roughness={0.5} />
      </mesh>
      <CuboidCollider args={[0.2, 0.125, 0.15]} />
    </RigidBody>
  )
}

export function OilDrum({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position}>
      <group>
        <mesh castShadow position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.7, 12]} />
          <meshStandardMaterial color={0x3a3a3a} roughness={0.4} metalness={0.2} />
        </mesh>
        {/* Orange stripe */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.12, 12]} />
          <meshStandardMaterial color={0xff6600} roughness={0.4} />
        </mesh>
        {/* Top rim */}
        <mesh position={[0, 0.7, 0]}>
          <torusGeometry args={[0.19, 0.02, 6, 12]} />
          <meshStandardMaterial color={0x555555} roughness={0.3} metalness={0.3} />
        </mesh>
      </group>
      <CylinderCollider args={[0.35, 0.2]} position={[0, 0.35, 0]} />
    </RigidBody>
  )
}

export function BarbedWire({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Posts */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 4]} />
          <meshStandardMaterial color={0x555555} roughness={0.3} metalness={0.4} />
        </mesh>
      ))}
      {/* Wire lines */}
      {[0.15, 0.3].map((y, i) => (
        <mesh key={`wire-${i}`} position={[0, y, 0]}>
          <boxGeometry args={[1.8, 0.01, 0.01]} />
          <meshStandardMaterial color={0x777777} roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ── TERRAIN ENRICHMENT ──────────────────────────────────

export function RockCluster({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const rocks = useMemo(() => {
    const r: { pos: [number, number, number]; size: number; color: number }[] = []
    for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) {
      r.push({
        pos: [(Math.random() - 0.5) * 0.8, Math.random() * 0.1, (Math.random() - 0.5) * 0.6],
        size: 0.06 + Math.random() * 0.12,
        color: Math.random() > 0.5 ? 0x999988 : 0x887766,
      })
    }
    return r
  }, [])

  return (
    <group position={position} scale={scale}>
      {rocks.map((rock, i) => (
        <mesh key={i} castShadow position={rock.pos}>
          <dodecahedronGeometry args={[rock.size, 0]} />
          <meshStandardMaterial color={rock.color} roughness={0.85} />
        </mesh>
      ))}
    </group>
  )
}

export function ScrubBrush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 0.7, 1.5, -0.4, 2.1].map((offset, i) => (
        <mesh key={i} castShadow position={[(Math.sin(i * 2) * 0.15), 0.1, offset * 0.3]}>
          <coneGeometry args={[0.08 + Math.random() * 0.06, 0.2 + Math.random() * 0.1, 5]} />
          <meshStandardMaterial color={i % 2 === 0 ? 0x4a5a3a : 0x5a6b4f} roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}

// ── FULL BATTLEFIELD ASSEMBLY ───────────────────────────

export function BattlefieldProps() {
  return (
    <group>
      <TableFrame />

      {/* No man's land -- sparse, keeps focus on soldiers */}
      <BarbedWire position={[1, 0, -2]} />
      <BarbedWire position={[2, 0, 2]} rotation={0.3} />
      <OilDrum position={[2, 0, -4]} />

      {/* Enemy side flavor */}
      <SandbagWall position={[6, 0, -2]} rotation={Math.PI + 0.3} />
      <FlagPole position={[7, 0, 0]} color={0x8b2020} />
      <AmmoCrate position={[5, 0, 3]} rotation={1.2} />

      {/* Light terrain scatter */}
      <RockCluster position={[3, 0, -5]} scale={0.8} />
      <RockCluster position={[-1, 0, 5]} />
      <ScrubBrush position={[-8, 0, -3]} />
      <ScrubBrush position={[5, 0, 5]} />
    </group>
  )
}
