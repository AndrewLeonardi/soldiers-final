/**
 * 3D Training Arena — visualizes the headless training simulation.
 *
 * Renders: soldier with weapon, red soda-can targets, projectile trails,
 * explosion effects. All positions driven by trainingStore.simState.
 * The useFrame hook drives the training tick loop.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useTrainingStore } from '@stores/trainingStore'
import { createFlexSoldier, poseIdle, poseShoot, poseAim, poseThrow } from '@three/models/flexSoldier'
import { applyWeaponToSoldier } from '@three/models/weaponMeshes'
import { getPlasticMat } from '@three/models/materials'
import type { RocketSimState } from '@engine/ml/scenarios/rocketScenario'
import type { GrenadeSimState } from '@engine/ml/scenarios/grenadeScenario'
import type { MGSimState } from '@engine/ml/scenarios/machineGunScenario'

// Colors
const TARGET_RED = '#cc3333'
const TARGET_RIM = '#888888'
const EXPLOSION_COLOR = '#ff8800'

function ArenaGround() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[5, 0, 0]}>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color="#c2a87d" roughness={0.9} />
      </mesh>
      {/* Boundary posts */}
      {[[-1, 0, -5], [-1, 0, 5], [13, 0, -5], [13, 0, 5]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function TargetCan({ position, alive }: { position: [number, number, number]; alive: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const explosionRef = useRef<THREE.Mesh>(null)
  const wasAlive = useRef(true)
  const explosionAge = useRef(0)

  useFrame((_, dt) => {
    if (!ref.current) return

    if (alive) {
      ref.current.visible = true
      wasAlive.current = true
      explosionAge.current = 0
    } else if (wasAlive.current) {
      // Just died — start explosion
      wasAlive.current = false
      ref.current.visible = false
      explosionAge.current = 0.01
    }

    // Animate explosion
    if (explosionRef.current && explosionAge.current > 0) {
      explosionAge.current += dt
      const t = explosionAge.current
      const scale = Math.min(1.5, t * 4)
      explosionRef.current.scale.setScalar(scale)
      explosionRef.current.visible = t < 0.4
      if (explosionRef.current.material instanceof THREE.MeshBasicMaterial) {
        explosionRef.current.material.opacity = Math.max(0, 1 - t * 2.5)
      }
    }
  })

  return (
    <group position={position}>
      {/* Soda can target */}
      <group ref={ref}>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 12]} />
          <meshStandardMaterial color={TARGET_RED} roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Top rim */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.04, 12]} />
          <meshStandardMaterial color={TARGET_RIM} roughness={0.2} metalness={0.6} />
        </mesh>
        {/* White stripe */}
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.08, 12]} />
          <meshStandardMaterial color="white" roughness={0.4} />
        </mesh>
      </group>
      {/* Explosion */}
      <mesh ref={explosionRef} visible={false}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={EXPLOSION_COLOR} transparent opacity={1} />
      </mesh>
    </group>
  )
}

function TrainingSoldier() {
  const soldierRef = useRef<THREE.Group>(null)
  const partsRef = useRef<ReturnType<typeof createFlexSoldier>['parts'] | null>(null)
  const groupRef = useRef<THREE.Group | null>(null)
  const weaponGrpRef = useRef<THREE.Group | null>(null)
  const weapon = useTrainingStore(s => s.weapon)

  useEffect(() => {
    if (!soldierRef.current) return
    // Clear previous
    while (soldierRef.current.children.length) {
      soldierRef.current.remove(soldierRef.current.children[0])
    }

    const result = createFlexSoldier('green')
    partsRef.current = result.parts
    groupRef.current = result.group
    soldierRef.current.add(result.group)

    // Apply weapon
    if (weapon && weapon !== 'rifle') {
      weaponGrpRef.current = applyWeaponToSoldier(result.parts, weapon, null)
    }
  }, [weapon])

  useFrame(() => {
    const parts = partsRef.current
    if (!parts) return

    const simState = useTrainingStore.getState().simState
    if (!simState) return

    // Position soldier
    parts.root.position.set(simState.soldierX, 0, simState.soldierZ)
    parts.root.rotation.y = simState.soldierRotation

    // Animate based on sim state
    const elapsed = simState.elapsed
    const justFired = simState.justFired

    if (justFired) {
      if (weapon === 'grenade') {
        poseThrow(parts, (elapsed * 3) % 1)
      } else {
        poseShoot(parts, (elapsed * 2) % 1)
      }
    } else {
      const t = elapsed
      poseAim(parts, t)
    }
  })

  return <group ref={soldierRef} />
}

function ProjectileTrails() {
  const ref = useRef<THREE.Group>(null)
  const meshPool = useRef<THREE.Mesh[]>([])

  // Pre-create a pool of small meshes for projectiles
  useMemo(() => {
    const pool: THREE.Mesh[] = []
    const geo = new THREE.SphereGeometry(0.05, 4, 4)
    const mat = new THREE.MeshBasicMaterial({ color: '#ffaa00' })
    for (let i = 0; i < 10; i++) {
      pool.push(new THREE.Mesh(geo, mat))
    }
    meshPool.current = pool
  }, [])

  useFrame(() => {
    if (!ref.current) return
    const simState = useTrainingStore.getState().simState
    if (!simState) return

    const projectiles = simState.projectiles || []

    // Update mesh positions from sim state
    for (let i = 0; i < meshPool.current.length; i++) {
      const mesh = meshPool.current[i]
      if (i < projectiles.length) {
        const p = projectiles[i]
        mesh.position.set(p.x, 'y' in p ? (p as { y: number }).y : 0.2, p.z)
        mesh.visible = true
        if (!mesh.parent) ref.current!.add(mesh)
      } else {
        mesh.visible = false
      }
    }
  })

  return <group ref={ref} />
}

export function TrainingScene() {
  const { scene } = useThree()
  const simState = useTrainingStore(s => s.simState)

  useEffect(() => {
    scene.fog = new THREE.Fog('#a0c0e0', 20, 40)
    return () => { scene.fog = null }
  }, [scene])

  // Drive the training tick
  useFrame((_, dt) => {
    const store = useTrainingStore.getState()
    if (store.status === 'running') {
      store.tick(dt)
    }
  })

  // Extract target positions from sim state
  const targets = useMemo(() => {
    if (!simState) return []
    if ('targets' in simState) {
      return (simState.targets as Array<{ x: number; z: number; alive: boolean }>).map((t, i) => ({
        key: i,
        position: [t.x, 0, t.z] as [number, number, number],
        alive: t.alive,
      }))
    }
    return []
  }, [simState?.elapsed]) // Re-check when time advances

  return (
    <>
      <color attach="background" args={['#a0c0e0']} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87CEEB', '#c2a87d', 0.5]} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-4, 6, -3]} intensity={0.3} color="#8090a0" />

      {/* Camera controls */}
      <OrbitControls
        target={[4, 0.5, 0]}
        maxPolarAngle={Math.PI * 0.45}
        minDistance={4}
        maxDistance={22}
        enablePan={false}
      />

      <ArenaGround />
      <TrainingSoldier />
      <ProjectileTrails />

      {targets.map(t => (
        <TargetCan key={t.key} position={t.position} alive={t.alive} />
      ))}
    </>
  )
}
