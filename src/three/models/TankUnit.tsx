/**
 * TankUnit — renders a toy tank in battle.
 *
 * Extracted from TrainingScene's TrainingTank. Same procedural mesh
 * (hull, tracks, turret, barrel) but driven by BattleUnit state
 * instead of SimState.
 *
 * When physicsControlled=true, RigidBody parent handles position.
 * Turret auto-tracks nearest enemy (rotation.y).
 */
import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TOY, getPlasticMat } from './materials'

interface TankUnitLike {
  id: string
  team: 'green' | 'tan'
  position: [number, number, number]
  rotation: number
  status: string
  weapon: string
  facingAngle?: number
  stateAge?: number
}

interface TankUnitProps {
  unit: TankUnitLike
  physicsControlled?: boolean
  /** Position of nearest enemy for turret tracking */
  turretTargetX?: number
  turretTargetZ?: number
}

export function TankUnit({ unit, physicsControlled = false, turretTargetX, turretTargetZ }: TankUnitProps) {
  const bodyRef = useRef<THREE.Group>(null!)
  const turretRef = useRef<THREE.Group | null>(null)

  // Build tank mesh once
  useEffect(() => {
    if (!bodyRef.current) return
    // Clear any existing children
    while (bodyRef.current.children.length) {
      bodyRef.current.remove(bodyRef.current.children[0])
    }

    const color = unit.team === 'green' ? TOY.armyGreen : TOY.sandBrown
    const mainMat = getPlasticMat(color)
    const darkMat = getPlasticMat(TOY.darkGreen)
    const metalMat = getPlasticMat(TOY.metalDark)

    // Hull
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), mainMat)
    hull.position.y = 0.2
    hull.castShadow = true
    bodyRef.current.add(hull)

    // Front slope
    const slope = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.48), mainMat)
    slope.position.set(0.35, 0.28, 0)
    slope.rotation.z = -0.3
    slope.castShadow = true
    bodyRef.current.add(slope)

    // Tracks (left + right)
    const trackGeo = new THREE.BoxGeometry(0.85, 0.12, 0.12)
    const leftTrack = new THREE.Mesh(trackGeo, darkMat)
    leftTrack.position.set(0, 0.1, 0.3)
    leftTrack.castShadow = true
    bodyRef.current.add(leftTrack)

    const rightTrack = new THREE.Mesh(trackGeo, darkMat)
    rightTrack.position.set(0, 0.1, -0.3)
    rightTrack.castShadow = true
    bodyRef.current.add(rightTrack)

    // Turret group
    const turretGrp = new THREE.Group()
    turretGrp.position.set(0, 0.35, 0)

    const turret = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.15, 8),
      mainMat,
    )
    turret.castShadow = true
    turretGrp.add(turret)

    // Barrel
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6),
      metalMat,
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.02, 0.35)
    barrel.castShadow = true
    turretGrp.add(barrel)

    bodyRef.current.add(turretGrp)
    turretRef.current = turretGrp
  }, [unit.team])

  useFrame((_, delta) => {
    if (!bodyRef.current) return

    // Position — when physics controlled, parent RigidBody handles this
    if (!physicsControlled) {
      bodyRef.current.position.set(
        unit.position[0],
        Math.max(0, unit.position[1]),
        unit.position[2],
      )
    }

    // Hull rotation — face movement direction
    const targetRot = unit.facingAngle ?? unit.rotation
    bodyRef.current.rotation.y = THREE.MathUtils.lerp(
      bodyRef.current.rotation.y,
      targetRot,
      Math.min(1, delta * 4),
    )

    // Turret tracking — aim at nearest enemy
    if (turretRef.current && turretTargetX !== undefined && turretTargetZ !== undefined) {
      const pos = physicsControlled
        ? bodyRef.current.parent?.position ?? bodyRef.current.position
        : bodyRef.current.position
      const dx = turretTargetX - pos.x
      const dz = turretTargetZ - pos.z
      const targetAngle = Math.atan2(dx, dz)
      // Turret rotation is relative to hull
      turretRef.current.rotation.y = THREE.MathUtils.lerp(
        turretRef.current.rotation.y,
        targetAngle - bodyRef.current.rotation.y,
        Math.min(1, delta * 6),
      )
    }
  })

  return <group ref={bodyRef} />
}
