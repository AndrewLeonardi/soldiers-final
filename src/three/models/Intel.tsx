import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Intel({ position = [-7, 0, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3
    }
    if (glowRef.current) {
      const t = Date.now() * 0.003
      glowRef.current.scale.setScalar(1 + Math.sin(t) * 0.15)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t) * 0.1
    }
  })

  return (
    <group position={position}>
      {/* Pedestal */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.5]} />
        <meshStandardMaterial color={0x6b4226} roughness={0.6} />
      </mesh>

      {/* Briefcase */}
      <group ref={groupRef} position={[0, 0.55, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.12, 0.35]} />
          <meshStandardMaterial color={0x2a1a0a} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, 0.09, 0]}>
          <torusGeometry args={[0.08, 0.015, 8, 16, Math.PI]} />
          <meshStandardMaterial color={0xd4aa40} roughness={0.2} metalness={0.5} />
        </mesh>
        {/* Clasp */}
        <mesh position={[0, 0.01, 0.175]}>
          <boxGeometry args={[0.08, 0.04, 0.01]} />
          <meshStandardMaterial color={0xd4aa40} roughness={0.2} metalness={0.5} />
        </mesh>
        {/* "TOP SECRET" stripe */}
        <mesh position={[0, 0.062, 0]}>
          <boxGeometry args={[0.4, 0.002, 0.08]} />
          <meshBasicMaterial color={0xcc2222} />
        </mesh>
      </group>

      {/* Glow ring */}
      <mesh ref={glowRef} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshBasicMaterial color={0xffdd44} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Point light to draw the eye */}
      <pointLight color={0xffdd44} intensity={1.5} distance={4} position={[0, 0.8, 0]} />
    </group>
  )
}
