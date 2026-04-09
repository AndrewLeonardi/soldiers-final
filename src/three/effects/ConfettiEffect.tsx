import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// ── Shared geometry + materials (created once) ──
const confettiGeo = new THREE.PlaneGeometry(0.15, 0.1)
const CONFETTI_COLORS = [0xd4aa40, 0x4ADE80, 0xffffff, 0xecc850, 0x88cc66]

const confettiMatCache = new Map<number, THREE.MeshBasicMaterial>()
function getConfettiMat(color: number): THREE.MeshBasicMaterial {
  if (!confettiMatCache.has(color)) {
    confettiMatCache.set(color, new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
    }))
  }
  return confettiMatCache.get(color)!
}

interface ConfettiParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  rotSpeed: THREE.Vector3
  flutterFreq: number
  flutterAmp: number
  lifetime: number
  removed: boolean
  baseX: number
}

interface ConfettiEffectProps {
  position: [number, number, number]
  onComplete: () => void
}

export function ConfettiEffect({ position, onComplete }: ConfettiEffectProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const age = useRef(0)
  const particles = useRef<ConfettiParticle[]>([])
  const initialized = useRef(false)

  useEffect(() => {
    return () => {
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

    // Initialize particles on first frame
    if (!initialized.current) {
      initialized.current = true
      const count = 45 + Math.floor(Math.random() * 15) // 45-60
      for (let i = 0; i < count; i++) {
        // `CONFETTI_COLORS` is a non-empty constant literal, so the
        // modulo index is always in bounds. The `?? 0xffffff` fallback
        // is strict noUncheckedIndexedAccess cover.
        const color =
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ??
          0xffffff
        const mat = getConfettiMat(color)
        const mesh = new THREE.Mesh(confettiGeo, mat.clone()) // clone for independent opacity
        mesh.position.set(
          (Math.random() - 0.5) * 6,
          Math.random() * 2,
          (Math.random() - 0.5) * 4,
        )

        const angle = Math.random() * Math.PI * 2
        const speed = 1.5 + Math.random() * 3
        const upSpeed = 3 + Math.random() * 4

        const particle: ConfettiParticle = {
          mesh,
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed,
            upSpeed,
            Math.sin(angle) * speed * 0.6,
          ),
          rotSpeed: new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 10,
          ),
          flutterFreq: 3 + Math.random() * 5,
          flutterAmp: 0.3 + Math.random() * 0.5,
          lifetime: 3.0 + Math.random() * 1.5,
          removed: false,
          baseX: 0,
        }
        particle.baseX = mesh.position.x
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

      // Light gravity (floaty confetti feel)
      p.velocity.y -= 3 * delta

      // Air resistance
      p.velocity.x *= 0.995
      p.velocity.z *= 0.995

      // Integrate position
      p.baseX += p.velocity.x * delta
      p.mesh.position.y += p.velocity.y * delta
      p.mesh.position.z += p.velocity.z * delta

      // Flutter on X axis
      p.mesh.position.x = p.baseX + Math.sin(t * p.flutterFreq) * p.flutterAmp

      // Tumble rotation
      p.mesh.rotation.x += p.rotSpeed.x * delta
      p.mesh.rotation.y += p.rotSpeed.y * delta
      p.mesh.rotation.z += p.rotSpeed.z * delta

      // Fade out near end of lifetime
      const lifeFrac = t / p.lifetime
      if (lifeFrac > 0.6) {
        const fadeOpacity = 1 - (lifeFrac - 0.6) / 0.4
        ;(p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, fadeOpacity)
      }

      // Ground clamp
      if (p.mesh.position.y < 0.02) {
        p.mesh.position.y = 0.02
        p.velocity.y = 0
        p.velocity.x *= 0.5
        p.velocity.z *= 0.5
      }
    }

    // Self-cleanup
    if (t > 5.0) {
      onComplete()
    }
  })

  return <group ref={groupRef} position={position} />
}
