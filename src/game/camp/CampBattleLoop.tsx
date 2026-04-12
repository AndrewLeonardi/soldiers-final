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
  HIT_RADIUS, WALL_HIT_RADIUS, BLAST, STAGGER, RAGDOLL, SHAKE,
  BLOCK_W, BLOCK_H,
  idealElevation, randRange,
} from '@engine/physics/battlePhysics'
import { triggerShake } from '@three/effects/ScreenShake'
import { triggerHitpause, getHitpauseScale } from '@engine/physics/hitpause'
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
  // North/South walls (horizontal, wide on X)
  { cx: 0, cz: -8, halfW: 1.2, halfD: 0.35, wallId: 'wall-north' },
  { cx: 0, cz: 8,  halfW: 1.2, halfD: 0.35, wallId: 'wall-south' },
  // East/West walls: rotated π/2 so width → depth, depth → width
  { cx: 10, cz: 0,  halfW: 0.35, halfD: 1.2, wallId: 'wall-east' },
  { cx: -10, cz: 0, halfW: 0.35, halfD: 1.2, wallId: 'wall-west' },
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

    // Clamp delta to avoid spiral of death, apply hitpause scale
    const rawDt = Math.min(delta, 0.05)
    const dt = rawDt * getHitpauseScale(rawDt)
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
    // 2. PLAYER AI — NERO hybrid + universal movement
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

      // Firing hold — stay in firing pose briefly after shooting (0.3s)
      if (player.status === 'firing' && player.stateAge < 0.3) {
        player.velocity[0] = 0
        player.velocity[2] = 0
        continue // Hold pose, no movement or re-firing
      }

      // Find nearest + weakest living enemy (for target selection)
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      let weakestEnemy: BattleUnit | null = null
      let lowestHealth = Infinity
      const livingEnemies: BattleUnit[] = []
      _tA.set(player.position[0], 0, player.position[2])

      for (const enemy of enemies) {
        if (enemy.status === 'dead') continue
        if (enemy.position[1] > 0.5) continue  // still falling
        livingEnemies.push(enemy)
        _tB.set(enemy.position[0], 0, enemy.position[2])
        const dist = _tA.distanceTo(_tB)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestEnemy = enemy
        }
        if (enemy.health < lowestHealth) {
          lowestHealth = enemy.health
          weakestEnemy = enemy
        }
      }

      // Cooldown check
      const cooldownMet = time - player.lastFireTime >= player.fireRate
      const cooldownRatio = Math.min(1, (time - player.lastFireTime) / player.fireRate)

      // NN decision (NERO hybrid + universal)
      let aimCorrection = 0
      let elevCorrection = 0
      let shouldFire = cooldownMet
      let selectedTarget: BattleUnit | null = nearestEnemy

      if (player.isTrained && brainCacheRef.current.has(player.id)) {
        // TRAINED: neural network forward pass with 10-input universal vector
        const nn = brainCacheRef.current.get(player.id)!

        // Build universal observation vector
        const threatDx = nearestEnemy ? nearestEnemy.position[0] - player.position[0] : 0
        const threatDz = nearestEnemy ? nearestEnemy.position[2] - player.position[2] : 0
        const threatBearing = nearestEnemy ? Math.atan2(threatDx, threatDz) : 0
        const threatDist = nearestDist === Infinity ? 1 : Math.min(1, nearestDist / 12)

        // Elevation hint for ballistic weapons
        let elevHint = 0
        if (nearestEnemy && (player.weapon === 'rocketLauncher' || player.weapon === 'grenade' || player.weapon === 'tank')) {
          elevHint = idealElevation(nearestDist) / 0.8
        }

        // Threat density: enemies in forward 60° cone
        let threatDensity = 0
        for (const e of livingEnemies) {
          const edx = e.position[0] - player.position[0]
          const edz = e.position[2] - player.position[2]
          const eAngle = Math.atan2(edx, edz)
          let angleDiff = eAngle - threatBearing
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
          if (Math.abs(angleDiff) < Math.PI / 3) threatDensity++
        }

        // Nearest friendly distance
        let nearestFriendlyDist = 8
        for (const ally of players) {
          if (ally === player || ally.status === 'dead') continue
          const fdx = ally.position[0] - player.position[0]
          const fdz = ally.position[2] - player.position[2]
          const fd = Math.sqrt(fdx * fdx + fdz * fdz)
          if (fd < nearestFriendlyDist) nearestFriendlyDist = fd
        }

        const nnInputs: number[] = [
          threatBearing / Math.PI,                   // [0] threat bearing
          threatDist,                                // [1] threat distance
          elevHint,                                  // [2] elevation hint
          1.0 - cooldownRatio,                       // [3] cooldown ratio
          livingEnemies.length / 6,                  // [4] enemy count
          player.health / player.maxHealth,          // [5] own health
          nearestFriendlyDist / 8,                   // [6] friendly dist
          Math.min(1, threatDensity / 4),            // [7] threat density
          player.velocity[0] / 2.0,                  // [8] velocity X
          player.velocity[2] / 2.0,                  // [9] velocity Z
        ]

        const outputs = nn.forward(nnInputs)

        // ── MOVEMENT from outputs[0-1] ──
        // Stop moving when about to fire — plant feet, aim, shoot.
        const wantsToFire = cooldownMet && (outputs[3] ?? 0) > 0 && nearestDist <= player.range
        if (nearestEnemy && !wantsToFire) {
          const moveForward = outputs[0] ?? 0
          const moveLateral = outputs[1] ?? 0
          const moveAngle = threatBearing + moveLateral * (Math.PI / 3)
          const maxSpeed = player.weapon === 'machineGun' ? 1.5 : 2.0
          const speed = Math.abs(moveForward) * maxSpeed
          const sign = moveForward >= 0 ? 1 : -1

          const newVx = Math.sin(moveAngle) * speed * sign
          const newVz = Math.cos(moveAngle) * speed * sign

          let newX = player.position[0] + newVx * dt
          let newZ = player.position[2] + newVz * dt

          // Clamp to table bounds
          newX = Math.max(-BASE_HALF_W + 0.5, Math.min(BASE_HALF_W - 0.5, newX))
          newZ = Math.max(-BASE_HALF_D + 0.5, Math.min(BASE_HALF_D - 0.5, newZ))

          // Wall collision check
          if (!isInsideWall(newX, newZ)) {
            player.position[0] = newX
            player.position[2] = newZ
          }

          player.velocity[0] = newVx
          player.velocity[2] = newVz

          if (speed > 0.1) {
            player.status = 'walking'
          }
        } else if (wantsToFire) {
          // Halt movement — soldier plants feet to fire
          player.velocity[0] = 0
          player.velocity[2] = 0
        }

        // ── TARGET SELECTION from outputs[5] (aggression) ──
        const aggression = ((outputs[5] ?? 0) + 1) / 2  // remap [-1,1] to [0,1]
        if (aggression > 0.7 && weakestEnemy) {
          selectedTarget = weakestEnemy
        } else if (aggression < 0.3) {
          selectedTarget = nearestEnemy
        } else {
          selectedTarget = Math.random() < aggression ? weakestEnemy : nearestEnemy
        }

        // Aim + fire from outputs[2-4]
        switch (player.weapon) {
          case 'rocketLauncher':
            aimCorrection = (outputs[2] ?? 0) * 0.2
            elevCorrection = (outputs[4] ?? 0) * 0.15
            break
          case 'grenade':
            aimCorrection = (outputs[2] ?? 0) * 0.25
            elevCorrection = (outputs[4] ?? 0) * 0.2
            break
          case 'machineGun':
            aimCorrection = (outputs[2] ?? 0) * 0.1
            elevCorrection = 0
            break
          default: // rifle
            aimCorrection = (outputs[2] ?? 0) * 0.15
            elevCorrection = (outputs[4] ?? 0) * 0.1
            break
        }

        shouldFire = cooldownMet && (outputs[3] ?? 0) > 0
      } else {
        // UNTRAINED: soldier has no weapon brain — stands still, won't fire.
        // They're warm bodies on the field but useless without training.
        player.status = 'idle'
        player.velocity[0] = 0
        player.velocity[2] = 0
        shouldFire = false
      }

      if (!selectedTarget || nearestDist > player.range) {
        player.status = player.status === 'walking' ? 'walking' : 'idle'
        continue
      }

      // Face toward selected target
      const dx = selectedTarget.position[0] - player.position[0]
      const dz = selectedTarget.position[2] - player.position[2]
      const angle = Math.atan2(dx, dz)
      player.facingAngle = angle
      player.rotation = angle
      const targetDist = Math.sqrt(dx * dx + dz * dz)

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
            const elev = Math.max(0.05, idealElevation(targetDist) + elevCorrection)
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
            // MG uses direct aim at target body (like rifle) with slight spread
            const speed = MG_BULLET_SPEED
            const tgtY = selectedTarget.position[1] + 0.8
            const dxMG = selectedTarget.position[0] - muzzleX
            const dyMG = tgtY - muzzleY
            const dzMG = selectedTarget.position[2] - muzzleZ
            const lenMG = Math.sqrt(dxMG * dxMG + dyMG * dyMG + dzMG * dzMG)
            // Add small random spread for MG burst feel
            const spread = 0.08
            vx = (dxMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed + aimCorrection * 2
            vy = (dyMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed
            vz = (dzMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed
            sfx.mgBurst()
            break
          }
          default: { // rifle
            const speed = BULLET_SPEED
            const targetY = selectedTarget.position[1] + 0.8
            const dirX = selectedTarget.position[0] - muzzleX
            const dirY = targetY - muzzleY
            const dirZ = selectedTarget.position[2] - muzzleZ
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
              const tgtYe = nearestPlayer.position[1] + 0.8
              const dxMGe = nearestPlayer.position[0] - muzzleX
              const dyMGe = tgtYe - muzzleY
              const dzMGe = nearestPlayer.position[2] - muzzleZ
              const lenMGe = Math.sqrt(dxMGe * dxMGe + dyMGe * dyMGe + dzMGe * dzMGe)
              const espread = 0.1
              vx = (dxMGe / lenMGe) * MG_BULLET_SPEED + (Math.random() - 0.5) * espread * MG_BULLET_SPEED
              vy = (dyMGe / lenMGe) * MG_BULLET_SPEED + (Math.random() - 0.5) * espread * MG_BULLET_SPEED
              vz = (dzMGe / lenMGe) * MG_BULLET_SPEED + (Math.random() - 0.5) * espread * MG_BULLET_SPEED
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

        // Combat movement — strafe and reposition while fighting
        // Enemies don't just stand still; they move laterally, advance, and retreat
        if (!enemy._combatTimer) enemy._combatTimer = Math.random() * 2
        enemy._combatTimer += dt

        // Every 1-2 seconds, pick a new movement impulse
        if (!enemy._strafeDir) enemy._strafeDir = Math.random() > 0.5 ? 1 : -1
        if (enemy._combatTimer > 1.2 + Math.random() * 0.8) {
          enemy._combatTimer = 0
          // 40% strafe flip, 20% advance, 20% retreat, 20% hold
          const roll = Math.random()
          if (roll < 0.4) {
            enemy._strafeDir = -enemy._strafeDir
          } else if (roll < 0.6) {
            enemy._strafeDir = 0  // advance
            enemy._advanceRetreat = 1
          } else if (roll < 0.8) {
            enemy._strafeDir = 0  // retreat
            enemy._advanceRetreat = -1
          } else {
            enemy._strafeDir = 0
            enemy._advanceRetreat = 0
          }
        }

        const combatSpeed = enemy.speed * 0.5 * dt
        const perpAngle = angle + Math.PI / 2
        let moveX = 0
        let moveZ = 0

        if (enemy._strafeDir) {
          // Lateral strafe
          moveX = Math.sin(perpAngle) * combatSpeed * enemy._strafeDir
          moveZ = Math.cos(perpAngle) * combatSpeed * enemy._strafeDir
        } else if (enemy._advanceRetreat) {
          // Advance or retreat along facing
          moveX = Math.sin(angle) * combatSpeed * 0.6 * enemy._advanceRetreat
          moveZ = Math.cos(angle) * combatSpeed * 0.6 * enemy._advanceRetreat
        }

        if (moveX !== 0 || moveZ !== 0) {
          let newX = enemy.position[0] + moveX
          let newZ = enemy.position[2] + moveZ
          // Clamp to table bounds
          newX = Math.max(-BASE_HALF_W + 0.5, Math.min(BASE_HALF_W - 0.5, newX))
          newZ = Math.max(-BASE_HALF_D + 0.5, Math.min(BASE_HALF_D - 0.5, newZ))

          if (!isInsideWall(newX, newZ)) {
            enemy.position[0] = newX
            enemy.position[2] = newZ
            enemy.status = 'walking'
          }
          enemy.velocity = [moveX / dt, 0, moveZ / dt]
        } else {
          enemy.velocity = [0, 0, 0]
        }
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
          triggerShake(SHAKE.GRENADE)
          triggerHitpause(3)
          projectiles.splice(i, 1)
          continue
        }
      }

      // Rocket ground impact
      if (p.type === 'rocket' && p.position[1] < 0.1) {
        applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef)
        sfx.explosionLarge()
        triggerShake(SHAKE.ROCKET)
        triggerHitpause(4)
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
            triggerShake(SHAKE.ROCKET)
            triggerHitpause(4)
          } else if (p.type === 'grenade') {
            applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef)
            sfx.explosionSmall()
            triggerShake(SHAKE.GRENADE)
            triggerHitpause(3)
          } else {
            // Direct bullet damage
            unit.health -= p.damage
            sfx.bulletImpact()
            triggerShake(SHAKE.BULLET_IMPACT)

            if (unit.health <= 0) {
              unit.status = 'dead'
              unit.stateAge = 0
              unit.spinSpeed = randRange(RAGDOLL.TUMBLE_SPIN_MIN, RAGDOLL.TUMBLE_SPIN_MAX)
              sfx.deathThud()
              triggerHitpause(3)
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

      // Always show weapon reward on victory card; track if it's newly unlocked for "NEW" badge
      const alreadyUnlocked = config.weaponReward
        ? useCampStore.getState().unlockedWeapons.includes(config.weaponReward)
        : true

      // Injure dead player soldiers
      const campStore = useCampStore.getState()
      for (const p of players) {
        if (p.status === 'dead' && p.soldierId) {
          campStore.injureSoldier(p.soldierId)
        }
      }

      useCampBattleStore.getState().setResult('victory', stars)
      if (config.weaponReward) useCampBattleStore.getState().setWeaponUnlocked(config.weaponReward)
      useCampStore.getState().completeBattle(config.id, stars, config.reward, config.weaponReward, config.goldReward)
      sfx.graduationFanfare()
      setBattlePhase('result')
    }

    // Defeat: all player soldiers dead — injure all
    if (livingPlayers.length === 0 && players.length > 0) {
      const campStore = useCampStore.getState()
      for (const p of players) {
        if (p.soldierId) campStore.injureSoldier(p.soldierId)
      }
      useCampBattleStore.getState().setResult('defeat', 0)
      sfx.deathThud()
      triggerShake(SHAKE.DEFEAT)
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
          triggerShake(SHAKE.ROCKET)
          triggerHitpause(4)
        } else if (p.type === 'grenade') {
          applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef)
          sfx.explosionSmall()
          triggerShake(SHAKE.GRENADE)
          triggerHitpause(3)
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
          triggerShake(SHAKE.BULLET_IMPACT)
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
