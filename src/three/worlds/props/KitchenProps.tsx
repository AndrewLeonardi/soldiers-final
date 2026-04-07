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
import { useRef, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, CylinderCollider, useRapier, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { GROUP_PROP, GROUP_ENV } from '@three/physics/collisionGroups'
import { registerProp, unregisterProp, getProp } from '@engine/physics/propState'
import { addStickyZone } from '@engine/physics/stickyZones'
import { triggerShake } from '@three/effects/ScreenShake'
import type { PropConfig } from '@config/worlds/types'

// ── Cereal Box (destructible cover) ──────────────────
// Tall box that provides cover. When hit hard enough, shatters.
// For now: static until hit, then becomes dynamic debris.

export function CerealBox({ config }: { config: PropConfig }) {
  const boxW = 1.2
  const boxH = 2.0
  const boxD = 0.4
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<RapierRigidBody>(null!)
  const destroyed = useRef(false)

  // Register with prop state system for explosion damage
  useEffect(() => {
    registerProp({
      id: config.id,
      position: [...config.position],
      tags: config.tags,
      health: config.health ?? 80,
      maxHealth: config.health ?? 80,
      destroyed: false,
    })
    return () => unregisterProp(config.id)
  }, [config.id])

  // Check for destruction each frame
  useFrame(() => {
    if (destroyed.current) return
    const prop = getProp(config.id)
    if (prop?.destroyed) {
      destroyed.current = true
      // Hide the mesh — prop is destroyed
      if (groupRef.current) groupRef.current.visible = false
      // Remove the rigid body from simulation
      if (bodyRef.current) {
        bodyRef.current.setEnabled(false)
      }
    } else if (prop && bodyRef.current) {
      // Sync position back to propState (so explosion distance checks work after being knocked)
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
      rotation={config.rotation ?? [0, 0, 0]}
      collisionGroups={GROUP_PROP}
      mass={3}
      linearDamping={1.0}
      angularDamping={2.0}
      restitution={0.1}
      friction={0.7}
    >
      <group ref={groupRef}>
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
      </group>
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
// When destroyed by explosions, the bottle disappears and creates
// a visual syrup puddle + sticky zone that slows ALL movement.

export function SyrupBottle({ config }: { config: PropConfig }) {
  const bottleRadius = 0.25
  const bottleHeight = 1.4
  const groupRef = useRef<THREE.Group>(null!)
  const bodyRef = useRef<RapierRigidBody>(null!)
  const puddleRef = useRef<THREE.Mesh>(null!)
  const destroyed = useRef(false)
  const stickyRadius = config.params?.stickyRadius ?? 2.0

  // Register with prop state for explosion damage
  useEffect(() => {
    registerProp({
      id: config.id,
      position: [...config.position],
      tags: config.tags,
      health: config.health ?? 40,
      maxHealth: config.health ?? 40,
      destroyed: false,
    })
    return () => unregisterProp(config.id)
  }, [config.id])

  // Check for destruction each frame
  useFrame(() => {
    if (destroyed.current) return
    const prop = getProp(config.id)
    if (prop?.destroyed) {
      destroyed.current = true
      // Hide bottle
      if (groupRef.current) groupRef.current.visible = false
      if (bodyRef.current) bodyRef.current.setEnabled(false)
      // Show puddle
      if (puddleRef.current) puddleRef.current.visible = true
      // Create sticky zone at current position
      const pos = bodyRef.current ? bodyRef.current.translation() : { x: config.position[0], y: 0, z: config.position[2] }
      addStickyZone({
        id: `sticky-${config.id}`,
        position: [pos.x, 0.01, pos.z],
        radius: stickyRadius,
        speedMultiplier: 0.3,
      })
    } else if (prop && bodyRef.current) {
      // Sync position for damage distance checks
      const pos = bodyRef.current.translation()
      prop.position[0] = pos.x
      prop.position[1] = pos.y
      prop.position[2] = pos.z
      // Update puddle position to follow bottle (before it breaks)
      if (puddleRef.current) {
        puddleRef.current.position.set(pos.x, 0.02, pos.z)
      }
    }
  })

  return (
    <>
    <RigidBody
      ref={bodyRef}
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
      <group ref={groupRef}>
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
      </group>
    </RigidBody>

    {/* Syrup puddle (hidden until bottle is destroyed) */}
    <mesh ref={puddleRef} position={config.position} rotation-x={-Math.PI / 2} visible={false}>
      <circleGeometry args={[stickyRadius, 24]} />
      <meshStandardMaterial color={0x8B6914} transparent opacity={0.4} roughness={1.0} />
    </mesh>
    </>
  )
}

// ── Mine (clickable explosive!) ──────────────────────
// Click to detonate. Applies Rapier impulse to nearby dynamic bodies.
// All animation uses mutable refs (no React re-renders in hot loop).

export function Mine({ config }: { config: PropConfig }) {
  const groupRef = useRef<THREE.Group>(null!)
  const flashRef = useRef<THREE.Mesh>(null!)
  const mineRef = useRef<THREE.Group>(null!)
  const state = useRef({ exploded: false, flashAge: -1, done: false })
  const { world } = useRapier()

  const blastRadius = config.params?.blastRadius ?? 4.0
  const blastForce = config.params?.blastForce ?? 10.0

  // Register as explosive prop — can be chain-detonated by other explosions
  useEffect(() => {
    registerProp({
      id: config.id,
      position: [...config.position],
      tags: config.tags,
      health: 1, // mines explode from any damage
      maxHealth: 1,
      destroyed: false,
      onExplode: (pos, radius, force) => {
        // This is called by applyExplosion when a chain reaction triggers this mine
        detonate()
      },
    })
    return () => unregisterProp(config.id)
  }, [config.id])

  const detonate = useCallback(() => {
    if (state.current.exploded) return
    state.current.exploded = true
    state.current.flashAge = 0
    triggerShake(0.2)

    // Hide mine mesh immediately
    if (mineRef.current) mineRef.current.visible = false
    // Show flash
    if (flashRef.current) flashRef.current.visible = true

    // Apply impulse to dynamic bodies in radius
    const cx = config.position[0]
    const cy = config.position[1] + 0.2
    const cz = config.position[2]

    world.bodies.forEach((body) => {
      if (!body.isDynamic()) return
      const pos = body.translation()
      const dx = pos.x - cx
      const dy = pos.y - cy
      const dz = pos.z - cz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist < blastRadius && dist > 0.01) {
        const f = ((blastRadius - dist) / blastRadius) * blastForce
        const invD = 1 / dist
        body.applyImpulse({
          x: dx * invD * f,
          y: Math.max(0.3, dy * invD + 0.5) * f * 0.8,
          z: dz * invD * f,
        }, true)
        body.wakeUp()
      }
    })
  }, [world, config.position, blastRadius, blastForce])

  // Check for chain-detonation from external explosions
  useFrame((_, delta) => {
    if (!state.current.exploded) {
      const prop = getProp(config.id)
      if (prop?.destroyed) detonate()
    }

    // Animate flash (zero React re-renders)
    const s = state.current
    if (s.flashAge < 0) return
    s.flashAge += delta
    if (flashRef.current) {
      const scale = 1 + s.flashAge * 12
      flashRef.current.scale.setScalar(scale)
      ;(flashRef.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 1 - s.flashAge * 3)
    }
    if (s.flashAge > 0.4) {
      s.flashAge = -1
      s.done = true
      if (groupRef.current) groupRef.current.visible = false
    }
  })

  return (
    <group ref={groupRef} position={config.position}>
      {/* Mine body */}
      <group ref={mineRef}>
        <mesh
          position={[0, 0.08, 0]}
          castShadow
          onClick={(e) => { e.stopPropagation(); detonate() }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = 'default' }}
        >
          <cylinderGeometry args={[0.3, 0.35, 0.15, 12]} />
          <meshStandardMaterial color={0x556b2f} roughness={0.6} metalness={0.3} />
        </mesh>
        {/* Danger stripe */}
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.31, 0.36, 0.05, 12]} />
          <meshStandardMaterial color={0xccaa00} roughness={0.5} />
        </mesh>
        {/* Trigger button */}
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 8]} />
          <meshStandardMaterial color={0xcc2222} roughness={0.4} emissive={0xcc2222} emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Explosion flash (hidden until detonation) */}
      <mesh ref={flashRef} position={[0, 0.5, 0]} visible={false}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color={0xff6600} transparent opacity={1}
          emissive={0xff4400} emissiveIntensity={3}
        />
      </mesh>
    </group>
  )
}
