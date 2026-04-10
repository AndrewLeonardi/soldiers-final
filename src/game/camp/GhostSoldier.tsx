/**
 * GhostSoldier — translucent soldier for training spectacle.
 *
 * Sprint 2, Phase C1. Visual-only, no physics.
 * Uses createFlexSoldier but applies transparent materials after creation.
 * Champion gets full opacity + slight scale-up; ghosts are dim silhouettes.
 */
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createFlexSoldier } from '@three/models/flexSoldier'
import { TOY } from '@three/models/materials'

interface GhostSoldierProps {
  x: number
  z: number
  rotation: number
  opacity: number
  isChampion?: boolean
  justFired?: boolean
}

/** Apply opacity to all meshes in a group recursively */
function setGroupOpacity(group: THREE.Group, opacity: number) {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const mat = child.material as THREE.MeshStandardMaterial
      if (!mat.transparent) {
        mat.transparent = true
      }
      mat.opacity = opacity
    }
  })
}

export function GhostSoldier({ x, z, rotation, opacity, isChampion, justFired }: GhostSoldierProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const muzzleRef = useRef<THREE.PointLight>(null!)
  const targetOpacity = useRef(opacity)
  const currentOpacity = useRef(opacity)

  const soldier = useMemo(() => {
    const color = isChampion ? TOY.armyGreen : 0x556b55
    return createFlexSoldier(color)
  }, [isChampion])

  // Mount soldier group
  useEffect(() => {
    if (groupRef.current && soldier) {
      groupRef.current.add(soldier.group)
      setGroupOpacity(soldier.group, opacity)
      return () => { groupRef.current?.remove(soldier.group) }
    }
  }, [soldier, opacity])

  // Update opacity smoothly
  useEffect(() => {
    targetOpacity.current = opacity
  }, [opacity])

  // Animate position, rotation, opacity
  useFrame((_, delta) => {
    if (!groupRef.current || !soldier) return

    // Position — placed at camp footprint coordinates
    groupRef.current.position.set(x, 0, z)
    groupRef.current.rotation.y = rotation

    // Smooth opacity changes
    const diff = targetOpacity.current - currentOpacity.current
    if (Math.abs(diff) > 0.01) {
      currentOpacity.current += diff * Math.min(1, delta * 8)
      setGroupOpacity(soldier.group, currentOpacity.current)
    }

    // Champion scale
    const targetScale = isChampion ? 1.15 : 1.0
    const s = groupRef.current.scale.x
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(s, targetScale, Math.min(1, delta * 6)))

    // Muzzle flash on fire
    if (muzzleRef.current) {
      muzzleRef.current.intensity = justFired
        ? THREE.MathUtils.lerp(muzzleRef.current.intensity, 3, 0.3)
        : THREE.MathUtils.lerp(muzzleRef.current.intensity, 0, Math.min(1, delta * 15))
    }
  })

  return (
    <group ref={groupRef}>
      {/* Muzzle flash light for champion */}
      {isChampion && (
        <pointLight
          ref={muzzleRef}
          position={[0, 0.8, 0.3]}
          color={0xffaa44}
          intensity={0}
          distance={2}
        />
      )}
    </group>
  )
}
