import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFlexSoldier, poseIdle } from './flexSoldier'
import { applyWeaponToSoldier } from './weaponMeshes'
import { TOY } from './materials'
import type { SoldierProfile } from '@config/types'

interface BarracksSoldierProps {
  soldier: SoldierProfile
  positionX: number
  onClick: () => void
}

function BarracksSoldier({ soldier, positionX, onClick }: BarracksSoldierProps) {
  const groupRef = useRef<THREE.Group>(null)
  const outerRef = useRef<THREE.Group>(null)
  const weaponRef = useRef<THREE.Group | null>(null)
  const [hovered, setHovered] = useState(false)
  const { gl } = useThree()

  const model = useMemo(() => createFlexSoldier(TOY.armyGreen), [])

  useEffect(() => {
    if (groupRef.current && model) {
      groupRef.current.add(model.group)
      return () => { groupRef.current?.remove(model.group) }
    }
  }, [model])

  useEffect(() => {
    if (!model) return
    weaponRef.current = applyWeaponToSoldier(model.parts, soldier.equippedWeapon, weaponRef.current)
  }, [soldier.equippedWeapon, model])

  // Idle animation + hover scale
  useFrame((state) => {
    if (!model) return
    poseIdle(model.parts, state.clock.getElapsedTime() + positionX * 2)

    if (outerRef.current) {
      const target = hovered ? 1.12 : 1.0
      const current = outerRef.current.scale.x
      const lerped = current + (target - current) * 0.15
      outerRef.current.scale.setScalar(lerped)
    }
  })

  // Cursor change on hover
  useEffect(() => {
    gl.domElement.style.cursor = hovered ? 'pointer' : 'auto'
    return () => { gl.domElement.style.cursor = 'auto' }
  }, [hovered, gl])

  return (
    <group ref={outerRef} position={[positionX, 0, 0]}>
      <group ref={groupRef} />
      {/* Large invisible click/hover target */}
      <mesh
        position={[0, 0.4, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.6, 1.0, 0.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

interface BarracksSceneProps {
  soldiers: SoldierProfile[]
  onSoldierTap: (id: string) => void
}

export function BarracksScene({ soldiers, onSoldierTap }: BarracksSceneProps) {
  const count = soldiers.length
  // Adaptive spacing: tighter with more soldiers
  const spacing = count <= 3 ? 0.8 : count <= 5 ? 0.65 : 0.55
  const totalWidth = (count - 1) * spacing
  const startX = -totalWidth / 2

  return (
    <>
      {/* Bright warm lighting -- high intensity for visibility */}
      <ambientLight intensity={1.5} color="#f5e6c8" />
      <directionalLight
        position={[3, 6, 5]}
        intensity={2.0}
        color="#fff5e0"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <directionalLight position={[-3, 4, 3]} intensity={0.8} color="#ddeeff" />
      <pointLight position={[0, 3, 2]} intensity={0.6} color="#ffe8c0" />

      {/* Ground surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 4]} />
        <meshStandardMaterial color={0x8a7a5a} roughness={0.85} metalness={0} />
      </mesh>

      {/* Wood frame edges */}
      {[[-4, 0], [4, 0]].map(([x], i) => (
        <mesh key={i} position={[x, 0.03, 0]}>
          <boxGeometry args={[0.08, 0.06, 4]} />
          <meshStandardMaterial color={0x8B6914} roughness={0.7} />
        </mesh>
      ))}

      {/* Soldiers */}
      {soldiers.map((sol, i) => (
        <BarracksSoldier
          key={sol.id}
          soldier={sol}
          positionX={startX + i * spacing}
          onClick={() => onSoldierTap(sol.id)}
        />
      ))}
    </>
  )
}
