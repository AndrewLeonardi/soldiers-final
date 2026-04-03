import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { BattlefieldProps } from '@three/models/sandboxProps'
import { CameraRig } from '@three/camera/CameraRig'
import type { GameUnit } from '@config/types'
import { WEAPON_STATS } from '@config/units'

let unitIdCounter = 0
function nextUnitId() { return `u-${++unitIdCounter}` }

// ── Lighting ────────────────────────────────────────────

function Lights() {
  return (
    <>
      <ambientLight color={0xb8a888} intensity={1.5} />
      <directionalLight
        color={0xfff5e0}
        intensity={3.5}
        position={[6, 12, 6]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight
        color={0x88aacc}
        intensity={0.8}
        position={[-6, 8, 3]}
      />
      <pointLight color={0xd4aa40} intensity={2.0} position={[-5, 5, -8]} distance={20} />
    </>
  )
}

// ── Ground ──────────────────────────────────────────────

function SandboxGround() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 14, 60, 40)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      // Create some sand dune hills
      const x = pos.getX(i)
      const y = pos.getY(i)
      let height = (Math.random() - 0.5) * 0.06
      // Dune near player side
      height += 0.2 * Math.exp(-((x + 4) ** 2 + (y - 1) ** 2) / 3)
      // Dune near center
      height += 0.15 * Math.exp(-((x - 1) ** 2 + (y + 2) ** 2) / 4)
      // Subtle hill on enemy side
      height += 0.12 * Math.exp(-((x - 6) ** 2 + y ** 2) / 5)
      pos.setZ(i, pos.getZ(i) + height)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <>
      {/* Visual ground */}
      <mesh
        geometry={geometry}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <meshStandardMaterial
          color={0xd2b48c}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Physics floor */}
      <RigidBody type="fixed" position={[0, -0.05, 0]}>
        <CuboidCollider args={[10, 0.05, 7]} />
      </RigidBody>
    </>
  )
}

// ── Player Zone Indicator ───────────────────────────────

function PlayerZone({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <mesh rotation-x={-Math.PI / 2} position={[-5, 0.02, 0]}>
      <planeGeometry args={[10, 14]} />
      <meshStandardMaterial
        color={0x4ADE80}
        transparent
        opacity={0.04}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// ── Placement Click Handler ─────────────────────────────

function PlacementGround({
  orbitingRef,
  selectedUnit,
}: {
  orbitingRef: React.MutableRefObject<boolean>
  selectedUnit: string | null
}) {
  const addPlayerUnit = useGameStore((s) => s.addPlayerUnit)
  const spendGold = useGameStore((s) => s.spendGold)
  const phase = useGameStore((s) => s.phase)
  const soldiers = useRosterStore((s) => s.soldiers)

  if (phase !== 'placement' || !selectedUnit) return null

  // selectedUnit is now a soldier ID from the roster
  const rosterSoldier = soldiers.find((s) => s.id === selectedUnit)

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      position={[0, 0.03, 0]}
      onPointerUp={(e) => {
        if (orbitingRef.current) return
        e.stopPropagation()

        const point = e.point
        const x = Math.round(point.x * 2) / 2
        const z = Math.round(point.z * 2) / 2

        if (x > 0.5) return

        const cost = 100
        if (!spendGold(cost)) return

        // Use the roster soldier's equipped weapon
        const weaponKey = rosterSoldier?.equippedWeapon ?? 'rifle'
        const stats = WEAPON_STATS[weaponKey]

        const unit: GameUnit = {
          id: nextUnitId(),
          type: 'soldier',
          team: 'green',
          position: [x, 0, z],
          rotation: Math.PI / 2,
          health: stats.health,
          maxHealth: stats.health,
          status: 'idle',
          weapon: weaponKey,
          lastFireTime: 0,
          fireRate: stats.fireRate,
          range: stats.range,
          damage: stats.damage,
          speed: stats.speed,
        }

        addPlayerUnit(unit)
      }}
    >
      <planeGeometry args={[20, 14]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

// ── Main Scene ──────────────────────────────────────────

interface BattleSceneProps {
  selectedUnit: string | null
  orbitingRef: React.MutableRefObject<boolean>
}

export function BattleScene({ selectedUnit, orbitingRef }: BattleSceneProps) {
  const playerUnits = useGameStore((s) => s.playerUnits)
  const phase = useGameStore((s) => s.phase)

  return (
    <>
      <Lights />
      <CameraRig orbitingRef={orbitingRef} />
      <SandboxGround />
      <BattlefieldProps />

      {/* Warm sky gradient */}
      <color attach="background" args={[0x88bbdd]} />
      <fog attach="fog" args={[0xd4c8a0, 18, 40]} />

      {/* Player zone indicator during placement */}
      <PlayerZone visible={phase === 'placement' && !!selectedUnit} />

      {/* Invisible click plane for freeform placement */}
      <PlacementGround orbitingRef={orbitingRef} selectedUnit={selectedUnit} />

      {/* Player soldiers */}
      {playerUnits.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}
    </>
  )
}
