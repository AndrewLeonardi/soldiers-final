import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Shared geometry/materials ──
const barrelGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.6, 12)
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.3 })
const stripeMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4, metalness: 0.1 })
const stripeGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.08, 12)
const warningGeo = new THREE.BoxGeometry(0.12, 0.12, 0.01)
const warningMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 })

interface ExplosiveBarrelProps {
  position: [number, number, number]
  rotation?: number
  alive: boolean
}

export function ExplosiveBarrelMesh({ position, rotation = 0, alive }: ExplosiveBarrelProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const pulseRef = useRef<THREE.Mesh>(null!)

  // Subtle warning pulse on the stripe
  useFrame(() => {
    if (!pulseRef.current || !alive) return
    const t = Date.now() * 0.003
    const emissive = 0.1 + Math.sin(t) * 0.05
    ;(pulseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = emissive
  })

  if (!alive) return null

  return (
    <group ref={groupRef} position={position} rotation-y={rotation}>
      {/* Main barrel body */}
      <mesh geometry={barrelGeo} material={barrelMat} position={[0, 0.3, 0]} castShadow receiveShadow />
      {/* Orange warning stripe */}
      <mesh ref={pulseRef} geometry={stripeGeo} position={[0, 0.35, 0]} castShadow>
        <meshStandardMaterial color={0xff6600} roughness={0.4} emissive={0xff4400} emissiveIntensity={0.1} />
      </mesh>
      {/* Top stripe */}
      <mesh geometry={stripeGeo} position={[0, 0.52, 0]} castShadow>
        <meshStandardMaterial color={0xff6600} roughness={0.4} />
      </mesh>
      {/* Warning symbol (yellow diamond) */}
      <mesh geometry={warningGeo} material={warningMat}
        position={[0, 0.35, 0.27]}
        rotation={[0, 0, Math.PI / 4]}
      />
      {/* Lid rim */}
      <mesh position={[0, 0.61, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.03, 12]} />
        <meshStandardMaterial color={0x333333} roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  )
}
