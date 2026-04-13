/**
 * FiringRange — full-screen weapon testing / firing range scene.
 *
 * Follows CampTrainingArena pattern: self-contained 3D scene with own
 * lighting, ground, camera, soldier, projectiles, and destructible wall.
 *
 * Entry: sceneStore.firingRangeSoldierId + firingRangeWeapon
 * Mounted by CampScene when both are non-null.
 */
import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import {
  createFlexSoldier,
  poseAim,
  poseShoot,
  poseRocketKneel,
  poseRocketFire,
  poseThrow,
} from '@three/models/flexSoldier'
import type { SoldierParts } from '@three/models/flexSoldier'
import { applyWeaponToSoldier, createWeaponMesh } from '@three/models/weaponMeshes'
import { getPlasticMat, TOY } from '@three/models/materials'
import { WallDefense } from '@three/models/Defenses'
import type { WallBlock } from '@three/models/Defenses'
import { ScreenShake, triggerShake } from '@three/effects/ScreenShake'
import { ImpactSpark } from '@three/effects/ImpactSpark'
import { ExplosionEffect } from '@three/effects/ExplosionEffect'
import { MuzzleSmoke } from '@three/effects/MuzzleSmoke'
import { WEAPON_STATS } from '@config/units'
import {
  BULLET_SPEED, ROCKET_SPEED, GRENADE_SPEED, MG_BULLET_SPEED,
  PROJECTILE_GRAVITY, WALL_HIT_RADIUS, SHAKE,
  BLOCK_W, BLOCK_H,
} from '@engine/physics/battlePhysics'
import * as sfx from '@audio/sfx'
import type { WeaponType } from '@config/types'
import { TABLE_BOUNDS } from './campConstants'

// ── Constants ──
const SOLDIER_POS: [number, number, number] = [0, 0, 0]
const WALL_POS: [number, number, number] = [8, 0, 0]
const WALL_ROTATION = Math.PI / 2 // face the soldier
const WALL_REBUILD_CHECK_INTERVAL = 3 // seconds
const WALL_REBUILD_THRESHOLD = 0.6 // rebuild when >60% destroyed

// ── Arena Ground ──
function FiringRangeGround() {
  return (
    <group>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[4, -0.01, 0]}>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#c2a87d" roughness={0.9} />
      </mesh>
      {/* Firing line markers */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <planeGeometry args={[0.05, 3]} />
        <meshStandardMaterial color="#cc4444" roughness={0.5} />
      </mesh>
      {/* Target line marker */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.001, 0]}>
        <planeGeometry args={[0.05, 3]} />
        <meshStandardMaterial color="#cc4444" roughness={0.5} />
      </mesh>
      {/* Ammo crate decorations */}
      {[[-1.5, 0.15, 2], [-1.5, 0.15, -2]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.5, 0.3, 0.35]} />
          <meshStandardMaterial color="#5a4a2a" roughness={0.7} />
        </mesh>
      ))}
      {/* Corner posts */}
      {[[-2, 0, -5], [-2, 0, 5], [12, 0, -5], [12, 0, 5]].map((pos, i) => (
        <mesh key={`post-${i}`} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.6, 6]} />
          <meshStandardMaterial color="#8B6914" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ── Dramatic Lighting ──
function FiringRangeLighting() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <hemisphereLight args={['#4466aa', '#332211', 0.3]} />
      {/* Main directional — warm, casting shadows */}
      <directionalLight
        position={[6, 12, 4]}
        intensity={2.5}
        color="#ffeecc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-10}
        shadow-camera-right={14}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Rim/backlight — cool blue for drama */}
      <directionalLight
        position={[-4, 8, -6]}
        intensity={0.8}
        color="#6688cc"
      />
      {/* Fill from below-front to lift shadows */}
      <pointLight position={[4, 0.5, 6]} intensity={0.5} color="#ffddaa" distance={15} />
    </>
  )
}

// ── Projectile type ──
interface FRProjectile {
  id: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  type: 'bullet' | 'rocket' | 'grenade'
  age: number
  fuseTime?: number
  alive: boolean
}

// ── Effects ──
interface EffectEntry {
  id: number
  position: [number, number, number]
  type: 'spark' | 'explosion' | 'smoke'
}

let _effectId = 0
let _projId = 0

// ── Firing Range Soldier ──
function FiringRangeSoldier({
  weapon,
  onFire,
}: {
  weapon: WeaponType
  onFire: (muzzleWorldPos: THREE.Vector3) => void
}) {
  const soldierRef = useRef<THREE.Group>(null)
  const partsRef = useRef<SoldierParts | null>(null)
  const fireTimer = useRef(0)
  const fireState = useRef<'aiming' | 'firing'>('aiming')
  const fireProgress = useRef(0)
  const aimTime = useRef(0)

  const stats = WEAPON_STATS[weapon]
  const fireRate = stats?.fireRate ?? 1.2

  // Build soldier + attach weapon
  useEffect(() => {
    if (!soldierRef.current) return
    while (soldierRef.current.children.length) {
      soldierRef.current.remove(soldierRef.current.children[0]!)
    }
    const result = createFlexSoldier()
    partsRef.current = result.parts
    soldierRef.current.add(result.group)

    // Face +X direction (toward wall)
    result.parts.root.rotation.y = Math.PI / 2

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

    fireState.current = 'aiming'
    aimTime.current = 0
    fireTimer.current = 0
    fireProgress.current = 0
  }, [weapon])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const parts = partsRef.current
    if (!parts) return

    const elapsed = performance.now() / 1000

    if (fireState.current === 'aiming') {
      aimTime.current += delta

      // Pose: aim at wall
      if (weapon === 'rocketLauncher') {
        poseRocketKneel(parts, elapsed)
      } else if (weapon === 'grenade') {
        poseAim(parts, elapsed)
      } else {
        poseAim(parts, elapsed)
      }

      // After aim settle + fire rate cooldown, transition to firing
      if (aimTime.current >= Math.max(0.4, fireRate * 0.5)) {
        fireState.current = 'firing'
        fireProgress.current = 0

        // Get muzzle world position for projectile spawn
        const muzzleWorld = new THREE.Vector3()
        if (parts.rifleGrp) {
          parts.rifleGrp.getWorldPosition(muzzleWorld)
          // Offset forward along barrel
          const forward = new THREE.Vector3(0, 0, 0.5)
          forward.applyQuaternion(parts.rifleGrp.getWorldQuaternion(new THREE.Quaternion()))
          muzzleWorld.add(forward)
        } else {
          muzzleWorld.set(SOLDIER_POS[0] + 0.6, 0.8, SOLDIER_POS[2])
        }

        onFire(muzzleWorld)

        // Play weapon sound
        if (weapon === 'rocketLauncher' || weapon === 'tank') sfx.rocketLaunch()
        else if (weapon === 'grenade') sfx.grenadeThrow()
        else if (weapon === 'machineGun') sfx.mgBurst()
        else sfx.rifleShot()

        // Fire screen shake
        const shakeKey = `FIRE_${weapon === 'rocketLauncher' ? 'ROCKET' : weapon === 'machineGun' ? 'MG' : weapon === 'grenade' ? 'GRENADE' : weapon === 'tank' ? 'TANK' : 'RIFLE'}` as keyof typeof SHAKE
        triggerShake(SHAKE[shakeKey] ?? SHAKE.FIRE_RIFLE)
      }
    } else {
      // Firing animation
      const fireDuration = weapon === 'grenade' ? 0.4 : weapon === 'rocketLauncher' ? 0.6 : 0.3
      fireProgress.current += delta / fireDuration
      const p = Math.min(fireProgress.current, 1)

      if (weapon === 'rocketLauncher') {
        poseRocketFire(parts, p)
      } else if (weapon === 'grenade') {
        poseThrow(parts, p)
      } else {
        poseShoot(parts, p)
      }

      if (p >= 1) {
        fireState.current = 'aiming'
        aimTime.current = 0
      }
    }
  })

  return <group ref={soldierRef} position={SOLDIER_POS} />
}

// ── Projectile Visuals (pool-based) ──
function FiringRangeProjectiles({
  projectiles,
  weapon,
}: {
  projectiles: FRProjectile[]
  weapon: WeaponType
}) {
  const groupRef = useRef<THREE.Group>(null)
  const meshPool = useRef<THREE.Group[]>([])

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
        // Bullet (rifle/MG)
        const bullet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.1, 4),
          new THREE.MeshBasicMaterial({ color: '#66ff66' }),
        )
        bullet.rotation.x = Math.PI / 2
        grp.add(bullet)
        // Tracer glow
        const glow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.002, 0.15, 4),
          new THREE.MeshBasicMaterial({ color: '#66ff66', transparent: true, opacity: 0.3 }),
        )
        glow.rotation.x = Math.PI / 2
        glow.position.z = -0.1
        grp.add(glow)
      }
      pool.push(grp)
    }
    meshPool.current = pool
  }, [weapon])

  useFrame(() => {
    if (!groupRef.current) return

    // Sync pool to live projectiles
    for (let i = 0; i < meshPool.current.length; i++) {
      const mesh = meshPool.current[i]!
      const proj = projectiles[i]
      if (proj && proj.alive) {
        if (!mesh.parent) groupRef.current.add(mesh)
        mesh.visible = true
        mesh.position.copy(proj.position)
        // Orient along velocity
        if (proj.velocity.lengthSq() > 0.1) {
          const dir = proj.velocity.clone().normalize()
          mesh.lookAt(mesh.position.x + dir.x, mesh.position.y + dir.y, mesh.position.z + dir.z)
        }
      } else {
        mesh.visible = false
      }
    }
  })

  return <group ref={groupRef} />
}

// ── Main FiringRange Component ──
interface FiringRangeProps {
  soldierId: string
  weapon: WeaponType
}

export function FiringRange({ soldierId, weapon }: FiringRangeProps) {
  const wallBlocksRef = useRef<Map<string, WallBlock[]>>(new Map())
  const [wallKey, setWallKey] = useState(0)
  const wallCheckTimer = useRef(0)
  const projectilesRef = useRef<FRProjectile[]>([])
  const [effects, setEffects] = useState<EffectEntry[]>([])

  // Get weapon projectile type
  const projType = weapon === 'rocketLauncher' || weapon === 'tank'
    ? 'rocket' as const
    : weapon === 'grenade' ? 'grenade' as const : 'bullet' as const

  const projSpeed = weapon === 'machineGun' ? MG_BULLET_SPEED
    : weapon === 'rocketLauncher' || weapon === 'tank' ? ROCKET_SPEED
    : weapon === 'grenade' ? GRENADE_SPEED
    : BULLET_SPEED

  // Handle fire event — spawn projectile + muzzle smoke
  const handleFire = useCallback((muzzleWorldPos: THREE.Vector3) => {
    const wallCenter = new THREE.Vector3(WALL_POS[0], 0.5, WALL_POS[2])
    const dir = wallCenter.clone().sub(muzzleWorldPos).normalize()

    // Add slight upward arc for grenades/rockets
    if (weapon === 'grenade') {
      dir.y += 0.3
      dir.normalize()
    } else if (weapon === 'rocketLauncher' || weapon === 'tank') {
      dir.y += 0.05
      dir.normalize()
    }

    const vel = dir.multiplyScalar(projSpeed)
    const proj: FRProjectile = {
      id: ++_projId,
      position: muzzleWorldPos.clone(),
      velocity: vel,
      type: projType,
      age: 0,
      fuseTime: weapon === 'grenade' ? 1.0 : undefined,
      alive: true,
    }
    projectilesRef.current.push(proj)

    // Spawn muzzle smoke effect
    setEffects(prev => [
      ...prev,
      {
        id: ++_effectId,
        position: [muzzleWorldPos.x, muzzleWorldPos.y, muzzleWorldPos.z] as [number, number, number],
        type: 'smoke' as const,
      },
    ])
  }, [weapon, projType, projSpeed])

  // Projectile physics + wall hit detection
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)

    // Check wall rebuild
    wallCheckTimer.current += delta
    if (wallCheckTimer.current >= WALL_REBUILD_CHECK_INTERVAL) {
      wallCheckTimer.current = 0
      const blocks = wallBlocksRef.current.get('fr-wall')
      if (blocks) {
        const aliveCount = blocks.filter(b => b.alive).length
        const total = blocks.length
        if (total > 0 && aliveCount / total < (1 - WALL_REBUILD_THRESHOLD)) {
          setWallKey(k => k + 1)
        }
      }
    }

    // Update projectiles
    for (const proj of projectilesRef.current) {
      if (!proj.alive) continue
      proj.age += delta

      // Gravity for rockets/grenades
      if (proj.type === 'rocket' || proj.type === 'grenade') {
        proj.velocity.y += PROJECTILE_GRAVITY * delta
      }

      proj.position.add(proj.velocity.clone().multiplyScalar(delta))

      // Kill if too old or below ground
      if (proj.age > 4 || proj.position.y < -1) {
        proj.alive = false
        continue
      }

      // Grenade fuse detonation
      if (proj.fuseTime && proj.age >= proj.fuseTime) {
        proj.alive = false
        spawnExplosion(proj.position)
        sfx.explosionSmall()
        triggerShake(SHAKE.GRENADE)
        // Blast wall blocks near explosion
        const blocks = wallBlocksRef.current.get('fr-wall')
        if (blocks) {
          for (const block of blocks) {
            if (!block.alive) continue
            const worldPos = block.mesh.getWorldPosition(new THREE.Vector3())
            const dist = worldPos.distanceTo(proj.position)
            if (dist < 1.5) {
              block.alive = false
              block.settled = false
              const blastDir = worldPos.clone().sub(proj.position).normalize()
              block.velocity.set(
                blastDir.x * 4 + (Math.random() - 0.5) * 2,
                2 + Math.random() * 3,
                blastDir.z * 4 + (Math.random() - 0.5) * 2,
              )
            }
          }
        }
        continue
      }

      // Check wall block hits
      const blocks = wallBlocksRef.current.get('fr-wall')
      if (blocks) {
        for (const block of blocks) {
          if (!block.alive) continue
          const worldPos = block.mesh.getWorldPosition(new THREE.Vector3())
          const dist = worldPos.distanceTo(proj.position)
          if (dist < WALL_HIT_RADIUS) {
            proj.alive = false

            if (proj.type === 'rocket') {
              // Rocket: big explosion
              spawnExplosion(proj.position)
              sfx.explosionLarge()
              triggerShake(SHAKE.ROCKET)
              // Blast radius
              for (const b of blocks) {
                if (!b.alive) continue
                const bPos = b.mesh.getWorldPosition(new THREE.Vector3())
                const bDist = bPos.distanceTo(proj.position)
                if (bDist < 2.0) {
                  b.alive = false
                  b.settled = false
                  const blastDir = bPos.clone().sub(proj.position).normalize()
                  b.velocity.set(
                    blastDir.x * 5 + (Math.random() - 0.5) * 2,
                    3 + Math.random() * 4,
                    blastDir.z * 5 + (Math.random() - 0.5) * 2,
                  )
                }
              }
            } else {
              // Bullet: destroy single block + spark
              block.alive = false
              block.settled = false
              block.velocity.set(
                (Math.random() - 0.5) * 2,
                1 + Math.random() * 2,
                (Math.random() - 0.5) * 2,
              )
              spawnSpark(proj.position)
              sfx.bulletImpact()
              triggerShake(SHAKE.BULLET_IMPACT)
            }
            break
          }
        }
      }
    }

    // Clean up dead projectiles
    projectilesRef.current = projectilesRef.current.filter(p => p.alive)
  })

  // Effect spawners
  const spawnSpark = useCallback((pos: THREE.Vector3) => {
    setEffects(prev => [
      ...prev,
      { id: ++_effectId, position: [pos.x, pos.y, pos.z], type: 'spark' },
    ])
  }, [])

  const spawnExplosion = useCallback((pos: THREE.Vector3) => {
    setEffects(prev => [
      ...prev,
      { id: ++_effectId, position: [pos.x, pos.y, pos.z], type: 'explosion' },
    ])
  }, [])

  const removeEffect = useCallback((id: number) => {
    setEffects(prev => prev.filter(e => e.id !== id))
  }, [])

  return (
    <>
      <FiringRangeLighting />
      <FiringRangeGround />

      {/* Orbit camera */}
      <OrbitControls
        target={[4, 1, 0]}
        minDistance={4}
        maxDistance={20}
        maxPolarAngle={Math.PI * 0.45}
        minPolarAngle={Math.PI / 8}
      />

      {/* Screen shake */}
      <ScreenShake />

      {/* Soldier */}
      <FiringRangeSoldier weapon={weapon} onFire={handleFire} />

      {/* Destructible wall target */}
      <WallDefense
        key={wallKey}
        position={WALL_POS}
        rotation={WALL_ROTATION}
        wallBlocksRef={wallBlocksRef}
        wallId="fr-wall"
        tableBounds={TABLE_BOUNDS}
      />

      {/* Projectiles */}
      <FiringRangeProjectiles
        projectiles={projectilesRef.current}
        weapon={weapon}
      />

      {/* Effects */}
      {effects.map(e => {
        if (e.type === 'spark') {
          return <ImpactSpark key={e.id} position={e.position} onComplete={() => removeEffect(e.id)} />
        }
        if (e.type === 'explosion') {
          return <ExplosionEffect key={e.id} position={e.position} scale={1} onComplete={() => removeEffect(e.id)} />
        }
        if (e.type === 'smoke') {
          return <MuzzleSmoke key={e.id} position={e.position} onComplete={() => removeEffect(e.id)} />
        }
        return null
      })}

      {/* Background color */}
      <color attach="background" args={['#1a2030']} />
      <fog attach="fog" args={['#1a2030', 15, 30]} />
    </>
  )
}
