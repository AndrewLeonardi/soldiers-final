import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '@stores/gameStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { SlotMarker } from '@three/physics/SlotMarker'

function Lights() {
  return (
    <>
      <ambientLight color={0x998866} intensity={1.2} />
      <directionalLight
        color={0xfff5e0}
        intensity={3.0}
        position={[5, 10, 5]}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight
        color={0x88aacc}
        intensity={0.6}
        position={[-5, 6, 3]}
      />
      <pointLight color={0xd4aa40} intensity={1.5} position={[-4, 4, -6]} distance={15} />
    </>
  )
}

function SandboxGround() {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 14, 60, 40)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * 0.06)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <>
      {/* Visual ground */}
      <mesh
        ref={meshRef}
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

      {/* Physics floor -- thin box collider */}
      <RigidBody type="fixed" position={[0, -0.05, 0]}>
        <CuboidCollider args={[10, 0.05, 7]} />
      </RigidBody>

      {/* Table edges -- invisible walls that let things fall off */}
      {/* Left edge */}
      <RigidBody type="fixed" position={[-10.5, 0.5, 0]}>
        <CuboidCollider args={[0.5, 1, 7]} />
      </RigidBody>
      {/* Back edge */}
      <RigidBody type="fixed" position={[0, 0.5, -7.5]}>
        <CuboidCollider args={[10, 1, 0.5]} />
      </RigidBody>

      {/* NO right or front edge -- soldiers can fall off! */}
    </>
  )
}

function SandboxProps() {
  return (
    <>
      {/* Bucket */}
      <RigidBody type="fixed" position={[-5, 0, 3]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.5, 0.4, 0.8, 12]} />
          <meshStandardMaterial color={0x3d6b4f} roughness={0.35} metalness={0} />
        </mesh>
        <CuboidCollider args={[0.5, 0.4, 0.5]} position={[0, 0.4, 0]} />
      </RigidBody>

      {/* Shovel */}
      <RigidBody type="fixed" position={[2, 0, -3]} rotation={[0, 0.4, 0]}>
        <group>
          {/* Handle */}
          <mesh castShadow position={[0, 0.3, 0]} rotation={[0, 0, 0.3]}>
            <cylinderGeometry args={[0.04, 0.04, 1.5, 6]} />
            <meshStandardMaterial color={0x6b4226} roughness={0.6} />
          </mesh>
          {/* Blade */}
          <mesh castShadow position={[-0.5, 0.05, 0]}>
            <boxGeometry args={[0.4, 0.05, 0.35]} />
            <meshStandardMaterial color={0x888888} roughness={0.3} metalness={0.4} />
          </mesh>
        </group>
        <CuboidCollider args={[0.5, 0.3, 0.3]} position={[0, 0.3, 0]} />
      </RigidBody>

      {/* Pebbles */}
      {[[-2, 0.08, 4], [4, 0.06, 2], [-6, 0.07, -1]].map((pos, i) => (
        <mesh key={i} castShadow position={pos as [number, number, number]}>
          <sphereGeometry args={[0.08 + i * 0.03, 6, 4]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? 0x999988 : 0x887766}
            roughness={0.8}
          />
        </mesh>
      ))}
    </>
  )
}

function CameraController() {
  const { camera } = useThree()
  const phase = useGameStore((s) => s.phase)

  useFrame(() => {
    if (phase === 'placement') {
      // Overhead view for placement
      camera.position.lerp(new THREE.Vector3(0, 12, 8), 0.02)
      camera.lookAt(0, 0, 0)
    } else if (phase === 'battle') {
      // Slightly closer during battle
      camera.position.lerp(new THREE.Vector3(0, 9, 7), 0.02)
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

export function BattleScene() {
  const slots = useGameStore((s) => s.slots)
  const playerUnits = useGameStore((s) => s.playerUnits)
  const phase = useGameStore((s) => s.phase)


  return (
    <>
      <Lights />
      <CameraController />
      <SandboxGround />
      <SandboxProps />

      {/* Sky color */}
      <color attach="background" args={[0x87CEEB]} />
      {/* Subtle distance fog */}
      <fog attach="fog" args={[0xc2b280, 20, 40]} />

      {/* Placement slots */}
      {phase === 'placement' && slots.map((slot) => (
        <SlotMarker key={slot.id} slot={slot} />
      ))}

      {/* Player soldiers */}
      {playerUnits.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}
    </>
  )
}
