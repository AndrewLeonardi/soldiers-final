/**
 * Physics Test Page — standalone proof that Rapier integration works.
 * Route: /physics-test
 *
 * Tests: ground collision, wall collision, table edge falls,
 * explosion knockback, ragdoll tumble, stagger recovery,
 * wall destruction, battle mode.
 */
import { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { SoldierBody } from '@three/physics/SoldierBody'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { WallDefense, type WallBlock } from '@three/models/Defenses'
import { GROUP_ENV, GROUP_WALL } from '@three/physics/collisionGroups'
import {
  BLAST, RAGDOLL, STAGGER, randRange,
  BULLET_SPEED, ROCKET_SPEED, GRENADE_SPEED,
  PROJECTILE_GRAVITY, HIT_RADIUS, idealElevation,
} from '@engine/physics/battlePhysics'

// ── Projectile type for battle mode ──
type ProjectileType = 'bullet' | 'rocket' | 'grenade'
interface BattleProjectile {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  type: ProjectileType
  damage: number
  team: 'green' | 'tan'
  age: number
  fuseTime?: number
}
type BattleWeapon = 'rifle' | 'rocket' | 'grenade'

// ── Types ──
interface TestSoldier {
  id: string
  team: 'green' | 'tan'
  position: [number, number, number]
  rotation: number
  status: string
  weapon: string
  health: number
  maxHealth: number
  facingAngle: number
  spinSpeed: number
  velocity: [number, number, number]
  stateAge: number
  lastFireTime: number
  fireRate: number
  range: number
  damage: number
  speed: number
  type: string
  hitRecoveryAt?: number
}

let _nextId = 1

function createTestSoldier(
  position: [number, number, number],
  team: 'green' | 'tan' = 'green',
): TestSoldier {
  return {
    id: `test-${_nextId++}`,
    team,
    position: [...position],
    rotation: 0,
    status: 'idle',
    weapon: 'rifle',
    health: 100,
    maxHealth: 100,
    facingAngle: 0,
    spinSpeed: 0,
    velocity: [0, 0, 0],
    stateAge: 0,
    lastFireTime: -10,
    fireRate: 1,
    range: 8,
    damage: 20,
    speed: 1.8,
    type: 'soldier',
  }
}

// ── Ground ──
function TestGround() {
  return (
    <>
      {/* Visual ground */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial color={0xd2b48c} roughness={0.9} />
      </mesh>
      {/* Physics ground — finite, matching table edges */}
      <RigidBody type="fixed" position={[0, -0.05, 0]} collisionGroups={GROUP_ENV}>
        <CuboidCollider args={[8, 0.05, 6]} />
      </RigidBody>
    </>
  )
}

// ── Test Wall ──
function TestWall({ position }: { position: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position} collisionGroups={GROUP_WALL}>
      <CuboidCollider args={[0.15, 0.5, 1.5]} />
      <mesh castShadow>
        <boxGeometry args={[0.3, 1, 3]} />
        <meshStandardMaterial color={0x4a6b3a} roughness={0.4} />
      </mesh>
    </RigidBody>
  )
}

// ── Table Edge Trim (visual only — no physics so things can fall off) ──
function TableEdgeTrim() {
  const edgeColor = 0x8B4513
  const trimHeight = 0.08
  const trimThick = 0.15
  // Thin decorative trim around the table top — purely visual, no collider
  const borders = [
    { pos: [0, trimHeight / 2, -6 + trimThick / 2] as [number, number, number], size: [16, trimHeight, trimThick] as [number, number, number] },
    { pos: [0, trimHeight / 2, 6 - trimThick / 2] as [number, number, number], size: [16, trimHeight, trimThick] as [number, number, number] },
    { pos: [-8 + trimThick / 2, trimHeight / 2, 0] as [number, number, number], size: [trimThick, trimHeight, 12] as [number, number, number] },
    { pos: [8 - trimThick / 2, trimHeight / 2, 0] as [number, number, number], size: [trimThick, trimHeight, 12] as [number, number, number] },
  ]

  return (
    <group>
      {borders.map((b, i) => (
        <mesh key={`trim-${i}`} position={b.pos} castShadow>
          <boxGeometry args={b.size} />
          <meshStandardMaterial color={edgeColor} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

// ── Explosion Marker ──
function ExplosionMarker({ position, onFade }: { position: [number, number, number]; onFade: () => void }) {
  const ref = useRef<THREE.Mesh>(null!)
  const age = useRef(0)

  useFrame((_, delta) => {
    age.current += delta
    if (age.current > 0.5) {
      onFade()
      return
    }
    const scale = 1 + age.current * 8
    ref.current.scale.setScalar(scale)
    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.opacity = 1 - age.current * 2
  })

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={0xff6600} transparent opacity={1} emissive={0xff4400} emissiveIntensity={2} />
    </mesh>
  )
}

// ── Position Sync ──
function SyncSoldierPosition({
  soldier,
  bodyMapRef,
}: {
  soldier: TestSoldier
  bodyMapRef: React.RefObject<Map<string, RapierRigidBody>>
}) {
  useFrame(() => {
    const body = bodyMapRef.current?.get(soldier.id)
    if (body) {
      const pos = body.translation()
      soldier.position[0] = pos.x
      soldier.position[1] = pos.y
      soldier.position[2] = pos.z
      const vel = body.linvel()
      soldier.velocity[0] = vel.x
      soldier.velocity[1] = vel.y
      soldier.velocity[2] = vel.z
    }
  })
  return null
}

// ── Stagger Recovery Controller ──
function StaggerController({ soldiers }: { soldiers: TestSoldier[] }) {
  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    for (const s of soldiers) {
      if (s.status === 'hit') {
        s.stateAge += delta
        if (s.stateAge > (s.hitRecoveryAt ?? STAGGER.BULLET_RECOVERY)) {
          s.status = 'idle'
          s.stateAge = 0
        }
      }
    }
  })
  return null
}

// ── Battle Controller ──
// Auto-fight loop: each soldier targets nearest enemy, fires on cooldown.
// Handles projectile movement, collisions, damage, explosions.
function BattleController({
  soldiers,
  bodyMapRef,
  battling,
  weapon,
  projectilesRef,
  onExplosion,
  onSoldiersChanged,
}: {
  soldiers: TestSoldier[]
  bodyMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>
  battling: boolean
  weapon: BattleWeapon
  projectilesRef: React.MutableRefObject<BattleProjectile[]>
  onExplosion: (pos: [number, number, number]) => void
  onSoldiersChanged: () => void
}) {
  const _pidRef = useRef(1)

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const time = state.clock.getElapsedTime()
    const projectiles = projectilesRef.current

    // ── Soldier AI: find nearest enemy and fire ──
    if (battling) {
      for (const s of soldiers) {
        if (s.status === 'dead' || s.status === 'hit') continue
        const body = bodyMapRef.current.get(s.id)
        if (!body) continue
        // Stop sliding while in battle (gravity y kept)
        const cur = body.linvel()
        body.setLinvel({ x: 0, y: cur.y, z: 0 }, true)

        // Find nearest enemy
        let nearest: TestSoldier | null = null
        let nearestDist = Infinity
        for (const e of soldiers) {
          if (e.team === s.team) continue
          if (e.status === 'dead') continue
          const dx = e.position[0] - s.position[0]
          const dz = e.position[2] - s.position[2]
          const d = Math.sqrt(dx * dx + dz * dz)
          if (d < nearestDist) { nearestDist = d; nearest = e }
        }
        if (!nearest) { s.status = 'idle'; continue }

        // Face target
        const dx = nearest.position[0] - s.position[0]
        const dz = nearest.position[2] - s.position[2]
        s.facingAngle = Math.atan2(dx, dz)
        s.rotation = s.facingAngle

        // Range check + cooldown
        if (nearestDist > s.range) { s.status = 'idle'; continue }
        if (time - s.lastFireTime < s.fireRate) {
          if (s.status !== 'firing' || s.stateAge > 0.4) s.status = 'idle'
          continue
        }

        // Fire!
        s.lastFireTime = time
        s.status = 'firing'
        s.stateAge = 0
        const muzzle: [number, number, number] = [s.position[0], s.position[1] + 0.8, s.position[2]]
        const baseAngle = s.facingAngle

        if (weapon === 'rifle') {
          const tgt: [number, number, number] = [nearest.position[0], nearest.position[1] + 0.5, nearest.position[2]]
          const dirX = tgt[0] - muzzle[0]
          const dirY = tgt[1] - muzzle[1]
          const dirZ = tgt[2] - muzzle[2]
          const len = Math.max(0.0001, Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ))
          projectiles.push({
            id: `bp-${_pidRef.current++}`,
            position: muzzle,
            velocity: [(dirX / len) * BULLET_SPEED, (dirY / len) * BULLET_SPEED, (dirZ / len) * BULLET_SPEED],
            type: 'bullet',
            damage: 20,
            team: s.team,
            age: 0,
          })
        } else if (weapon === 'rocket') {
          const elev = Math.max(0.05, idealElevation(nearestDist))
          const cosE = Math.cos(elev)
          projectiles.push({
            id: `bp-${_pidRef.current++}`,
            position: muzzle,
            velocity: [
              Math.sin(baseAngle) * cosE * ROCKET_SPEED,
              Math.sin(elev) * ROCKET_SPEED,
              Math.cos(baseAngle) * cosE * ROCKET_SPEED,
            ],
            type: 'rocket',
            damage: 0, // explosion handles it
            team: s.team,
            age: 0,
          })
        } else if (weapon === 'grenade') {
          const cosE = Math.cos(0.5)
          projectiles.push({
            id: `bp-${_pidRef.current++}`,
            position: muzzle,
            velocity: [
              Math.sin(baseAngle) * cosE * GRENADE_SPEED,
              Math.sin(0.5) * GRENADE_SPEED + 3,
              Math.cos(baseAngle) * cosE * GRENADE_SPEED,
            ],
            type: 'grenade',
            damage: 0,
            team: s.team,
            age: 0,
            fuseTime: BLAST.GRENADE.fuseTime,
          })
        }
      }
    }

    // ── Update projectiles (always — let in-flight ones land even after STOP) ──
    const startCount = projectiles.length
    let removed = false
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i]
      p.age += delta
      // Apply gravity to rockets/grenades
      if (p.type !== 'bullet') {
        p.velocity[1] += PROJECTILE_GRAVITY * delta
      }
      // Move
      p.position[0] += p.velocity[0] * delta
      p.position[1] += p.velocity[1] * delta
      p.position[2] += p.velocity[2] * delta

      // Bullet too old or below ground
      if (p.type === 'bullet' && (p.age > 4 || p.position[1] < -1)) {
        projectiles.splice(i, 1); removed = true; continue
      }
      // Grenade fuse
      if (p.type === 'grenade' && p.fuseTime != null && p.age >= p.fuseTime) {
        explode(p.position, BLAST.GRENADE.radius, BLAST.GRENADE.damage, p.team)
        projectiles.splice(i, 1); removed = true; continue
      }
      // Rocket ground impact
      if (p.type === 'rocket' && p.position[1] < 0.1) {
        explode(p.position, BLAST.ROCKET.radius, BLAST.ROCKET.damage, p.team)
        projectiles.splice(i, 1); removed = true; continue
      }

      // Unit collision
      let hit = false
      for (const u of soldiers) {
        if (u.status === 'dead') continue
        if (u.team === p.team) continue
        const ddx = p.position[0] - u.position[0]
        const ddy = p.position[1] - (u.position[1] + 0.4)
        const ddz = p.position[2] - u.position[2]
        const dd = Math.sqrt(ddx * ddx + ddy * ddy + ddz * ddz)
        if (dd < HIT_RADIUS) {
          if (p.type === 'rocket') {
            explode(p.position, BLAST.ROCKET.radius, BLAST.ROCKET.damage, p.team)
          } else if (p.type === 'grenade') {
            explode(p.position, BLAST.GRENADE.radius, BLAST.GRENADE.damage, p.team)
          } else {
            // Bullet damage
            applyBulletDamage(u, p.damage, [ddx, 0, ddz])
          }
          projectiles.splice(i, 1); removed = true; hit = true; break
        }
      }
      if (hit) continue
    }
    // Sync state when projectiles change in any way (added or removed)
    if (removed || projectiles.length !== startCount) onSoldiersChanged()

    // ── Helpers ──
    function applyBulletDamage(u: TestSoldier, dmg: number, knockDir: [number, number, number]) {
      u.health -= dmg
      const body = bodyMapRef.current.get(u.id)
      if (u.health <= 0) {
        u.health = 0
        u.status = 'dead'
        u.stateAge = 0
        const len = Math.max(0.0001, Math.sqrt(knockDir[0] ** 2 + knockDir[2] ** 2))
        const kf = randRange(1.0, 2.5)
        if (body) {
          body.applyImpulse({
            x: (knockDir[0] / len) * kf,
            y: 0,
            z: (knockDir[2] / len) * kf,
          }, true)
        }
        u.spinSpeed = 0
      } else {
        u.status = 'hit'
        u.stateAge = 0
        u.hitRecoveryAt = STAGGER.BULLET_RECOVERY
      }
    }

    function explode(center: [number, number, number], radius: number, damage: number, team: 'green' | 'tan') {
      onExplosion(center)
      const blastConfig = radius > 3.55 ? BLAST.ROCKET : BLAST.GRENADE
      for (const u of soldiers) {
        if (u.status === 'dead') continue
        if (u.team === team) continue
        const dxu = u.position[0] - center[0]
        const dyu = u.position[1] + 0.4 - center[1]
        const dzu = u.position[2] - center[2]
        const dist = Math.sqrt(dxu * dxu + dyu * dyu + dzu * dzu)
        if (dist >= radius) continue
        const force = (radius - dist) / radius
        const dmg = Math.round(damage * force)
        u.health -= dmg

        const len = Math.max(0.0001, Math.sqrt(dxu * dxu + dzu * dzu))
        const fv = randRange(RAGDOLL.FORCE_VARIANCE_MIN, RAGDOLL.FORCE_VARIANCE_MAX)
        const knockForce = force * blastConfig.unitForce * fv
        const lateralAngle = Math.random() * Math.PI * 2
        const lateralKick = Math.random() * RAGDOLL.LATERAL_OFFSET_MAX
        const ix = (dxu / len) * knockForce + Math.cos(lateralAngle) * lateralKick
        const iz = (dzu / len) * knockForce + Math.sin(lateralAngle) * lateralKick
        const body = bodyMapRef.current.get(u.id)

        if (u.health <= 0) {
          u.health = 0
          u.status = 'dead'
          u.stateAge = 0
          u.spinSpeed = 0
          if (body) body.applyImpulse({ x: ix, y: 0, z: iz }, true)
        } else {
          u.status = 'hit'
          u.stateAge = 0
          u.hitRecoveryAt = STAGGER.EXPLOSION_RECOVERY
          const iy = 0.4 + force * blastConfig.unitYBias * 0.3
          if (body) body.applyImpulse({ x: ix, y: iy, z: iz }, true)
        }
      }
      onSoldiersChanged()
    }
  })

  return null
}

// ── Projectile Visual ──
function ProjectileVisual({ p }: { p: BattleProjectile }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame(() => {
    if (ref.current) ref.current.position.set(p.position[0], p.position[1], p.position[2])
  })
  const size = p.type === 'bullet' ? 0.04 : p.type === 'grenade' ? 0.1 : 0.12
  const color = p.type === 'bullet' ? 0xffee66 : p.type === 'grenade' ? 0x222222 : 0x884422
  return (
    <mesh ref={ref} position={p.position}>
      <sphereGeometry args={[size, 8, 6]} />
      <meshStandardMaterial color={color} emissive={p.type === 'bullet' ? 0xffaa00 : 0x000000} emissiveIntensity={p.type === 'bullet' ? 1 : 0} />
    </mesh>
  )
}

// ── Walking Controller ──
function WalkingController({
  soldiers,
  bodyMapRef,
  walking,
  walkTarget,
}: {
  soldiers: TestSoldier[]
  bodyMapRef: React.RefObject<Map<string, RapierRigidBody>>
  walking: boolean
  walkTarget: [number, number, number]
}) {
  useFrame(() => {
    if (!walking) return
    const speed = 2.0
    for (const s of soldiers) {
      if (s.status === 'dead' || s.status === 'hit') continue
      const body = bodyMapRef.current?.get(s.id)
      if (!body) continue
      const pos = body.translation()
      const dx = walkTarget[0] - pos.x
      const dz = walkTarget[2] - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.5) {
        const curVel = body.linvel()
        body.setLinvel({ x: 0, y: curVel.y, z: 0 }, true)
        continue
      }
      const curVel = body.linvel()
      body.setLinvel({ x: (dx / dist) * speed, y: curVel.y, z: (dz / dist) * speed }, true)
      s.facingAngle = Math.atan2(dx, dz)
      s.rotation = s.facingAngle
      s.status = 'walking'
    }
  })
  return null
}

// ── Mine Marker (visible black sphere at the mine position) ──
function MineMarker({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    if (ref.current) {
      // Pulsing red glow
      const t = state.clock.getElapsedTime()
      const intensity = 0.5 + 0.5 * Math.sin(t * 5)
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = intensity
    }
  })
  return (
    <mesh ref={ref} position={position} castShadow>
      <sphereGeometry args={[0.18, 16, 12]} />
      <meshStandardMaterial color={0x222222} emissive={0xff0000} emissiveIntensity={0.5} />
    </mesh>
  )
}

// ── Main Scene ──
function PhysicsTestScene({
  soldiers,
  bodyMapRef,
  explosions,
  onExplosionFade,
  walking,
  walkTarget,
  showWall,
  wallBlocksRef,
  battling,
  battleWeapon,
  projectilesRef,
  projectiles,
  onBattleExplosion,
  onSoldiersChanged,
  mineMarker,
}: {
  soldiers: TestSoldier[]
  bodyMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>
  explosions: { id: string; position: [number, number, number] }[]
  onExplosionFade: (id: string) => void
  walking: boolean
  walkTarget: [number, number, number]
  showWall: boolean
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
  battling: boolean
  battleWeapon: BattleWeapon
  projectilesRef: React.MutableRefObject<BattleProjectile[]>
  projectiles: BattleProjectile[]
  onBattleExplosion: (pos: [number, number, number]) => void
  onSoldiersChanged: () => void
  mineMarker: [number, number, number] | null
}) {
  const handleBodyReady = useCallback((id: string, body: RapierRigidBody) => {
    bodyMapRef.current.set(id, body)
  }, [bodyMapRef])

  const handleBodyRemoved = useCallback((id: string) => {
    bodyMapRef.current.delete(id)
  }, [bodyMapRef])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color={0xffeedd} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />

      {/* Environment */}
      <TestGround />
      <TableEdgeTrim />
      {/* Cover walls in upper area */}
      <TestWall position={[0, 0.5, 2]} />
      <TestWall position={[3, 0.5, 4]} />
      {/* Mine test wall — solid wall at +4 X, z=-3 (clear area for MINE TEST) */}
      <TestWall position={[4, 0.5, -3]} />

      {/* Visible mine marker (set during MINE TEST) */}
      {mineMarker && <MineMarker position={mineMarker} />}

      {/* Destructible wall (spawned via ADD WALL button) — placed near right edge so blast sends blocks over */}
      {showWall && (
        <WallDefense
          position={[5, 0, 0]}
          wallBlocksRef={wallBlocksRef}
          wallId="test-wall"
          tableBounds={{ halfWidth: 8, halfDepth: 6 }}
        />
      )}

      {/* Sky */}
      <color attach="background" args={[0x88bbdd]} />
      <fog attach="fog" args={[0xd4c8a0, 18, 40]} />

      {/* Camera */}
      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
      />

      {/* Controllers */}
      <WalkingController soldiers={soldiers} bodyMapRef={bodyMapRef} walking={walking} walkTarget={walkTarget} />
      <StaggerController soldiers={soldiers} />
      <BattleController
        soldiers={soldiers}
        bodyMapRef={bodyMapRef}
        battling={battling}
        weapon={battleWeapon}
        projectilesRef={projectilesRef}
        onExplosion={onBattleExplosion}
        onSoldiersChanged={onSoldiersChanged}
      />

      {/* Battle projectiles */}
      {projectiles.map(p => (
        <ProjectileVisual key={p.id} p={p} />
      ))}

      {/* Walk target marker */}
      {walking && (
        <mesh position={walkTarget} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[0.3, 0.5, 16]} />
          <meshStandardMaterial color={0xff4444} emissive={0xff2200} emissiveIntensity={0.5} />
        </mesh>
      )}

      {/* Soldiers */}
      {soldiers.map(s => (
        <SoldierBody
          key={s.id}
          unitId={s.id}
          position={s.position}
          isDead={s.status === 'dead'}
          onBodyReady={handleBodyReady}
          onBodyRemoved={handleBodyRemoved}
        >
          <SoldierUnit unit={s} physicsControlled />
        </SoldierBody>
      ))}

      {/* Position sync */}
      {soldiers.map(s => (
        <SyncSoldierPosition key={`sync-${s.id}`} soldier={s} bodyMapRef={bodyMapRef} />
      ))}

      {/* Explosion effects */}
      {explosions.map(e => (
        <ExplosionMarker key={e.id} position={e.position} onFade={() => onExplosionFade(e.id)} />
      ))}

    </>
  )
}

// ── Page ──
let _expId = 1

export default function PhysicsTest() {
  const [soldiers, setSoldiers] = useState<TestSoldier[]>([])
  const [explosions, setExplosions] = useState<{ id: string; position: [number, number, number] }[]>([])
  const [log, setLog] = useState<string[]>(['Physics test ready. Spawn some soldiers!'])
  const [walking, setWalking] = useState(false)
  const [walkTarget, setWalkTarget] = useState<[number, number, number]>([0, 0.01, 0])
  const [showWall, setShowWall] = useState(false)
  const [battling, setBattling] = useState(false)
  const [battleWeapon, setBattleWeapon] = useState<BattleWeapon>('rifle')
  const [projectiles, setProjectiles] = useState<BattleProjectile[]>([])
  const [mineMarker, setMineMarker] = useState<[number, number, number] | null>(null)
  const projectilesRef = useRef<BattleProjectile[]>([])
  const bodyMapRef = useRef<Map<string, RapierRigidBody>>(new Map())
  const wallBlocksRef = useRef<Map<string, WallBlock[]>>(new Map())

  // Debug: expose state to window for inspection via preview_eval
  useEffect(() => {
    ;(window as any).__debug = { bodyMapRef, soldiersRef: { current: soldiers } }
  }, [soldiers])

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-9), msg])
  }, [])

  const spawnSoldier = useCallback(() => {
    const x = (Math.random() - 0.5) * 10
    const z = (Math.random() - 0.5) * 8
    const team = Math.random() > 0.5 ? 'green' as const : 'tan' as const
    const s = createTestSoldier([x, 2, z], team)
    setSoldiers(prev => [...prev, s])
    addLog(`Spawned ${team} soldier at (${x.toFixed(1)}, 2, ${z.toFixed(1)}) — should fall and land`)
  }, [addLog])

  const spawnNearEdge = useCallback(() => {
    const s = createTestSoldier([7.5, 0.5, 0], 'tan')
    setSoldiers(prev => [...prev, s])
    setTimeout(() => {
      const body = bodyMapRef.current.get(s.id)
      if (body) {
        body.setLinvel({ x: 3, y: 0, z: 0 }, true)
        addLog(`Pushing soldier toward table edge — should fall off!`)
      }
    }, 500)
    addLog(`Spawned soldier near right edge — will be pushed off`)
  }, [addLog])

  const triggerExplosion = useCallback(() => {
    const center: [number, number, number] = [
      (Math.random() - 0.5) * 6,
      0.5,
      (Math.random() - 0.5) * 4,
    ]
    const blastConfig = BLAST.GRENADE
    const blastRadius = blastConfig.radius

    setExplosions(prev => [...prev, { id: `exp-${_expId++}`, position: center }])

    let hitCount = 0
    let killCount = 0
    for (const s of soldiers) {
      if (s.status === 'dead') continue
      const body = bodyMapRef.current.get(s.id)
      if (!body) continue

      const pos = body.translation()
      const dx = pos.x - center[0]
      const dy = pos.y - center[1]
      const dz = pos.z - center[2]
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

      if (dist < blastRadius) {
        const force = (blastRadius - dist) / blastRadius
        const forceVar = randRange(RAGDOLL.FORCE_VARIANCE_MIN, RAGDOLL.FORCE_VARIANCE_MAX)
        const knockForce = force * blastConfig.unitForce * forceVar
        const dir = new THREE.Vector3(dx, dy, dz).normalize()
        const lateralAngle = Math.random() * Math.PI * 2
        const lateralKick = Math.random() * RAGDOLL.LATERAL_OFFSET_MAX
        const impulseX = dir.x * knockForce + Math.cos(lateralAngle) * lateralKick
        const impulseZ = dir.z * knockForce + Math.sin(lateralAngle) * lateralKick

        // Apply damage
        const dmg = Math.round(blastConfig.damage * force)
        s.health -= dmg

        if (s.health <= 0) {
          // Kill — pure horizontal knockback, vertical crumple pose handles the fall
          s.health = 0
          s.status = 'dead'
          s.stateAge = 0
          killCount++
          s.spinSpeed = 0
          body.applyImpulse({ x: impulseX, y: 0, z: impulseZ }, true)
        } else {
          // Stagger (non-lethal)
          s.status = 'hit'
          s.stateAge = 0
          s.hitRecoveryAt = STAGGER.EXPLOSION_RECOVERY
          const hitImpulseY = 0.4 + force * blastConfig.unitYBias * 0.3
          body.applyImpulse({ x: impulseX, y: hitImpulseY, z: impulseZ }, true)
        }
        hitCount++
      }
    }

    // Apply to wall blocks too — destroyed blocks fly as debris then disappear
    const tempPos = new THREE.Vector3()
    const cPos = new THREE.Vector3(...center)
    for (const [, blocks] of wallBlocksRef.current) {
      for (const block of blocks) {
        if (!block.alive || !block.mesh.visible) continue
        block.mesh.getWorldPosition(tempPos)
        const dist = cPos.distanceTo(tempPos)
        if (dist >= blastRadius) continue
        const force = (blastRadius - dist) / blastRadius
        const knockDir = tempPos.clone().sub(cPos).normalize()
        if (force > blastConfig.destroyThreshold) {
          block.alive = false
          block.settled = false
          // Give destroyed blocks velocity so they fly as debris (Defenses.tsx handles the animation)
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
        } else if (force > blastConfig.shakeThreshold) {
          block.settled = false
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
        }
      }
    }

    setSoldiers(prev => [...prev]) // trigger re-render
    addLog(`Explosion — hit ${hitCount} soldiers, ${killCount} killed`)
  }, [soldiers, addLog])

  const killRandom = useCallback(() => {
    const alive = soldiers.filter(s => s.status !== 'dead')
    if (alive.length === 0) {
      addLog('No alive soldiers to kill')
      return
    }
    const target = alive[Math.floor(Math.random() * alive.length)]
    target.status = 'dead'
    target.health = 0
    target.spinSpeed = 0

    // Flick over
    const body = bodyMapRef.current.get(target.id)
    if (body) {
      const angle = Math.random() * Math.PI * 2
      body.applyImpulse({
        x: Math.cos(angle) * 0.3,
        y: 0,
        z: Math.sin(angle) * 0.3,
      }, true)
    }

    setSoldiers(prev => [...prev])
    addLog(`Killed soldier ${target.id} — ragdoll with tumble!`)
  }, [soldiers, addLog])

  const toggleWalk = useCallback(() => {
    if (walking) {
      setWalking(false)
      for (const s of soldiers) {
        const body = bodyMapRef.current.get(s.id)
        if (body) {
          const curVel = body.linvel()
          body.setLinvel({ x: 0, y: curVel.y, z: 0 }, true)
        }
        if (s.status === 'walking') s.status = 'idle'
      }
      addLog('Walking stopped')
    } else {
      const tx = (Math.random() - 0.5) * 10
      const tz = (Math.random() - 0.5) * 8
      setWalkTarget([tx, 0.01, tz])
      setWalking(true)
      addLog(`Walking all soldiers to (${tx.toFixed(1)}, ${tz.toFixed(1)}) — watch them navigate!`)
    }
  }, [walking, soldiers, addLog])

  const spawnMany = useCallback(() => {
    const newSoldiers: TestSoldier[] = []
    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * 8
      const z = (Math.random() - 0.5) * 6
      const team = i % 2 === 0 ? 'green' as const : 'tan' as const
      newSoldiers.push(createTestSoldier([x, 2 + i * 0.5, z], team))
    }
    setSoldiers(prev => [...prev, ...newSoldiers])
    addLog(`Spawned 6 soldiers — watch them all land independently`)
  }, [addLog])

  // ── STAGGER button ──
  const staggerRandom = useCallback(() => {
    const alive = soldiers.filter(s => s.status !== 'dead' && s.status !== 'hit')
    if (alive.length === 0) { addLog('No soldiers to stagger'); return }
    const target = alive[Math.floor(Math.random() * alive.length)]
    target.status = 'hit'
    target.stateAge = 0
    target.hitRecoveryAt = STAGGER.EXPLOSION_RECOVERY

    const body = bodyMapRef.current.get(target.id)
    if (body) {
      const angle = Math.random() * Math.PI * 2
      body.applyImpulse({
        x: Math.cos(angle) * 2,
        y: 1.5,
        z: Math.sin(angle) * 2,
      }, true)
    }
    setSoldiers(prev => [...prev])
    addLog(`Staggered ${target.id} — will recover in ${STAGGER.EXPLOSION_RECOVERY}s`)
  }, [soldiers, addLog])

  // ── ADD WALL button ──
  const addWall = useCallback(() => {
    setShowWall(true)
    addLog('Spawned destructible wall at (5, 0, 0) near right edge — WALL EXPLODE should send blocks off!')
  }, [addLog])

  // ── WALL EXPLODE button ──
  const wallExplode = useCallback(() => {
    if (!showWall) { addLog('No wall — press ADD WALL first'); return }
    const center: [number, number, number] = [5, 0.5, 0]
    const blastConfig = BLAST.ROCKET
    const blastRadius = blastConfig.radius
    const cPos = new THREE.Vector3(...center)
    const tempPos = new THREE.Vector3()

    setExplosions(prev => [...prev, { id: `exp-${_expId++}`, position: center }])

    let destroyed = 0
    let shaken = 0
    for (const [, blocks] of wallBlocksRef.current) {
      for (const block of blocks) {
        if (!block.alive || !block.mesh.visible) continue
        block.mesh.getWorldPosition(tempPos)
        const dist = cPos.distanceTo(tempPos)
        if (dist >= blastRadius) continue
        const force = (blastRadius - dist) / blastRadius
        const knockDir = tempPos.clone().sub(cPos).normalize()
        if (force > blastConfig.destroyThreshold) {
          block.alive = false
          block.settled = false
          // Fly as debris — Defenses.tsx hides after settling
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
          destroyed++
        } else if (force > blastConfig.shakeThreshold) {
          block.settled = false
          block.velocity.set(
            knockDir.x * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
            force * blastConfig.blockYBias + Math.random() * 2,
            knockDir.z * force * blastConfig.blockForce + (Math.random() - 0.5) * 3,
          )
          shaken++
        }
      }
    }
    addLog(`ROCKET at wall — ${destroyed} blocks destroyed, ${shaken} shaken loose`)
  }, [showWall, addLog])

  const resetScene = useCallback(() => {
    setSoldiers([])
    setExplosions([])
    setShowWall(false)
    setBattling(false)
    setProjectiles([])
    setMineMarker(null)
    projectilesRef.current = []
    bodyMapRef.current.clear()
    wallBlocksRef.current.clear()
    addLog('Scene reset')
  }, [addLog])

  const handleExplosionFade = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id))
  }, [])

  // ── Battle Mode ──
  const startBattle = useCallback(() => {
    // Reset and spawn 5v5 squads
    setSoldiers([])
    setProjectiles([])
    projectilesRef.current = []
    bodyMapRef.current.clear()

    const newSoldiers: TestSoldier[] = []
    const SQUAD = 5
    // Green squad on left
    for (let i = 0; i < SQUAD; i++) {
      const s = createTestSoldier([-4.5, 0.5, -2 + i], 'green')
      s.range = 16 // generous so they always engage
      s.fireRate = battleWeapon === 'rifle' ? 1.0 : battleWeapon === 'grenade' ? 2.0 : 3.0
      newSoldiers.push(s)
    }
    // Tan squad on right
    for (let i = 0; i < SQUAD; i++) {
      const s = createTestSoldier([4.5, 0.5, -2 + i], 'tan')
      s.range = 16
      s.fireRate = battleWeapon === 'rifle' ? 1.0 : battleWeapon === 'grenade' ? 2.0 : 3.0
      newSoldiers.push(s)
    }
    setSoldiers(newSoldiers)
    setBattling(true)
    addLog(`BATTLE START — 5v5 with ${battleWeapon}!`)
  }, [battleWeapon, addLog])

  const stopBattle = useCallback(() => {
    setBattling(false)
    addLog('Battle paused. Projectiles continue until they land.')
  }, [addLog])

  // ── MINE TEST: 1 soldier next to a mine, with a wall behind them ──
  // Tests: explosion knockback + wall solidity + death pose
  const mineTest = useCallback(() => {
    // Reset
    setSoldiers([])
    setExplosions([])
    setShowWall(false)
    setBattling(false)
    setProjectiles([])
    projectilesRef.current = []
    bodyMapRef.current.clear()
    wallBlocksRef.current.clear()

    // Mine test layout (in clear z=-3 area, away from cover walls):
    //   mine at x=-1, soldier at x=1, wall at x=4
    //   explosion pushes soldier in +X toward the wall (3 units to travel)
    const soldier = createTestSoldier([1, 0.5, -3], 'green')
    setSoldiers([soldier])

    const minePos: [number, number, number] = [-1, 0.3, -3]
    setMineMarker(minePos)
    addLog('MINE TEST: soldier at (1,-3), mine at (-1,-3), wall at (4,-3). Detonating in 4s...')

    // Detonate after 4 seconds
    setTimeout(() => {
      const body = bodyMapRef.current.get(soldier.id)
      if (!body) { addLog('ERROR: soldier body not registered'); return }

      // Visual explosion at mine position
      setExplosions(prev => [...prev, { id: `exp-${_expId++}`, position: minePos }])
      setMineMarker(null)

      // Lethal damage
      soldier.health = 0
      soldier.status = 'dead'
      soldier.stateAge = 0
      soldier.spinSpeed = 0

      // Wake the body and SET velocity directly (bypasses sleep + impulse-vs-damping issues)
      body.wakeUp()
      body.setLinearDamping(0.3) // low damping so it actually flies
      body.setLinvel({ x: 12, y: 5, z: 0 }, true)
      addLog('💥 MINE DETONATED — soldier launched at wall!')
      setSoldiers(prev => [...prev])
    }, 4000)
  }, [addLog])

  const setWeapon = useCallback((w: BattleWeapon) => {
    setBattleWeapon(w)
    // Update fireRate on living soldiers
    const fireRate = w === 'rifle' ? 1.0 : w === 'grenade' ? 2.0 : 3.0
    for (const s of soldiers) {
      if (s.status !== 'dead') s.fireRate = fireRate
    }
    setSoldiers(prev => [...prev])
    addLog(`Weapon set to ${w}`)
  }, [soldiers, addLog])

  const handleBattleExplosion = useCallback((pos: [number, number, number]) => {
    setExplosions(prev => [...prev, { id: `exp-${_expId++}`, position: pos }])
  }, [])

  const handleSoldiersChanged = useCallback(() => {
    // Force re-render of soldiers (status changes from BattleController)
    setSoldiers(prev => [...prev])
    setProjectiles([...projectilesRef.current])
  }, [])

  return (
    <div style={{ width: '100%', height: '100svh', position: 'relative', background: '#111' }}>
      {/* 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [12, 10, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <Physics gravity={[0, -15, 0]}>
            <PhysicsTestScene
              soldiers={soldiers}
              bodyMapRef={bodyMapRef}
              explosions={explosions}
              onExplosionFade={handleExplosionFade}
              walking={walking}
              walkTarget={walkTarget}
              showWall={showWall}
              wallBlocksRef={wallBlocksRef}
              battling={battling}
              battleWeapon={battleWeapon}
              projectilesRef={projectilesRef}
              projectiles={projectiles}
              onBattleExplosion={handleBattleExplosion}
              onSoldiersChanged={handleSoldiersChanged}
              mineMarker={mineMarker}
            />
          </Physics>
        </Suspense>
      </Canvas>

      {/* Controls overlay */}
      <div style={{
        position: 'absolute', top: 16, left: 16,
        display: 'flex', flexDirection: 'column', gap: 8,
        fontFamily: "'Black Ops One', monospace",
      }}>
        <h2 style={{ color: '#D4AA40', margin: 0, fontSize: 20 }}>PHYSICS TEST LAB</h2>
        <p style={{ color: '#aaa', margin: 0, fontSize: 11 }}>
          Soldiers: {soldiers.length} ({soldiers.filter(s => s.status !== 'dead').length} alive)
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {[
            { label: 'SPAWN 1', fn: spawnSoldier, color: '#4a6b3a' },
            { label: 'SPAWN 6', fn: spawnMany, color: '#4a6b3a' },
            { label: 'NEAR EDGE', fn: spawnNearEdge, color: '#8B4513' },
            { label: walking ? 'STOP WALK' : 'WALK', fn: toggleWalk, color: walking ? '#aa4400' : '#556B2F' },
            { label: 'STAGGER', fn: staggerRandom, color: '#b8860b' },
            { label: 'EXPLODE', fn: triggerExplosion, color: '#cc4400' },
            { label: 'KILL 1', fn: killRandom, color: '#992222' },
            { label: 'MINE TEST', fn: mineTest, color: '#990000' },
            { label: 'ADD WALL', fn: addWall, color: '#556B2F' },
            { label: 'WALL EXPLODE', fn: wallExplode, color: '#cc6600' },
            { label: battling ? 'STOP BATTLE' : 'BATTLE', fn: battling ? stopBattle : startBattle, color: battling ? '#aa4400' : '#2a5b9a' },
            { label: `WPN: ${battleWeapon.toUpperCase()}`, fn: () => setWeapon(battleWeapon === 'rifle' ? 'grenade' : battleWeapon === 'grenade' ? 'rocket' : 'rifle'), color: '#4a4a8a' },
            { label: 'RESET', fn: resetScene, color: '#444' },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.fn}
              style={{
                padding: '8px 14px',
                background: btn.color,
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.2)',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: "'Black Ops One', monospace",
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log */}
      <div style={{
        position: 'absolute', bottom: 16, left: 16, right: 16,
        background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: 12,
        fontFamily: 'monospace', fontSize: 11, color: '#8f8',
        maxHeight: 160, overflow: 'auto',
      }}>
        {log.map((msg, i) => (
          <div key={i} style={{ opacity: 0.5 + (i / log.length) * 0.5 }}>
            {'> '}{msg}
          </div>
        ))}
      </div>

      {/* Back link */}
      <a
        href="/"
        style={{
          position: 'absolute', top: 16, right: 16,
          color: '#888', textDecoration: 'none', fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        ← back
      </a>
    </div>
  )
}
