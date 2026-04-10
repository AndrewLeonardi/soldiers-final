/**
 * CampBattleLoop — THE core combat loop for camp battles.
 *
 * Sprint 4, Phase 3a. Runs inside CampScene during 'fighting' phase.
 * Adapted from BattleScene.tsx but simplified for camp context:
 *   - No Intel objective (enemies march toward camp center)
 *   - No flow field (enemies walk straight, avoid walls)
 *   - Player AI uses NERO hybrid (trained NN vs untrained chaos)
 *   - Wall destruction via wallBlocksRef
 *   - Drop-in spawn: units start at high Y and fall via simple gravity
 *
 * Tick order each frame:
 *   1. Spawn waves (time-based, at high Y for drop effect)
 *   2. Gravity drop (animate falling units to ground)
 *   3. Player AI (target → aim → fire)
 *   4. Enemy AI (march → target → fire, wall avoidance)
 *   5. Update projectiles (gravity, position, age)
 *   6. Hit detection (unit hits, wall hits, ground hits)
 *   7. Check win/lose conditions
 */
import { useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '@stores/sceneStore'
import { useCampBattleStore } from '@stores/campBattleStore'
import type { BattleUnit, BattleProjectile, BattleExplosion } from '@stores/campBattleStore'
import { useCampStore } from '@stores/campStore'
import { NeuralNet } from '@engine/ml/neuralNet'
import { getWeaponShape } from '@game/training/weaponShapes'
import { WEAPON_STATS, ENEMY_STATS } from '@config/units'
import { SPAWN_POSITIONS } from '@config/campBattles'
import type { CampWaveEnemy } from '@config/campBattles'
import type { WeaponType, EnemyType } from '@config/types'
import type { WallBlock } from '@three/models/Defenses'
import { BASE_HALF_W, BASE_HALF_D } from './campConstants'
import {
  PROJECTILE_GRAVITY, PROJECTILE_MAX_AGE,
  BULLET_SPEED, ROCKET_SPEED, GRENADE_SPEED, MG_BULLET_SPEED,
  HIT_RADIUS, WALL_HIT_RADIUS, BLAST, STAGGER, RAGDOLL,
  BLOCK_W, BLOCK_H,
  idealElevation, randRange,
} from '@engine/physics/battlePhysics'
import * as sfx from '@audio/sfx'

// ── Reusable THREE vectors (avoid per-frame alloc) ──
const _tA = new THREE.Vector3()
const _tB = new THREE.Vector3()

let _pid = 0  // projectile ID counter
let _uid = 0  // unit ID counter

// ── Drop physics ──
const DROP_GRAVITY = -20  // fast dramatic drop
const DROP_HEIGHT_PLAYER = 4  // player soldiers drop from 4 units high
const DROP_HEIGHT_ENEMY = 5   // enemies drop from 5 units high (staggered)
const FALL_DEATH_Y = -10  // below this Y, unit is dead (fell off map)

/** Check if an XZ position is over the table surface */
function isOverTable(x: number, z: number): boolean {
  return Math.abs(x) <= BASE_HALF_W && Math.abs(z) <= BASE_HALF_D
}

// ── Wall segments for collision (from CampLayout) ──
// Each wall is an axis-aligned box defined by center + half-extents
// Walls at [0,0,-5], [0,0,5] are horizontal (wide on X)
// Walls at [6,0,0], [-6,0,0] are vertical (wide on Z, rotated π/2)
interface WallBounds {
  cx: number; cz: number;
  halfW: number; halfD: number;
  wallId: string;
}

const WALL_BOUNDS: WallBounds[] = [
  // North/South walls: 8 * 0.3 / 2 = 1.2 wide, ~0.25 deep
  { cx: 0, cz: -5, halfW: 1.2, halfD: 0.35, wallId: 'wall-north' },
  { cx: 0, cz: 5,  halfW: 1.2, halfD: 0.35, wallId: 'wall-south' },
  // East/West walls: rotated π/2 so width → depth, depth → width
  { cx: 6, cz: 0,  halfW: 0.35, halfD: 1.2, wallId: 'wall-east' },
  { cx: -6, cz: 0, halfW: 0.35, halfD: 1.2, wallId: 'wall-west' },
]

function isInsideWall(x: number, z: number, padding: number = 0.3): WallBounds | null {
  for (const wall of WALL_BOUNDS) {
    if (
      x >= wall.cx - wall.halfW - padding &&
      x <= wall.cx + wall.halfW + padding &&
      z >= wall.cz - wall.halfD - padding &&
      z <= wall.cz + wall.halfD + padding
    ) {
      return wall
    }
  }
  return null
}

// ── Helpers ──

function createPlayerUnit(
  soldierId: string,
  name: string,
  weapon: WeaponType,
  position: [number, number, number],
  brainWeights?: number[],
): BattleUnit {
  const stats = WEAPON_STATS[weapon] ?? WEAPON_STATS.rifle
  return {
    id: `player-${++_uid}`,
    name,
    team: 'green',
    weapon,
    position: [position[0], DROP_HEIGHT_PLAYER, position[2]], // start high for drop
    rotation: 0,
    health: stats.health,
    maxHealth: stats.health,
    status: 'idle',
    lastFireTime: -10,
    fireRate: stats.fireRate,
    range: stats.range,
    damage: stats.damage,
    speed: stats.speed,
    facingAngle: 0,
    velocity: [0, 0, 0],
    stateAge: 0,
    spinSpeed: 0,
    soldierId,
    isTrained: !!brainWeights && brainWeights.length > 0,
    brainWeights,
  }
}

function createEnemyUnit(
  type: EnemyType,
  weapon: WeaponType,
  position: [number, number, number],
  dropIndex: number,
): BattleUnit {
  const stats = ENEMY_STATS[type] ?? ENEMY_STATS.infantry
  // Stagger drop heights so they don't all land at once
  const dropY = DROP_HEIGHT_ENEMY + dropIndex * 0.4
  return {
    id: `enemy-${++_uid}`,
    name: type.toUpperCase(),
    team: 'tan',
    weapon,
    position: [position[0], dropY, position[2]], // start high for drop
    rotation: 0,
    health: stats.health,
    maxHealth: stats.health,
    status: 'idle',
    lastFireTime: -10,
    fireRate: stats.fireRate,
    range: stats.range,
    damage: stats.damage,
    speed: stats.speed,
    facingAngle: 0,
    velocity: [0, 0, 0],
    stateAge: 0,
    spinSpeed: 0,
    isTrained: false,
    enemyType: type,
  }
}

let _dropIdx = 0  // global drop index for staggering

function spawnEnemiesForEntry(entry: CampWaveEnemy): BattleUnit[] {
  const spawn = SPAWN_POSITIONS[entry.spawnSide] ?? SPAWN_POSITIONS['right']!
  const units: BattleUnit[] = []
  for (let i = 0; i < entry.count; i++) {
    // Spread enemies along the spawn edge
    const offset = (i - (entry.count - 1) / 2) * 1.2
    const isVertical = entry.spawnSide === 'right' || entry.spawnSide === 'left'
    const x = spawn!.x + (isVertical ? 0 : offset)
    const z = spawn!.z + (isVertical ? offset : 0)
    const weapon = entry.weapon ?? (entry.type === 'jeep' ? 'machineGun' : 'rifle')
    units.push(createEnemyUnit(entry.type, weapon as WeaponType, [x, 0, z], _dropIdx++))
  }
  return units
}

interface CampBattleLoopProps {
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
}

export function CampBattleLoop({ wallBlocksRef }: CampBattleLoopProps) {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)

  const brainCacheRef = useRef<Map<string, NeuralNet>>(new Map())
  const battleStartedRef = useRef(false)
  const timeRef = useRef(0)

  // Initialize battle units from placed soldiers
  const initializeUnits = useCallback(() => {
    const store = useCampBattleStore.getState()
    const campStore = useCampStore.getState()
    if (!store.battleConfig || battleStartedRef.current) return

    battleStartedRef.current = true
    timeRef.current = 0
    _pid = 0
    _uid = 0
    _dropIdx = 0
    brainCacheRef.current.clear()

    // Create player units from placed soldiers (they'll drop from high Y)
    const playerUnits: BattleUnit[] = store.placedSoldiers.map((placed) => {
      const solRecord = campStore.soldiers.find(s => s.id === placed.soldierId)
      const weapon = (placed.weapon || 'rifle') as WeaponType
      const brainWeights = solRecord?.trainedBrains?.[weapon]
      return createPlayerUnit(placed.soldierId, placed.name, weapon, placed.position, brainWeights)
    })

    // Pre-cache neural nets for trained soldiers
    for (const unit of playerUnits) {
      if (unit.isTrained && unit.brainWeights) {
        const shape = getWeaponShape(unit.weapon)
        const nn = new NeuralNet(shape.input, shape.hidden, shape.output)
        nn.setWeights(unit.brainWeights)
        brainCacheRef.current.set(unit.id, nn)
      }
    }

    // Spawn first wave enemies immediately via the wavesSpawned tracking
    const enemyUnits: BattleUnit[] = []
    const config = store.battleConfig
    if (config.waves[0] && config.waves[0].delay <= 0) {
      for (const entry of config.waves[0].enemies) {
        enemyUnits.push(...spawnEnemiesForEntry(entry))
      }
    }

    useCampBattleStore.setState({
      playerUnits,
      enemyUnits,
      projectiles: [],
      explosions: [],
      battleTime: 0,
      currentWave: 0,
    })

    sfx.deployHorn()
  }, [])

  useFrame((_, delta) => {
    if (battlePhase !== 'fighting') {
      if (battleStartedRef.current && battlePhase !== 'result') {
        battleStartedRef.current = false
      }
      return
    }

    // Init on first frame
    if (!battleStartedRef.current) {
      initializeUnits()
      return
    }

    // Clamp delta to avoid spiral of death
    const dt = Math.min(delta, 0.05)
    timeRef.current += dt

    const state = useCampBattleStore.getState()
    const config = state.battleConfig
    if (!config) return

    const time = timeRef.current
    const players = [...state.playerUnits]
    const enemies = [...state.enemyUnits]
    const projectiles = [...state.projectiles]
    const explosions = [...state.explosions]

    // ──────────────────────────────────────────────
    // 1. WAVE SPAWNING
    // ──────────────────────────────────────────────
    const wavesSpawned = [...state.wavesSpawned]
    for (let wi = 0; wi < config.waves.length; wi++) {
      if (wavesSpawned[wi]) continue
      const wave = config.waves[wi]!
      if (time >= wave.delay) {
        wavesSpawned[wi] = true
        for (const entry of wave.enemies) {
          enemies.push(...spawnEnemiesForEntry(entry))
        }
      }
    }

    // ──────────────────────────────────────────────
    // 1b. GRAVITY DROP — animate falling units
    // ──────────────────────────────────────────────
    const allUnits = [...players, ...enemies]
    for (const unit of allUnits) {
      if (unit.status === 'dead') continue

      const overTable = isOverTable(unit.position[0], unit.position[2])

      // If unit is NOT over the table and on or below ground level, apply falling gravity
      if (!overTable && unit.position[1] <= 0) {
        unit.velocity[1] = (unit.velocity[1] ?? 0) + DROP_GRAVITY * dt
        unit.position[1] += unit.velocity[1] * dt

        // Kill unit if it fell off the map entirely
        if (unit.position[1] < FALL_DEATH_Y) {
          unit.status = 'dead'
          unit.health = 0
        }
        continue
      }

      if (unit.position[1] > 0) {
        // Apply gravity
        unit.velocity[1] = (unit.velocity[1] ?? 0) + DROP_GRAVITY * dt
        unit.position[1] += unit.velocity[1] * dt

        // Land on ground — only if over the table
        if (unit.position[1] <= 0) {
          if (overTable) {
            unit.position[1] = 0
            unit.velocity[1] = 0
            sfx.bulletImpact()
          }
          // If not over table, unit keeps falling (handled next frame by the block above)
        }

        // Don't run AI while falling
        continue
      }
    }

    // ──────────────────────────────────────────────
    // 2. PLAYER AI — NERO hybrid
    // ──────────────────────────────────────────────
    for (const player of players) {
      if (player.status === 'dead') continue
      if (player.position[1] > 0) continue  // still falling

      // Update stateAge
      player.stateAge += dt

      // Hit recovery
      if (player.status === 'hit') {
        if (player.stateAge > (player.hitRecoveryAt ?? STAGGER.BULLET_RECOVERY)) {
          player.status = 'idle'
          player.stateAge = 0
        }
        continue // No AI while staggered
      }

      // Find nearest living enemy
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      _tA.set(player.position[0], 0, player.position[2])

      for (const enemy of enemies) {
        if (enemy.status === 'dead') continue
        if (enemy.position[1] > 0.5) continue  // still falling
        _tB.set(enemy.position[0], 0, enemy.position[2])
        const dist = _tA.distanceTo(_tB)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestEnemy = enemy
        }
      }

      if (!nearestEnemy || nearestDist > player.range) {
        player.status = 'idle'
        continue
      }

      // Face toward target
      const dx = nearestEnemy.position[0] - player.position[0]
      const dz = nearestEnemy.position[2] - player.position[2]
      const angle = Math.atan2(dx, dz)
      player.facingAngle = angle
      player.rotation = angle

      // Cooldown check
      const cooldownMet = time - player.lastFireTime >= player.fireRate
      const cooldownRatio = Math.min(1, (time - player.lastFireTime) / player.fireRate)

      // NN decision (NERO hybrid)
      let aimCorrection = 0
      let elevCorrection = 0
      let shouldFire = cooldownMet

      if (player.isTrained && brainCacheRef.current.has(player.id)) {
        // TRAINED: neural network forward pass
        const nn = brainCacheRef.current.get(player.id)!
        const elevation = idealElevation(nearestDist)
        const livingEnemies = enemies.filter(e => e.status !== 'dead').length

        const nnInputs = [
          dx / 10,
          dz / 5,
          Math.min(1, nearestDist / 10),
          elevation / 0.8,
          1.0 - cooldownRatio,
          livingEnemies / 5,
        ]

        // Rifle gets extra accuracy input
        if (player.weapon === 'rifle') {
          nnInputs.push(0.5) // placeholder accuracy
        }

        const outputs = nn.forward(nnInputs)

        // Weapon-specific multipliers
        switch (player.weapon) {
          case 'rocketLauncher':
            aimCorrection = (outputs[0] ?? 0) * 0.2
            elevCorrection = (outputs[1] ?? 0) * 0.15
            break
          case 'grenade':
            aimCorrection = (outputs[0] ?? 0) * 0.25
            elevCorrection = (outputs[1] ?? 0) * 0.2
            break
          case 'machineGun':
            aimCorrection = (outputs[0] ?? 0) * 0.3
            elevCorrection = 0
            break
          default: // rifle
            aimCorrection = (outputs[0] ?? 0) * 0.15
            elevCorrection = (outputs[1] ?? 0) * 0.1
            break
        }

        shouldFire = cooldownMet && (outputs[2] ?? 0) > 0
      } else {
        // UNTRAINED: chaos mode — ±23° aim scatter, random fire hesitation
        aimCorrection = (Math.random() - 0.5) * 0.8
        elevCorrection = (Math.random() - 0.5) * 0.4
        shouldFire = cooldownMet && Math.random() > 0.3
      }

      // FIRE!
      if (shouldFire) {
        player.lastFireTime = time
        player.status = 'firing'
        player.stateAge = 0

        const finalAngle = angle + aimCorrection
        const muzzleX = player.position[0]
        const muzzleY = player.position[1] + 0.8
        const muzzleZ = player.position[2]

        let vx: number, vy: number, vz: number
        let projType: 'bullet' | 'rocket' | 'grenade' = 'bullet'

        switch (player.weapon) {
          case 'rocketLauncher': {
            const elev = Math.max(0.05, idealElevation(nearestDist) + elevCorrection)
            const speed = ROCKET_SPEED
            vx = Math.sin(finalAngle) * Math.cos(elev) * speed
            vy = Math.sin(elev) * speed
            vz = Math.cos(finalAngle) * Math.cos(elev) * speed
            projType = 'rocket'
            sfx.rocketLaunch()
            break
          }
          case 'grenade': {
            const elev = Math.max(0.15, 0.5 + elevCorrection)
            const speed = GRENADE_SPEED
            vx = Math.sin(finalAngle) * Math.cos(elev) * speed
            vy = 5.5 + elevCorrection * 2
            vz = Math.cos(finalAngle) * Math.cos(elev) * speed
            projType = 'grenade'
            sfx.grenadeThrow()
            break
          }
          case 'machineGun': {
            const speed = MG_BULLET_SPEED
            vx = Math.sin(finalAngle) * speed
            vy = 0.05
            vz = Math.cos(finalAngle) * speed
            sfx.mgBurst()
            break
          }
          default: { // rifle
            const speed = BULLET_SPEED
            const targetY = nearestEnemy.position[1] + 0.8
            const dirX = nearestEnemy.position[0] - muzzleX
            const dirY = targetY - muzzleY
            const dirZ = nearestEnemy.position[2] - muzzleZ
            const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
            vx = (dirX / len) * speed + aimCorrection * 3
            vy = (dirY / len) * speed
            vz = (dirZ / len) * speed
            sfx.rifleShot()
            break
          }
        }

        projectiles.push({
          id: `p-${++_pid}`,
          position: [muzzleX, muzzleY, muzzleZ],
          velocity: [vx, vy, vz],
          type: projType,
          damage: player.damage,
          ownerId: player.id,
          team: 'green',
          age: 0,
        })
      }
    }

    // ──────────────────────────────────────────────
    // 3. ENEMY AI — march + fire + wall avoidance
    // ──────────────────────────────────────────────
    for (const enemy of enemies) {
      if (enemy.status === 'dead') continue
      if (enemy.position[1] > 0) continue  // still falling

      enemy.stateAge += dt

      // Hit recovery
      if (enemy.status === 'hit') {
        if (enemy.stateAge > (enemy.hitRecoveryAt ?? STAGGER.BULLET_RECOVERY)) {
          enemy.status = 'idle'
          enemy.stateAge = 0
        }
        continue
      }

      // Find nearest living player
      let nearestPlayer: BattleUnit | null = null
      let nearestDist = Infinity
      _tA.set(enemy.position[0], 0, enemy.position[2])

      for (const player of players) {
        if (player.status === 'dead') continue
        if (player.position[1] > 0.5) continue  // still falling
        _tB.set(player.position[0], 0, player.position[2])
        const dist = _tA.distanceTo(_tB)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestPlayer = player
        }
      }

      // Fire if in range
      if (nearestPlayer && nearestDist <= enemy.range) {
        const dx = nearestPlayer.position[0] - enemy.position[0]
        const dz = nearestPlayer.position[2] - enemy.position[2]
        const angle = Math.atan2(dx, dz)
        enemy.facingAngle = angle
        enemy.rotation = angle

        const cooldownMet = time - enemy.lastFireTime >= enemy.fireRate
        if (cooldownMet) {
          enemy.lastFireTime = time
          enemy.status = 'firing'
          enemy.stateAge = 0

          const aimError = (Math.random() - 0.5) * 0.3
          const finalAngle = angle + aimError
          const muzzleX = enemy.position[0]
          const muzzleY = enemy.position[1] + 0.8
          const muzzleZ = enemy.position[2]

          let vx: number, vy: number, vz: number
          let projType: 'bullet' | 'rocket' | 'grenade' = 'bullet'

          const weapon = enemy.weapon as WeaponType
          switch (weapon) {
            case 'rocketLauncher': {
              const elev = idealElevation(nearestDist)
              vx = Math.sin(finalAngle) * Math.cos(elev) * ROCKET_SPEED
              vy = Math.sin(elev) * ROCKET_SPEED
              vz = Math.cos(finalAngle) * Math.cos(elev) * ROCKET_SPEED
              projType = 'rocket'
              sfx.rocketLaunch()
              break
            }
            case 'grenade': {
              vx = Math.sin(finalAngle) * Math.cos(0.5) * GRENADE_SPEED
              vy = 5.5 + (Math.random() - 0.5) * 1.0
              vz = Math.cos(finalAngle) * Math.cos(0.5) * GRENADE_SPEED
              projType = 'grenade'
              sfx.grenadeThrow()
              break
            }
            case 'machineGun': {
              vx = Math.sin(finalAngle) * MG_BULLET_SPEED
              vy = 0.05
              vz = Math.cos(finalAngle) * MG_BULLET_SPEED
              sfx.mgBurst()
              break
            }
            default: { // rifle
              const targetY = nearestPlayer.position[1] + 0.8
              const dirX = nearestPlayer.position[0] - muzzleX
              const dirY = targetY - muzzleY
              const dirZ = nearestPlayer.position[2] - muzzleZ
              const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
              vx = (dirX / len) * BULLET_SPEED
              vy = (dirY / len) * BULLET_SPEED
              vz = (dirZ / len) * BULLET_SPEED
              sfx.rifleShot()
              break
            }
          }

          projectiles.push({
            id: `p-${++_pid}`,
            position: [muzzleX, muzzleY, muzzleZ],
            velocity: [vx, vy, vz],
            type: projType,
            damage: enemy.damage,
            ownerId: enemy.id,
            team: 'tan',
            age: 0,
          })
        }

        // Stop moving while firing
        enemy.velocity = [0, 0, 0]
      } else {
        // March toward camp center (or nearest player if visible)
        const targetX = nearestPlayer ? nearestPlayer.position[0] : 0
        const targetZ = nearestPlayer ? nearestPlayer.position[2] : 0
        let dx = targetX - enemy.position[0]
        let dz = targetZ - enemy.position[2]
        const len = Math.sqrt(dx * dx + dz * dz)

        if (len > 0.5) {
          const speed = enemy.speed * dt
          let newX = enemy.position[0] + (dx / len) * speed
          let newZ = enemy.position[2] + (dz / len) * speed

          // Wall collision — check if new position is inside a wall
          const wall = isInsideWall(newX, newZ)
          if (wall) {
            // Check if wall still has living blocks (if all destroyed, walk through)
            const blocks = wallBlocksRef.current.get(wall.wallId)
            const aliveCount = blocks ? blocks.filter(b => b.alive).length : 0
            const totalBlocks = blocks ? blocks.length : 1
            const wallMostlyAlive = aliveCount > totalBlocks * 0.3

            if (wallMostlyAlive) {
              // Steer around the wall — pick the closer end
              const toEndA_Z = (wall.cz - wall.halfD - 0.5) - enemy.position[2]
              const toEndB_Z = (wall.cz + wall.halfD + 0.5) - enemy.position[2]
              const toEndA_X = (wall.cx - wall.halfW - 0.5) - enemy.position[0]
              const toEndB_X = (wall.cx + wall.halfW + 0.5) - enemy.position[0]

              // For vertical walls (halfD > halfW), steer around Z ends
              // For horizontal walls (halfW > halfD), steer around X ends
              if (wall.halfD > wall.halfW) {
                // Vertical wall — pick closer Z end to steer around
                const slideZ = Math.abs(toEndA_Z) < Math.abs(toEndB_Z) ? toEndA_Z : toEndB_Z
                newX = enemy.position[0] // don't move into wall
                newZ = enemy.position[2] + Math.sign(slideZ) * speed
              } else {
                // Horizontal wall — pick closer X end to steer around
                const slideX = Math.abs(toEndA_X) < Math.abs(toEndB_X) ? toEndA_X : toEndB_X
                newZ = enemy.position[2] // don't move into wall
                newX = enemy.position[0] + Math.sign(slideX) * speed
              }
            }
          }

          enemy.position[0] = newX
          enemy.position[2] = newZ
          enemy.facingAngle = Math.atan2(dx, dz)
          enemy.rotation = enemy.facingAngle
          enemy.status = 'walking'
        } else {
          enemy.status = 'idle'
        }
      }
    }

    // ──────────────────────────────────────────────
    // 4. PROJECTILE PHYSICS
    // ──────────────────────────────────────────────
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!
      p.age += dt

      // Remove expired
      if (p.age > PROJECTILE_MAX_AGE) {
        projectiles.splice(i, 1)
        continue
      }

      // Gravity for rockets and grenades
      if (p.type === 'rocket' || p.type === 'grenade') {
        p.velocity[1] += PROJECTILE_GRAVITY * dt
      }

      // Position integration
      p.position[0] += p.velocity[0] * dt
      p.position[1] += p.velocity[1] * dt
      p.position[2] += p.velocity[2] * dt

      // Grenade bounce
      if (p.type === 'grenade' && p.position[1] < 0.07) {
        p.position[1] = 0.07
        p.velocity[1] *= -0.3
        p.velocity[0] *= 0.6
        p.velocity[2] *= 0.6

        // Fuse detonation
        if (p.age >= BLAST.GRENADE.fuseTime) {
          applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef)
          sfx.explosionSmall()
          projectiles.splice(i, 1)
          continue
        }
      }

      // Rocket ground impact
      if (p.type === 'rocket' && p.position[1] < 0.1) {
        applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef)
        sfx.explosionLarge()
        projectiles.splice(i, 1)
        continue
      }

      // Bullet removal below ground
      if (p.type === 'bullet' && p.position[1] < -0.5) {
        projectiles.splice(i, 1)
        continue
      }
    }

    // ──────────────────────────────────────────────
    // 5. HIT DETECTION — units
    // ──────────────────────────────────────────────
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!
      let hit = false

      // Check against all units on opposite team
      const targets = p.team === 'green' ? enemies : players
      for (const unit of targets) {
        if (unit.status === 'dead') continue

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.5)
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          if (p.type === 'rocket') {
            applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef)
            sfx.explosionLarge()
          } else if (p.type === 'grenade') {
            applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef)
            sfx.explosionSmall()
          } else {
            // Direct bullet damage
            unit.health -= p.damage
            sfx.bulletImpact()

            if (unit.health <= 0) {
              unit.status = 'dead'
              unit.stateAge = 0
              unit.spinSpeed = randRange(RAGDOLL.TUMBLE_SPIN_MIN, RAGDOLL.TUMBLE_SPIN_MAX)
              sfx.deathThud()
            } else {
              unit.status = 'hit'
              unit.stateAge = 0
              unit.hitRecoveryAt = STAGGER.BULLET_RECOVERY
            }
          }

          hit = true
          break
        }
      }

      // 5b. HIT DETECTION — wall blocks
      if (!hit) {
        hit = checkWallHit(projectiles[i]!, wallBlocksRef, explosions, players, enemies)
      }

      if (hit) {
        projectiles.splice(i, 1)
      }
    }

    // ──────────────────────────────────────────────
    // 6. EXPLOSION CLEANUP
    // ──────────────────────────────────────────────
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (time - explosions[i]!.time > 1.5) {
        explosions.splice(i, 1)
      }
    }

    // ──────────────────────────────────────────────
    // 7. WIN/LOSE CHECK
    // ──────────────────────────────────────────────
    const livingPlayers = players.filter(p => p.status !== 'dead')
    const livingEnemies = enemies.filter(e => e.status !== 'dead')
    const allWavesSpawned = wavesSpawned.every(Boolean)

    // Victory: all waves spawned + all enemies dead
    if (allWavesSpawned && enemies.length > 0 && livingEnemies.length === 0) {
      // Calculate stars
      let stars = 1 // base: won
      const allSurvived = livingPlayers.length === players.length
      if (allSurvived) stars = 2  // no losses
      const timeLimit = config.stars.three.threshold
      if (allSurvived && timeLimit && time <= timeLimit) stars = 3  // speed run

      useCampBattleStore.getState().setResult('victory', stars)
      useCampStore.getState().completeBattle(config.id, stars, config.reward)
      sfx.graduationFanfare()
      setBattlePhase('result')
    }

    // Defeat: all player soldiers dead
    if (livingPlayers.length === 0 && players.length > 0) {
      useCampBattleStore.getState().setResult('defeat', 0)
      sfx.deathThud()
      setBattlePhase('result')
    }

    // ──────────────────────────────────────────────
    // COMMIT state
    // ──────────────────────────────────────────────
    useCampBattleStore.setState({
      playerUnits: players,
      enemyUnits: enemies,
      projectiles,
      explosions,
      battleTime: time,
      wavesSpawned,
    })
  })

  return null
}

// ── Cascade collapse: unsettle blocks above a destroyed block ──
function cascadeAbove(destroyedBlock: WallBlock, blocks: WallBlock[]) {
  const row = destroyedBlock.row
  const bx = destroyedBlock.mesh.position.x
  const blockW = destroyedBlock.size[0]

  // Find all alive+settled blocks in higher rows that overlap horizontally
  for (const b of blocks) {
    if (!b.alive || !b.settled || b.groundSupported) continue
    if (b.row <= row) continue  // only affect blocks above

    // Check horizontal overlap
    const overlap = blockW - Math.abs(b.mesh.position.x - bx)
    if (overlap > blockW * 0.15) {
      // Check if this block still has ANY support from its own row-1
      const supportRow = b.row - 1
      let hasSupport = false
      for (const below of blocks) {
        if (below.row !== supportRow || !below.alive) continue
        const supportOverlap = b.size[0] - Math.abs(b.mesh.position.x - below.mesh.position.x)
        if (supportOverlap > b.size[0] * 0.3) {
          hasSupport = true
          break
        }
      }
      if (!hasSupport) {
        b.settled = false
        b.velocity.y = -0.5 - Math.random() * 0.5
        b.velocity.x += (Math.random() - 0.5) * 0.3
        b.velocity.z += (Math.random() - 0.5) * 0.2
      }
    }
  }
}

// ── Wall hit detection ──
function checkWallHit(
  p: BattleProjectile,
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>,
  explosions: BattleExplosion[],
  players: BattleUnit[],
  enemies: BattleUnit[],
): boolean {
  // Convert projectile to world position
  const px = p.position[0]
  const py = p.position[1]
  const pz = p.position[2]

  for (const [_wallId, blocks] of wallBlocksRef.current) {
    for (const block of blocks) {
      if (!block.alive) continue

      // Get block world position from its mesh
      const bx = block.mesh.getWorldPosition(_tA).x
      const by = _tA.y
      const bz = _tA.z

      const dx = px - bx
      const dy = py - by
      const dz = pz - bz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < WALL_HIT_RADIUS) {
        if (p.type === 'rocket') {
          applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef)
          sfx.explosionLarge()
        } else if (p.type === 'grenade') {
          applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef)
          sfx.explosionSmall()
        } else {
          // Bullet destroys the block it hits + launches it
          block.alive = false
          block.settled = false
          const forceVar = randRange(0.8, 1.5)
          block.velocity.set(
            (dx / dist) * 2 * forceVar + (Math.random() - 0.5) * 0.5,
            1.5 * forceVar,
            (dz / dist) * 2 * forceVar + (Math.random() - 0.5) * 0.5,
          )
          // Cascade: drop unsupported blocks above
          cascadeAbove(block, blocks)
          sfx.bulletImpact()
        }
        return true
      }
    }
  }
  return false
}

// ── Explosion helper ──
function applyExplosion(
  center: [number, number, number],
  blastConfig: typeof BLAST.ROCKET | typeof BLAST.GRENADE,
  team: 'green' | 'tan',
  players: BattleUnit[],
  enemies: BattleUnit[],
  explosions: BattleExplosion[],
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>,
) {
  const blastRadius = blastConfig.radius
  const blastDamage = blastConfig.damage

  // Add visual explosion
  explosions.push({
    id: `exp-${++_pid}`,
    position: [...center],
    scale: blastRadius / 3,
    time: 0,
  })

  // Damage all units in blast radius (friendly fire included)
  const allUnits = [...players, ...enemies]
  for (const unit of allUnits) {
    if (unit.status === 'dead') continue

    const dx = unit.position[0] - center[0]
    const dy = unit.position[1] - center[1]
    const dz = unit.position[2] - center[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist >= blastRadius) continue

    const force = (blastRadius - dist) / blastRadius
    const dmg = Math.round(blastDamage * force)
    unit.health -= dmg

    if (unit.health <= 0) {
      unit.status = 'dead'
      unit.stateAge = 0
      unit.spinSpeed = randRange(RAGDOLL.TUMBLE_SPIN_MIN, RAGDOLL.TUMBLE_SPIN_MAX)
      sfx.deathThud()
    } else {
      unit.status = 'hit'
      unit.stateAge = 0
      unit.hitRecoveryAt = STAGGER.EXPLOSION_RECOVERY
    }
  }

  // ── Wall block destruction ──
  for (const [_wallId, blocks] of wallBlocksRef.current) {
    const destroyed: WallBlock[] = []
    for (const block of blocks) {
      if (!block.alive) continue

      const bx = block.mesh.getWorldPosition(_tA).x
      const by = _tA.y
      const bz = _tA.z

      const dx = bx - center[0]
      const dy = by - center[1]
      const dz = bz - center[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist >= blastRadius) continue

      const force = (blastRadius - dist) / blastRadius

      if (force > blastConfig.destroyThreshold) {
        // Destroy the block — launch it
        block.alive = false
        block.settled = false
        const forceVar = randRange(RAGDOLL.FORCE_VARIANCE_MIN, RAGDOLL.FORCE_VARIANCE_MAX)
        const launchForce = blastConfig.blockForce * force * forceVar
        block.velocity.set(
          (dx / dist) * launchForce + (Math.random() - 0.5) * 2,
          blastConfig.blockYBias * force * forceVar,
          (dz / dist) * launchForce + (Math.random() - 0.5) * 2,
        )
        destroyed.push(block)
      } else if (force > blastConfig.shakeThreshold) {
        // Shake loose — cascade collapse will handle the rest
        if (block.settled && !block.groundSupported) {
          block.settled = false
          block.velocity.set(
            (Math.random() - 0.5) * 0.3,
            0.1,
            (Math.random() - 0.5) * 0.3,
          )
        }
      }
    }
    // Cascade: drop unsupported blocks above all destroyed blocks
    for (const d of destroyed) {
      cascadeAbove(d, blocks)
    }
  }
}
