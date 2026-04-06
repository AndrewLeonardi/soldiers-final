import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Shared geometry (tiny sphere, reused across all sparks) ──
const sparkGeo = new THREE.SphereGeometry(0.02, 4, 4)
const sparkMat = new THREE.MeshBasicMaterial({
  color: 0xffdd44,
  transparent: true,
  opacity: 1,
  depthWrite: false,
})

// Flash core (bigger, brighter)
const flashGeo = new THREE.SphereGeometry(0.06, 6, 6)
const flashMat = new THREE.MeshBasicMaterial({
  color: 0xffffaa,
  transparent: true,
  opacity: 1,
  depthWrite: false,
})

interface SparkParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  removed: boolean
}

interface ImpactSparkProps {
  position: [number, number, number]
  onComplete: () => void
}

export function ImpactSpark({ position, onComplete }: ImpactSparkProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const flashRef = useRef<THREE.Mesh>(null!)
  const age = useRef(0)
  const particles = useRef<SparkParticle[]>([])
  const initialized = useRef(false)
  const flashMatClone = useRef<THREE.MeshBasicMaterial | null>(null)

  useEffect(() => {
    return () => {
      flashMatClone.current?.dispose()
      for (const p of particles.current) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh)
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
      const count = 3 + Math.floor(Math.random() * 3) // 3-5 sparks
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(sparkGeo, sparkMat)
        const angle = Math.random() * Math.PI * 2
        const speed = 3 + Math.random() * 5
        const upSpeed = 2 + Math.random() * 3
        const particle: SparkParticle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            upSpeed,
            Math.sin(angle) * speed,
          ),
          removed: false,
        }
        particles.current.push(particle)
        groupRef.current.add(mesh)
      }
      if (flashRef.current) {
        flashMatClone.current = flashRef.current.material as THREE.MeshBasicMaterial
      }
    }

    const t = age.current

    // Flash core — bright then fades fast
    if (flashRef.current && flashMatClone.current) {
      const flashScale = Math.min(1.5, t * 20)
      flashRef.current.scale.setScalar(flashScale)
      flashMatClone.current.opacity = Math.max(0, 1 - t * 8)
      flashRef.current.visible = t < 0.15
    }

    // Spark particles — shoot outward then die
    for (const p of particles.current) {
      if (p.removed) continue
      if (t > 0.15) {
        groupRef.current?.remove(p.mesh)
        p.removed = true
        continue
      }
      p.velocity.y -= 20 * delta // quick gravity
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta))
      const scale = Math.max(0.1, 1 - t * 7)
      p.mesh.scale.setScalar(scale)
    }

    if (t > 0.2) {
      onComplete()
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={flashRef} geometry={flashGeo} material={flashMat.clone()} />
    </group>
  )
}
