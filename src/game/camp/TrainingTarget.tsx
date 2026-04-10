/**
 * TrainingTarget — wooden training target stand.
 *
 * Sprint 2, Phase C1. Simple procedural wooden post + target board.
 * Visual-only, no physics. Stands at fixed positions in the camp.
 */
import { useRef } from 'react'
import * as THREE from 'three'

interface TrainingTargetProps {
  x: number
  z: number
}

const POST_COLOR = 0x5a3416
const BOARD_COLOR = 0xd4c4a0
const RING_COLOR = 0xcc3333
const CENTER_COLOR = 0xffcc00

export function TrainingTarget({ x, z }: TrainingTargetProps) {
  return (
    <group position={[x, 0, z]}>
      {/* Wooden post */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 1.0, 6]} />
        <meshStandardMaterial color={POST_COLOR} roughness={0.7} />
      </mesh>

      {/* Support strut (angled back) */}
      <mesh position={[-0.15, 0.3, -0.1]} rotation-z={0.4} castShadow>
        <cylinderGeometry args={[0.02, 0.025, 0.6, 6]} />
        <meshStandardMaterial color={POST_COLOR} roughness={0.7} />
      </mesh>

      {/* Target board */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.02]} />
        <meshStandardMaterial color={BOARD_COLOR} roughness={0.85} />
      </mesh>

      {/* Outer ring */}
      <mesh position={[0, 0.9, 0.011]}>
        <ringGeometry args={[0.1, 0.14, 16]} />
        <meshBasicMaterial color={RING_COLOR} side={THREE.DoubleSide} />
      </mesh>

      {/* Inner ring */}
      <mesh position={[0, 0.9, 0.012]}>
        <ringGeometry args={[0.04, 0.07, 12]} />
        <meshBasicMaterial color={RING_COLOR} side={THREE.DoubleSide} />
      </mesh>

      {/* Bullseye center */}
      <mesh position={[0, 0.9, 0.013]}>
        <circleGeometry args={[0.03, 10]} />
        <meshBasicMaterial color={CENTER_COLOR} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
