import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── A rotating pencil/ruler arm on a pivot that sweeps soldiers off ──
// Sweeps every few seconds. Units in path get LAUNCHED.

const ARM_LENGTH = 4.0
const ARM_HEIGHT = 0.5 // height above ground where it sweeps
const pivotGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.4, 8)
const pivotMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.3, metalness: 0.6 })

interface SweepingArmProps {
  position: [number, number, number]
  speed?: number // radians per second (default ~0.8)
  /** Angle driven by battle tick (keeps visual in sync with physics) */
  angle: number
}

export function SweepingArmMesh({ position, speed = 0.8, angle }: SweepingArmProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const armRef = useRef<THREE.Group>(null!)

  // Build the pencil arm geometry once
  const armGeo = useMemo(() => new THREE.BoxGeometry(ARM_LENGTH, 0.08, 0.12), [])

  useFrame(() => {
    if (!armRef.current) return
    // Driven by battle tick's hazard.age * speed — no drift
    armRef.current.rotation.y = angle
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Pivot base (metal cylinder on ground) */}
      <mesh geometry={pivotGeo} material={pivotMat} position={[0, 0.2, 0]} castShadow />

      {/* Rotating arm group */}
      <group ref={armRef} position={[0, ARM_HEIGHT, 0]}>
        {/* Pencil body (yellow) */}
        <mesh geometry={armGeo} position={[ARM_LENGTH / 2 - 0.3, 0, 0]} castShadow>
          <meshStandardMaterial color={0xf0c040} roughness={0.5} />
        </mesh>
        {/* Pencil tip (dark) */}
        <mesh position={[ARM_LENGTH - 0.3, 0, 0]} castShadow>
          <coneGeometry args={[0.06, 0.2, 6]} />
          <meshStandardMaterial color={0x333333} roughness={0.6} />
        </mesh>
        {/* Eraser end (pink) */}
        <mesh position={[-0.35, 0, 0]} castShadow>
          <boxGeometry args={[0.15, 0.1, 0.14]} />
          <meshStandardMaterial color={0xe87a90} roughness={0.7} />
        </mesh>
        {/* Metal ferrule (silver band before eraser) */}
        <mesh position={[-0.22, 0, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.065, 0.06, 8]} />
          <meshStandardMaterial color={0xaaaaaa} roughness={0.2} metalness={0.8} />
        </mesh>
      </group>
    </group>
  )
}

/** Get the current tip position of the sweeping arm in world space */
export function getSweepArmTip(position: [number, number, number], age: number, speed: number): THREE.Vector3 {
  const angle = age * speed
  return new THREE.Vector3(
    position[0] + Math.cos(angle) * (ARM_LENGTH - 0.3),
    ARM_HEIGHT,
    position[2] + Math.sin(angle) * (ARM_LENGTH - 0.3),
  )
}

export const SWEEP_ARM_LENGTH = ARM_LENGTH
export const SWEEP_ARM_HEIGHT = ARM_HEIGHT
