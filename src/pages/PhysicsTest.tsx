/**
 * Physics Test Page — standalone proof that Rapier integration works.
 * Route: /physics-test
 *
 * Tests: ground collision, wall collision, table edge falls,
 * explosion knockback, ragdoll tumble, stagger recovery,
 * wall destruction.
 */
import { useRef, useState, useCallback, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { SoldierBody } from '@three/physics/SoldierBody'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { WallDefense, type WallBlock } from '@three/models/Defenses'
import { GROUP_ENV } from '@three/physics/collisionGroups'
import { BLAST, RAGDOLL, STAGGER, randRange } from '@engine/physics/battlePhysics'

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
// Explosions set non-lethal hits to status='hit'. This controller returns
// them to 'idle' after the recovery window. Kept even without the STAGGER
// button so EXPLODE survivors don't stay stunned forever.
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
  mineMarker,
  resetKey,
}: {
  soldiers: TestSoldier[]
  bodyMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>
  explosions: { id: string; position: [number, number, number] }[]
  onExplosionFade: (id: string) => void
  walking: boolean
  walkTarget: [number, number, number]
  showWall: boolean
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
  mineMarker: [number, number, number] | null
  resetKey: number
}) {
  const handleBodyReady = useCallback((id: string, body: RapierRigidBody) => {
    bodyMapRef.current.set(id, body)
  }, [bodyMapRef])

  const handleBodyRemoved = useCallback((id: string) => {
    bodyMapRef.current.delete(id)
  }, [bodyMapRef])

  const tableBounds = { halfWidth: 8, halfDepth: 6 }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color={0xffeedd} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />

      {/* Environment */}
      <TestGround />
      <TableEdgeTrim />

      {/* Cover walls — destructible. Keyed on resetKey so RESET rebuilds them. */}
      <WallDefense
        key={`cover-1-${resetKey}`}
        position={[0, 0, 2]}
        wallBlocksRef={wallBlocksRef}
        wallId="cover-1"
        tableBounds={tableBounds}
      />
      <WallDefense
        key={`cover-2-${resetKey}`}
        position={[3, 0, 4]}
        wallBlocksRef={wallBlocksRef}
        wallId="cover-2"
        tableBounds={tableBounds}
      />
      {/* Mine test wall — rotated 90° so its thin face meets a soldier launched in +X */}
      <WallDefense
        key={`mine-wall-${resetKey}`}
        position={[4, 0, -3]}
        rotation={Math.PI / 2}
        wallBlocksRef={wallBlocksRef}
        wallId="mine-wall"
        tableBounds={tableBounds}
      />

      {/* Visible mine marker (set during MINE TEST) */}
      {mineMarker && <MineMarker position={mineMarker} />}

      {/* Spawned test wall near the right edge (ADD WALL button) */}
      {showWall && (
        <WallDefense
          position={[5, 0, 0]}
          wallBlocksRef={wallBlocksRef}
          wallId="test-wall"
          tableBounds={tableBounds}
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
  const [mineMarker, setMineMarker] = useState<[number, number, number] | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const bodyMapRef = useRef<Map<string, RapierRigidBody>>(new Map())
  const wallBlocksRef = useRef<Map<string, WallBlock[]>>(new Map())

  // Debug: expose state to window for inspection via preview_eval
  useEffect(() => {
    ;(window as any).__debug = { bodyMapRef, soldiersRef: { current: soldiers } }
  }, [soldiers])

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev.slice(-9), msg])
  }, [])

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
    setMineMarker(null)
    bodyMapRef.current.clear()
    wallBlocksRef.current.clear()
    setResetKey(k => k + 1) // force cover walls to remount with fresh blocks
    addLog('Scene reset')
  }, [addLog])

  const handleExplosionFade = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id))
  }, [])

  // ── MINE TEST: 1 soldier next to a mine, with a wall behind them ──
  // Tests: explosion knockback + wall solidity + death pose
  const mineTest = useCallback(() => {
    // Reset
    setSoldiers([])
    setExplosions([])
    setShowWall(false)
    bodyMapRef.current.clear()
    wallBlocksRef.current.clear()
    setResetKey(k => k + 1) // force cover walls (including mine wall) to remount fresh

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
              mineMarker={mineMarker}
              resetKey={resetKey}
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
            { label: 'SPAWN 6', fn: spawnMany, color: '#4a6b3a' },
            { label: walking ? 'STOP WALK' : 'WALK', fn: toggleWalk, color: walking ? '#aa4400' : '#556B2F' },
            { label: 'EXPLODE', fn: triggerExplosion, color: '#cc4400' },
            { label: 'KILL 1', fn: killRandom, color: '#992222' },
            { label: 'MINE TEST', fn: mineTest, color: '#990000' },
            { label: 'ADD WALL', fn: addWall, color: '#556B2F' },
            { label: 'WALL EXPLODE', fn: wallExplode, color: '#cc6600' },
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
