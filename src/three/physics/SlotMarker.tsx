import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlacementSlot } from '@config/types'

interface SlotMarkerProps {
  slot: PlacementSlot
}

export function SlotMarker({ slot }: SlotMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.getElapsedTime()

    // Pulse opacity
    const pulse = 0.4 + Math.sin(t * 3 + slot.pos[0]) * 0.2
    const mat = ringRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = slot.occupied ? 0.1 : pulse

    // Gentle hover
    ringRef.current.position.y = slot.pos[1] + 0.02 + Math.sin(t * 2) * 0.01
  })

  const color = slot.occupied ? 0x666666 : slot.type === 'elevated' ? 0xd4aa40 : 0x4ADE80

  return (
    <group position={slot.pos}>
      {/* Glowing ring */}
      <mesh
        ref={ringRef}
        rotation-x={-Math.PI / 2}
        position-y={0.02}
      >
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center dot */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <circleGeometry args={[0.08, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  )
}
