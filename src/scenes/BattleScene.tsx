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
import { ImpactSpark } from '@three/effects/ImpactSpark'
import { DustCloud } from '@three/effects/DustCloud'
import { triggerShake } from '@three/effects/ScreenShake'
import { ENEMY_STATS, WEAPON_STATS } from '@config/units'
import { useTutorialStore } from '@stores/tutorialStore'
import * as sfx from '@audio/sfx'
import {
  GRAVITY, PROJECTILE_GRAVITY, BULLET_SPEED, ROCKET_SPEED, GRENADE_SPEED,
  MG_BULLET_SPEED, ROCKET_GRAV, PROJECTILE_MAX_AGE, HIT_RADIUS, WALL_HIT_RADIUS,
  INTEL_POS_ARRAY, LOSE_THRESHOLD, SPAWN_X, FALL_DEATH_Y,
  TABLE_EDGE_X, TABLE_EDGE_Z, TABLE_EDGE_LEFT,
  BLAST, SHAKE, RAGDOLL, DEBRIS,
  idealElevation, randRange, randomDeathType,
} from '@engine/physics/battlePhysics'
import { triggerHitpause, getHitpauseScale } from '@engine/physics/hitpause'
import { perfMonitor } from '@engine/physics/perfMonitor'
import { createHazardState, type HazardState } from '@engine/hazards/hazardTypes'
import { ExplosiveBarrelMesh } from '@three/hazards/ExplosiveBarrel'
import { SweepingArmMesh, SWEEP_ARM_LENGTH, SWEEP_ARM_HEIGHT } from '@three/hazards/SweepingArm'
import { SpringLauncherMesh, TRIGGER_RADIUS, COOLDOWN as SPRING_COOLDOWN, LAUNCH_VELOCITY } from '@three/hazards/SpringLauncher'
import type { GameUnit, Projectile, Wave, WaveEnemy, EnemyType, WeaponType, HazardConfig } from '@config/types'

// ── Battle constants (derived from physics module) ──────
const INTEL_POS = new THREE.Vector3(...INTEL_POS_ARRAY)

// Reusable temp vectors (avoids GC pressure in hot loops)
const _tA = new THREE.Vector3()
const _tB = new THREE.Vector3()
const _tC = new THREE.Vector3()
const _tD = new THREE.Vector3()

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

  // Hazard state (initialized from level config)
  const hazardsRef = useRef<HazardState[]>([])

  // Explosion effects (visual only -- spawned at applyExplosion locations)
  interface ExplosionData { id: string; position: [number, number, number]; scale: number }
  const [explosions, setExplosions] = useState<ExplosionData[]>([])
  const explosionIdRef = useRef(0)

  // Impact sparks (bullet/wall hits)
  interface SparkData { id: string; position: [number, number, number] }
  const [sparks, setSparks] = useState<SparkData[]>([])
  const sparkIdRef = useRef(0)

  // Dust clouds (landings, heavy impacts)
  interface DustData { id: string; position: [number, number, number]; intensity: number }
  const [dustClouds, setDustClouds] = useState<DustData[]>([])
  const dustIdRef = useRef(0)

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
      // Initialize hazards from level config
      const levelHazards = useGameStore.getState().level?.hazards ?? []
      hazardsRef.current = levelHazards.map(createHazardState)
    } else {
      battleActive.current = false
    }
    // Clear refs when leaving battle (prevents stale refs across rounds)
    if (phase === 'placement' || phase === 'levelSelect') {
      wallBlocksRef.current.clear()
      setExplosions([])
      setSparks([])
      setDustClouds([])
      setShowConfetti(false)
      victorySlowMo.current = false
      perfMonitor.reset()
      hazardsRef.current = []
    }
  }, [phase])

  // Also sync placement-phase units for rendering
  useEffect(() => {
    if (phase === 'placement') {
      playersRef.current = playerUnitsStore.map(makeBattleUnit)
    }
  }, [phase, playerUnitsStore])

  // ── BATTLE TICK (all logic in one useFrame, mutable refs) ──
  const { gl } = useThree()
  useFrame((_, rawDelta) => {
    if (!battleActive.current) return
    perfMonitor.beginFrame()
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
    // Then apply hitpause scale (near-zero during freeze frames)
    const slowMoDelta = victorySlowMo.current ? rawDeltaClamped * 0.2 : rawDeltaClamped
    const delta = slowMoDelta * getHitpauseScale(rawDeltaClamped)
    battleTimeRef.current += delta
    const time = battleTimeRef.current

    const players = playersRef.current
    const enemies = enemiesRef.current
    const projectiles = projectilesRef.current

    // Single combined array for unit iteration — reuse to avoid GC pressure
    // (Previously spread 5x per frame creating garbage)
    const allUnits: BattleUnit[] = []
    for (let i = 0; i < players.length; i++) allUnits.push(players[i])
    for (let i = 0; i < enemies.length; i++) allUnits.push(enemies[i])

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
                position: [Math.min(SPAWN_X + xOffset + Math.random() * 1.0, TABLE_EDGE_X - 0.5), 0, Math.max(-TABLE_EDGE_Z + 0.5, Math.min(TABLE_EDGE_Z - 0.5, z))],
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
      // Skip AI for units falling off the table
      const enemyOffEdge = enemy.position[0] > TABLE_EDGE_X || enemy.position[0] < TABLE_EDGE_LEFT ||
                           Math.abs(enemy.position[2]) > TABLE_EDGE_Z
      if (enemyOffEdge) continue
      enemy.stateAge += delta

      _tA.set(enemy.position[0], enemy.position[1], enemy.position[2])

      // Find nearest living player
      let nearestPlayer: BattleUnit | null = null
      let nearestDist = Infinity
      for (const p of players) {
        if (p.status === 'dead') continue
        const d = _tA.distanceTo(_tB.set(p.position[0], p.position[1], p.position[2]))
        if (d < nearestDist) { nearestDist = d; nearestPlayer = p }
      }

      if (nearestPlayer && nearestDist <= enemy.range) {
        // Stop and fire
        _tB.set(nearestPlayer.position[0], nearestPlayer.position[1], nearestPlayer.position[2])
        enemy.facingAngle = Math.atan2(_tB.x - _tA.x, _tB.z - _tA.z)

        if (time - enemy.lastFireTime >= enemy.fireRate) {
          enemy.lastFireTime = time
          enemy.status = 'firing'
          enemy.stateAge = 0

          const muzzle: [number, number, number] = [_tA.x, _tA.y + 0.8, _tA.z]
          const ew = enemy.weapon as WeaponType
          const baseAngle = Math.atan2(_tB.x - _tA.x, _tB.z - _tA.z)

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
            _tC.set(_tB.x, _tB.y + 0.5, _tB.z)
            const dir = _tC.sub(_tD.set(muzzle[0], muzzle[1], muzzle[2])).normalize()
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
        _tC.copy(INTEL_POS).sub(_tA).normalize()
        enemy.position[0] += _tC.x * enemy.speed * delta
        enemy.position[2] += _tC.z * enemy.speed * delta
        enemy.facingAngle = Math.atan2(_tC.x, _tC.z)
        enemy.status = 'walking'

        // Check defeat condition
        if (_tA.distanceTo(INTEL_POS) < LOSE_THRESHOLD) {
          useGameStore.getState().setResult('defeat', 0)
          sfx.explosionLarge()
          triggerShake(SHAKE.DEFEAT)
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

      _tA.set(player.position[0], player.position[1], player.position[2])
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      for (const e of enemies) {
        if (e.status === 'dead') continue
        const d = _tA.distanceTo(_tB.set(e.position[0], e.position[1], e.position[2]))
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e }
      }

      if (nearestEnemy && nearestDist <= player.range) {
        _tB.set(nearestEnemy.position[0], nearestEnemy.position[1], nearestEnemy.position[2])
        const dx = _tB.x - _tA.x
        const dz = _tB.z - _tA.z
        const baseAngle = Math.atan2(dx, dz)
        player.facingAngle = baseAngle

        const weapon = player.weapon as WeaponType
        const cooldownMet = time - player.lastFireTime >= player.fireRate

        // Build NN inputs (same format as training scenarios)
        const cooldownRatio = Math.min(1, (time - player.lastFireTime) / player.fireRate)
        const elevation = idealElevation(nearestDist)
        const nnInputs = [
          _tB.x / 10,
          _tB.z / 5,
          Math.min(1, nearestDist / 10),
          elevation / 0.8,
          1.0 - cooldownRatio, // 0 = ready, 1 = full cooldown
          enemies.filter((e) => e.status !== 'dead').length / 5,
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

          const muzzle: [number, number, number] = [_tA.x, _tA.y + 0.8, _tA.z]
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
            _tC.set(_tB.x, _tB.y + 0.5, _tB.z)
            const dir = _tC.sub(_tD.set(muzzle[0], muzzle[1], muzzle[2])).normalize()
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
      const isRocket = blastRadius > 3.3
      const blastConfig = isRocket ? BLAST.ROCKET : BLAST.GRENADE
      const cPos = _tC.set(center[0], center[1], center[2])
      let killCount = 0

      // ── Damage units ──
      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === team) continue // no friendly fire
        const uPos = _tD.set(unit.position[0], unit.position[1], unit.position[2])
        uPos.y += 0.4
        const dist = cPos.distanceTo(uPos)
        if (dist < blastRadius) {
          const force = (blastRadius - dist) / blastRadius
          const dmg = Math.round(blastDamage * force)
          unit.health -= dmg

          // Knockback with VARIATION for comedy
          const knockDir = _tA.set(uPos.x - cPos.x, uPos.y - cPos.y, uPos.z - cPos.z).normalize()
          const forceVariance = randRange(RAGDOLL.FORCE_VARIANCE_MIN, RAGDOLL.FORCE_VARIANCE_MAX)
          const knockForce = force * blastConfig.unitForce * forceVariance

          // Add random lateral offset for unpredictable trajectories
          const lateralAngle = Math.random() * Math.PI * 2
          const lateralKick = Math.random() * RAGDOLL.LATERAL_OFFSET_MAX
          unit.velocity[0] += knockDir.x * knockForce + Math.cos(lateralAngle) * lateralKick
          unit.velocity[2] += knockDir.z * knockForce + Math.sin(lateralAngle) * lateralKick

          if (unit.health <= 0) {
            unit.health = 0
            unit.status = 'dead'
            unit.stateAge = 0
            killCount++
            sfx.deathThud()

            // Death type determines trajectory character
            const deathType = randomDeathType()
            if (deathType === 'launch') {
              // High arc, less spin — soldier flies dramatically
              unit.velocity[1] += randRange(RAGDOLL.LAUNCH_Y_MIN, RAGDOLL.LAUNCH_Y_MAX) * force
              unit.spinSpeed = randRange(1, 3)
            } else {
              // Low tumble, lots of spin — soldier rolls and bounces
              unit.velocity[1] += 0.4 + force * 2
              unit.spinSpeed = randRange(RAGDOLL.TUMBLE_SPIN_MIN, RAGDOLL.TUMBLE_SPIN_MAX)
            }

            // Spawn dust at death position
            const dustId = `dust-${++dustIdRef.current}`
            setDustClouds(prev => [...prev, { id: dustId, position: [...unit.position] as [number, number, number], intensity: 0.8 }])
          } else {
            unit.status = 'hit'
            unit.stateAge = 0
            unit.velocity[1] += 0.4 + force * blastConfig.unitYBias * 0.3
          }
        }
      }

      // ── Damage wall blocks (sandbox-style punchier physics) ──
      const tempWorldPos = new THREE.Vector3()
      let blocksDestroyed = 0
      for (const [, blocks] of wallBlocksRef.current) {
        for (const block of blocks) {
          if (!block.alive) continue
          block.mesh.getWorldPosition(tempWorldPos)
          const dist = cPos.distanceTo(tempWorldPos)
          if (dist < blastRadius) {
            const force = (blastRadius - dist) / blastRadius
            if (force > blastConfig.destroyThreshold) {
              // Destroy block and LAUNCH it (sandbox-style: much more dramatic)
              block.alive = false
              block.settled = false
              block.mesh.visible = false
              blocksDestroyed++
              const knockDir = _tA.set(tempWorldPos.x - cPos.x, tempWorldPos.y - cPos.y, tempWorldPos.z - cPos.z).normalize()
              block.velocity.set(
                knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
                1 + force * blastConfig.blockYBias,
                knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
              )
            } else if (force > blastConfig.shakeThreshold) {
              // Shake loose for cascade
              block.settled = false
              block.velocity.set(
                block.velocity.x + (Math.random() - 0.5) * 0.8,
                block.velocity.y + force * 3,
                block.velocity.z + (Math.random() - 0.5) * 0.8,
              )
            }
          }
        }
      }

      // ── Hitpause on big impacts ──
      if (killCount > 0 || blocksDestroyed >= 3) {
        triggerHitpause(killCount >= 2 ? 5 : 3)
      }

      // ── Chain reaction: check if any barrels are in blast radius ──
      for (const hazard of hazardsRef.current) {
        if (hazard.triggered || hazard.config.type !== 'explosive_barrel') continue
        const bPos = hazard.config.position
        const dx = bPos[0] - center[0]
        const dy = (bPos[1] + 0.3) - center[1]
        const dz = bPos[2] - center[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < blastRadius) {
          hazard.health -= 999
          if (hazard.health <= 0) {
            hazard.triggered = true
            // Chain reaction: explode immediately (hitpause gives the visual stagger)
            applyExplosion(bPos, 4.0, 80, '')
            sfx.barrelExplosion()
            triggerShake(SHAKE.BARREL)
            triggerHitpause(5)
          }
        }
      }

      // ── Calibrated screen shake ──
      const shakeAmount = isRocket ? SHAKE.ROCKET : SHAKE.GRENADE
      triggerShake(killCount >= 2 ? SHAKE.MULTI_KILL : shakeAmount)

      // ── Spawn explosion visual effect ──
      const expId = `exp-${++explosionIdRef.current}`
      const expScale = isRocket ? 1.2 : 0.9
      setExplosions((prev) => [...prev, { id: expId, position: [...center] as [number, number, number], scale: expScale }])
    }

    // ── Hazard interactions ──
    for (let hi = 0; hi < hazardsRef.current.length; hi++) {
      const hazard = hazardsRef.current[hi]
      if (hazard.triggered && hazard.config.type === 'explosive_barrel') continue
      hazard.age += delta
      if (hazard.cooldown > 0) hazard.cooldown -= delta

      switch (hazard.config.type) {
        case 'sweeping_arm': {
          const speed = hazard.config.params?.speed ?? 0.8
          const armAngle = hazard.age * speed
          const hx = hazard.config.position[0]
          const hz = hazard.config.position[2]

          // Arm direction matches Three.js rotation.y convention
          const armDirX = Math.sin(armAngle)
          const armDirZ = Math.cos(armAngle)

          for (const unit of allUnits) {
            if (unit.status === 'dead') continue
            if (unit.position[1] > SWEEP_ARM_HEIGHT + 0.5) continue
            // Per-unit cooldown: skip if this unit was recently hit by ANY arm
            // (reuse stateAge — if status is 'hit' and stateAge < 1s, skip)
            if (unit.status === 'hit' && unit.stateAge < 1.0) continue

            const ux = unit.position[0] - hx
            const uz = unit.position[2] - hz

            // Project onto arm direction
            const dot = ux * armDirX + uz * armDirZ
            if (dot < 0.5 || dot > SWEEP_ARM_LENGTH) continue

            // Perpendicular distance from unit to arm line
            const perpDist = Math.abs(ux * armDirZ - uz * armDirX)

            if (perpDist < 0.45) {
              // WHACK! Single hit, then the unit is immune for 1s
              const crossSign = (ux * armDirZ - uz * armDirX) > 0 ? 1 : -1
              const perpX = armDirZ * crossSign
              const perpZ = -armDirX * crossSign
              const launchForce = 6 + Math.random() * 3
              unit.velocity[0] = perpX * launchForce
              unit.velocity[1] = 4 + Math.random() * 2
              unit.velocity[2] = perpZ * launchForce
              unit.spinSpeed = 3 + Math.random() * 3
              unit.health -= 15
              if (unit.health <= 0) {
                unit.health = 0
                unit.status = 'dead'
                unit.stateAge = 0
                sfx.deathThud()
              } else {
                unit.status = 'hit'
                unit.stateAge = 0 // starts the 1s immunity window
              }
              sfx.sweepWhoosh()
              triggerShake(SHAKE.GRENADE)
              triggerHitpause(3)
            }
          }
          break
        }

        case 'spring_launcher': {
          if (hazard.cooldown > 0) break
          const hPos = hazard.config.position

          for (const unit of allUnits) {
            if (unit.status === 'dead') continue
            if (unit.position[1] > 0.3) continue // must be on ground
            const dx = unit.position[0] - hPos[0]
            const dz = unit.position[2] - hPos[2]
            const dist = Math.sqrt(dx * dx + dz * dz)
            if (dist < TRIGGER_RADIUS) {
              // BOING! Launch straight up
              unit.velocity[1] += LAUNCH_VELOCITY
              unit.velocity[0] += (Math.random() - 0.5) * 2
              unit.velocity[2] += (Math.random() - 0.5) * 2
              unit.spinSpeed = 2 + Math.random() * 3
              hazard.cooldown = SPRING_COOLDOWN
              sfx.springBoing()
              triggerShake(SHAKE.GRENADE)
              triggerHitpause(3)
              break // only launch one unit per trigger
            }
          }
          break
        }

        case 'explosive_barrel': {
          // Check if any projectile hit the barrel
          const hPos = hazard.config.position
          for (let pi = projectiles.length - 1; pi >= 0; pi--) {
            const p = projectiles[pi]
            const dx = p.position[0] - hPos[0]
            const dy = p.position[1] - (hPos[1] + 0.3)
            const dz = p.position[2] - hPos[2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
            if (dist < 0.5) {
              hazard.health -= p.type === 'bullet' ? p.damage : 999
              projectiles.splice(pi, 1)
              if (hazard.health <= 0) {
                hazard.triggered = true
                applyExplosion(hPos, 4.0, 80, '')
                sfx.barrelExplosion()
                triggerShake(SHAKE.BARREL)
                triggerHitpause(5)
              }
              break
            }
          }
          // Also check if caught in another explosion's radius
          // (handled by applyExplosion checking barrel positions)
          break
        }
      }
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

      // Grenade fuse explosion (sandbox-style timing)
      if (p.type === 'grenade' && p.age >= (p.fuseTime ?? BLAST.GRENADE.fuseTime)) {
        applyExplosion(p.position, BLAST.GRENADE.radius, BLAST.GRENADE.damage, p.team)
        sfx.explosionLarge()
        projectiles.splice(i, 1)
        continue
      }

      // Rocket ground impact explosion
      if (p.type === 'rocket' && p.position[1] < 0.1) {
        applyExplosion(p.position, BLAST.ROCKET.radius, BLAST.ROCKET.damage, p.team)
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
      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === p.team) continue

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.4)
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          if (p.type === 'rocket') {
            applyExplosion(p.position, BLAST.ROCKET.radius, BLAST.ROCKET.damage, p.team)
            sfx.explosionLarge()
          } else if (p.type === 'grenade') {
            applyExplosion(p.position, BLAST.GRENADE.radius, BLAST.GRENADE.damage, p.team)
            sfx.explosionLarge()
          } else {
            unit.health -= p.damage
            sfx.bulletImpact()
            triggerShake(SHAKE.BULLET_IMPACT)
            // Spawn spark at hit location
            const bSparkId = `spark-${++sparkIdRef.current}`
            setSparks(prev => [...prev, { id: bSparkId, position: [...p.position] as [number, number, number] }])
            if (unit.health <= 0) {
              unit.health = 0
              unit.status = 'dead'
              unit.stateAge = 0
              sfx.deathThud()
              // Varied ragdoll: random perpendicular offset + death type
              const knockDir = new THREE.Vector3(dx, 0, dz).normalize()
              const perpAngle = Math.atan2(knockDir.z, knockDir.x) + (Math.random() - 0.5) * 1.2
              const forceVar = randRange(RAGDOLL.FORCE_VARIANCE_MIN, RAGDOLL.FORCE_VARIANCE_MAX)
              unit.velocity[0] += knockDir.x * 1.5 * forceVar + Math.cos(perpAngle) * 0.5
              unit.velocity[1] += randRange(1.0, 2.5)
              unit.velocity[2] += knockDir.z * 1.5 * forceVar + Math.sin(perpAngle) * 0.5
              unit.spinSpeed = randRange(1, RAGDOLL.TUMBLE_SPIN_MAX * 0.5)
              triggerHitpause(3)
            } else {
              unit.status = 'hit'
              unit.stateAge = 0
            }
          }
          const shooter = allUnits.find((u) => u.id === p.ownerId)
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

          if (dist < WALL_HIT_RADIUS) {
            if (p.type === 'rocket') {
              applyExplosion(p.position, BLAST.ROCKET.radius, BLAST.ROCKET.damage, p.team)
              sfx.explosionLarge()
            } else if (p.type === 'grenade') {
              applyExplosion(p.position, BLAST.GRENADE.radius, BLAST.GRENADE.damage, p.team)
              sfx.explosionLarge()
            } else {
              // Bullets: impact spark + slight block nudge
              sfx.bulletImpact()
              triggerShake(SHAKE.BULLET_IMPACT)
              // Spawn impact spark at hit location
              const sparkId = `spark-${++sparkIdRef.current}`
              setSparks(prev => [...prev, { id: sparkId, position: [...p.position] as [number, number, number] }])
              // Nudge the hit block slightly (makes wall feel alive)
              if (block.settled) {
                block.settled = false
                block.velocity.set(
                  (Math.random() - 0.5) * 0.2,
                  0.1 + Math.random() * 0.15,
                  (Math.random() - 0.5) * 0.2,
                )
              }
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
    for (const unit of allUnits) {
      // ── Check table boundaries: units past the edge fall and die ──
      const pastEdge = unit.position[0] > TABLE_EDGE_X || unit.position[0] < TABLE_EDGE_LEFT ||
                       Math.abs(unit.position[2]) > TABLE_EDGE_Z
      if (pastEdge && unit.status !== 'dead') {
        // Instant death + start falling
        unit.health = 0
        unit.status = 'dead'
        unit.stateAge = 0
        unit.velocity[1] = Math.min(unit.velocity[1], -3)
        sfx.fallScream()
      }

      const hasVel = Math.abs(unit.velocity[0]) > 0.01 || Math.abs(unit.velocity[1]) > 0.01 || Math.abs(unit.velocity[2]) > 0.01
      const isAboveGround = unit.position[1] > 0.01
      if (!hasVel && !isAboveGround && !pastEdge) continue

      // ── Fall off table edge: instant death ──
      if (unit.position[1] < FALL_DEATH_Y) {
        if (unit.status !== 'dead') {
          unit.health = 0
          unit.status = 'dead'
          unit.stateAge = 0
          sfx.fallScream()
        }
        // Keep falling (don't clamp) — they disappear off screen
        unit.velocity[1] += GRAVITY * delta * 0.5
        unit.position[1] += unit.velocity[1] * delta
        continue
      }

      // Gravity (always apply if past edge — no invisible floor in the sky)
      if (unit.position[1] > 0 || unit.velocity[1] > 0 || pastEdge) {
        unit.velocity[1] += GRAVITY * delta
      }

      // Integrate
      unit.position[0] += unit.velocity[0] * delta
      unit.position[1] += unit.velocity[1] * delta
      unit.position[2] += unit.velocity[2] * delta

      // Ground clamp + dust on heavy landing (but NOT if past table edge — let them fall)
      if (unit.position[1] <= 0 && !pastEdge) {
        const wasAirborne = unit.velocity[1] < -2
        unit.position[1] = 0
        if (unit.velocity[1] < -0.5) {
          unit.velocity[1] *= RAGDOLL.GROUND_BOUNCE_VY
          // Spawn dust cloud on heavy landing
          if (wasAirborne) {
            const dId = `dust-${++dustIdRef.current}`
            const intensity = Math.min(1.0, Math.abs(unit.velocity[1]) / 8)
            setDustClouds(prev => [...prev, { id: dId, position: [...unit.position] as [number, number, number], intensity }])
          }
        } else {
          unit.velocity[1] = 0
        }
        unit.velocity[0] *= RAGDOLL.GROUND_FRICTION
        unit.velocity[2] *= RAGDOLL.GROUND_FRICTION
        unit.spinSpeed *= RAGDOLL.SPIN_DAMPING
      }

      // Air drag
      unit.velocity[0] *= RAGDOLL.AIR_DRAG
      unit.velocity[2] *= RAGDOLL.AIR_DRAG

      // Stop when slow on ground (but not if past edge)
      if (unit.position[1] <= 0 && !pastEdge && Math.abs(unit.velocity[0]) < 0.05 && Math.abs(unit.velocity[2]) < 0.05) {
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

    // ── Performance monitoring ──
    const particleCount = explosions.length + sparks.length + dustClouds.length
    const unitCount = players.length + enemies.length + projectiles.length
    perfMonitor.endFrame(gl.info as any, particleCount, unitCount)
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

      {/* Hazards */}
      {hazardsRef.current.map((h, i) => {
        const cfg = h.config
        switch (cfg.type) {
          case 'explosive_barrel':
            return <ExplosiveBarrelMesh key={`hazard-${i}`} position={cfg.position} rotation={cfg.rotation} alive={!h.triggered} />
          case 'sweeping_arm':
            return <SweepingArmMesh key={`hazard-${i}`} position={cfg.position} speed={cfg.params?.speed ?? 0.8} angle={h.age * (cfg.params?.speed ?? 0.8)} />
          case 'spring_launcher':
            return <SpringLauncherMesh key={`hazard-${i}`} position={cfg.position} fireProgress={h.cooldown > SPRING_COOLDOWN - 0.3 ? 1 - (SPRING_COOLDOWN - h.cooldown) / 0.3 : 0} />
          default:
            return null
        }
      })}

      {/* Impact sparks */}
      {sparks.map((s) => (
        <ImpactSpark
          key={s.id}
          position={s.position}
          onComplete={() => setSparks((prev) => prev.filter((x) => x.id !== s.id))}
        />
      ))}

      {/* Dust clouds */}
      {dustClouds.map((d) => (
        <DustCloud
          key={d.id}
          position={d.position}
          intensity={d.intensity}
          onComplete={() => setDustClouds((prev) => prev.filter((x) => x.id !== d.id))}
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
