/**
 * 3D Training Arena — visualizes the headless training simulation.
 *
 * Renders weapon-specific visuals:
 * - Rocket: soldier kneels with launcher, fires rocket meshes with exhaust
 * - Grenade: soldier throws, grenade arcs
 * - MachineGun: soldier aims, rapid bullet trails
 * - Tank: procedural tank model drives around, turret tracks targets
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useTrainingStore } from '@stores/trainingStore'
import {
  createFlexSoldier,
  poseRocketKneel,
  poseRocketFire,
  poseAim,
  poseShoot,
  poseThrow,
} from '@three/models/flexSoldier'
import type { SoldierParts } from '@three/models/flexSoldier'
import { createWeaponMesh, applyWeaponToSoldier } from '@three/models/weaponMeshes'
import { getPlasticMat, TOY } from '@three/models/materials'
import type { TankSimState } from '@engine/ml/scenarios/tankScenario'

const TARGET_RED = '#cc3333'
const EXPLOSION_COLOR = '#ff8800'

// ── Arena Ground ─────────────────────────────────────

function ArenaGround() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[5, 0, 0]}>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#c2a87d" roughness={0.9} />
      </mesh>
      {[[-1, 0, -6], [-1, 0, 6], [13, 0, -6], [13, 0, 6]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.8, 6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ── Target Can ───────────────────────────────────────

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
      wasAlive.current = false
      ref.current.visible = false
      explosionAge.current = 0.01
    }
    if (explosionRef.current && explosionAge.current > 0) {
      explosionAge.current += dt
      const t = explosionAge.current
      explosionRef.current.scale.setScalar(Math.min(1.5, t * 4))
      explosionRef.current.visible = t < 0.4
      if (explosionRef.current.material instanceof THREE.MeshBasicMaterial) {
        explosionRef.current.material.opacity = Math.max(0, 1 - t * 2.5)
      }
    }
  })

  return (
    <group position={position}>
      <group ref={ref}>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.5, 12]} />
          <meshStandardMaterial color={TARGET_RED} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.04, 12]} />
          <meshStandardMaterial color="#888888" roughness={0.2} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.155, 0.155, 0.08, 12]} />
          <meshStandardMaterial color="white" roughness={0.4} />
        </mesh>
      </group>
      <mesh ref={explosionRef} visible={false}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color={EXPLOSION_COLOR} transparent opacity={1} />
      </mesh>
    </group>
  )
}

// ── Training Soldier (rocket/grenade/MG) ─────────────

function TrainingSoldier() {
  const soldierRef = useRef<THREE.Group>(null)
  const partsRef = useRef<SoldierParts | null>(null)
  const weapon = useTrainingStore(s => s.weapon)

  useEffect(() => {
    if (!soldierRef.current) return
    while (soldierRef.current.children.length) {
      soldierRef.current.remove(soldierRef.current.children[0])
    }
    const result = createFlexSoldier('green')
    partsRef.current = result.parts
    soldierRef.current.add(result.group)

    if (weapon === 'rocketLauncher') {
      // For rocket: clear rifle children, add launcher INTO rifleGrp
      // so the kneeling pose rotates the weapon correctly on the shoulder
      const rifleGrp = result.parts.rifleGrp
      while (rifleGrp.children.length) rifleGrp.remove(rifleGrp.children[0])
      const launcher = createWeaponMesh('rocketLauncher')
      launcher.scale.setScalar(1.5)
      launcher.position.set(0, 0, 0.1)
      rifleGrp.add(launcher)
    } else if (weapon && weapon !== 'rifle' && weapon !== 'tank') {
      applyWeaponToSoldier(result.parts, weapon, null)
    }
  }, [weapon])

  useFrame(() => {
    const parts = partsRef.current
    if (!parts) return
    const simState = useTrainingStore.getState().simState
    if (!simState || simState.type === 'tank') return

    parts.root.position.set(simState.soldierX, 0, simState.soldierZ)
    parts.root.rotation.y = simState.soldierRotation

    const elapsed = simState.elapsed
    const justFired = simState.justFired

    if (weapon === 'rocketLauncher') {
      if (justFired) {
        poseRocketFire(parts, (elapsed * 2.5) % 1)
      } else {
        poseRocketKneel(parts, elapsed)
      }
    } else if (weapon === 'grenade') {
      if (justFired) {
        poseThrow(parts, (elapsed * 3) % 1)
      } else {
        poseAim(parts, elapsed)
      }
    } else {
      // machineGun or rifle
      if (justFired) {
        poseShoot(parts, (elapsed * 4) % 1)
      } else {
        poseAim(parts, elapsed)
      }
    }
  })

  return <group ref={soldierRef} />
}

// ── Training Tank ────────────────────────────────────

function TrainingTank() {
  const bodyRef = useRef<THREE.Group>(null)
  const turretRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!bodyRef.current) return
    while (bodyRef.current.children.length) {
      bodyRef.current.remove(bodyRef.current.children[0])
    }

    const greenMat = getPlasticMat(TOY.armyGreen)
    const darkMat = getPlasticMat(TOY.darkGreen)
    const metalMat = getPlasticMat(TOY.metalDark)

    // Tank body
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), greenMat)
    hull.position.y = 0.2
    hull.castShadow = true
    bodyRef.current.add(hull)

    // Tracks
    const trackGeo = new THREE.BoxGeometry(0.85, 0.12, 0.12)
    const leftTrack = new THREE.Mesh(trackGeo, darkMat)
    leftTrack.position.set(0, 0.1, 0.3)
    leftTrack.castShadow = true
    bodyRef.current.add(leftTrack)

    const rightTrack = new THREE.Mesh(trackGeo, darkMat)
    rightTrack.position.set(0, 0.1, -0.3)
    rightTrack.castShadow = true
    bodyRef.current.add(rightTrack)

    // Turret base
    const turretGrp = new THREE.Group()
    turretGrp.position.set(0, 0.35, 0)

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.15, 8), greenMat)
    turret.castShadow = true
    turretGrp.add(turret)

    // Barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), metalMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.02, 0.35)
    barrel.castShadow = true
    turretGrp.add(barrel)

    bodyRef.current.add(turretGrp)
    turretRef.current = turretGrp
  }, [])

  useFrame(() => {
    if (!bodyRef.current) return
    const simState = useTrainingStore.getState().simState
    if (!simState || simState.type !== 'tank') return
    const tank = simState as TankSimState

    bodyRef.current.position.set(tank.tankX, 0, tank.tankZ)
    bodyRef.current.rotation.y = tank.tankAngle

    if (turretRef.current) {
      turretRef.current.rotation.y = tank.turretAngle - tank.tankAngle
    }
  })

  return <group ref={bodyRef} />
}

// ── Weapon-Specific Projectiles ──────────────────────

function ProjectileTrails() {
  const ref = useRef<THREE.Group>(null)
  const weapon = useTrainingStore(s => s.weapon)
  const meshPool = useRef<THREE.Group[]>([])

  useMemo(() => {
    const pool: THREE.Group[] = []
    for (let i = 0; i < 10; i++) {
      const grp = new THREE.Group()

      if (weapon === 'rocketLauncher' || weapon === 'tank') {
        // Rocket/shell: cylinder body + red cone nose + orange exhaust
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.03, 0.25, 6),
          new THREE.MeshStandardMaterial({ color: '#666666', roughness: 0.3, metalness: 0.5 })
        )
        body.rotation.x = Math.PI / 2
        grp.add(body)

        const nose = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.08, 6),
          new THREE.MeshStandardMaterial({ color: '#cc2222', roughness: 0.3 })
        )
        nose.rotation.x = Math.PI / 2
        nose.position.z = 0.16
        grp.add(nose)

        const exhaust = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: '#ff8800', transparent: true, opacity: 0.8 })
        )
        exhaust.position.z = -0.15
        grp.add(exhaust)

        const smoke = new THREE.Mesh(
          new THREE.SphereGeometry(0.04, 4, 4),
          new THREE.MeshBasicMaterial({ color: '#aaaaaa', transparent: true, opacity: 0.4 })
        )
        smoke.position.z = -0.22
        grp.add(smoke)
      } else if (weapon === 'grenade') {
        const gren = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 6),
          new THREE.MeshStandardMaterial({ color: '#2d4a2d', roughness: 0.5 })
        )
        grp.add(gren)
      } else {
        // MG bullets — tiny elongated cylinder
        const bullet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4),
          new THREE.MeshBasicMaterial({ color: '#ffdd44' })
        )
        bullet.rotation.x = Math.PI / 2
        grp.add(bullet)
      }

      pool.push(grp)
    }
    meshPool.current = pool
  }, [weapon])

  useFrame(() => {
    if (!ref.current) return
    const simState = useTrainingStore.getState().simState
    if (!simState) return

    const projectiles = simState.projectiles || []

    for (let i = 0; i < meshPool.current.length; i++) {
      const grp = meshPool.current[i]
      if (i < projectiles.length) {
        const p = projectiles[i]
        const py = 'y' in p ? (p as { y: number }).y : 0.2
        grp.position.set(p.x, py, p.z)
        grp.visible = true

        // Orient rocket/shell in direction of travel
        if ('vx' in p && 'vz' in p) {
          const pp = p as { vx: number; vz: number; vy?: number }
          grp.rotation.y = Math.atan2(pp.vx, pp.vz)
          if (pp.vy !== undefined) {
            grp.rotation.x = -Math.atan2(pp.vy, Math.sqrt(pp.vx * pp.vx + pp.vz * pp.vz))
          }
        }

        if (!grp.parent) ref.current!.add(grp)
      } else {
        grp.visible = false
      }
    }
  })

  return <group ref={ref} />
}

// ── Main Training Scene ──────────────────────────────

export function TrainingScene() {
  const { scene } = useThree()
  const simState = useTrainingStore(s => s.simState)
  const weapon = useTrainingStore(s => s.weapon)
  const tickCounter = useTrainingStore(s => s.tickCounter)

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

  // Extract targets — re-derive each tick
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCounter])

  const isTank = weapon === 'tank'

  return (
    <>
      <color attach="background" args={['#a0c0e0']} />

      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#87CEEB', '#c2a87d', 0.5]} />
      <directionalLight
        position={[6, 12, 8]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={14}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-4, 6, -3]} intensity={0.3} color="#8090a0" />

      <OrbitControls
        target={[5, 0.3, 0]}
        maxPolarAngle={Math.PI * 0.45}
        minDistance={6}
        maxDistance={30}
        enablePan={false}
      />

      <ArenaGround />

      {isTank ? <TrainingTank /> : <TrainingSoldier />}
      <ProjectileTrails />

      {targets.map(t => (
        <TargetCan key={t.key} position={t.position} alive={t.alive} />
      ))}
    </>
  )
}
