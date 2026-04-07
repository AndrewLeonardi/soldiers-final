/**
 * Physics Test Page — standalone proof that Rapier integration works.
 * Route: /physics-test
 *
 * Tests: ground collision, wall collision, table edge falls,
 * explosion knockback, ragdoll tumble, multi-soldier interactions.
 */
import { useRef, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { SoldierBody } from '@three/physics/SoldierBody'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { GROUP_ENV, GROUP_WALL } from '@three/physics/collisionGroups'
import { BLAST, RAGDOLL, randRange } from '@engine/physics/battlePhysics'

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

// ── Table Borders (thin walls at ground edges, tall enough soldiers can't climb over) ──
function TableBorders() {
  const edgeColor = 0x8B4513
  const wallHeight = 1.0
  const wallThick = 0.15
  // Walls sit AT the ground edge (inside, not outside) so no ledge exists
  const borders = [
    // front (z-), back (z+), left (x-), right (x+)
    { pos: [0, wallHeight / 2, -6 + wallThick / 2] as [number, number, number], half: [8, wallHeight / 2, wallThick / 2] as [number, number, number], size: [16, wallHeight, wallThick] as [number, number, number] },
    { pos: [0, wallHeight / 2, 6 - wallThick / 2] as [number, number, number], half: [8, wallHeight / 2, wallThick / 2] as [number, number, number], size: [16, wallHeight, wallThick] as [number, number, number] },
    { pos: [-8 + wallThick / 2, wallHeight / 2, 0] as [number, number, number], half: [wallThick / 2, wallHeight / 2, 6] as [number, number, number], size: [wallThick, wallHeight, 12] as [number, number, number] },
    { pos: [8 - wallThick / 2, wallHeight / 2, 0] as [number, number, number], half: [wallThick / 2, wallHeight / 2, 6] as [number, number, number], size: [wallThick, wallHeight, 12] as [number, number, number] },
  ]

  return (
    <group>
      {borders.map((b, i) => (
        <RigidBody key={`border-${i}`} type="fixed" position={b.pos} collisionGroups={GROUP_ENV}>
          <CuboidCollider args={b.half} />
          <mesh castShadow>
            <boxGeometry args={b.size} />
            <meshStandardMaterial color={edgeColor} roughness={0.7} />
          </mesh>
        </RigidBody>
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

// ── Walking Controller (continuously drives soldiers toward a target) ──
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
      if (s.status === 'dead') continue
      const body = bodyMapRef.current?.get(s.id)
      if (!body) continue
      const pos = body.translation()
      const dx = walkTarget[0] - pos.x
      const dz = walkTarget[2] - pos.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.5) {
        // Arrived — stop
        const curVel = body.linvel()
        body.setLinvel({ x: 0, y: curVel.y, z: 0 }, true)
        continue
      }
      const curVel = body.linvel()
      body.setLinvel({ x: (dx / dist) * speed, y: curVel.y, z: (dz / dist) * speed }, true)
      // Update facing
      s.facingAngle = Math.atan2(dx, dz)
      s.rotation = s.facingAngle
      s.status = 'walking'
    }
  })
  return null
}

// ── Main Scene ──
function PhysicsTestScene({
  soldiers,
  bodyMapRef,
  explosions,
  onExplosionFade,
  walking,
  walkTarget,
}: {
  soldiers: TestSoldier[]
  bodyMapRef: React.MutableRefObject<Map<string, RapierRigidBody>>
  explosions: { id: string; position: [number, number, number] }[]
  onExplosionFade: (id: string) => void
  walking: boolean
  walkTarget: [number, number, number]
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
      <TableBorders />
      <TestWall position={[0, 0.5, 0]} />
      <TestWall position={[3, 0.5, 2]} />

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

      {/* Walking controller */}
      <WalkingController soldiers={soldiers} bodyMapRef={bodyMapRef} walking={walking} walkTarget={walkTarget} />

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
  const bodyMapRef = useRef<Map<string, RapierRigidBody>>(new Map())

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
    // Push toward edge after a short delay
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
    const blastRadius = BLAST.GRENADE.radius

    setExplosions(prev => [...prev, { id: `exp-${_expId++}`, position: center }])

    let hitCount = 0
    for (const s of soldiers) {
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
        const knockForce = force * BLAST.GRENADE.unitForce * forceVar
        const dir = new THREE.Vector3(dx, dy, dz).normalize()

        body.applyImpulse({
          x: dir.x * knockForce,
          y: randRange(3, 7) * force,
          z: dir.z * knockForce,
        }, true)
        hitCount++
      }
    }
    addLog(`Explosion at (${center[0].toFixed(1)}, ${center[2].toFixed(1)}) — hit ${hitCount} soldiers`)
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

    // Flick over — tiny sideways nudge, like tipping a toy soldier
    const body = bodyMapRef.current.get(target.id)
    if (body) {
      const angle = Math.random() * Math.PI * 2
      body.applyImpulse({
        x: Math.cos(angle) * 0.3,
        y: 0,
        z: Math.sin(angle) * 0.3,
      }, true)
    }

    setSoldiers(prev => [...prev]) // trigger re-render
    addLog(`Killed soldier ${target.id} — ragdoll with tumble!`)
  }, [soldiers, addLog])

  const toggleWalk = useCallback(() => {
    if (walking) {
      setWalking(false)
      // Stop all soldiers
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
      // Pick a random walk target
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

  const resetScene = useCallback(() => {
    setSoldiers([])
    setExplosions([])
    bodyMapRef.current.clear()
    addLog('Scene reset')
  }, [addLog])

  const handleExplosionFade = useCallback((id: string) => {
    setExplosions(prev => prev.filter(e => e.id !== id))
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
            { label: 'EXPLODE', fn: triggerExplosion, color: '#cc4400' },
            { label: 'KILL 1', fn: killRandom, color: '#992222' },
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
