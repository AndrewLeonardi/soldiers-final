import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '@stores/gameStore'
import { useRosterStore } from '@stores/rosterStore'
import { NeuralNet } from '@engine/ml/neuralNet'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { WallDefense, SandbagDefense, WatchTower, type WallBlock } from '@three/models/Defenses'
import { ProjectileMesh } from '@three/models/ProjectileMesh'
import { Intel } from '@three/models/Intel'
import { GhostPreview } from '@three/models/GhostPreview'
import { BattlefieldProps } from '@three/models/sandboxProps'
import { CameraRig } from '@three/camera/CameraRig'
import { ExplosionEffect } from '@three/effects/ExplosionEffect'
import { ConfettiEffect } from '@three/effects/ConfettiEffect'
import { triggerShake } from '@three/effects/ScreenShake'
import { ENEMY_STATS, WEAPON_STATS } from '@config/units'
import { useTutorialStore } from '@stores/tutorialStore'
import * as sfx from '@audio/sfx'
import type { GameUnit, Projectile, Wave, WaveEnemy, EnemyType, WeaponType } from '@config/types'

// ── Battle constants ────────────────────────────────────
const INTEL_POS = new THREE.Vector3(-7, 0, 0)
const LOSE_THRESHOLD = 1.5
const SPAWN_X = 8
const BULLET_SPEED = 20
const ROCKET_SPEED = 12
const GRENADE_SPEED = 6
const MG_BULLET_SPEED = 20
const ROCKET_GRAV = 9.0 // for ballistic calc (positive = downward)
const PROJECTILE_GRAVITY = -6 // applied per frame to rocket/grenade vy
const PROJECTILE_MAX_AGE = 4
const HIT_RADIUS = 0.5
const GRAVITY = -15

let _eid = 1000
let _pid = 5000

// ── Mutable unit type for battle ──
interface BattleUnit extends GameUnit {
  velocity: [number, number, number]
  spinSpeed: number
  stateAge: number
  facingAngle: number
  nn?: NeuralNet // cached neural net (only for trained soldiers)
  isTrained: boolean
  shotsFired: number
  shotsHit: number
}

/** Compute ideal ballistic elevation for a given distance */
function idealElevation(dist: number): number {
  const arg = (ROCKET_GRAV * dist) / (ROCKET_SPEED * ROCKET_SPEED)
  return Math.abs(arg) <= 1 ? 0.5 * Math.asin(arg) : 0.6
}

/** Get enemy combat stats: base type stats + weapon overrides for range/damage/fireRate */
function getEnemyStats(type: import('@config/types').EnemyType, weapon: WeaponType) {
  const base = ENEMY_STATS[type]
  if (weapon === 'rifle') return base
  const ws = WEAPON_STATS[weapon]
  return { ...base, range: ws.range, damage: ws.damage, fireRate: ws.fireRate }
}

function makeBattleUnit(unit: GameUnit): BattleUnit {
  // Look up trained brain weights from roster
  const roster = useRosterStore.getState()
  const profile = roster.soldiers.find((s) => s.id === unit.profileId)
  const weaponKey = unit.weapon as WeaponType
  const brainWeights = profile?.trainedBrains?.[weaponKey]

  let nn: NeuralNet | undefined
  let isTrained = false

  // Rifle doesn't need training
  if (weaponKey === 'rifle') {
    isTrained = true // rifles are always "trained" (basic aim)
  } else if (brainWeights && brainWeights.length > 0) {
    nn = new NeuralNet(6, 12, 4)
    nn.setWeights(brainWeights)
    isTrained = true
  }

  return {
    ...unit,
    velocity: [0, 0, 0],
    spinSpeed: 0,
    stateAge: 0,
    facingAngle: unit.rotation,
    nn,
    isTrained,
    shotsFired: 0,
    shotsHit: 0,
  }
}

// ── Lighting ────────────────────────────────────────────
function Lights() {
  return (
    <>
      <ambientLight color={0xb8a888} intensity={1.5} />
      <directionalLight
        color={0xfff5e0} intensity={3.5} position={[6, 12, 6]}
        castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-near={0.5} shadow-camera-far={35}
        shadow-camera-left={-14} shadow-camera-right={14}
        shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <directionalLight color={0x88aacc} intensity={0.8} position={[-6, 8, 3]} />
      <pointLight color={0xd4aa40} intensity={2.0} position={[-5, 5, -8]} distance={20} />
    </>
  )
}

// ── Ground ──────────────────────────────────────────────
function SandboxGround() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 14, 60, 40)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      let height = (Math.random() - 0.5) * 0.06
      height += 0.2 * Math.exp(-((x + 4) ** 2 + (y - 1) ** 2) / 3)
      height += 0.15 * Math.exp(-((x - 1) ** 2 + (y + 2) ** 2) / 4)
      height += 0.12 * Math.exp(-((x - 6) ** 2 + y ** 2) / 5)
      pos.setZ(i, pos.getZ(i) + height)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <>
      <mesh geometry={geometry} rotation-x={-Math.PI / 2} receiveShadow>
        <meshStandardMaterial color={0xd2b48c} roughness={0.9} metalness={0} />
      </mesh>
      <RigidBody type="fixed" position={[0, -0.05, 0]}>
        <CuboidCollider args={[10, 0.05, 7]} />
      </RigidBody>
    </>
  )
}

// ── Player Zone ─────────────────────────────────────────
function PlayerZone({ visible }: { visible: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.visible = visible
    if (visible) {
      const t = Date.now() * 0.002
      ;(meshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.04 + Math.sin(t) * 0.02
    }
  })
  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} position={[-4, 0.02, 0]}>
      <planeGeometry args={[12, 14]} />
      <meshStandardMaterial color={0x4ADE80} transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Main Scene ──────────────────────────────────────────
interface BattleSceneProps {
  orbitingRef: React.MutableRefObject<boolean>
}

export function BattleScene({ orbitingRef }: BattleSceneProps) {
  const phase = useGameStore((s) => s.phase)
  const playerUnitsStore = useGameStore((s) => s.playerUnits)
  const selectedPlacement = useGameStore((s) => s.selectedPlacement)
  const placementRotation = useGameStore((s) => s.placementRotation)
  const placeSoldier = useGameStore((s) => s.placeSoldier)

  // ── Mutable battle state (NOT in Zustand -- mutated every frame) ──
  const playersRef = useRef<BattleUnit[]>([])
  const enemiesRef = useRef<BattleUnit[]>([])
  const projectilesRef = useRef<Projectile[]>([])
  const battleTimeRef = useRef(0)
  const wavesSpawned = useRef(new Set<number>())
  const battleActive = useRef(false)
  // Force re-render periodically so new enemies/projectiles appear in JSX
  const [renderTick, setRenderTick] = useState(0)
  const renderTickTimer = useRef(0)

  // Wall block refs for collision detection
  const wallBlocksRef = useRef<Map<string, WallBlock[]>>(new Map())

  // Explosion effects (visual only -- spawned at applyExplosion locations)
  interface ExplosionData { id: string; position: [number, number, number]; scale: number }
  const [explosions, setExplosions] = useState<ExplosionData[]>([])
  const explosionIdRef = useRef(0)

  // Victory slow-mo + confetti
  const victorySlowMo = useRef(false)
  const slowMoStartTime = useRef(0)
  const pendingStars = useRef(0)
  const [showConfetti, setShowConfetti] = useState(false)

  // Sync store → mutable refs on phase transitions
  useEffect(() => {
    if (phase === 'battle') {
      playersRef.current = playerUnitsStore.map(makeBattleUnit)
      enemiesRef.current = []
      projectilesRef.current = []
      battleTimeRef.current = 0
      wavesSpawned.current.clear()
      battleActive.current = true
      _eid = 1000
      _pid = 5000
    } else {
      battleActive.current = false
    }
    // Clear refs when leaving battle (prevents stale refs across rounds)
    if (phase === 'placement' || phase === 'levelSelect') {
      wallBlocksRef.current.clear()
      setExplosions([])
      setShowConfetti(false)
      victorySlowMo.current = false
    }
  }, [phase])

  // Also sync placement-phase units for rendering
  useEffect(() => {
    if (phase === 'placement') {
      playersRef.current = playerUnitsStore.map(makeBattleUnit)
    }
  }, [phase, playerUnitsStore])

  // ── BATTLE TICK (all logic in one useFrame, mutable refs) ──
  useFrame((_, rawDelta) => {
    if (!battleActive.current) return
    const rawDeltaClamped = Math.min(rawDelta, 0.05)

    // ── Slow-mo timer: after last enemy dies, play 1.5s of slow-mo before result ──
    if (victorySlowMo.current) {
      const elapsed = (performance.now() - slowMoStartTime.current) / 1000
      if (elapsed >= 1.5) {
        // Slow-mo complete: trigger result + confetti
        victorySlowMo.current = false
        const level = useGameStore.getState().level
        useGameStore.getState().setResult('victory', pendingStars.current)
        if (level) useGameStore.getState().completeLevel(level.id, pendingStars.current)
        sfx.graduationFanfare()
        setShowConfetti(true)
        battleActive.current = false
        return
      }
    }

    // Apply slow-mo factor to delta (5x slower during victory slow-mo)
    const delta = victorySlowMo.current ? rawDeltaClamped * 0.2 : rawDeltaClamped
    battleTimeRef.current += delta
    const time = battleTimeRef.current

    const players = playersRef.current
    const enemies = enemiesRef.current
    const projectiles = projectilesRef.current

    // ── Spawn waves from level config (multi-wave support) ──
    const level = useGameStore.getState().level
    const isTutorial = useTutorialStore.getState().isTutorialBattle()

    if (isTutorial) {
      // Tutorial: simple 2-infantry wave
      if (!wavesSpawned.current.has(0) && time >= 0.5) {
        wavesSpawned.current.add(0)
        const stats = ENEMY_STATS.infantry
        for (let j = 0; j < 2; j++) {
          const z = (j - 0.5) * 1.4
          enemies.push(makeBattleUnit({
            id: `e-${++_eid}`, type: 'soldier', team: 'tan',
            position: [SPAWN_X + Math.random() * 1.5, 0, z],
            rotation: Math.PI, health: stats.health, maxHealth: stats.health,
            status: 'walking', weapon: 'rifle', lastFireTime: -10,
            fireRate: stats.fireRate, range: stats.range,
            damage: stats.damage, speed: stats.speed,
          }))
        }
      }
    } else if (level) {
      for (let wi = 0; wi < level.waves.length; wi++) {
        if (wavesSpawned.current.has(wi)) continue
        const wave = level.waves[wi]
        if (time >= wave.delay) {
          wavesSpawned.current.add(wi)
          for (const entry of wave.enemies) {
            const enemyWeapon = (entry.weapon ?? 'rifle') as WeaponType
            const stats = getEnemyStats(entry.type, enemyWeapon)
            if (!stats) continue
            const spacing = entry.spacing ?? 1.5
            const xOffset = entry.type === 'tank' ? 2 : entry.type === 'jeep' ? 1 : 0
            for (let j = 0; j < entry.count; j++) {
              const z = (j - (entry.count - 1) / 2) * spacing
              enemies.push(makeBattleUnit({
                id: `e-${++_eid}`, type: 'soldier', team: 'tan',
                position: [SPAWN_X + xOffset + Math.random() * 1.5, 0, z],
                rotation: Math.PI, health: stats.health, maxHealth: stats.health,
                status: 'walking', weapon: enemyWeapon, lastFireTime: -10,
                fireRate: stats.fireRate, range: stats.range,
                damage: stats.damage, speed: stats.speed,
              }))
            }
          }
        }
      }
    }

    // ── Enemy AI ──
    for (const enemy of enemies) {
      if (enemy.status === 'dead') { enemy.stateAge += delta; continue }
      enemy.stateAge += delta

      const ePos = new THREE.Vector3(...enemy.position)

      // Find nearest living player
      let nearestPlayer: BattleUnit | null = null
      let nearestDist = Infinity
      for (const p of players) {
        if (p.status === 'dead') continue
        const d = ePos.distanceTo(new THREE.Vector3(...p.position))
        if (d < nearestDist) { nearestDist = d; nearestPlayer = p }
      }

      if (nearestPlayer && nearestDist <= enemy.range) {
        // Stop and fire
        const tPos = new THREE.Vector3(...nearestPlayer.position)
        enemy.facingAngle = Math.atan2(tPos.x - ePos.x, tPos.z - ePos.z)

        if (time - enemy.lastFireTime >= enemy.fireRate) {
          enemy.lastFireTime = time
          enemy.status = 'firing'
          enemy.stateAge = 0

          const muzzle: [number, number, number] = [ePos.x, ePos.y + 0.8, ePos.z]
          const ew = enemy.weapon as WeaponType
          const baseAngle = Math.atan2(tPos.x - ePos.x, tPos.z - ePos.z)

          if (ew === 'rocketLauncher') {
            // Enemy rocket: ballistic arc with slight aim randomness
            const aimError = (Math.random() - 0.5) * 0.3
            const finalAngle = baseAngle + aimError
            const elev = Math.max(0.05, idealElevation(nearestDist) + (Math.random() - 0.5) * 0.1)
            const cosE = Math.cos(elev)
            projectiles.push({
              id: `p-${++_pid}`, position: muzzle,
              velocity: [
                Math.sin(finalAngle) * cosE * ROCKET_SPEED,
                Math.sin(elev) * ROCKET_SPEED,
                Math.cos(finalAngle) * cosE * ROCKET_SPEED,
              ],
              type: 'rocket', damage: enemy.damage,
              ownerId: enemy.id, team: 'tan', age: 0,
            })
            sfx.rocketLaunch()
          } else if (ew === 'grenade') {
            // Enemy grenade: high arc throw with aim randomness
            const aimError = (Math.random() - 0.5) * 0.3
            const finalAngle = baseAngle + aimError
            const cosE = Math.cos(0.5)
            projectiles.push({
              id: `p-${++_pid}`, position: muzzle,
              velocity: [
                Math.sin(finalAngle) * cosE * GRENADE_SPEED,
                5.5 + (Math.random() - 0.5) * 1.0,
                Math.cos(finalAngle) * cosE * GRENADE_SPEED,
              ],
              type: 'grenade' as any, damage: enemy.damage,
              ownerId: enemy.id, team: 'tan', age: 0,
            })
            sfx.grenadeThrow()
          } else if (ew === 'machineGun') {
            // Enemy MG: rapid straight bullets with sweep
            const aimError = (Math.random() - 0.5) * 0.4
            const finalAngle = baseAngle + aimError
            const dir = new THREE.Vector3(
              Math.sin(finalAngle), 0.05, Math.cos(finalAngle)
            ).normalize()
            projectiles.push({
              id: `p-${++_pid}`, position: muzzle,
              velocity: [dir.x * MG_BULLET_SPEED, dir.y * MG_BULLET_SPEED, dir.z * MG_BULLET_SPEED],
              type: 'bullet', damage: enemy.damage,
              ownerId: enemy.id, team: 'tan', age: 0,
            })
            sfx.mgBurst()
          } else {
            // Rifle: direct aim bullet
            const tCenter = new THREE.Vector3(tPos.x, tPos.y + 0.5, tPos.z)
            const dir = tCenter.sub(new THREE.Vector3(...muzzle)).normalize()
            projectiles.push({
              id: `p-${++_pid}`, position: muzzle,
              velocity: [dir.x * BULLET_SPEED, dir.y * BULLET_SPEED, dir.z * BULLET_SPEED],
              type: 'bullet', damage: enemy.damage,
              ownerId: enemy.id, team: 'tan', age: 0,
            })
            sfx.rifleShot()
          }
        } else if (enemy.stateAge > 0.4) {
          enemy.status = 'idle'
        }
      } else {
        // March toward Intel
        const toIntel = INTEL_POS.clone().sub(ePos).normalize()
        enemy.position[0] += toIntel.x * enemy.speed * delta
        enemy.position[2] += toIntel.z * enemy.speed * delta
        enemy.facingAngle = Math.atan2(toIntel.x, toIntel.z)
        enemy.status = 'walking'

        // Check defeat condition
        if (ePos.distanceTo(INTEL_POS) < LOSE_THRESHOLD) {
          useGameStore.getState().setResult('defeat', 0)
          sfx.explosionLarge()
          triggerShake(0.3)
          const expId = `exp-${++explosionIdRef.current}`
          setExplosions((prev) => [...prev, { id: expId, position: [INTEL_POS.x, 0.5, INTEL_POS.z] as [number, number, number], scale: 1.5 }])
          battleActive.current = false
          return
        }
      }
      // Sync facing angle to rotation for SoldierUnit
      enemy.rotation = enemy.facingAngle
    }

    // ── Player AI (NERO hybrid -- trained NN vs untrained chaos) ──
    for (const player of players) {
      if (player.status === 'dead') { player.stateAge += delta; continue }
      player.stateAge += delta

      const pPos = new THREE.Vector3(...player.position)
      const aliveEnemies = enemies.filter((e) => e.status !== 'dead')
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      for (const e of aliveEnemies) {
        const d = pPos.distanceTo(new THREE.Vector3(...e.position))
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e }
      }

      if (nearestEnemy && nearestDist <= player.range) {
        const ePos = new THREE.Vector3(...nearestEnemy.position)
        const dx = ePos.x - pPos.x
        const dz = ePos.z - pPos.z
        const baseAngle = Math.atan2(dx, dz)
        player.facingAngle = baseAngle

        const weapon = player.weapon as WeaponType
        const cooldownMet = time - player.lastFireTime >= player.fireRate

        // Build NN inputs (same format as training scenarios)
        const cooldownRatio = Math.min(1, (time - player.lastFireTime) / player.fireRate)
        const elevation = idealElevation(nearestDist)
        const nnInputs = [
          ePos.x / 10,
          ePos.z / 5,
          Math.min(1, nearestDist / 10),
          elevation / 0.8,
          1.0 - cooldownRatio, // 0 = ready, 1 = full cooldown
          aliveEnemies.length / 5,
        ]

        // Get aim corrections from trained NN or random chaos
        let aimCorrection = 0
        let elevCorrection = 0
        let shouldFire = cooldownMet

        if (weapon === 'rifle') {
          // Rifle: basic scripted aim, always "trained"
          aimCorrection = 0
          elevCorrection = 0
        } else if (player.nn && player.isTrained) {
          // TRAINED: neural net provides precise corrections
          const outputs = player.nn.forward(nnInputs)
          if (weapon === 'rocketLauncher') {
            aimCorrection = outputs[0] * 0.2
            elevCorrection = outputs[1] * 0.15
          } else if (weapon === 'grenade') {
            aimCorrection = outputs[0] * 0.25
            elevCorrection = outputs[1] * 0.2
          } else if (weapon === 'machineGun') {
            aimCorrection = outputs[0] * 0.3
            elevCorrection = 0
          }
          shouldFire = cooldownMet && outputs[2] > 0
        } else {
          // UNTRAINED: hilariously bad aim
          aimCorrection = (Math.random() - 0.5) * 0.8 // wild offset (±23 degrees)
          elevCorrection = (Math.random() - 0.5) * 0.4 // random arc
          // Sometimes hesitates, sometimes fires too early
          shouldFire = cooldownMet && Math.random() > 0.3
        }

        if (shouldFire) {
          player.lastFireTime = time
          player.status = 'firing'
          player.stateAge = 0
          player.shotsFired++

          const muzzle: [number, number, number] = [pPos.x, pPos.y + 0.8, pPos.z]
          const finalAngle = baseAngle + aimCorrection

          if (weapon === 'rocketLauncher') {
            // Rocket: ballistic arc with NERO corrections
            const finalElev = Math.max(0.05, elevation + elevCorrection)
            const cosE = Math.cos(finalElev)
            projectiles.push({
              id: `p-${++_pid}`,
              position: muzzle,
              velocity: [
                Math.sin(finalAngle) * cosE * ROCKET_SPEED,
                Math.sin(finalElev) * ROCKET_SPEED,
                Math.cos(finalAngle) * cosE * ROCKET_SPEED,
              ],
              type: 'rocket',
              damage: player.damage,
              ownerId: player.id,
              team: 'green',
              age: 0,
            })
            sfx.rocketLaunch()
          } else if (weapon === 'grenade') {
            // Grenade: high arc throw
            const finalElev = Math.max(0.15, 0.5 + elevCorrection)
            const cosE = Math.cos(finalElev)
            projectiles.push({
              id: `p-${++_pid}`,
              position: muzzle,
              velocity: [
                Math.sin(finalAngle) * cosE * GRENADE_SPEED,
                5.5 + elevCorrection * 2,
                Math.cos(finalAngle) * cosE * GRENADE_SPEED,
              ],
              type: 'grenade' as any,
              damage: player.damage,
              ownerId: player.id,
              team: 'green',
              age: 0,
            })
            sfx.grenadeThrow()
          } else if (weapon === 'machineGun') {
            // MG: rapid straight bullets with sweep
            const dir = new THREE.Vector3(
              Math.sin(finalAngle), 0.05, Math.cos(finalAngle)
            ).normalize()
            projectiles.push({
              id: `p-${++_pid}`,
              position: muzzle,
              velocity: [dir.x * MG_BULLET_SPEED, dir.y * MG_BULLET_SPEED, dir.z * MG_BULLET_SPEED],
              type: 'bullet',
              damage: player.damage,
              ownerId: player.id,
              team: 'green',
              age: 0,
            })
            sfx.mgBurst()
          } else {
            // Rifle: direct aim
            const tCenter = ePos.clone()
            tCenter.y += 0.5
            const dir = tCenter.sub(new THREE.Vector3(...muzzle)).normalize()
            projectiles.push({
              id: `p-${++_pid}`,
              position: muzzle,
              velocity: [dir.x * BULLET_SPEED, dir.y * BULLET_SPEED, dir.z * BULLET_SPEED],
              type: 'bullet',
              damage: player.damage,
              ownerId: player.id,
              team: 'green',
              age: 0,
            })
            sfx.rifleShot()
          }
        } else if (player.stateAge > 0.4) {
          player.status = 'idle'
        }
      } else {
        if (player.status !== 'idle') { player.status = 'idle'; player.stateAge = 0 }
      }
      player.rotation = player.facingAngle
    }

    // ── Explosion helper (blast radius damage + knockback + wall destruction + VFX) ──
    function applyExplosion(center: [number, number, number], blastRadius: number, blastDamage: number, team: string) {
      const allUnits = [...players, ...enemies]
      const cPos = new THREE.Vector3(...center)

      // ── Damage units ──
      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === team) continue // no friendly fire
        const uPos = new THREE.Vector3(...unit.position)
        uPos.y += 0.4
        const dist = cPos.distanceTo(uPos)
        if (dist < blastRadius) {
          const force = (blastRadius - dist) / blastRadius
          const dmg = Math.round(blastDamage * force)
          unit.health -= dmg
          // Knockback
          const knockDir = uPos.clone().sub(cPos).normalize()
          const knockForce = force * 6
          unit.velocity[0] += knockDir.x * knockForce
          unit.velocity[1] += 0.4 + force * 3
          unit.velocity[2] += knockDir.z * knockForce
          unit.spinSpeed = 1 + Math.random() * 2

          if (unit.health <= 0) {
            unit.health = 0
            unit.status = 'dead'
            unit.stateAge = 0
            sfx.deathThud()
          } else {
            unit.status = 'hit'
            unit.stateAge = 0
          }
        }
      }

      // ── Damage wall blocks ──
      const tempWorldPos = new THREE.Vector3()
      for (const [, blocks] of wallBlocksRef.current) {
        for (const block of blocks) {
          if (!block.alive) continue
          block.mesh.getWorldPosition(tempWorldPos)
          const dist = cPos.distanceTo(tempWorldPos)
          if (dist < blastRadius) {
            const force = (blastRadius - dist) / blastRadius
            if (force > 0.25) {
              // Destroy block and launch it
              block.alive = false
              block.settled = false
              block.mesh.visible = false
              // Create ejection velocity (radial + upward)
              const knockDir = tempWorldPos.clone().sub(cPos).normalize()
              const knockForce = force * 5
              block.velocity.set(
                knockDir.x * knockForce + (Math.random() - 0.5) * 2,
                1 + force * 4,
                knockDir.z * knockForce + (Math.random() - 0.5) * 2,
              )
            } else if (force > 0.1) {
              // Just shake the block (knock it loose so it cascades)
              block.settled = false
              block.velocity.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                force * 2,
                (Math.random() - 0.5) * 0.5,
              ))
            }
          }
        }
      }

      // ── Screen shake ──
      triggerShake(0.15)

      // ── Spawn explosion visual effect ──
      const expId = `exp-${++explosionIdRef.current}`
      const expScale = blastRadius > 3.3 ? 1.2 : 0.9 // bigger for rockets
      setExplosions((prev) => [...prev, { id: expId, position: [...center] as [number, number, number], scale: expScale }])
    }

    // ── Update projectiles ──
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      p.age += delta

      if (p.age > PROJECTILE_MAX_AGE) { projectiles.splice(i, 1); continue }

      // Gravity for rockets and grenades
      if (p.type === 'rocket' || p.type === 'grenade') {
        p.velocity[1] += PROJECTILE_GRAVITY * delta
      }

      // Integrate position
      p.position[0] += p.velocity[0] * delta
      p.position[1] += p.velocity[1] * delta
      p.position[2] += p.velocity[2] * delta

      // Grenade bounce on ground
      if (p.type === 'grenade' && p.position[1] < 0.07) {
        p.position[1] = 0.07
        p.velocity[1] *= -0.3
        p.velocity[0] *= 0.6
        p.velocity[2] *= 0.6
      }

      // Grenade fuse explosion
      if (p.type === 'grenade' && p.age >= (p.fuseTime ?? 1.2)) {
        applyExplosion(p.position, 3.0, 60, p.team)
        sfx.explosionLarge()
        projectiles.splice(i, 1)
        continue
      }

      // Rocket ground impact explosion
      if (p.type === 'rocket' && p.position[1] < 0.1) {
        applyExplosion(p.position, 3.6, 90, p.team)
        sfx.explosionLarge()
        projectiles.splice(i, 1)
        continue
      }

      // Remove bullets below ground
      if (p.type === 'bullet' && p.position[1] < -0.5) {
        projectiles.splice(i, 1)
        continue
      }
    }

    // ── Collision detection (bullets = direct hit, rockets/grenades = explode) ──
    const tempBlockPos = new THREE.Vector3()
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      let removed = false

      // ── Check unit hits ──
      const allUnits = [...players, ...enemies]
      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === p.team) continue

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.4)
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          if (p.type === 'rocket') {
            applyExplosion(p.position, 3.6, 90, p.team)
            sfx.explosionLarge()
          } else if (p.type === 'grenade') {
            applyExplosion(p.position, 3.0, 60, p.team)
            sfx.explosionLarge()
          } else {
            unit.health -= p.damage
            sfx.bulletImpact()
            if (unit.health <= 0) {
              unit.health = 0
              unit.status = 'dead'
              unit.stateAge = 0
              sfx.deathThud()
              const knockDir = new THREE.Vector3(dx, 0, dz).normalize()
              unit.velocity[0] += knockDir.x * 1.5
              unit.velocity[1] += 1.5
              unit.velocity[2] += knockDir.z * 1.5
              unit.spinSpeed = 1 + Math.random() * 1.5
            } else {
              unit.status = 'hit'
              unit.stateAge = 0
            }
          }
          const shooter = [...players, ...enemies].find((u) => u.id === p.ownerId)
          if (shooter && 'shotsHit' in shooter) shooter.shotsHit++
          projectiles.splice(i, 1)
          removed = true
          break
        }
      }
      if (removed) continue

      // ── Check wall block hits ──
      for (const [, blocks] of wallBlocksRef.current) {
        for (const block of blocks) {
          if (!block.alive) continue
          block.mesh.getWorldPosition(tempBlockPos)
          const dx = p.position[0] - tempBlockPos.x
          const dy = p.position[1] - tempBlockPos.y
          const dz = p.position[2] - tempBlockPos.z
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

          if (dist < 0.3) { // Wall block hit radius (~half block width)
            if (p.type === 'rocket') {
              applyExplosion(p.position, 3.6, 90, p.team)
              sfx.explosionLarge()
            } else if (p.type === 'grenade') {
              applyExplosion(p.position, 3.0, 60, p.team)
              sfx.explosionLarge()
            } else {
              // Bullets absorbed by walls (walls are cover!)
              sfx.bulletImpact()
            }
            projectiles.splice(i, 1)
            removed = true
            break
          }
        }
        if (removed) break
      }
    }

    // ── Ragdoll physics for all units ──
    for (const unit of [...players, ...enemies]) {
      const hasVel = Math.abs(unit.velocity[0]) > 0.01 || Math.abs(unit.velocity[1]) > 0.01 || Math.abs(unit.velocity[2]) > 0.01
      const isAboveGround = unit.position[1] > 0.01
      if (!hasVel && !isAboveGround) continue

      // Gravity
      if (unit.position[1] > 0 || unit.velocity[1] > 0) {
        unit.velocity[1] += GRAVITY * delta
      }

      // Integrate
      unit.position[0] += unit.velocity[0] * delta
      unit.position[1] += unit.velocity[1] * delta
      unit.position[2] += unit.velocity[2] * delta

      // Ground clamp
      if (unit.position[1] <= 0) {
        unit.position[1] = 0
        if (unit.velocity[1] < -0.5) {
          unit.velocity[1] *= -0.2
        } else {
          unit.velocity[1] = 0
        }
        unit.velocity[0] *= 0.8
        unit.velocity[2] *= 0.8
        unit.spinSpeed *= 0.7
      }

      // Air drag
      unit.velocity[0] *= 0.993
      unit.velocity[2] *= 0.993

      // Stop when slow on ground
      if (unit.position[1] <= 0 && Math.abs(unit.velocity[0]) < 0.05 && Math.abs(unit.velocity[2]) < 0.05) {
        unit.velocity[0] = 0
        unit.velocity[1] = 0
        unit.velocity[2] = 0
      }
      if (unit.status === 'dead' && unit.position[1] <= 0) {
        unit.spinSpeed *= 0.8
        if (unit.spinSpeed < 0.05) unit.spinSpeed = 0
      }
    }

    // ── Check victory (all waves spawned + all enemies dead) ──
    const totalWaves = isTutorial ? 1 : (level?.waves.length ?? 1)
    const allWavesSpawned = wavesSpawned.current.size >= totalWaves
    const livingEnemies = enemies.filter((e) => e.status !== 'dead')
    if (allWavesSpawned && enemies.length > 0 && livingEnemies.length === 0) {
      const store = useGameStore.getState()
      const livingPlayers = players.filter((p) => p.status !== 'dead')
      const allSurvived = livingPlayers.length === players.length

      // Evaluate star criteria from level config
      let stars = 0
      const sc = level?.stars
      if (sc) {
        // Star 1: survive (always granted on victory)
        if (sc.one.type === 'survive') stars = 1
        // Star 2
        if (stars >= 1) {
          if (sc.two.type === 'budget_remaining' && store.gold >= (sc.two.threshold ?? 0)) stars = 2
          else if (sc.two.type === 'objective' && sc.two.desc === 'No soldiers lost' && allSurvived) stars = 2
        }
        // Star 3
        if (stars >= 2) {
          if (sc.three.type === 'objective' && sc.three.desc === 'No soldiers lost' && allSurvived) stars = 3
          else if (sc.three.type === 'budget_remaining' && store.gold >= (sc.three.threshold ?? 0)) stars = 3
        }
      } else {
        stars = 1 // fallback
      }

      // Start slow-mo instead of immediate result (unless already in slow-mo)
      if (!victorySlowMo.current) {
        pendingStars.current = stars
        victorySlowMo.current = true
        slowMoStartTime.current = performance.now()
      }
    }

    // Trigger React re-render every ~100ms so new enemies/projectiles appear in JSX
    renderTickTimer.current += delta
    if (renderTickTimer.current > 0.1) {
      renderTickTimer.current = 0
      setRenderTick((t) => t + 1)
    }
  })

  // ── Determine what to render ──
  // During battle/result, render from mutable refs
  // During placement, render from store
  const isBattle = phase === 'battle' || phase === 'result'
  const renderPlayers = isBattle ? playersRef.current : playerUnitsStore.map(makeBattleUnit)
  const renderEnemies = isBattle ? enemiesRef.current : []
  const renderProjectiles = isBattle ? projectilesRef.current : []

  const isPlacing = phase === 'placement' && !!selectedPlacement

  return (
    <>
      <Lights />
      <CameraRig orbitingRef={orbitingRef} />
      <SandboxGround />
      <BattlefieldProps />
      <Intel />

      <color attach="background" args={[0x88bbdd]} />
      <fog attach="fog" args={[0xd4c8a0, 18, 40]} />

      <PlayerZone visible={isPlacing} />
      <GhostPreview selectedType={selectedPlacement} placementRotation={placementRotation} />

      {/* Placement click plane */}
      {phase === 'placement' && selectedPlacement && (
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, 0.03, 0]}
          onPointerUp={(e) => {
            if (orbitingRef.current) return
            e.stopPropagation()
            const x = Math.round(e.point.x * 2) / 2
            const z = Math.round(e.point.z * 2) / 2
            if (x > 2) return

            const sel = selectedPlacement
            if (sel === 'wall' || sel === 'sandbag' || sel === 'tower') {
              useGameStore.getState().placeDefense(sel, [x, 0, z])
            } else {
              placeSoldier(sel, [x, 0, z])
            }
          }}
        >
          <planeGeometry args={[20, 14]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Player units: soldiers + defenses */}
      {renderPlayers.map((unit) => {
        if (unit.type === 'wall') return (
          <WallDefense
            key={unit.id}
            position={unit.position}
            rotation={unit.rotation}
            wallBlocksRef={wallBlocksRef}
            wallId={unit.id}
          />
        )
        if (unit.type === 'sandbag') return <SandbagDefense key={unit.id} position={unit.position} rotation={unit.rotation} />
        if (unit.type === 'tower') return <WatchTower key={unit.id} position={unit.position} rotation={unit.rotation} />
        return <SoldierUnit key={unit.id} unit={unit} />
      })}
      {renderEnemies.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}

      {/* Projectiles */}
      {renderProjectiles.map((p) => (
        <ProjectileMesh key={p.id} projectile={p} />
      ))}

      {/* Explosion effects */}
      {explosions.map((exp) => (
        <ExplosionEffect
          key={exp.id}
          position={exp.position}
          scale={exp.scale}
          onComplete={() => setExplosions((prev) => prev.filter((e) => e.id !== exp.id))}
        />
      ))}

      {/* Victory confetti */}
      {showConfetti && (
        <ConfettiEffect
          position={[0, 5, 0]}
          onComplete={() => setShowConfetti(false)}
        />
      )}
    </>
  )
}
