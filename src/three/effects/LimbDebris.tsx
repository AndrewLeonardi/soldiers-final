/**
 * LimbDebris — a small colored chunk that flies away when a limb is blown off.
 * Uses simple Three.js animation (no Rapier body) to keep it lightweight.
 * Self-removes after lifetime via onComplete callback.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TOY, getPlasticMat } from '@three/models/materials'
import type { DismemberableLimb } from '@three/models/flexSoldier'

// Shared geometry per limb type
const geoCache = new Map<string, THREE.BufferGeometry>()
function getLimbGeo(limb: DismemberableLimb): THREE.BufferGeometry {
  if (!geoCache.has(limb)) {
    switch (limb) {
      case 'leftArm':
      case 'rightArm':
        geoCache.set(limb, new THREE.CylinderGeometry(0.04, 0.03, 0.28, 6))
        break
      case 'leftLeg':
      case 'rightLeg':
        geoCache.set(limb, new THREE.CylinderGeometry(0.06, 0.05, 0.35, 6))
        break
      case 'head':
        geoCache.set(limb, new THREE.SphereGeometry(0.1, 8, 6))
        break
    }
  }
  return geoCache.get(limb)!
}

interface LimbDebrisProps {
  position: [number, number, number]
  velocity: [number, number, number]
  team: 'green' | 'tan'
  limb: DismemberableLimb
  onComplete: () => void
}

const LIFETIME = 3.0
const GRAVITY = -12

export function LimbDebris({ position, velocity, team, limb, onComplete }: LimbDebrisProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const age = useRef(0)
  const vel = useRef(new THREE.Vector3(...velocity))
  const spin = useRef(new THREE.Vector3(
    (Math.random() - 0.5) * 8,
    (Math.random() - 0.5) * 6,
    (Math.random() - 0.5) * 8,
  ))

  const color = team === 'green' ? TOY.armyGreen : TOY.sandBrown
  const mat = getPlasticMat(color)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    age.current += delta
    if (age.current > LIFETIME) { onComplete(); return }

    const mesh = meshRef.current
    if (!mesh) return

    // Gravity
    vel.current.y += GRAVITY * delta

    // Move
    mesh.position.x += vel.current.x * delta
    mesh.position.y += vel.current.y * delta
    mesh.position.z += vel.current.z * delta

    // Ground bounce
    if (mesh.position.y < 0.05) {
      mesh.position.y = 0.05
      vel.current.y *= -0.3
      vel.current.x *= 0.7
      vel.current.z *= 0.7
      spin.current.multiplyScalar(0.5)
    }

    // Spin
    mesh.rotation.x += spin.current.x * delta
    mesh.rotation.y += spin.current.y * delta
    mesh.rotation.z += spin.current.z * delta

    // Fade out in last second
    if (age.current > LIFETIME - 1.0) {
      const fade = (LIFETIME - age.current) / 1.0
      mesh.scale.setScalar(fade)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      geometry={getLimbGeo(limb)}
      material={mat}
      castShadow
    />
  )
}
