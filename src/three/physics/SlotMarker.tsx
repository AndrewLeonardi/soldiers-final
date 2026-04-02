import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PlacementSlot } from '@config/types'

interface SlotMarkerProps {
  slot: PlacementSlot
  isTarget: boolean
  onPointerDown: () => void
}

export function SlotMarker({ slot, isTarget, onPointerDown }: SlotMarkerProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.getElapsedTime()

    const pulse = isTarget
      ? 0.7 + Math.sin(t * 6) * 0.3
      : 0.4 + Math.sin(t * 3 + slot.pos[0]) * 0.2
    const mat = ringRef.current.material as THREE.MeshStandardMaterial
    mat.opacity = slot.occupied ? 0.1 : pulse

    ringRef.current.position.y = slot.pos[1] + 0.02 + Math.sin(t * 2) * 0.01
  })

  const color = slot.occupied
    ? 0x666666
    : isTarget
      ? 0x4ADE80
      : slot.type === 'elevated'
        ? 0xd4aa40
        : 0x4ADE80

  const scale = isTarget ? 1.3 : 1

  return (
    <group position={slot.pos}>
      {/* Clickable area (invisible, larger) */}
      {!slot.occupied && (
        <mesh
          rotation-x={-Math.PI / 2}
          position-y={0.01}
          onPointerDown={(e) => {
            e.stopPropagation()
            onPointerDown()
          }}
        >
          <circleGeometry args={[0.7, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Glowing ring */}
      <mesh
        ref={ringRef}
        rotation-x={-Math.PI / 2}
        position-y={0.02}
        scale={scale}
      >
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isTarget ? 1.0 : 0.5}
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Center dot */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.01} scale={scale}>
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
