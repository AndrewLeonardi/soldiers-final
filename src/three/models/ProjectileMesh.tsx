import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Projectile } from '@config/types'

interface ProjectileMeshProps {
  projectile: Projectile
}

export function ProjectileMesh({ projectile }: ProjectileMeshProps) {
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!ref.current) return
    ref.current.position.set(
      projectile.position[0],
      projectile.position[1],
      projectile.position[2],
    )

    // Orient along velocity
    const vx = projectile.velocity[0]
    const vy = projectile.velocity[1]
    const vz = projectile.velocity[2]
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz)
    if (len > 0.01) {
      const dir = new THREE.Vector3(vx / len, vy / len, vz / len)
      const quat = new THREE.Quaternion()
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      ref.current.quaternion.copy(quat)
    }
  })

  if (projectile.type === 'rocket') {
    return (
      <group ref={ref} position={projectile.position}>
        {/* Rocket body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.05, 0.2, 6]} />
          <meshStandardMaterial color={0x555555} roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Orange glow / flame */}
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.06, 6, 4]} />
          <meshStandardMaterial
            color={0xff6600}
            emissive={0xff4400}
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
    )
  }

  // Bullet
  return (
    <group ref={ref} position={projectile.position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.1, 4]} />
        <meshStandardMaterial
          color={0xffdd44}
          emissive={0xffaa00}
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  )
}
