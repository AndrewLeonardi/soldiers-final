/**
 * MuzzleSmoke — small smoke puff at muzzle position on fire.
 *
 * Follows DustCloud pattern: billboard planes that rise, expand, fade.
 * Lighter colors (grey/white) for gunsmoke aesthetic.
 */
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const smokeGeo = new THREE.PlaneGeometry(0.1, 0.1)
const SMOKE_COLORS = [0xaaaaaa, 0xcccccc, 0x999999]

interface SmokeParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  lifetime: number
  removed: boolean
}

interface MuzzleSmokeProps {
  position: [number, number, number]
  onComplete: () => void
}

export function MuzzleSmoke({ position, onComplete }: MuzzleSmokeProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const age = useRef(0)
  const particles = useRef<SmokeParticle[]>([])
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
      const count = 3 + Math.floor(Math.random() * 2) // 3-4 particles
      for (let i = 0; i < count; i++) {
        const color = SMOKE_COLORS[Math.floor(Math.random() * SMOKE_COLORS.length)] ?? 0xaaaaaa
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(smokeGeo, mat)
        mesh.rotation.z = Math.random() * Math.PI

        const angle = Math.random() * Math.PI * 2
        const speed = 0.3 + Math.random() * 0.4
        const particle: SmokeParticle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed * 0.3,
            0.3 + Math.random() * 0.5, // drift upward
            Math.sin(angle) * speed * 0.3,
          ),
          lifetime: 0.3 + Math.random() * 0.2,
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

      // Rise and drift
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta))
      p.velocity.multiplyScalar(0.94)

      // Expand (0.5 → 2.0 scale)
      const lifeFrac = t / p.lifetime
      const scale = 0.5 + lifeFrac * 1.5
      p.mesh.scale.setScalar(scale)

      // Fade out
      ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - lifeFrac)

      // Billboard: face camera
      p.mesh.lookAt(p.mesh.position.x, p.mesh.position.y + 10, p.mesh.position.z)
    }

    if (t > 0.5) {
      onComplete()
    }
  })

  return <group ref={groupRef} position={position} />
}
