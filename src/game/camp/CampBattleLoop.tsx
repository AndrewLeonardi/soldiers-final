/**
 * CampBattleLoop — THE core combat loop for camp battles.
 *
 * Sprint 5 (battle rework). Player soldiers attack enemy base to capture Intel.
 * Enemies are pre-placed defenders. Player movement via flow field + action verbs.
 * NN controls aim/fire decisions (10-in/6-out topology).
 *
 * Two-phase victory:
 *   Phase 1 — FIGHT: Kill all enemy soldiers (Intel protected by force field)
 *   Phase 2 — CAPTURE: Force field drops, first soldier to reach Intel wins
 *
 * Tick order each frame:
 *   1. (Skip wave spawning — enemies are pre-placed)
 *   2. Gravity drop (animate falling player units to ground)
 *   3. Player AI (flow field movement + NN aim/fire)
 *   4. Enemy AI (defend position, fire at approaching players)
 *   5. Update projectiles (gravity, position, age)
 *   6. Hit detection (unit hits, wall hits, ground hits)
 *   7. Check win/lose conditions (Intel capture / all players dead)
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
import { getRank, XP_REWARDS } from '@config/ranks'
import { DEFENSE_HALF_EXTENTS } from '@config/defenses'
import type { CampEnemyPlacement } from '@config/campBattles'
import type { WeaponType, EnemyType } from '@config/types'
import type { WallBlock } from '@three/models/Defenses'
import { BASE_HALF_W, BASE_HALF_D } from './campConstants'
import {
  PROJECTILE_GRAVITY, PROJECTILE_MAX_AGE,
  BULLET_SPEED, ROCKET_SPEED, GRENADE_SPEED, MG_BULLET_SPEED,
  HIT_RADIUS, WALL_HIT_RADIUS, BLAST, STAGGER, RAGDOLL, SHAKE,
  BLOCK_W, BLOCK_H,
  INTEL_CAPTURE_RADIUS, VERB_SPEED, VERB_AIM_SCALE, VERB_FLANK_PERP_BIAS,
  idealElevation, randRange,
} from '@engine/physics/battlePhysics'
import { createFlowField, rebuildField, getFlowDirection, hasFlow } from '@engine/ai/flowField'
import type { FlowField, FlowObstacle } from '@engine/ai/flowField'
import { triggerShake } from '@three/effects/ScreenShake'
import { triggerHitpause, getHitpauseScale } from '@engine/physics/hitpause'
import * as sfx from '@audio/sfx'

// ── Reusable THREE vectors (avoid per-frame alloc) ──
const _tA = new THREE.Vector3()
const _tB = new THREE.Vector3()

let _pid = 0  // projectile ID counter
let _uid = 0  // unit ID counter

// ── Drop physics ──
const DROP_GRAVITY = -20
const DROP_HEIGHT_PLAYER = 4
const FALL_DEATH_Y = -10

/** Check if an XZ position is over the table surface */
function isOverTable(x: number, z: number): boolean {
  return Math.abs(x) <= BASE_HALF_W && Math.abs(z) <= BASE_HALF_D
}

// ── Wall segments for collision ──
interface WallBounds {
  cx: number; cz: number
  halfW: number; halfD: number
  wallId: string
}

let _activeWallBounds: WallBounds[] = []

function isInsideWall(x: number, z: number, padding: number = 0.3): WallBounds | null {
  for (const wall of _activeWallBounds) {
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

// ── Unit creation ──

function createPlayerUnit(
  soldierId: string,
  name: string,
  weapon: WeaponType,
  position: [number, number, number],
  brainWeights?: number[],
  soldierXP?: number,
  actionVerb?: string,
): BattleUnit {
  const stats = WEAPON_STATS[weapon]
  const rank = getRank(soldierXP ?? 0)
  const healthMult = rank.healthMult ?? 1
  const health = Math.round(stats.health * healthMult)

  return {
    id: `player-${++_uid}`,
    name,
    team: 'green',
    weapon,
    position: [position[0], DROP_HEIGHT_PLAYER, position[2]],
    rotation: 0,
    health,
    maxHealth: health,
    status: 'idle',
    lastFireTime: -999,
    fireRate: stats.fireRate,
    range: stats.range,
    damage: stats.damage,
    speed: stats.speed,
    facingAngle: 0,
    velocity: [0, 0, 0],
    stateAge: 0,
    spinSpeed: 0,
    soldierId,
    isTrained: !!(brainWeights && brainWeights.length > 0),
    brainWeights,
    actionVerb: (actionVerb as any) ?? 'advance',
  }
}

function createEnemyFromPlacement(
  placement: CampEnemyPlacement,
  index: number,
): BattleUnit {
  const stats = ENEMY_STATS[placement.type]
  const weaponStats = WEAPON_STATS[placement.weapon]
  const range = placement.elevated ? weaponStats.range * 1.3 : weaponStats.range
  const y = placement.elevated ? 1.5 : 0

  return {
    id: `enemy-${++_uid}`,
    name: `Enemy ${index + 1}`,
    team: 'tan',
    weapon: placement.weapon,
    position: [placement.position[0], y, placement.position[2]],
    rotation: placement.facingAngle ?? Math.PI,
    health: stats.health,
    maxHealth: stats.health,
    status: 'idle',
    lastFireTime: -999,
    fireRate: weaponStats.fireRate,
    range,
    damage: weaponStats.damage,
    speed: stats.speed,
    facingAngle: placement.facingAngle ?? Math.PI,
    velocity: [0, 0, 0],
    stateAge: 0,
    spinSpeed: 0,
    isTrained: false,
    enemyType: placement.type,
    spawnPosition: [...placement.position] as [number, number, number],
    _combatTimer: undefined,
    _strafeDir: undefined,
    _advanceRetreat: undefined,
  }
}

// ── Main battle loop component ──

interface CampBattleLoopProps {
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
}

export function CampBattleLoop({ wallBlocksRef }: CampBattleLoopProps) {
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const setBattlePhase = useSceneStore((s) => s.setBattlePhase)

  const brainCacheRef = useRef<Map<string, NeuralNet>>(new Map())
  const battleStartedRef = useRef(false)
  const timeRef = useRef(0)
  const flowFieldRef = useRef<FlowField | null>(null)
  const flowFieldDirtyRef = useRef(false)
  const lastFlowFieldRebuildRef = useRef(0)
  const intelPositionRef = useRef<[number, number, number]>([8, 0, 0])

  // ── Initialize units on first frame of 'fighting' phase ──
  const initializeUnits = useCallback(() => {
    const store = useCampBattleStore.getState()
    const config = store.battleConfig
    if (!config) return
    if (battleStartedRef.current) return
    battleStartedRef.current = true
    timeRef.current = 0
    _pid = 0
    _uid = 0

    brainCacheRef.current.clear()
    flowFieldRef.current = null
    flowFieldDirtyRef.current = false
    lastFlowFieldRebuildRef.current = 0

    // Store Intel position
    intelPositionRef.current = config.intelPosition ?? [8, 0, 0]

    // Build wall collision bounds from enemy defenses + player defenses
    const enemyDefenses = config.enemyDefenses ?? []
    const playerDefenses = store.placedDefenses ?? []
    _activeWallBounds = [
      ...enemyDefenses.map((def, i) => {
        const ext = DEFENSE_HALF_EXTENTS[def.type] ?? DEFENSE_HALF_EXTENTS['wall']
        const isRotated = Math.abs(Math.sin(def.rotation)) > 0.5
        return {
          cx: def.position[0],
          cz: def.position[2],
          halfW: isRotated ? ext.halfD : ext.halfW,
          halfD: isRotated ? ext.halfW : ext.halfD,
          wallId: `enemy-def-${i}`,
        }
      }),
      ...playerDefenses.map((def) => {
        const ext = DEFENSE_HALF_EXTENTS[def.type] ?? DEFENSE_HALF_EXTENTS['wall']
        const isRotated = Math.abs(Math.sin(def.rotation)) > 0.5
        return {
          cx: def.position[0],
          cz: def.position[2],
          halfW: isRotated ? ext.halfD : ext.halfW,
          halfD: isRotated ? ext.halfW : ext.halfD,
          wallId: def.id,
        }
      }),
    ]

    // Build flow field with Intel as target, enemy defenses as obstacles
    const worldSize: [number, number] = [BASE_HALF_W * 2, BASE_HALF_D * 2]
    const ff = createFlowField(worldSize, 0.5)
    const obstacles: FlowObstacle[] = enemyDefenses.map((def) => {
      const ext = DEFENSE_HALF_EXTENTS[def.type] ?? DEFENSE_HALF_EXTENTS['wall']
      return {
        x: def.position[0],
        z: def.position[2],
        halfW: ext.halfW,
        halfD: ext.halfD,
        rotation: def.rotation,
      }
    })
    const intelPos = intelPositionRef.current
    rebuildField(ff, obstacles, [], worldSize, intelPos[0], intelPos[2])
    flowFieldRef.current = ff

    // Create player units from placed soldiers
    const campStoreState = useCampStore.getState()
    const playerUnits: BattleUnit[] = []
    for (const placed of store.placedSoldiers) {
      const solRecord = campStoreState.soldiers.find(s => s.id === placed.soldierId)
      const brainWeights = solRecord?.trainedBrains?.[placed.weapon]
      const xp = solRecord?.xp ?? 0
      playerUnits.push(createPlayerUnit(
        placed.soldierId, placed.name, placed.weapon as WeaponType,
        placed.position, brainWeights, xp, placed.actionVerb,
      ))
    }

    // Pre-cache neural nets for trained soldiers
    for (const pu of playerUnits) {
      if (pu.isTrained && pu.brainWeights) {
        const shape = getWeaponShape(pu.weapon)
        const nn = new NeuralNet(shape.input, shape.hidden, shape.output)
        nn.setWeights(pu.brainWeights)
        brainCacheRef.current.set(pu.id, nn)
      }
    }

    // Create enemy units from config (pre-placed, no drop animation)
    const enemySoldiers = config.enemySoldiers ?? []
    const enemyUnits: BattleUnit[] = enemySoldiers.map((es, i) =>
      createEnemyFromPlacement(es, i)
    )

    useCampBattleStore.setState({
      playerUnits,
      enemyUnits,
      projectiles: [],
      explosions: [],
      battleTime: 0,
      currentWave: 0,
      wavesSpawned: [],
    })

    sfx.deployHorn()
  }, [])

  // ── Per-frame simulation tick ──
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

    const dt = Math.min(delta, 0.05) * getHitpauseScale(delta)
    timeRef.current += dt
    const time = timeRef.current

    const state = useCampBattleStore.getState()
    const config = state.battleConfig
    if (!config) return

    const players = [...state.playerUnits]
    const enemies = [...state.enemyUnits]
    const projectiles = [...state.projectiles]
    const explosions = [...state.explosions]
    const wavesSpawned = [...state.wavesSpawned]

    const intelPos = intelPositionRef.current

    // ──────────────────────────────────────────────
    // 1. (No wave spawning — enemies are pre-placed)
    // ──────────────────────────────────────────────

    // ──────────────────────────────────────────────
    // 2. GRAVITY DROP (player drop-in animation)
    // ──────────────────────────────────────────────
    const allUnitsForDrop = [...players, ...enemies]
    for (const unit of allUnitsForDrop) {
      if (unit.status === 'dead') continue

      // Off-table fall
      if (!isOverTable(unit.position[0], unit.position[2]) && unit.position[1] <= 0) {
        unit.velocity[1] += DROP_GRAVITY * dt
        unit.position[1] += unit.velocity[1] * dt
        if (unit.position[1] < FALL_DEATH_Y) {
          unit.status = 'dead'
          unit.stateAge = 0
        }
        continue
      }

      // In-air drop
      if (unit.position[1] > 0) {
        unit.velocity[1] += DROP_GRAVITY * dt
        unit.position[1] += unit.velocity[1] * dt
        if (unit.position[1] <= 0 && isOverTable(unit.position[0], unit.position[2])) {
          unit.position[1] = 0
          unit.velocity[1] = 0
          sfx.bulletImpact()
        }
        continue // skip AI while falling
      }
    }

    // ──────────────────────────────────────────────
    // 3. PLAYER AI — flow field movement + NN aim/fire
    // ──────────────────────────────────────────────
    for (const player of players) {
      if (player.status === 'dead') continue
      if (player.position[1] > 0) continue // still falling

      player.stateAge += dt

      // Hit recovery
      if (player.status === 'hit') {
        if (player.stateAge > (player.hitRecoveryAt ?? STAGGER.BULLET_RECOVERY)) {
          player.status = 'idle'
          player.stateAge = 0
        }
        continue
      }

      // Firing hold — stay in firing pose briefly
      if (player.status === 'firing' && player.stateAge < 0.3) {
        player.velocity[0] = 0
        player.velocity[2] = 0
        continue
      }

      // ── Target acquisition ──
      let nearestEnemy: BattleUnit | null = null
      let nearestDist = Infinity
      let weakestEnemy: BattleUnit | null = null
      let lowestHealth = Infinity
      const livingEnemies: BattleUnit[] = []
      _tA.set(player.position[0], 0, player.position[2])

      for (const enemy of enemies) {
        if (enemy.status === 'dead') continue
        if (enemy.position[1] > 0.5) continue
        livingEnemies.push(enemy)
        _tB.set(enemy.position[0], 0, enemy.position[2])
        const dist = _tA.distanceTo(_tB)
        if (dist < nearestDist) { nearestDist = dist; nearestEnemy = enemy }
        if (enemy.health < lowestHealth) { lowestHealth = enemy.health; weakestEnemy = enemy }
      }

      const cooldownMet = time - player.lastFireTime >= player.fireRate
      const cooldownRatio = Math.min(1, (time - player.lastFireTime) / player.fireRate)

      // ── Action verb ──
      const verb = player.actionVerb ?? 'advance'
      const verbSpeed = VERB_SPEED[verb] ?? 1
      const verbAimScale = VERB_AIM_SCALE[verb] ?? 1

      // ── NN decision (aim/fire only — movement is verb-driven) ──
      let aimCorrection = 0
      let elevCorrection = 0
      let shouldFire = false
      let selectedTarget: BattleUnit | null = nearestEnemy

      if (player.isTrained && brainCacheRef.current.has(player.id)) {
        const nn = brainCacheRef.current.get(player.id)!

        const threatDx = nearestEnemy ? nearestEnemy.position[0] - player.position[0] : 0
        const threatDz = nearestEnemy ? nearestEnemy.position[2] - player.position[2] : 0
        const threatBearing = nearestEnemy ? Math.atan2(threatDx, threatDz) : 0
        const threatDist = nearestDist === Infinity ? 1 : Math.min(1, nearestDist / 12)

        let elevHint = 0
        if (nearestEnemy && (player.weapon === 'rocketLauncher' || player.weapon === 'grenade' || player.weapon === 'tank')) {
          elevHint = idealElevation(nearestDist) / 0.8
        }

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

        let nearestFriendlyDist = 8
        for (const ally of players) {
          if (ally === player || ally.status === 'dead') continue
          const fdx = ally.position[0] - player.position[0]
          const fdz = ally.position[2] - player.position[2]
          const fd = Math.sqrt(fdx * fdx + fdz * fdz)
          if (fd < nearestFriendlyDist) nearestFriendlyDist = fd
        }

        // 10-input vector (same as training — topology change deferred to Sprint 4)
        const nnInputs: number[] = [
          threatBearing / Math.PI,
          threatDist,
          elevHint,
          1.0 - cooldownRatio,
          livingEnemies.length / 6,
          player.health / player.maxHealth,
          nearestFriendlyDist / 8,
          Math.min(1, threatDensity / 4),
          player.velocity[0] / 2.0,
          player.velocity[2] / 2.0,
        ]

        const outputs = nn.forward(nnInputs)

        // outputs[0-1] = movement (IGNORED — movement is verb-driven now)
        // outputs[2] = aim correction
        // outputs[3] = fire gate
        // outputs[4] = elevation correction
        // outputs[5] = aggression (target selection)

        switch (player.weapon) {
          case 'rocketLauncher':
            aimCorrection = (outputs[2] ?? 0) * 0.2 * verbAimScale
            elevCorrection = (outputs[4] ?? 0) * 0.15
            break
          case 'grenade':
            aimCorrection = (outputs[2] ?? 0) * 0.25 * verbAimScale
            elevCorrection = (outputs[4] ?? 0) * 0.2
            break
          case 'machineGun':
            aimCorrection = (outputs[2] ?? 0) * 0.1 * verbAimScale
            elevCorrection = 0
            break
          default: // rifle
            aimCorrection = (outputs[2] ?? 0) * 0.15 * verbAimScale
            elevCorrection = (outputs[4] ?? 0) * 0.1
            break
        }

        shouldFire = cooldownMet && (outputs[3] ?? 0) > 0

        // Target selection from aggression output
        const aggression = ((outputs[5] ?? 0) + 1) / 2
        if (aggression > 0.7 && weakestEnemy) {
          selectedTarget = weakestEnemy
        } else if (aggression < 0.3) {
          selectedTarget = nearestEnemy
        } else {
          selectedTarget = Math.random() < aggression ? weakestEnemy : nearestEnemy
        }
      } else {
        // UNTRAINED: follow verb for movement but cannot fire
        shouldFire = false
      }

      // ── MOVEMENT (verb-driven + flow field) ──
      const wantsToFire = shouldFire && nearestEnemy && nearestDist <= player.range

      if (verb === 'hold') {
        // HOLD: no movement, stay at placed position
        player.velocity[0] = 0
        player.velocity[2] = 0
        player.status = 'idle'
      } else if (wantsToFire) {
        // Stop to fire — plant feet
        player.velocity[0] = 0
        player.velocity[2] = 0
      } else {
        // Move toward Intel using flow field
        const ff = flowFieldRef.current
        let dirX = 0, dirZ = 0

        if (ff && hasFlow(ff, player.position[0], player.position[2])) {
          const flow = getFlowDirection(ff, player.position[0], player.position[2])
          dirX = flow.x
          dirZ = flow.z
        } else {
          // Fallback: direct march toward Intel
          const dxI = intelPos[0] - player.position[0]
          const dzI = intelPos[2] - player.position[2]
          const lenI = Math.sqrt(dxI * dxI + dzI * dzI)
          if (lenI > 0.1) { dirX = dxI / lenI; dirZ = dzI / lenI }
        }

        // FLANK modifier: blend perpendicular bias
        if (verb === 'flank') {
          const perpX = -dirZ
          const perpZ = dirX
          const flankSign = player.position[2] > 0 ? 1 : -1
          dirX = dirX * (1 - VERB_FLANK_PERP_BIAS) + perpX * flankSign * VERB_FLANK_PERP_BIAS
          dirZ = dirZ * (1 - VERB_FLANK_PERP_BIAS) + perpZ * flankSign * VERB_FLANK_PERP_BIAS
          const lenN = Math.sqrt(dirX * dirX + dirZ * dirZ)
          if (lenN > 0) { dirX /= lenN; dirZ /= lenN }
        }

        const speed = player.speed * verbSpeed
        const vx = dirX * speed
        const vz = dirZ * speed

        let newX = player.position[0] + vx * dt
        let newZ = player.position[2] + vz * dt
        newX = Math.max(-BASE_HALF_W + 0.5, Math.min(BASE_HALF_W - 0.5, newX))
        newZ = Math.max(-BASE_HALF_D + 0.5, Math.min(BASE_HALF_D - 0.5, newZ))

        if (!isInsideWall(newX, newZ)) {
          player.position[0] = newX
          player.position[2] = newZ
        }

        player.velocity[0] = vx
        player.velocity[2] = vz

        if (speed > 0.1) {
          player.status = 'walking'
          // Face movement direction while walking
          player.facingAngle = Math.atan2(vx, vz)
          player.rotation = player.facingAngle
        }
      }

      // ── Skip firing if no target or out of range ──
      if (!selectedTarget || nearestDist > player.range) {
        if (player.status !== 'walking') player.status = 'idle'
        continue
      }

      // ── Face target when firing ──
      if (wantsToFire) {
        const dx = selectedTarget.position[0] - player.position[0]
        const dz = selectedTarget.position[2] - player.position[2]
        const angle = Math.atan2(dx, dz)
        player.facingAngle = angle
        player.rotation = angle
      }

      const targetDist = Math.sqrt(
        (selectedTarget.position[0] - player.position[0]) ** 2 +
        (selectedTarget.position[2] - player.position[2]) ** 2,
      )

      // ── FIRE ──
      if (wantsToFire) {
        player.lastFireTime = time
        player.status = 'firing'
        player.stateAge = 0

        const angle = player.facingAngle
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
            triggerShake(SHAKE.FIRE_ROCKET)
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
            triggerShake(SHAKE.FIRE_GRENADE)
            break
          }
          case 'machineGun': {
            const speed = MG_BULLET_SPEED
            const tgtY = selectedTarget.position[1] + 0.8
            const dxMG = selectedTarget.position[0] - muzzleX
            const dyMG = tgtY - muzzleY
            const dzMG = selectedTarget.position[2] - muzzleZ
            const lenMG = Math.sqrt(dxMG * dxMG + dyMG * dyMG + dzMG * dzMG)
            const spread = 0.08
            vx = (dxMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed
            vy = (dyMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed
            vz = (dzMG / lenMG) * speed + (Math.random() - 0.5) * spread * speed
            sfx.mgBurst()
            triggerShake(SHAKE.FIRE_MG)
            break
          }
          default: { // rifle
            const tgtY = selectedTarget.position[1] + 0.8
            const dirX = selectedTarget.position[0] - muzzleX
            const dirY = tgtY - muzzleY
            const dirZ = selectedTarget.position[2] - muzzleZ
            const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ)
            vx = (dirX / len) * BULLET_SPEED + aimCorrection * 3
            vy = (dirY / len) * BULLET_SPEED
            vz = (dirZ / len) * BULLET_SPEED
            sfx.rifleShot()
            triggerShake(SHAKE.FIRE_RIFLE)
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
    // 4. ENEMY AI — defend position, fire at approaching players
    // ──────────────────────────────────────────────
    for (const enemy of enemies) {
      if (enemy.status === 'dead') continue
      if (enemy.position[1] > 0) continue // still falling (shouldn't happen for pre-placed)

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
        if (player.position[1] > 0.5) continue
        _tB.set(player.position[0], 0, player.position[2])
        const dist = _tA.distanceTo(_tB)
        if (dist < nearestDist) { nearestDist = dist; nearestPlayer = player }
      }

      // ── Fire if in range ──
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
              triggerShake(SHAKE.FIRE_ROCKET)
              break
            }
            case 'grenade': {
              vx = Math.sin(finalAngle) * Math.cos(0.5) * GRENADE_SPEED
              vy = 5.5 + (Math.random() - 0.5) * 1.0
              vz = Math.cos(finalAngle) * Math.cos(0.5) * GRENADE_SPEED
              projType = 'grenade'
              sfx.grenadeThrow()
              triggerShake(SHAKE.FIRE_GRENADE)
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
              triggerShake(SHAKE.FIRE_MG)
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
              triggerShake(SHAKE.FIRE_RIFLE)
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

        // Combat movement — strafe/reposition but anchor to spawn position
        if (!enemy._combatTimer) enemy._combatTimer = Math.random() * 2
        enemy._combatTimer += dt

        if (!enemy._strafeDir) enemy._strafeDir = Math.random() > 0.5 ? 1 : -1
        if (enemy._combatTimer > 1.2 + Math.random() * 0.8) {
          enemy._combatTimer = 0
          const roll = Math.random()
          if (roll < 0.4) {
            enemy._strafeDir = -enemy._strafeDir
          } else if (roll < 0.6) {
            enemy._strafeDir = 0
            enemy._advanceRetreat = 1
          } else if (roll < 0.8) {
            enemy._strafeDir = 0
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
          moveX = Math.sin(perpAngle) * combatSpeed * enemy._strafeDir
          moveZ = Math.cos(perpAngle) * combatSpeed * enemy._strafeDir
        } else if (enemy._advanceRetreat) {
          moveX = Math.sin(angle) * combatSpeed * 0.6 * enemy._advanceRetreat
          moveZ = Math.cos(angle) * combatSpeed * 0.6 * enemy._advanceRetreat
        }

        // Anchor constraint — don't stray more than 3 units from spawn
        if (enemy.spawnPosition && (moveX !== 0 || moveZ !== 0)) {
          let newX = enemy.position[0] + moveX
          let newZ = enemy.position[2] + moveZ
          const spawnX = enemy.spawnPosition![0]
          const spawnZ = enemy.spawnPosition![2]
          const anchorDist = Math.sqrt((newX - spawnX) ** 2 + (newZ - spawnZ) ** 2)

          if (anchorDist > 3.0) {
            // Override: move back toward spawn
            const dxS = spawnX - enemy.position[0]
            const dzS = spawnZ - enemy.position[2]
            const lenS = Math.sqrt(dxS * dxS + dzS * dzS)
            if (lenS > 0.1) {
              moveX = (dxS / lenS) * combatSpeed
              moveZ = (dzS / lenS) * combatSpeed
              newX = enemy.position[0] + moveX
              newZ = enemy.position[2] + moveZ
            }
          }

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
        // No target in range — return to spawn position
        if (enemy.spawnPosition) {
          const dxS = enemy.spawnPosition[0] - enemy.position[0]
          const dzS = enemy.spawnPosition[2] - enemy.position[2]
          const lenS = Math.sqrt(dxS * dxS + dzS * dzS)
          if (lenS > 0.5) {
            const speed = enemy.speed * 0.5 * dt
            let newX = enemy.position[0] + (dxS / lenS) * speed
            let newZ = enemy.position[2] + (dzS / lenS) * speed
            newX = Math.max(-BASE_HALF_W + 0.5, Math.min(BASE_HALF_W - 0.5, newX))
            newZ = Math.max(-BASE_HALF_D + 0.5, Math.min(BASE_HALF_D - 0.5, newZ))
            if (!isInsideWall(newX, newZ)) {
              enemy.position[0] = newX
              enemy.position[2] = newZ
            }
            enemy.facingAngle = Math.atan2(dxS, dzS)
            enemy.rotation = enemy.facingAngle
            enemy.status = 'walking'
            enemy.velocity = [(dxS / lenS) * enemy.speed * 0.5, 0, (dzS / lenS) * enemy.speed * 0.5]
          } else {
            enemy.status = 'idle'
            enemy.velocity = [0, 0, 0]
            // Face toward player spawn (left side)
            enemy.facingAngle = enemy.spawnPosition ? Math.atan2(-1, 0) : Math.PI
            enemy.rotation = enemy.facingAngle
          }
        } else {
          enemy.status = 'idle'
          enemy.velocity = [0, 0, 0]
        }
      }
    }

    // ──────────────────────────────────────────────
    // 5. FLOW FIELD REBUILD (when walls are destroyed)
    // ──────────────────────────────────────────────
    if (flowFieldDirtyRef.current && time - lastFlowFieldRebuildRef.current > 0.5) {
      const ff = flowFieldRef.current
      const enemyDefs = config.enemyDefenses ?? []
      if (ff && enemyDefs.length > 0) {
        const newObstacles: FlowObstacle[] = []
        for (let i = 0; i < enemyDefs.length; i++) {
          const def = enemyDefs[i]!
          const blocks = wallBlocksRef.current.get(`enemy-def-${i}`)
          const aliveCount = blocks ? blocks.filter(b => b.alive).length : 0
          const totalBlocks = blocks ? blocks.length : 1
          // Only include walls that are >30% intact
          if (aliveCount > totalBlocks * 0.3) {
            const ext = DEFENSE_HALF_EXTENTS[def.type] ?? DEFENSE_HALF_EXTENTS['wall']
            newObstacles.push({
              x: def.position[0], z: def.position[2],
              halfW: ext.halfW, halfD: ext.halfD,
              rotation: def.rotation,
            })
          }
        }
        const worldSize: [number, number] = [BASE_HALF_W * 2, BASE_HALF_D * 2]
        rebuildField(ff, newObstacles, [], worldSize, intelPos[0], intelPos[2])

        // Also rebuild wall bounds for collision
        _activeWallBounds = []
        for (let i = 0; i < enemyDefs.length; i++) {
          const def = enemyDefs[i]!
          const blocks = wallBlocksRef.current.get(`enemy-def-${i}`)
          const aliveCount = blocks ? blocks.filter(b => b.alive).length : 0
          const totalBlocks = blocks ? blocks.length : 1
          if (aliveCount > totalBlocks * 0.3) {
            const ext = DEFENSE_HALF_EXTENTS[def.type] ?? DEFENSE_HALF_EXTENTS['wall']
            const isRotated = Math.abs(Math.sin(def.rotation)) > 0.5
            _activeWallBounds.push({
              cx: def.position[0], cz: def.position[2],
              halfW: isRotated ? ext.halfD : ext.halfW,
              halfD: isRotated ? ext.halfW : ext.halfD,
              wallId: `enemy-def-${i}`,
            })
          }
        }
      }
      flowFieldDirtyRef.current = false
      lastFlowFieldRebuildRef.current = time
    }

    // ──────────────────────────────────────────────
    // 6. PROJECTILE PHYSICS
    // ──────────────────────────────────────────────
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!
      p.age += dt

      if (p.age > PROJECTILE_MAX_AGE) {
        projectiles.splice(i, 1)
        continue
      }

      if (p.type === 'rocket' || p.type === 'grenade') {
        p.velocity[1] += PROJECTILE_GRAVITY * dt
      }

      p.position[0] += p.velocity[0] * dt
      p.position[1] += p.velocity[1] * dt
      p.position[2] += p.velocity[2] * dt

      if (p.type === 'grenade' && p.position[1] < 0.07) {
        p.position[1] = 0.07
        p.velocity[1] *= -0.3
        p.velocity[0] *= 0.6
        p.velocity[2] *= 0.6
        if (p.age >= BLAST.GRENADE.fuseTime) {
          applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
          sfx.explosionSmall()
          triggerShake(SHAKE.GRENADE)
          triggerHitpause(3)
          projectiles.splice(i, 1)
          continue
        }
      }

      if (p.type === 'rocket' && p.position[1] < 0.1) {
        applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
        sfx.explosionLarge()
        triggerShake(SHAKE.ROCKET)
        triggerHitpause(4)
        projectiles.splice(i, 1)
        continue
      }

      if (p.type === 'bullet' && p.position[1] < -0.5) {
        projectiles.splice(i, 1)
        continue
      }
    }

    // ──────────────────────────────────────────────
    // 7. HIT DETECTION — units
    // ──────────────────────────────────────────────
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]!
      let hit = false

      const targets = p.team === 'green' ? enemies : players
      for (const unit of targets) {
        if (unit.status === 'dead') continue

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.5)
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          if (p.type === 'rocket') {
            applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
            sfx.explosionLarge()
            triggerShake(SHAKE.ROCKET)
            triggerHitpause(4)
          } else if (p.type === 'grenade') {
            applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
            sfx.explosionSmall()
            triggerShake(SHAKE.GRENADE)
            triggerHitpause(3)
          } else {
            unit.health -= p.damage
            sfx.bulletImpact()
            triggerShake(SHAKE.BULLET_IMPACT)

            if (unit.health <= 0) {
              unit.status = 'dead'
              unit.stateAge = 0
              unit.spinSpeed = randRange(RAGDOLL.TUMBLE_SPIN_MIN, RAGDOLL.TUMBLE_SPIN_MAX)
              sfx.deathThud()
              triggerHitpause(3)
              if (p.team === 'green') {
                const shooter = players.find(u => u.id === p.ownerId)
                if (shooter?.soldierId) useCampBattleStore.getState().recordKill(shooter.soldierId)
              }
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

      if (!hit) {
        hit = checkWallHit(projectiles[i]!, wallBlocksRef, explosions, players, enemies, flowFieldDirtyRef)
      }

      if (hit) {
        projectiles.splice(i, 1)
      }
    }

    // ──────────────────────────────────────────────
    // 8. EXPLOSION CLEANUP
    // ──────────────────────────────────────────────
    for (let i = explosions.length - 1; i >= 0; i--) {
      if (time - explosions[i]!.time > 1.5) {
        explosions.splice(i, 1)
      }
    }

    // ──────────────────────────────────────────────
    // 9. WIN/LOSE CHECK — Intel capture
    // ──────────────────────────────────────────────
    const livingPlayers = players.filter(p => p.status !== 'dead')
    const livingEnemies = enemies.filter(e => e.status !== 'dead')
    const allEnemiesDead = enemies.length > 0 && livingEnemies.length === 0

    // Victory: all enemies dead + soldier reaches Intel
    if (allEnemiesDead) {
      let captured = false
      for (const player of players) {
        if (player.status === 'dead') continue
        const dx = player.position[0] - intelPos[0]
        const dz = player.position[2] - intelPos[2]
        const dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < INTEL_CAPTURE_RADIUS) {
          captured = true
          break
        }
      }

      if (captured) {
        let stars = 1
        const allSurvived = livingPlayers.length === players.length
        if (allSurvived) stars = 2
        const timeLimit = config.stars.three.threshold
        if (allSurvived && timeLimit && time <= timeLimit) stars = 3

        const campStore = useCampStore.getState()
        for (const p of players) {
          if (p.status === 'dead' && p.soldierId) {
            campStore.injureSoldier(p.soldierId)
          }
        }

        const battleStore = useCampBattleStore.getState()
        battleStore.setResult('victory', stars)
        if (config.weaponReward) battleStore.setWeaponUnlocked(config.weaponReward)
        useCampStore.getState().completeBattle(config.id, stars, config.reward, config.weaponReward)

        const kills = battleStore.soldierKills
        const xpData: Record<string, { xp: number; newRankName: string | null }> = {}
        const freshCampStore = useCampStore.getState()
        for (const pu of players) {
          if (!pu.soldierId) continue
          const solRecord = freshCampStore.soldiers.find(s => s.id === pu.soldierId)
          if (!solRecord) continue
          const oldRank = getRank(solRecord.xp ?? 0)
          let earned = XP_REWARDS.BATTLE_WIN + stars * XP_REWARDS.STAR_BONUS
          if ((kills[pu.soldierId] ?? 0) > 0) earned += XP_REWARDS.FIRST_KILL_BONUS
          freshCampStore.awardSoldierXP(pu.soldierId, earned)
          const newRank = getRank((solRecord.xp ?? 0) + earned)
          xpData[pu.soldierId] = {
            xp: earned,
            newRankName: newRank.name !== oldRank.name ? newRank.name : null,
          }
        }
        useCampBattleStore.getState().setSoldierXPEarned(xpData)

        sfx.graduationFanfare()
        setBattlePhase('result')
      }
    }

    // Defeat: all player soldiers dead
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

  for (const b of blocks) {
    if (!b.alive || !b.settled || b.groundSupported) continue
    if (b.row <= row) continue

    const overlap = blockW - Math.abs(b.mesh.position.x - bx)
    if (overlap > blockW * 0.15) {
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
  flowFieldDirtyRef: React.MutableRefObject<boolean>,
): boolean {
  const px = p.position[0]
  const py = p.position[1]
  const pz = p.position[2]

  for (const [_wallId, blocks] of wallBlocksRef.current) {
    for (const block of blocks) {
      if (!block.alive) continue

      const bx = block.mesh.getWorldPosition(_tA).x
      const by = _tA.y
      const bz = _tA.z

      const dx = px - bx
      const dy = py - by
      const dz = pz - bz
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < WALL_HIT_RADIUS) {
        if (p.type === 'rocket') {
          applyExplosion(p.position, BLAST.ROCKET, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
          sfx.explosionLarge()
          triggerShake(SHAKE.ROCKET)
          triggerHitpause(4)
        } else if (p.type === 'grenade') {
          applyExplosion(p.position, BLAST.GRENADE, p.team, players, enemies, explosions, wallBlocksRef, flowFieldDirtyRef, p.ownerId)
          sfx.explosionSmall()
          triggerShake(SHAKE.GRENADE)
          triggerHitpause(3)
        } else {
          block.alive = false
          block.settled = false
          const forceVar = randRange(0.8, 1.5)
          block.velocity.set(
            (dx / dist) * 2 * forceVar + (Math.random() - 0.5) * 0.5,
            1.5 * forceVar,
            (dz / dist) * 2 * forceVar + (Math.random() - 0.5) * 0.5,
          )
          cascadeAbove(block, blocks)
          sfx.bulletImpact()
          triggerShake(SHAKE.BULLET_IMPACT)
          flowFieldDirtyRef.current = true
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
  flowFieldDirtyRef: React.MutableRefObject<boolean>,
  ownerId?: string,
) {
  const blastRadius = blastConfig.radius
  const blastDamage = blastConfig.damage

  explosions.push({
    id: `exp-${++_pid}`,
    position: [...center],
    scale: blastRadius / 3,
    time: 0,
  })

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
      if (team === 'green' && unit.team === 'tan' && ownerId) {
        const shooter = players.find(u => u.id === ownerId)
        if (shooter?.soldierId) useCampBattleStore.getState().recordKill(shooter.soldierId)
      }
    } else {
      unit.status = 'hit'
      unit.stateAge = 0
      unit.hitRecoveryAt = STAGGER.EXPLOSION_RECOVERY
    }
  }

  // Wall block destruction
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
        flowFieldDirtyRef.current = true
      } else if (force > blastConfig.shakeThreshold) {
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
    for (const d of destroyed) {
      cascadeAbove(d, blocks)
    }
  }
}
