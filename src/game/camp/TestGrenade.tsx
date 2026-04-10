/**
 * TestGrenade — dev-only tool for verifying destructibility.
 *
 * Sprint 1, Subsystem 2. Press `G` to drop a grenade-strength physics
 * impulse at the camera's orbit target. Destroys wall blocks, tower
 * blocks, and barbed wire identically.
 *
 * Gated to dev builds only (import.meta.env.DEV).
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BLAST } from '@engine/physics/battlePhysics'
import type { WallBlock } from '@three/models/Defenses'

interface TestGrenadeProps {
  wallBlocksRef: React.RefObject<Map<string, WallBlock[]>>
}

/** Explosion flash — expands and fades over 0.5s */
function ExplosionFlash({ position, onDone }: { position: THREE.Vector3; onDone: () => void }) {
  const ref = useRef<THREE.Mesh>(null!)
  const age = useRef(0)

  useFrame((_, delta) => {
    age.current += delta
    if (age.current > 0.5) {
      onDone()
      return
    }
    const scale = 1 + age.current * 8
    ref.current.scale.setScalar(scale)
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = 1 - age.current * 2
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial
        color={0xff6600}
        transparent
        opacity={1}
        emissive={0xff4400}
        emissiveIntensity={2}
      />
    </mesh>
  )
}

export function TestGrenade({ wallBlocksRef }: TestGrenadeProps) {
  const { controls } = useThree()
  const explosionsRef = useRef<THREE.Vector3[]>([])
  const [, setTick] = useRenderTick()

  const detonate = useCallback((center: THREE.Vector3) => {
    const blastConfig = BLAST.GRENADE
    const blastRadius = blastConfig.radius
    const cPos = center
    const tempPos = new THREE.Vector3()
    const blocksMap = wallBlocksRef.current

    if (!blocksMap) return

    let destroyed = 0
    for (const [, blocks] of blocksMap) {
      for (const block of blocks) {
        if (!block.alive || !block.mesh.visible) continue
        block.mesh.getWorldPosition(tempPos)
        const dist = cPos.distanceTo(tempPos)
        if (dist >= blastRadius) continue
        const force = (blastRadius - dist) / blastRadius
        const knockDir = tempPos.clone().sub(cPos).normalize()

        if (force > blastConfig.destroyThreshold) {
          block.alive = false
          block.settled = false
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
          destroyed++
        } else if (force > blastConfig.shakeThreshold) {
          block.settled = false
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
        }
      }
    }

    explosionsRef.current.push(center.clone())
    setTick()

    if (import.meta.env.DEV) {
      console.log(`[TestGrenade] 💥 at (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)}) — ${destroyed} blocks destroyed`)
    }
  }, [wallBlocksRef, setTick])

  // Listen for G key
  useEffect(() => {
    if (!import.meta.env.DEV) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        // Get the orbit target as the detonation point
        const ctrl = controls as any
        const target = ctrl?.target
        if (target) {
          detonate(new THREE.Vector3(target.x, 0.5, target.z))
        } else {
          detonate(new THREE.Vector3(0, 0.5, 0))
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [controls, detonate])

  const handleExplosionDone = useCallback((index: number) => {
    explosionsRef.current.splice(index, 1)
    setTick()
  }, [setTick])

  if (!import.meta.env.DEV) return null

  return (
    <>
      {explosionsRef.current.map((pos, i) => (
        <ExplosionFlash
          key={`test-exp-${i}-${pos.x.toFixed(2)}`}
          position={pos}
          onDone={() => handleExplosionDone(i)}
        />
      ))}
    </>
  )
}

/** Minimal re-render trigger without useState dependency on array */
function useRenderTick(): [number, () => void] {
  const ref = useRef(0)
  const [tick, setTickState] = useState(0)
  const setTick = useCallback(() => {
    ref.current++
    setTickState(ref.current)
  }, [])
  return [tick, setTick]
}