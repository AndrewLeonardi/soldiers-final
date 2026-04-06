import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Spring launcher: launches soldiers straight up when they walk over it ──
// Compressed spring on the ground. Triggers on proximity. Cooldown between fires.

const TRIGGER_RADIUS = 0.6
const COOLDOWN = 3.0 // seconds between triggers
const LAUNCH_VELOCITY = 14 // upward speed

const basePlateGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.06, 12)
const basePlateMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.3, metalness: 0.7 })

interface SpringLauncherProps {
  position: [number, number, number]
  /** 0-1: 0 = compressed (ready), 1 = extended (just fired) */
  fireProgress: number
}

export function SpringLauncherMesh({ position, fireProgress }: SpringLauncherProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Spring coil height based on fire state
  const springHeight = 0.08 + fireProgress * 0.35
  const springScale = 1 - fireProgress * 0.3 // compress when ready, extend when fired

  return (
    <group ref={groupRef} position={position}>
      {/* Base plate */}
      <mesh geometry={basePlateGeo} material={basePlateMat} position={[0, 0.03, 0]} castShadow receiveShadow />

      {/* Spring coils (stacked torus rings) */}
      {[0, 1, 2, 3].map(i => {
        const y = 0.06 + i * 0.04 * (1 + fireProgress * 2)
        const scale = 1 - i * 0.05
        return (
          <mesh key={i} position={[0, y, 0]} scale={[scale, springScale, scale]} castShadow>
            <torusGeometry args={[0.15, 0.02, 6, 16]} />
            <meshStandardMaterial
              color={0xcc4444}
              roughness={0.3}
              metalness={0.6}
              emissive={0xff2200}
              emissiveIntensity={fireProgress * 0.3}
            />
          </mesh>
        )
      })}

      {/* Top plate (launches things) */}
      <mesh position={[0, 0.06 + springHeight, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.04, 12]} />
        <meshStandardMaterial color={0x888888} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Trigger zone indicator (subtle ring on ground) */}
      <mesh position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[TRIGGER_RADIUS - 0.05, TRIGGER_RADIUS, 24]} />
        <meshBasicMaterial color={0xff4444} transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export { TRIGGER_RADIUS, COOLDOWN, LAUNCH_VELOCITY }
