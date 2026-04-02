import { useGameStore } from '@stores/gameStore'
import { ENEMY_STATS } from '@config/units'
import type { GameUnit, Projectile, Wave, WaveEnemy, EnemyType } from '@config/types'

let _eid = 1000
function nextEnemyId(): string {
  return `e-${++_eid}`
}

let _pid = 5000
function nextProjectileId(): string {
  return `p-${++_pid}`
}

const OBJECTIVE_X = -7
const LOSE_THRESHOLD_X = -6
const SPAWN_X = 8
const BULLET_SPEED = 20
const ROCKET_SPEED = 8
const ROCKET_GRAVITY = -6
const PROJECTILE_MAX_AGE = 4 // seconds
const HIT_RADIUS = 0.5

export class BattleManager {
  private wavesSpawned: Set<number> = new Set()
  private battleElapsed = 0
  private started = false

  reset(): void {
    this.wavesSpawned.clear()
    this.battleElapsed = 0
    this.started = false
    _eid = 1000
    _pid = 5000
  }

  tick(dt: number, elapsed: number): void {
    const state = useGameStore.getState()
    if (state.phase !== 'battle') return
    if (state.result !== null) return

    // Record battle start time on first tick
    if (!this.started) {
      this.started = true
      this.battleElapsed = 0
      useGameStore.setState({ battleStartTime: elapsed })
    }

    this.battleElapsed += dt

    this.spawnWaves()
    this.updateEnemyAI(dt)
    this.updatePlayerAI(dt)
    this.updateProjectiles(dt)
    this.checkCollisions()
    this.checkWinLose()
  }

  // ---- Wave spawning ----
  private spawnWaves(): void {
    const state = useGameStore.getState()
    const level = state.level
    if (!level) return

    const waves: Wave[] = level.waves
    for (let i = 0; i < waves.length; i++) {
      if (this.wavesSpawned.has(i)) continue
      const wave = waves[i]
      if (this.battleElapsed >= wave.delay) {
        this.wavesSpawned.add(i)
        this.spawnWave(wave, i)
      }
    }
  }

  private spawnWave(wave: Wave, _waveIndex: number): void {
    for (const enemyDef of wave.enemies) {
      this.spawnEnemyGroup(enemyDef)
    }
  }

  private spawnEnemyGroup(def: WaveEnemy): void {
    const stats = ENEMY_STATS[def.type as EnemyType]
    if (!stats) return

    const spacing = def.spacing ?? 1.2
    const pathZ = def.path === 'flank' ? 3 : 0
    const count = def.count

    for (let i = 0; i < count; i++) {
      const zOffset = (i - (count - 1) / 2) * spacing
      const unit: GameUnit = {
        id: nextEnemyId(),
        type: 'soldier',
        team: 'tan',
        position: [SPAWN_X + i * 0.5, 0, pathZ + zOffset],
        rotation: -Math.PI / 2, // face left
        health: stats.health,
        maxHealth: stats.health,
        status: 'walking',
        weapon: 'rifle',
        lastFireTime: 0,
        fireRate: stats.fireRate,
        range: stats.range,
        damage: stats.damage,
        speed: stats.speed,
      }
      useGameStore.getState().addEnemyUnit(unit)
    }
  }

  // ---- Enemy AI ----
  private updateEnemyAI(dt: number): void {
    const state = useGameStore.getState()
    const enemies = state.enemyUnits
    const players = state.playerUnits

    for (const enemy of enemies) {
      if (enemy.status === 'dead') continue

      // Find nearest living player unit in range
      const target = this.findNearest(enemy, players)
      const distToTarget = target ? this.dist2D(enemy, target) : Infinity

      if (target && distToTarget <= enemy.range) {
        // Stop and fire
        if (enemy.status !== 'firing') {
          useGameStore.getState().updateUnit(enemy.id, { status: 'firing' })
        }

        // Face the target
        const dx = target.position[0] - enemy.position[0]
        const dz = target.position[2] - enemy.position[2]
        const angle = Math.atan2(dz, dx) + Math.PI
        useGameStore.getState().updateUnit(enemy.id, { rotation: angle })

        // Fire if cooldown elapsed
        if (this.battleElapsed - enemy.lastFireTime >= enemy.fireRate) {
          this.fireProjectile(enemy, target)
          useGameStore.getState().updateUnit(enemy.id, { lastFireTime: this.battleElapsed })
        }
      } else {
        // Walk toward objective (left)
        if (enemy.status !== 'walking') {
          useGameStore.getState().updateUnit(enemy.id, { status: 'walking' })
        }
        const newX = enemy.position[0] - enemy.speed * dt
        useGameStore.getState().updateUnit(enemy.id, {
          position: [newX, enemy.position[1], enemy.position[2]],
          rotation: -Math.PI / 2, // face left
        })
      }
    }
  }

  // ---- Player AI ----
  private updatePlayerAI(dt: number): void {
    const state = useGameStore.getState()
    const players = state.playerUnits
    const enemies = state.enemyUnits

    for (const player of players) {
      if (player.status === 'dead') continue
      if (player.type !== 'soldier') continue

      const target = this.findNearest(player, enemies)
      if (!target) {
        if (player.status !== 'idle') {
          useGameStore.getState().updateUnit(player.id, { status: 'idle' })
        }
        continue
      }

      const dist = this.dist2D(player, target)
      if (dist > player.range) {
        if (player.status !== 'idle') {
          useGameStore.getState().updateUnit(player.id, { status: 'idle' })
        }
        continue
      }

      // Face the target
      const dx = target.position[0] - player.position[0]
      const dz = target.position[2] - player.position[2]
      const angle = Math.atan2(dz, dx) + Math.PI
      useGameStore.getState().updateUnit(player.id, { rotation: angle, status: 'firing' })

      // Fire if cooldown elapsed
      if (this.battleElapsed - player.lastFireTime >= player.fireRate) {
        this.fireProjectile(player, target)
        useGameStore.getState().updateUnit(player.id, { lastFireTime: this.battleElapsed })
      }
    }
  }

  // ---- Projectiles ----
  private fireProjectile(shooter: GameUnit, target: GameUnit): void {
    const dx = target.position[0] - shooter.position[0]
    const dy = target.position[1] - shooter.position[1]
    const dz = target.position[2] - shooter.position[2]
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist === 0) return

    const isRocket = shooter.weapon === 'rocketLauncher'
    const speed = isRocket ? ROCKET_SPEED : BULLET_SPEED

    // Normalize direction and apply speed
    const vx = (dx / dist) * speed
    const vy = isRocket ? ((dy / dist) * speed + 3) : (dy / dist) * speed // rockets arc up
    const vz = (dz / dist) * speed

    const proj: Projectile = {
      id: nextProjectileId(),
      position: [shooter.position[0], shooter.position[1] + 0.4, shooter.position[2]],
      velocity: [vx, vy, vz],
      type: isRocket ? 'rocket' : 'bullet',
      damage: shooter.damage,
      ownerId: shooter.id,
      team: shooter.team,
      age: 0,
    }

    useGameStore.getState().addProjectile(proj)
  }

  private updateProjectiles(dt: number): void {
    const state = useGameStore.getState()
    const projectiles = state.projectiles
    const toRemove: string[] = []
    const updated: Projectile[] = []

    for (const p of projectiles) {
      const newAge = p.age + dt
      if (newAge > PROJECTILE_MAX_AGE) {
        toRemove.push(p.id)
        continue
      }

      const isRocket = p.type === 'rocket'
      const newVy = isRocket ? p.velocity[1] + ROCKET_GRAVITY * dt : p.velocity[1]

      const newPos: [number, number, number] = [
        p.position[0] + p.velocity[0] * dt,
        p.position[1] + newVy * dt,
        p.position[2] + p.velocity[2] * dt,
      ]

      // Remove if below ground
      if (newPos[1] < -0.5) {
        toRemove.push(p.id)
        continue
      }

      updated.push({
        ...p,
        position: newPos,
        velocity: [p.velocity[0], newVy, p.velocity[2]],
        age: newAge,
      })
    }

    // Batch update projectiles
    if (toRemove.length > 0 || updated.length !== projectiles.length) {
      const removeSet = new Set(toRemove)
      useGameStore.setState({
        projectiles: updated.filter((p) => !removeSet.has(p.id)),
      })
    } else {
      useGameStore.setState({ projectiles: updated })
    }
  }

  // ---- Collision detection ----
  private checkCollisions(): void {
    const state = useGameStore.getState()
    const projectiles = state.projectiles
    const allUnits = [...state.playerUnits, ...state.enemyUnits]

    const projToRemove: Set<string> = new Set()
    const unitDamage: Map<string, number> = new Map()

    for (const p of projectiles) {
      if (projToRemove.has(p.id)) continue

      for (const unit of allUnits) {
        if (unit.status === 'dead') continue
        if (unit.team === p.team) continue // no friendly fire

        const dx = p.position[0] - unit.position[0]
        const dy = p.position[1] - (unit.position[1] + 0.3) // aim at center mass
        const dz = p.position[2] - unit.position[2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < HIT_RADIUS) {
          projToRemove.add(p.id)
          const prev = unitDamage.get(unit.id) ?? 0
          unitDamage.set(unit.id, prev + p.damage)
          break
        }
      }
    }

    // Apply damage
    for (const [unitId, dmg] of unitDamage) {
      const unit = allUnits.find((u) => u.id === unitId)
      if (!unit) continue
      const newHealth = Math.max(0, unit.health - dmg)
      const newStatus = newHealth <= 0 ? 'dead' as const : 'hit' as const
      useGameStore.getState().updateUnit(unitId, {
        health: newHealth,
        status: newStatus,
      })
    }

    // Remove hit projectiles
    if (projToRemove.size > 0) {
      useGameStore.setState((s) => ({
        projectiles: s.projectiles.filter((p) => !projToRemove.has(p.id)),
      }))
    }
  }

  // ---- Win/lose conditions ----
  private checkWinLose(): void {
    const state = useGameStore.getState()
    if (state.result !== null) return

    const livingEnemies = state.enemyUnits.filter((e) => e.status !== 'dead')

    // Lose: any living enemy past the threshold
    for (const enemy of livingEnemies) {
      if (enemy.position[0] <= LOSE_THRESHOLD_X) {
        useGameStore.getState().setResult('defeat', 0)
        return
      }
    }

    // Win: all waves spawned and all enemies dead
    const level = state.level
    if (!level) return
    const allWavesSpawned = this.wavesSpawned.size >= level.waves.length
    const allEnemiesDead = state.enemyUnits.length > 0 && livingEnemies.length === 0

    if (allWavesSpawned && allEnemiesDead) {
      // Calculate stars
      const livingPlayers = state.playerUnits.filter((p) => p.status !== 'dead')
      const allSurvived = livingPlayers.length === state.playerUnits.filter((p) => p.type === 'soldier').length
      let stars = 1 // survived
      if (state.gold >= 200) stars = 2
      if (allSurvived) stars = 3
      useGameStore.getState().setResult('victory', stars)
    }
  }

  // ---- Helpers ----
  private findNearest(source: GameUnit, targets: GameUnit[]): GameUnit | null {
    let best: GameUnit | null = null
    let bestDist = Infinity

    for (const t of targets) {
      if (t.status === 'dead') continue
      if (t.type !== 'soldier') continue // only target soldiers
      const d = this.dist2D(source, t)
      if (d < bestDist) {
        bestDist = d
        best = t
      }
    }
    return best
  }

  private dist2D(a: GameUnit, b: GameUnit): number {
    const dx = a.position[0] - b.position[0]
    const dz = a.position[2] - b.position[2]
    return Math.sqrt(dx * dx + dz * dz)
  }
}
