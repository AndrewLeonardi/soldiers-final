import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createFlexSoldier, animateFlexSoldier } from './flexSoldier'
import { applyWeaponToSoldier } from './weaponMeshes'
import { TOY } from './materials'

// Accept any unit-like object (GameUnit or BattleUnit with extra fields)
interface UnitLike {
  id: string
  team: 'green' | 'tan'
  position: [number, number, number]
  rotation: number
  status: string
  weapon: string
  facingAngle?: number
  spinSpeed?: number
  velocity?: [number, number, number]
  stateAge?: number
  health?: number
  maxHealth?: number
}

interface SoldierUnitProps {
  unit: UnitLike
  /** When true, a RigidBody parent handles positioning. SoldierUnit only does rotation/animation. */
  physicsControlled?: boolean
}

export function SoldierUnit({ unit, physicsControlled = false }: SoldierUnitProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const weaponRef = useRef<THREE.Group | null>(null)
  const muzzleFlashRef = useRef<THREE.PointLight>(null!)

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

  useEffect(() => {
    if (!soldier) return
    weaponRef.current = applyWeaponToSoldier(soldier.parts, unit.weapon as any, weaponRef.current)
  }, [unit.weapon, soldier])

  useFrame((state, delta) => {
    if (!soldier || !groupRef.current) return

    // Always animate the pose. The death pose is now a vertical crumple that
    // stays inside the capsule collider, so there's no need to skip animation
    // for "ragdolling" soldiers. The body never tumbles outside its collider.
    animateFlexSoldier(soldier, unit.status as any, state.clock.getElapsedTime(), delta)

    // Muzzle flash: bright point light when firing
    if (muzzleFlashRef.current) {
      const isFiring = unit.status === 'firing' && (unit.stateAge ?? 1) < 0.1
      if (isFiring) {
        muzzleFlashRef.current.intensity = 4 * (1 - (unit.stateAge ?? 0) / 0.1)
      } else {
        muzzleFlashRef.current.intensity = 0
      }
    }

    // Position — when physics-controlled, RigidBody parent handles this.
    // Only set position manually when NOT inside a RigidBody (barracks, placement).
    if (!physicsControlled) {
      const isAirborne = unit.position[1] > 0.1 || (unit.velocity && Math.abs(unit.velocity[1]) > 0.5)
      const lerpSpeed = isAirborne ? 20 : 10
      const target = new THREE.Vector3(
        unit.position[0],
        Math.max(0, unit.position[1]),
        unit.position[2],
      )
      groupRef.current.position.lerp(target, Math.min(1, delta * lerpSpeed))
      if (groupRef.current.position.y < 0) groupRef.current.position.y = 0
    }

    // Rotation: just face the target angle. No tumble, no spin accumulation.
    // The Rapier body has lockRotations, so the visual must match by staying upright.
    const targetRot = unit.facingAngle ?? unit.rotation
    groupRef.current.rotation.x = 0
    groupRef.current.rotation.z = 0
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRot,
      Math.min(1, delta * 6),
    )
  })

  return (
    <group ref={groupRef}>
      {/* Muzzle flash light -- activates during firing */}
      <pointLight
        ref={muzzleFlashRef}
        color={0xffaa22}
        intensity={0}
        distance={4}
        position={[0, 0.8, 0.3]}
      />
    </group>
  )
}
