/**
 * Workshop Bench Props — industrial objects.
 *
 * Tape measure provides cover. Hammer topples dramatically.
 * Nuts and bolts scatter as tiny debris. Wood block is a platform.
 */
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { GROUP_PROP, GROUP_ENV } from '@three/physics/collisionGroups'
import { registerProp, unregisterProp, getProp } from '@engine/physics/propState'
import type { PropConfig } from '@config/worlds/types'

// ── Tape Measure (destructible cover/wall) ───────────
// Flat yellow rectangle that provides low cover.

export function TapeMeasure({ config }: { config: PropConfig }) {
  const bodyRef = useRef<RapierRigidBody>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const destroyed = useRef(false)

  useEffect(() => {
    registerProp({
      id: config.id,
      position: [...config.position],
      tags: config.tags,
      health: config.health ?? 120,
      maxHealth: config.health ?? 120,
      destroyed: false,
    })
    return () => unregisterProp(config.id)
  }, [config.id])

  useFrame(() => {
    if (destroyed.current) return
    const prop = getProp(config.id)
    if (prop?.destroyed) {
      destroyed.current = true
      if (groupRef.current) groupRef.current.visible = false
      if (bodyRef.current) bodyRef.current.setEnabled(false)
    } else if (prop && bodyRef.current) {
      const pos = bodyRef.current.translation()
      prop.position[0] = pos.x
      prop.position[1] = pos.y
      prop.position[2] = pos.z
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={config.position}
      collisionGroups={GROUP_PROP}
      mass={2}
      linearDamping={1.5}
      angularDamping={3.0}
      restitution={0.1}
      friction={0.8}
    >
      <group ref={groupRef}>
        <CuboidCollider args={[1.5, 0.15, 0.3]} position={[0, 0.15, 0]} />
        {/* Main body — yellow tape */}
        <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.0, 0.3, 0.6]} />
          <meshStandardMaterial color={0xddcc22} roughness={0.4} metalness={0.2} />
        </mesh>
        {/* Metal end clip */}
        <mesh position={[1.5, 0.15, 0]} castShadow>
          <boxGeometry args={[0.15, 0.35, 0.65]} />
          <meshStandardMaterial color={0x888888} roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Measurement marks */}
        <mesh position={[0, 0.31, 0]}>
          <planeGeometry args={[2.8, 0.25]} />
          <meshStandardMaterial color={0x222222} roughness={0.8} transparent opacity={0.3} />
        </mesh>
      </group>
    </RigidBody>
  )
}

// ── Hammer (heavy knockable — topples dramatically) ──
// High mass, low damping. When hit by an explosion, it topples
// and slides across the bench. The metal head is heavy.

export function Hammer({ config }: { config: PropConfig }) {
  return (
    <RigidBody
      type="dynamic"
      position={config.position}
      collisionGroups={GROUP_PROP}
      mass={8}
      linearDamping={0.3}
      angularDamping={0.5}
      restitution={0.15}
      friction={0.5}
    >
      {/* Handle — wooden cylinder */}
      <CuboidCollider args={[0.08, 0.6, 0.08]} position={[0, 0.6, 0]} />
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.07, 1.2, 8]} />
        <meshStandardMaterial color={0x8B6914} roughness={0.7} />
      </mesh>

      {/* Head — heavy metal block */}
      <CuboidCollider args={[0.2, 0.15, 0.12]} position={[0, 1.2, 0]} />
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.3, 0.24]} />
        <meshStandardMaterial color={0x666677} roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Face — flat striking surface */}
      <mesh position={[0.2, 1.2, 0]} castShadow>
        <boxGeometry args={[0.02, 0.28, 0.22]} />
        <meshStandardMaterial color={0x555566} roughness={0.2} metalness={0.8} />
      </mesh>
    </RigidBody>
  )
}

// ── Nuts and Bolts (small debris scatter) ────────────
// Cluster of tiny physics objects that scatter on explosion.

export function NutsAndBolts({ config }: { config: PropConfig }) {
  const positions = [
    [0, 0.06, 0],
    [0.2, 0.06, 0.15],
    [-0.15, 0.06, 0.1],
    [0.1, 0.06, -0.18],
    [-0.2, 0.06, -0.1],
  ]

  return (
    <group position={config.position}>
      {positions.map((pos, i) => (
        <RigidBody
          key={`nut-${config.id}-${i}`}
          type="dynamic"
          position={pos as [number, number, number]}
          collisionGroups={GROUP_PROP}
          mass={0.3}
          linearDamping={0.5}
          angularDamping={1.0}
          restitution={0.3}
          friction={0.4}
        >
          <CylinderCollider args={[0.03, 0.06]} />
          <mesh castShadow>
            <cylinderGeometry args={[0.06, 0.06, 0.06, 6]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? 0x888899 : 0x777788}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

// ── Wood Block (elevated platform) ───────────────────
// Fixed body. Soldiers placed on top get height advantage.

export function WoodBlock({ config }: { config: PropConfig }) {
  return (
    <RigidBody
      type="fixed"
      position={config.position}
      collisionGroups={GROUP_ENV}
    >
      <CuboidCollider args={[1.0, 0.4, 1.0]} position={[0, 0.4, 0]} />
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.0, 0.8, 2.0]} />
        <meshStandardMaterial color={0x8B6914} roughness={0.8} />
      </mesh>
      {/* Wood grain lines */}
      <mesh position={[0, 0.81, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshStandardMaterial color={0x7a5a10} roughness={0.9} transparent opacity={0.2} />
      </mesh>
    </RigidBody>
  )
}
