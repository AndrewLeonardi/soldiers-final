/**
 * Kitchen Table Props — the comedy objects.
 *
 * Each prop is a Rapier rigid body that reacts to physics forces.
 * A coffee mug tips and rolls when hit by explosions.
 * A cereal box shatters into chunks when destroyed.
 * A syrup bottle breaks and creates a sticky zone.
 *
 * These aren't scenery — they're weapons, hazards, and punchlines.
 */
import { useRef, useMemo } from 'react'
import { RigidBody, CuboidCollider, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { GROUP_PROP, GROUP_ENV } from '@three/physics/collisionGroups'
import type { PropConfig } from '@config/worlds/types'

// ── Cereal Box (destructible cover) ──────────────────
// Tall box that provides cover. When hit hard enough, shatters.
// For now: static until hit, then becomes dynamic debris.

export function CerealBox({ config }: { config: PropConfig }) {
  const boxW = 1.2
  const boxH = 2.0
  const boxD = 0.4

  return (
    <RigidBody
      type="dynamic"
      position={config.position}
      rotation={config.rotation ?? [0, 0, 0]}
      collisionGroups={GROUP_PROP}
      mass={3}
      linearDamping={1.0}
      angularDamping={2.0}
      restitution={0.1}
      friction={0.7}
    >
      <CuboidCollider args={[boxW / 2, boxH / 2, boxD / 2]} position={[0, boxH / 2, 0]} />
      <mesh position={[0, boxH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[boxW, boxH, boxD]} />
        <meshStandardMaterial color={0xdd8833} roughness={0.6} />
      </mesh>
      {/* Label stripe */}
      <mesh position={[0, boxH * 0.65, boxD / 2 + 0.001]} castShadow>
        <planeGeometry args={[boxW * 0.8, boxH * 0.25]} />
        <meshStandardMaterial color={0xcc2222} roughness={0.5} />
      </mesh>
      {/* Top flap */}
      <mesh position={[0, boxH + 0.02, 0]} castShadow>
        <boxGeometry args={[boxW, 0.04, boxD]} />
        <meshStandardMaterial color={0xcc7722} roughness={0.6} />
      </mesh>
    </RigidBody>
  )
}

// ── Coffee Mug (knockable — tips and rolls!) ─────────
// The comedy prop. When an explosion hits nearby, the mug tips
// over and ROLLS across the table, crushing anything in its path.
// Uses a cylinder collider for natural rolling behavior.

export function CoffeeMug({ config }: { config: PropConfig }) {
  const mugRadius = 0.5
  const mugHeight = 0.7

  return (
    <RigidBody
      type="dynamic"
      position={config.position}
      collisionGroups={GROUP_PROP}
      mass={2}
      linearDamping={0.3}    // low damping = rolls far
      angularDamping={0.5}   // keeps rolling
      restitution={0.2}
      friction={0.4}
    >
      <CylinderCollider args={[mugHeight / 2, mugRadius]} position={[0, mugHeight / 2, 0]} />

      {/* Mug body — cylinder */}
      <mesh position={[0, mugHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[mugRadius, mugRadius * 0.9, mugHeight, 16]} />
        <meshStandardMaterial color={0xeeeeee} roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Mug handle */}
      <mesh position={[mugRadius + 0.12, mugHeight * 0.45, 0]} castShadow>
        <torusGeometry args={[0.15, 0.04, 8, 12, Math.PI]} />
        <meshStandardMaterial color={0xdddddd} roughness={0.3} />
      </mesh>

      {/* Coffee inside (dark circle on top) */}
      <mesh position={[0, mugHeight - 0.02, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[mugRadius * 0.85, 16]} />
        <meshStandardMaterial color={0x3d1c02} roughness={0.8} />
      </mesh>

      {/* Mug rim */}
      <mesh position={[0, mugHeight, 0]} castShadow>
        <cylinderGeometry args={[mugRadius + 0.03, mugRadius + 0.03, 0.04, 16]} />
        <meshStandardMaterial color={0xdddddd} roughness={0.3} />
      </mesh>
    </RigidBody>
  )
}

// ── Syrup Bottle (breaks into sticky zone) ───────────
// Tall bottle. When destroyed by explosions, it "breaks" and
// creates a sticky zone that slows movement.
// For now: a static prop that can be knocked over.

export function SyrupBottle({ config }: { config: PropConfig }) {
  const bottleRadius = 0.25
  const bottleHeight = 1.4

  return (
    <RigidBody
      type="dynamic"
      position={config.position}
      collisionGroups={GROUP_PROP}
      mass={1.5}
      linearDamping={0.5}
      angularDamping={1.0}
      restitution={0.1}
      friction={0.6}
    >
      <CylinderCollider args={[bottleHeight / 2, bottleRadius]} position={[0, bottleHeight / 2, 0]} />

      {/* Bottle body */}
      <mesh position={[0, bottleHeight * 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[bottleRadius, bottleRadius * 1.1, bottleHeight * 0.7, 12]} />
        <meshStandardMaterial color={0x8B6914} roughness={0.4} metalness={0.1} transparent opacity={0.85} />
      </mesh>

      {/* Bottle neck */}
      <mesh position={[0, bottleHeight * 0.8, 0]} castShadow>
        <cylinderGeometry args={[bottleRadius * 0.4, bottleRadius * 0.7, bottleHeight * 0.25, 12]} />
        <meshStandardMaterial color={0x8B6914} roughness={0.4} transparent opacity={0.85} />
      </mesh>

      {/* Cap */}
      <mesh position={[0, bottleHeight * 0.95, 0]} castShadow>
        <cylinderGeometry args={[bottleRadius * 0.35, bottleRadius * 0.35, 0.1, 12]} />
        <meshStandardMaterial color={0xcc2222} roughness={0.5} />
      </mesh>

      {/* Syrup inside (darker) */}
      <mesh position={[0, bottleHeight * 0.3, 0]}>
        <cylinderGeometry args={[bottleRadius * 0.85, bottleRadius * 0.95, bottleHeight * 0.5, 12]} />
        <meshStandardMaterial color={0x5a3a0a} roughness={0.8} />
      </mesh>

      {/* Label */}
      <mesh position={[0, bottleHeight * 0.45, bottleRadius + 0.001]} castShadow>
        <planeGeometry args={[bottleRadius * 1.2, bottleHeight * 0.2]} />
        <meshStandardMaterial color={0xffcc44} roughness={0.5} />
      </mesh>
    </RigidBody>
  )
}
