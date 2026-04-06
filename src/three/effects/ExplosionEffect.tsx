import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Shared geometries (created once, reused) ──
const fireballGeo = new THREE.SphereGeometry(1, 12, 8)
const debrisGeoBox = new THREE.BoxGeometry(0.05, 0.05, 0.05)
const debrisGeoSphere = new THREE.SphereGeometry(0.03, 4, 4)

const fireballMatOuter = new THREE.MeshBasicMaterial({
  color: 0xff6622,
  transparent: true,
  opacity: 1,
  depthWrite: false,
})

const fireballMatInner = new THREE.MeshBasicMaterial({
  color: 0xffcc44,
  transparent: true,
  opacity: 1,
  depthWrite: false,
})

// ── Shared debris materials (cached per color, never disposed) ──
const DEBRIS_COLORS = [0xb8a870, 0x8b7d5c, 0x4a5a3a, 0x777777, 0x6b4226]
const debrisMatCache = new Map<number, THREE.MeshStandardMaterial>()
function getDebrisMaterial(color: number): THREE.MeshStandardMaterial {
  if (!debrisMatCache.has(color)) {
    debrisMatCache.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }))
  }
  return debrisMatCache.get(color)!
}

interface DebrisParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotSpeed: THREE.Vector3
  lifetime: number
  removed: boolean
}

interface ExplosionEffectProps {
  position: [number, number, number]
  scale?: number
  onComplete: () => void
}

export function ExplosionEffect({ position, scale = 1, onComplete }: ExplosionEffectProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const outerRef = useRef<THREE.Mesh>(null!)
  const innerRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)
  const age = useRef(0)
  const debris = useRef<DebrisParticle[]>([])
  const initialized = useRef(false)
  const outerMatRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const innerMatRef = useRef<THREE.MeshBasicMaterial | null>(null)

  // Cleanup on unmount: dispose cloned fireball materials, remove debris meshes
  useEffect(() => {
    return () => {
      outerMatRef.current?.dispose()
      innerMatRef.current?.dispose()
      // Remove debris meshes from group (shared materials/geometries NOT disposed)
      for (const p of debris.current) {
        if (p.mesh.parent) p.mesh.parent.remove(p.mesh)
      }
      debris.current = []
    }
  }, [])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    age.current += delta

    if (!groupRef.current) return

    // Initialize debris particles on first frame
    if (!initialized.current) {
      initialized.current = true
      const count = 8 + Math.floor(Math.random() * 5) // 8-12 particles
      for (let i = 0; i < count; i++) {
        const geo = Math.random() > 0.5 ? debrisGeoBox : debrisGeoSphere
        const color = DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)]
        const mat = getDebrisMaterial(color) // shared, not cloned
        const mesh = new THREE.Mesh(geo, mat)
        mesh.castShadow = true
        mesh.position.set(0, 0.1, 0)

        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 5
        const upSpeed = 2 + Math.random() * 4

        const particle: DebrisParticle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            upSpeed,
            Math.sin(angle) * speed,
          ),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
          ),
          lifetime: 1.2 + Math.random() * 1.0,
          removed: false,
        }
        debris.current.push(particle)
        groupRef.current.add(mesh)
      }

      // Track cloned materials for disposal
      if (outerRef.current) outerMatRef.current = outerRef.current.material as THREE.MeshBasicMaterial
      if (innerRef.current) innerMatRef.current = innerRef.current.material as THREE.MeshBasicMaterial
    }

    const t = age.current

    // ── Fireball animation ──
    if (outerRef.current) {
      const outerScale = Math.min(2.0 * scale, t * 8 * scale)
      outerRef.current.scale.setScalar(outerScale)
      const outerMat = outerRef.current.material as THREE.MeshBasicMaterial
      outerMat.opacity = Math.max(0, 1 - t * 2.5)
      outerRef.current.visible = t < 0.5
    }

    if (innerRef.current) {
      const innerScale = Math.min(1.2 * scale, t * 6 * scale)
      innerRef.current.scale.setScalar(innerScale)
      const innerMat = innerRef.current.material as THREE.MeshBasicMaterial
      innerMat.opacity = Math.max(0, 1 - t * 3)
      innerRef.current.visible = t < 0.4
    }

    // ── Light flash ──
    if (lightRef.current) {
      lightRef.current.intensity = t < 0.2 ? (8 * scale) * (1 - t / 0.2) : 0
    }

    // ── Debris physics ──
    for (const p of debris.current) {
      if (p.removed) continue

      if (t > p.lifetime) {
        // Remove from scene graph instead of just hiding
        groupRef.current?.remove(p.mesh)
        p.removed = true
        continue
      }

      // Gravity
      p.velocity.y -= 12 * delta

      // Integrate position
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta))

      // Ground bounce
      if (p.mesh.position.y < 0.025) {
        p.mesh.position.y = 0.025
        p.velocity.y *= -0.3
        p.velocity.x *= 0.6
        p.velocity.z *= 0.6
      }

      // Tumble
      p.mesh.rotation.x += p.rotSpeed.x * delta
      p.mesh.rotation.z += p.rotSpeed.z * delta

      // Scale-fade near end of lifetime
      const lifeFrac = t / p.lifetime
      if (lifeFrac > 0.6) {
        const fadeScale = 1 - (lifeFrac - 0.6) / 0.4
        p.mesh.scale.setScalar(Math.max(0.01, fadeScale))
      }
    }

    // ── Self-cleanup ──
    if (t > 2.5) {
      onComplete()
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Outer fireball (orange) -- cloned material for independent opacity */}
      <mesh ref={outerRef} geometry={fireballGeo} material={fireballMatOuter.clone()} />
      {/* Inner fireball (bright yellow) */}
      <mesh ref={innerRef} geometry={fireballGeo} material={fireballMatInner.clone()} />
      {/* Flash point light */}
      <pointLight ref={lightRef} color={0xff6622} intensity={0} distance={8 * scale} />
    </group>
  )
}
