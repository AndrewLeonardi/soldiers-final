/**
 * CampTrainingArena — full-screen immersive training observation view.
 *
 * Sprint B. Ported from /play's TrainingScene.tsx, reads from campTrainingStore.
 * Shows the champion soldier, projectiles, targets, and ghost population.
 * Mounted inside CampScene when observingSlotIndex !== null.
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import {
  createFlexSoldier,
  poseRocketKneel,
  poseRocketFire,
  poseAim,
  poseShoot,
  poseThrow,
} from '@three/models/flexSoldier'
import type { SoldierParts } from '@three/models/flexSoldier'
import { applyWeaponToSoldier, createWeaponMesh } from '@three/models/weaponMeshes'
import { getPlasticMat, TOY } from '@three/models/materials'
import { GhostSoldier } from './GhostSoldier'
import * as sfx from '@audio/sfx'
import type { WeaponType } from '@config/types'

const TARGET_RED = '#cc3333'
const EXPLOSION_COLOR = '#ff8800'

// ── Arena Ground ──

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

// ── Target Can ──

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
      sfx.targetHitPop()
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

// ── Observation Soldier (champion — full detail) ──

function ObservationSoldier({ slotIndex }: { slotIndex: number }) {
  const soldierRef = useRef<THREE.Group>(null)
  const partsRef = useRef<SoldierParts | null>(null)
  const prevFired = useRef(false)
  const slot = useCampTrainingStore(s => s.slots[slotIndex])
  const weapon = slot?.slotWeapon as WeaponType | null

  useEffect(() => {
    if (!soldierRef.current || !weapon) return
    while (soldierRef.current.children.length) {
      soldierRef.current.remove(soldierRef.current.children[0]!)
    }
    const result = createFlexSoldier()
    partsRef.current = result.parts
    soldierRef.current.add(result.group)

    if (weapon === 'rocketLauncher') {
      const rifleGrp = result.parts.rifleGrp
      while (rifleGrp.children.length) rifleGrp.remove(rifleGrp.children[0]!)
      const launcher = createWeaponMesh('rocketLauncher')
      launcher.scale.setScalar(1.5)
      launcher.position.set(0, 0, 0.1)
      rifleGrp.add(launcher)
    } else if (weapon !== 'rifle' && weapon !== 'tank') {
      applyWeaponToSoldier(result.parts, weapon, null)
    }
  }, [weapon])

  useFrame(() => {
    const parts = partsRef.current
    if (!parts) return
    const store = useCampTrainingStore.getState()
    const currentSlot = store.slots[slotIndex]
    if (!currentSlot || currentSlot.simStates.length === 0) return

    const simState = currentSlot.simStates[currentSlot.championIndex]
    if (!simState || simState.type === 'tank') return

    parts.root.position.set(simState.soldierX, 0, simState.soldierZ)
    parts.root.rotation.y = simState.soldierRotation

    const elapsed = simState.elapsed
    const justFired = simState.justFired

    if (justFired && !prevFired.current) {
      if (weapon === 'rocketLauncher' || weapon === 'tank') sfx.rocketLaunch()
      else if (weapon === 'grenade') sfx.grenadeThrow()
      else if (weapon === 'machineGun') sfx.mgBurst()
      else sfx.rifleShot()
    }
    prevFired.current = justFired

    if (weapon === 'rocketLauncher') {
      if (justFired) poseRocketFire(parts, (elapsed * 2.5) % 1)
      else poseRocketKneel(parts, elapsed)
    } else if (weapon === 'grenade') {
      if (justFired) poseThrow(parts, (elapsed * 3) % 1)
      else poseAim(parts, elapsed)
    } else {
      if (justFired) poseShoot(parts, (elapsed * 4) % 1)
      else poseAim(parts, elapsed)
    }
  })

  return <group ref={soldierRef} />
}

// ── Observation Tank ──

function ObservationTank({ slotIndex }: { slotIndex: number }) {
  const bodyRef = useRef<THREE.Group>(null)
  const turretRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!bodyRef.current) return
    while (bodyRef.current.children.length) {
      bodyRef.current.remove(bodyRef.current.children[0]!)
    }

    const greenMat = getPlasticMat(TOY.armyGreen)
    const darkMat = getPlasticMat(TOY.darkGreen)
    const metalMat = getPlasticMat(TOY.metalDark)

    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), greenMat)
    hull.position.y = 0.2
    hull.castShadow = true
    bodyRef.current.add(hull)

    const trackGeo = new THREE.BoxGeometry(0.85, 0.12, 0.12)
    const leftTrack = new THREE.Mesh(trackGeo, darkMat)
    leftTrack.position.set(0, 0.1, 0.3)
    bodyRef.current.add(leftTrack)
    const rightTrack = new THREE.Mesh(trackGeo, darkMat)
    rightTrack.position.set(0, 0.1, -0.3)
    bodyRef.current.add(rightTrack)

    const turretGrp = new THREE.Group()
    turretGrp.position.set(0, 0.35, 0)
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.15, 8), greenMat)
    turretGrp.add(turret)
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), metalMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.02, 0.35)
    turretGrp.add(barrel)
    bodyRef.current.add(turretGrp)
    turretRef.current = turretGrp
  }, [])

  useFrame(() => {
    if (!bodyRef.current) return
    const store = useCampTrainingStore.getState()
    const slot = store.slots[slotIndex]
    if (!slot || slot.simStates.length === 0) return
    const simState = slot.simStates[slot.championIndex]
    if (!simState || simState.type !== 'tank') return

    const tank = simState as any
    bodyRef.current.position.set(tank.tankX, 0, tank.tankZ)
    bodyRef.current.rotation.y = tank.tankAngle
    if (turretRef.current) {
      turretRef.current.rotation.y = tank.turretAngle - tank.tankAngle
    }
  })

  return <group ref={bodyRef} />
}

// ── Observation Projectiles ──

function ObservationProjectiles({ slotIndex }: { slotIndex: number }) {
  const ref = useRef<THREE.Group>(null)
  const slot = useCampTrainingStore(s => s.slots[slotIndex])
  const weapon = slot?.slotWeapon as WeaponType | null
  const meshPool = useRef<THREE.Group[]>([])
  const prevCount = useRef(0)
  const lastPositions = useRef<{ x: number; y: number; z: number }[]>([])
  const explosionPool = useRef<THREE.Mesh[]>([])
  const explosionAges = useRef<number[]>([])

  useMemo(() => {
    const pool: THREE.Group[] = []
    for (let i = 0; i < 10; i++) {
      const grp = new THREE.Group()
      if (weapon === 'rocketLauncher' || weapon === 'tank') {
        const body = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.03, 0.25, 6),
          new THREE.MeshStandardMaterial({ color: '#666666', roughness: 0.3, metalness: 0.5 }),
        )
        body.rotation.x = Math.PI / 2
        grp.add(body)
        const nose = new THREE.Mesh(
          new THREE.ConeGeometry(0.04, 0.08, 6),
          new THREE.MeshStandardMaterial({ color: '#cc2222', roughness: 0.3 }),
        )
        nose.rotation.x = Math.PI / 2
        nose.position.z = 0.16
        grp.add(nose)
        const exhaust = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 6, 6),
          new THREE.MeshBasicMaterial({ color: '#ff8800', transparent: true, opacity: 0.8 }),
        )
        exhaust.position.z = -0.15
        grp.add(exhaust)
      } else if (weapon === 'grenade') {
        const gren = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 6, 6),
          new THREE.MeshStandardMaterial({ color: '#2d4a2d', roughness: 0.5 }),
        )
        grp.add(gren)
      } else {
        const bullet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.01, 0.01, 0.08, 4),
          new THREE.MeshBasicMaterial({ color: '#ffdd44' }),
        )
        bullet.rotation.x = Math.PI / 2
        grp.add(bullet)
      }
      pool.push(grp)
    }
    meshPool.current = pool

    const explosions: THREE.Mesh[] = []
    const ages: number[] = []
    for (let i = 0; i < 6; i++) {
      const exp = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#ff6600', transparent: true, opacity: 1 }),
      )
      exp.visible = false
      explosions.push(exp)
      ages.push(0)
    }
    explosionPool.current = explosions
    explosionAges.current = ages
  }, [weapon])

  useFrame((_, dt) => {
    if (!ref.current) return
    const store = useCampTrainingStore.getState()
    const currentSlot = store.slots[slotIndex]
    if (!currentSlot || currentSlot.simStates.length === 0) return
    const simState = currentSlot.simStates[currentSlot.championIndex]
    if (!simState) return

    const projectiles = 'projectiles' in simState ? (simState as any).projectiles : []
    const isExplosive = weapon === 'rocketLauncher' || weapon === 'grenade' || weapon === 'tank'

    if (isExplosive && projectiles.length < prevCount.current) {
      sfx.explosionSmall()
      const disappeared = prevCount.current - projectiles.length
      for (let d = 0; d < disappeared; d++) {
        const freeIdx = explosionAges.current.findIndex(a => a <= 0 || a > 0.5)
        if (freeIdx >= 0 && lastPositions.current.length > 0) {
          const pos = lastPositions.current[lastPositions.current.length - 1 - d]
          if (pos) {
            const exp = explosionPool.current[freeIdx]!
            exp.position.set(pos.x, Math.max(0.1, pos.y), pos.z)
            exp.scale.setScalar(0.3)
            exp.visible = true
            explosionAges.current[freeIdx] = 0.01
            if (!exp.parent) ref.current!.add(exp)
          }
        }
      }
    }

    lastPositions.current = projectiles.map((p: any) => ({
      x: p.x,
      y: 'y' in p ? p.y : 0.2,
      z: p.z,
    }))
    prevCount.current = projectiles.length

    for (let i = 0; i < meshPool.current.length; i++) {
      const grp = meshPool.current[i]!
      if (i < projectiles.length) {
        const p = projectiles[i]
        const py = 'y' in p ? p.y : 0.2
        grp.position.set(p.x, py, p.z)
        grp.visible = true
        if ('vx' in p && 'vz' in p) {
          grp.rotation.y = Math.atan2(p.vx, p.vz)
          if (p.vy !== undefined) {
            grp.rotation.x = -Math.atan2(p.vy, Math.sqrt(p.vx * p.vx + p.vz * p.vz))
          }
        }
        if (!grp.parent) ref.current!.add(grp)
      } else {
        grp.visible = false
      }
    }

    for (let i = 0; i < explosionPool.current.length; i++) {
      if (explosionAges.current[i]! > 0) {
        explosionAges.current[i]! += dt
        const t = explosionAges.current[i]!
        const exp = explosionPool.current[i]!
        exp.scale.setScalar(Math.min(2.0, 0.3 + t * 6))
        exp.visible = t < 0.5
        if (exp.material instanceof THREE.MeshBasicMaterial) {
          exp.material.opacity = Math.max(0, 1 - t * 2)
        }
        if (t >= 0.5) {
          exp.visible = false
          explosionAges.current[i] = 0
        }
      }
    }
  })

  return <group ref={ref} />
}

// ── Observation Targets (enemies rendered as target cans) ──

function ObservationTargets({ slotIndex }: { slotIndex: number }) {
  const tickCounter = useCampTrainingStore(s => s.slots[slotIndex]?.tickCounter ?? 0)

  const targets = useMemo(() => {
    const store = useCampTrainingStore.getState()
    const slot = store.slots[slotIndex]
    if (!slot || slot.simStates.length === 0) return []
    const simState = slot.simStates[slot.championIndex]
    if (!simState || !('enemies' in simState)) return []
    return (simState as any).enemies.map((e: any, i: number) => ({
      key: i,
      position: [e.x, 0, e.z] as [number, number, number],
      alive: e.alive,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickCounter, slotIndex])

  return (
    <>
      {targets.map((t: any) => (
        <TargetCan key={t.key} position={t.position} alive={t.alive} />
      ))}
    </>
  )
}

// ── Observation Ghosts (population at low opacity) ──

function ObservationGhosts({ slotIndex }: { slotIndex: number }) {
  const ghostSnapshots = useCampTrainingStore(s => s.slots[slotIndex]?.ghostSnapshots ?? [])
  const championIndex = useCampTrainingStore(s => s.slots[slotIndex]?.championIndex ?? 0)

  return (
    <>
      {ghostSnapshots.map((g, i) => {
        if (i === championIndex) return null // champion rendered separately at full detail
        return (
          <GhostSoldier
            key={i}
            x={g.x}
            z={g.z}
            rotation={g.rotation}
            opacity={0.15}
            justFired={g.justFired}
          />
        )
      })}
    </>
  )
}

// ── Main Arena Component ──

export function CampTrainingArena({ slotIndex }: { slotIndex: number }) {
  const slot = useCampTrainingStore(s => s.slots[slotIndex])
  const weapon = slot?.slotWeapon as WeaponType | null
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

      {/* Champion at full detail */}
      {isTank ? (
        <ObservationTank slotIndex={slotIndex} />
      ) : (
        <ObservationSoldier slotIndex={slotIndex} />
      )}

      {/* Projectiles with trails + explosions */}
      <ObservationProjectiles slotIndex={slotIndex} />

      {/* Enemy targets */}
      <ObservationTargets slotIndex={slotIndex} />

      {/* Ghost population (translucent) */}
      <ObservationGhosts slotIndex={slotIndex} />
    </>
  )
}
