import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Projectile } from '@config/types'

interface ProjectileMeshProps {
  projectile: Projectile
}

export function ProjectileMesh({ projectile }: ProjectileMeshProps) {
  const ref = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)

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

    if (projectile.type === 'grenade') {
      // Grenades tumble
      ref.current.rotation.x += 0.15
      ref.current.rotation.z += 0.1
      // Pulse emissive to show it's live
      if (glowRef.current) {
        const t = Date.now() * 0.01
        const mat = glowRef.current.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 0.3 + Math.sin(t) * 0.3
      }
    } else if (len > 0.01) {
      const dir = new THREE.Vector3(vx / len, vy / len, vz / len)
      const quat = new THREE.Quaternion()
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
      ref.current.quaternion.copy(quat)
    }
  })

  if (projectile.type === 'rocket') {
    // Compute trail positions from velocity direction
    const vx = projectile.velocity[0]
    const vy = projectile.velocity[1]
    const vz = projectile.velocity[2]
    const len = Math.sqrt(vx * vx + vy * vy + vz * vz)
    const dirX = len > 0.01 ? -vx / len : 0
    const dirY = len > 0.01 ? -vy / len : 0
    const dirZ = len > 0.01 ? -vz / len : 0

    return (
      <group ref={ref} position={projectile.position}>
        {/* Rocket body */}
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.05, 0.2, 6]} />
          <meshStandardMaterial color={0x555555} roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Nose cone (red) */}
        <mesh position={[0, 0.12, 0]}>
          <coneGeometry args={[0.03, 0.06, 6]} />
          <meshStandardMaterial color={0xcc3333} roughness={0.4} />
        </mesh>
        {/* Primary flame glow */}
        <mesh position={[0, -0.12, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshBasicMaterial
            color={0xff6600}
            transparent
            opacity={0.9}
          />
        </mesh>
        {/* Exhaust trail spheres (fade behind rocket) */}
        <mesh position={[dirX * 0.2, dirY * 0.2 - 0.12, dirZ * 0.2]}>
          <sphereGeometry args={[0.06, 6, 4]} />
          <meshBasicMaterial color={0xff8833} transparent opacity={0.5} />
        </mesh>
        <mesh position={[dirX * 0.35, dirY * 0.35 - 0.12, dirZ * 0.35]}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshBasicMaterial color={0xffaa44} transparent opacity={0.25} />
        </mesh>
        {/* Smoke puff at tail */}
        <mesh position={[dirX * 0.5, dirY * 0.5 - 0.12, dirZ * 0.5]}>
          <sphereGeometry args={[0.1, 6, 4]} />
          <meshBasicMaterial color={0x999999} transparent opacity={0.12} />
        </mesh>
      </group>
    )
  }

  if (projectile.type === 'grenade') {
    return (
      <group ref={ref} position={projectile.position}>
        {/* Grenade body -- olive sphere with emissive pulse */}
        <mesh ref={glowRef} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial
            color={0x4a5a3a}
            emissive={0xff4400}
            emissiveIntensity={0.3}
            roughness={0.5}
          />
        </mesh>
        {/* Pin / fuse nub */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.04, 4]} />
          <meshStandardMaterial color={0x888888} roughness={0.3} metalness={0.4} />
        </mesh>
      </group>
    )
  }

  // ── Bullet (enhanced with glow + trail) ──
  const isGreen = projectile.team === 'green'
  const glowColor = isGreen ? 0x66ff66 : 0xff6644
  const bulletColor = isGreen ? 0xaaff88 : 0xffdd44

  return (
    <group ref={ref} position={projectile.position}>
      {/* Bullet body (bigger, brighter) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 4]} />
        <meshStandardMaterial
          color={bulletColor}
          emissive={bulletColor}
          emissiveIntensity={2}
        />
      </mesh>
      {/* Glow sphere around bullet */}
      <mesh>
        <sphereGeometry args={[0.05, 6, 4]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.4}
        />
      </mesh>
      {/* Trailing cylinder (tapered, fading) */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.015, 0.005, 0.18, 4]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  )
}
