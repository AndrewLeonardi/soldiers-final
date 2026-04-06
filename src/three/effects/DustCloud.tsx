import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Shared geometry (tiny plane, reused) ──
const dustGeo = new THREE.PlaneGeometry(0.12, 0.12)
const DUST_COLORS = [0xc4a872, 0xb89860, 0xd4b888]
const dustMatCache = new Map<number, THREE.MeshBasicMaterial>()
function getDustMat(color: number): THREE.MeshBasicMaterial {
  if (!dustMatCache.has(color)) {
    dustMatCache.set(color, new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    }))
  }
  return dustMatCache.get(color)!
}

interface DustParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifetime: number
  removed: boolean
}

interface DustCloudProps {
  position: [number, number, number]
  intensity?: number // 0.5 = light puff, 1.0 = heavy landing
  onComplete: () => void
}

export function DustCloud({ position, intensity = 0.5, onComplete }: DustCloudProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const age = useRef(0)
  const particles = useRef<DustParticle[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    return () => {
      for (const p of particles.current) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh)
        ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
      }
      particles.current = []
    }
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    age.current += delta

    if (!groupRef.current) return

    if (!initialized.current) {
      initialized.current = true
      const count = Math.floor(3 + intensity * 3) // 3-6 particles
      for (let i = 0; i < count; i++) {
        const color = DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)]
        const mat = getDustMat(color).clone() // clone for independent opacity
        const mesh = new THREE.Mesh(dustGeo, mat)
        mesh.position.set(0, 0.02, 0)
        // Random billboard rotation
        mesh.rotation.z = Math.random() * Math.PI

        const angle = Math.random() * Math.PI * 2
        const speed = (0.5 + Math.random() * 1.0) * intensity
        const particle: DustParticle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            0.3 + Math.random() * 0.5 * intensity,
            Math.sin(angle) * speed,
          ),
          lifetime: 0.25 + Math.random() * 0.15,
          removed: false,
        }
        particles.current.push(particle)
        groupRef.current.add(mesh)
      }
    }

    const t = age.current

    for (const p of particles.current) {
      if (p.removed) continue
      if (t > p.lifetime) {
        groupRef.current?.remove(p.mesh)
        ;(p.mesh.material as THREE.MeshBasicMaterial).dispose()
        p.removed = true
        continue
      }

      // Expand outward, rise slightly
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta))
      p.velocity.multiplyScalar(0.92) // quick deceleration

      // Scale up (expanding puff)
      const lifeFrac = t / p.lifetime
      const scale = 1 + lifeFrac * 2
      p.mesh.scale.setScalar(scale)

      // Fade out
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - lifeFrac)

      // Billboard: always face camera
      p.mesh.lookAt(p.mesh.position.x, p.mesh.position.y + 10, p.mesh.position.z)
    }

    if (t > 0.5) {
      onComplete()
    }
  })

  return <group ref={groupRef} position={position} />
}
