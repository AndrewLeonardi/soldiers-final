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
}

interface SoldierUnitProps {
  unit: UnitLike
}

export function SoldierUnit({ unit }: SoldierUnitProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const weaponRef = useRef<THREE.Group | null>(null)
  const tumbleRef = useRef({ rx: 0, rz: 0 })
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

    // Animate pose -- skip when ragdolling (spinning through air)
    const spin = unit.spinSpeed ?? 0
    const isRagdolling = spin > 0.1 && unit.position[1] > 0.05
    if (!isRagdolling) {
      animateFlexSoldier(soldier, unit.status as any, state.clock.getElapsedTime(), delta)
    }

    // Muzzle flash: bright point light when firing
    if (muzzleFlashRef.current) {
      const isFiring = unit.status === 'firing' && (unit.stateAge ?? 1) < 0.1
      if (isFiring) {
        muzzleFlashRef.current.intensity = 4 * (1 - (unit.stateAge ?? 0) / 0.1)
      } else {
        muzzleFlashRef.current.intensity = 0
      }
    }

    // Position -- lerp to unit position, clamp above ground
    const isAirborne = unit.position[1] > 0.1 || (unit.velocity && Math.abs(unit.velocity[1]) > 0.5)
    const lerpSpeed = isAirborne ? 20 : 10
    const target = new THREE.Vector3(
      unit.position[0],
      Math.max(0, unit.position[1]),
      unit.position[2],
    )
    groupRef.current.position.lerp(target, Math.min(1, delta * lerpSpeed))
    if (groupRef.current.position.y < 0) groupRef.current.position.y = 0

    // Rotation
    const isGrounded = unit.position[1] < 0.05

    if (spin > 0.1 && !isGrounded) {
      // Airborne tumble
      tumbleRef.current.rx += spin * delta * 3
      tumbleRef.current.rz += spin * delta * 2.3
      groupRef.current.rotation.x = tumbleRef.current.rx
      groupRef.current.rotation.z = tumbleRef.current.rz
      groupRef.current.rotation.y += spin * delta * 0.5
    } else if (isGrounded) {
      // Settle rotation back to upright
      tumbleRef.current.rx *= 0.85
      tumbleRef.current.rz *= 0.85
      if (Math.abs(tumbleRef.current.rx) < 0.02) tumbleRef.current.rx = 0
      if (Math.abs(tumbleRef.current.rz) < 0.02) tumbleRef.current.rz = 0
      groupRef.current.rotation.x = tumbleRef.current.rx
      groupRef.current.rotation.z = tumbleRef.current.rz

      // Face direction smoothly
      const targetRot = unit.facingAngle ?? unit.rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        Math.min(1, delta * 6),
      )
    } else {
      // Falling (no spin) -- just face direction
      const targetRot = unit.facingAngle ?? unit.rotation
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRot,
        Math.min(1, delta * 6),
      )
      tumbleRef.current.rx *= 0.95
      tumbleRef.current.rz *= 0.95
      groupRef.current.rotation.x = tumbleRef.current.rx
      groupRef.current.rotation.z = tumbleRef.current.rz
    }
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
