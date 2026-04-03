import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'
import { useGameStore } from '@stores/gameStore'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { ProjectileMesh } from '@three/models/ProjectileMesh'
import { Intel } from '@three/models/Intel'
import { GhostPreview } from '@three/models/GhostPreview'
import { BattlefieldProps } from '@three/models/sandboxProps'
import { CameraRig } from '@three/camera/CameraRig'
import { ENEMY_STATS } from '@config/units'
import type { GameUnit, Projectile, Wave, WaveEnemy, EnemyType } from '@config/types'

// ── Battle constants ────────────────────────────────────
const INTEL_POS = new THREE.Vector3(-7, 0, 0)
const LOSE_THRESHOLD = 1.5 // distance to Intel = defeat
const SPAWN_X = 8
const BULLET_SPEED = 20
const ROCKET_SPEED = 8
const ROCKET_GRAVITY = -6
const PROJECTILE_MAX_AGE = 4
const HIT_RADIUS = 0.5
const GRAVITY = -15

let _eid = 1000
let _pid = 5000

// ── Mutable unit type for battle (no store updates per frame) ──
interface BattleUnit extends GameUnit {
  velocity: [number, number, number]
  spinSpeed: number
  stateAge: number
  facingAngle: number
}

function makeBattleUnit(unit: GameUnit): BattleUnit {
  return {
    ...unit,
    velocity: [0, 0, 0],
    spinSpeed: 0,
    stateAge: 0,
    facingAngle: unit.rotation,
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
    const delta = Math.min(rawDelta, 0.05)
    battleTimeRef.current += delta
    const time = battleTimeRef.current

    const players = playersRef.current
    const enemies = enemiesRef.current
    const projectiles = projectilesRef.current

    // ── Spawn waves ──
    const level = useGameStore.getState().level
    if (level) {
      for (let i = 0; i < level.waves.length; i++) {
        if (wavesSpawned.current.has(i)) continue
        const wave = level.waves[i] as Wave
        if (time >= wave.delay) {
          wavesSpawned.current.add(i)
          for (const enemyDef of wave.enemies) {
            const def = enemyDef as WaveEnemy
            const stats = ENEMY_STATS[def.type as EnemyType]
            if (!stats) continue
            const spacing = def.spacing ?? 1.2
            const pathZ = def.path === 'flank' ? 3 : 0
            for (let j = 0; j < def.count; j++) {
              const zOff = (j - (def.count - 1) / 2) * spacing
              enemies.push(makeBattleUnit({
                id: `e-${++_eid}`,
                type: 'soldier',
                team: 'tan',
                position: [SPAWN_X + j * 0.5, 0, pathZ + zOff],
                rotation: Math.PI, // face left (toward Intel)
                health: stats.health,
                maxHealth: stats.health,
                status: 'walking',
                weapon: 'rifle',
                lastFireTime: -10,
                fireRate: stats.fireRate,
                range: stats.range,
                damage: stats.damage,
                speed: stats.speed,
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

          // Spawn projectile
          const muzzle: [number, number, number] = [ePos.x, ePos.y + 0.8, ePos.z]
          const tCenter = new THREE.Vector3(tPos.x, tPos.y + 0.5, tPos.z)
          const dir = tCenter.sub(new THREE.Vector3(...muzzle)).normalize()
          projectiles.push({
            id: `p-${++_pid}`,
            position: muzzle,
            velocity: [dir.x * BULLET_SPEED, dir.y * BULLET_SPEED, dir.z * BULLET_SPEED],
            type: 'bullet',
            damage: enemy.damage,
            ownerId: enemy.id,
            team: 'tan',
            age: 0,
          })
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
          battleActive.current = false
          return
        }
      }
      // Sync facing angle to rotation for SoldierUnit
      enemy.rotation = enemy.facingAngle
    }

    // ── Player AI ──
    for (const player of players) {
      if (player.status === 'dead') { player.stateAge += delta; continue }
      player.stateAge += delta

      const pPos = new THREE.Vector3(...player.position)
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      for (const e of enemies) {
        if (e.status === 'dead') continue
        const d = pPos.distanceTo(new THREE.Vector3(...e.position))
        if (d < nearestDist) { nearestDist = d; nearestEnemy = e }
      }

      if (nearestEnemy && nearestDist <= player.range) {
        const ePos = new THREE.Vector3(...nearestEnemy.position)
        player.facingAngle = Math.atan2(ePos.x - pPos.x, ePos.z - pPos.z)

        const isRocket = player.weapon === 'rocketLauncher'

        if (time - player.lastFireTime >= player.fireRate) {
          player.lastFireTime = time
          player.status = 'firing'
          player.stateAge = 0

          const muzzle: [number, number, number] = [pPos.x, pPos.y + 0.8, pPos.z]
          const tCenter = new THREE.Vector3(ePos.x, ePos.y + 0.5, ePos.z)
          const dir = tCenter.sub(new THREE.Vector3(...muzzle)).normalize()

          if (isRocket) {
            projectiles.push({
              id: `p-${++_pid}`,
              position: muzzle,
              velocity: [dir.x * ROCKET_SPEED, dir.y * ROCKET_SPEED + 3, dir.z * ROCKET_SPEED],
              type: 'rocket',
              damage: player.damage,
              ownerId: player.id,
              team: 'green',
              age: 0,
            })
          } else {
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
          }
        } else if (player.stateAge > 0.4) {
          player.status = 'idle'
        }
      } else {
        if (player.status !== 'idle') { player.status = 'idle'; player.stateAge = 0 }
      }
      player.rotation = player.facingAngle
    }

    // ── Update projectiles ──
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      p.age += delta

      if (p.age > PROJECTILE_MAX_AGE) { projectiles.splice(i, 1); continue }

      // Gravity for rockets
      if (p.type === 'rocket') {
        p.velocity[1] += ROCKET_GRAVITY * delta
      }

      // Integrate position
      p.position[0] += p.velocity[0] * delta
      p.position[1] += p.velocity[1] * delta
      p.position[2] += p.velocity[2] * delta

      // Remove if below ground
      if (p.position[1] < -0.5) { projectiles.splice(i, 1); continue }
    }

    // ── Collision detection ──
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      const allUnits = [...players, ...enemies]

      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === p.team) continue

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.4)
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          // Apply damage
          unit.health -= p.damage
          if (unit.health <= 0) {
            unit.health = 0
            unit.status = 'dead'
            unit.stateAge = 0
            // Death knockback
            const knockDir = new THREE.Vector3(dx, 0, dz).normalize()
            unit.velocity[0] += knockDir.x * 1.5
            unit.velocity[1] += 1.5
            unit.velocity[2] += knockDir.z * 1.5
            unit.spinSpeed = 1 + Math.random() * 1.5
          } else {
            unit.status = 'hit'
            unit.stateAge = 0
          }
          projectiles.splice(i, 1)
          break
        }
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

    // ── Check victory ──
    const allWavesSpawned = level ? wavesSpawned.current.size >= level.waves.length : false
    const livingEnemies = enemies.filter((e) => e.status !== 'dead')
    if (allWavesSpawned && enemies.length > 0 && livingEnemies.length === 0) {
      const livingPlayers = players.filter((p) => p.status !== 'dead')
      const allSurvived = livingPlayers.length === players.length
      let stars = 1
      if (useGameStore.getState().gold >= 200) stars = 2
      if (allSurvived) stars = 3
      useGameStore.getState().setResult('victory', stars)
      battleActive.current = false
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
            placeSoldier(selectedPlacement, [x, 0, z])
          }}
        >
          <planeGeometry args={[20, 14]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}

      {/* Soldiers */}
      {renderPlayers.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}
      {renderEnemies.map((unit) => (
        <SoldierUnit key={unit.id} unit={unit} />
      ))}

      {/* Projectiles */}
      {renderProjectiles.map((p) => (
        <ProjectileMesh key={p.id} projectile={p} />
      ))}
    </>
  )
}
