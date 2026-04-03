import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { createFlexSoldier, animateFlexSoldier } from './flexSoldier'
import { applyWeaponToSoldier } from './weaponMeshes'
import type { GameUnit } from '@config/types'
import { TOY } from './materials'

interface SoldierUnitProps {
  unit: GameUnit
}

export function SoldierUnit({ unit }: SoldierUnitProps) {
  const rigidRef = useRef<RapierRigidBody>(null)
  const groupRef = useRef<THREE.Group>(null)
  const weaponRef = useRef<THREE.Group | null>(null)

  const soldier = useMemo(() => {
    const color = unit.team === 'green' ? TOY.armyGreen : TOY.sandBrown
    return createFlexSoldier(color)
  }, [unit.team])

  useEffect(() => {
    if (groupRef.current && soldier) {
      groupRef.current.add(soldier.group)
      return () => { groupRef.current?.remove(soldier.group) }
    }
  }, [soldier])

  // Apply weapon based on unit's weapon type
  useEffect(() => {
    if (!soldier) return
    weaponRef.current = applyWeaponToSoldier(soldier.parts, unit.weapon, weaponRef.current)
  }, [unit.weapon, soldier])

  useFrame((state) => {
    if (!soldier) return
    animateFlexSoldier(soldier, unit.status, state.clock.getElapsedTime(), state.clock.getDelta())
  })

  const isDead = unit.status === 'dead'

  return (
    <RigidBody
      ref={rigidRef}
      type={isDead ? 'dynamic' : 'kinematicPosition'}
      position={unit.position}
      rotation={[0, unit.rotation, 0]}
      colliders={false}
      gravityScale={isDead ? 1 : 0}
    >
      <CapsuleCollider args={[0.15, 0.12]} position={[0, 0.27, 0]} />
      <group ref={groupRef} />
    </RigidBody>
  )
}
