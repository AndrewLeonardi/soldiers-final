/**
 * AmbientSoldiers — spawns and manages the wandering toy soldiers.
 *
 * Sprint 1, Subsystem 3. 6-10 procedural soldiers spawn at boot,
 * each running its own WanderBrain FSM independently.
 *
 * Selection: invisible enlarged hitbox, drag-safe click (>6px move = ignore),
 * selection ring, hover scale, face-camera-on-select.
 * Selected soldier shows a name tag ("Pvt. Henson"). No sheet, no actions.
 */
import { useRef, useMemo, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { GROUP_SOLDIER } from '@three/physics/collisionGroups'
import { WanderBrain } from './WanderBrain'
import { SOLDIER_BOUNDS, AMBIENT_SOLDIER_COUNT } from './campConstants'
import { useCampStore } from '@stores/campStore'

// ── Name pool ──
const FIRST_NAMES = [
  'Henson', 'Davies', 'Kowalski', 'Jackson', 'Murphy',
  'Rodriguez', 'Chen', 'Brooks', 'Foster', 'Palmer',
  'Reeves', 'Santos', 'Gibbs', 'Torres', 'Walsh',
]

const RANKS = ['Pvt.', 'Pfc.', 'Cpl.']

function pickName(index: number): string {
  const rank = RANKS[index % RANKS.length]!
  const name = FIRST_NAMES[index % FIRST_NAMES.length]!
  return `${rank} ${name}`
}

// ── Soldier data ──
interface AmbientSoldierData {
  id: string
  name: string
  team: 'green'
  position: [number, number, number]
  rotation: number
  status: string
  weapon: string
  facingAngle: number
  health: number
  maxHealth: number
  velocity: [number, number, number]
  stateAge: number
  spinSpeed: number
}

function createAmbientSoldier(index: number): AmbientSoldierData {
  const x = (Math.random() * 2 - 1) * (SOLDIER_BOUNDS.halfW - 1)
  const z = (Math.random() * 2 - 1) * (SOLDIER_BOUNDS.halfD - 1)
  return {
    id: `ambient-${index}`,
    name: pickName(index),
    team: 'green',
    position: [x, 0.5, z],
    rotation: Math.random() * Math.PI * 2,
    status: 'idle',
    weapon: 'rifle',
    facingAngle: Math.random() * Math.PI * 2,
    health: 100,
    maxHealth: 100,
    velocity: [0, 0, 0],
    stateAge: 0,
    spinSpeed: 0,
  }
}

// ── Selection ring ──
function SelectionRing() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.getElapsedTime() * 0.5
    }
  })

  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
      <ringGeometry args={[0.4, 0.55, 24]} />
      <meshBasicMaterial color={0x44ff44} transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── Individual soldier component ──
interface SoldierEntryProps {
  data: AmbientSoldierData
  isSelected: boolean
  isHovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const DRAG_THRESHOLD = 6 // px — V3 pattern

function SoldierEntry({ data, isSelected, isHovered, onSelect, onHover }: SoldierEntryProps) {
  const bodyRef = useRef<RapierRigidBody>(null!)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const groupRef = useRef<THREE.Group>(null!)

  // Sync position from physics body
  useFrame(() => {
    const body = bodyRef.current
    if (!body) return
    const pos = body.translation()
    data.position[0] = pos.x
    data.position[1] = pos.y
    data.position[2] = pos.z
  })

  // Hover scale
  useFrame((_, delta) => {
    if (!groupRef.current) return
    const targetScale = isHovered || isSelected ? 1.1 : 1.0
    const current = groupRef.current.scale.x
    const next = THREE.MathUtils.lerp(current, targetScale, Math.min(1, delta * 8))
    groupRef.current.scale.setScalar(next)
  })

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation()
    pointerDownPos.current = { x: e.clientX ?? 0, y: e.clientY ?? 0 }
  }, [])

  const handlePointerUp = useCallback((e: any) => {
    e.stopPropagation()
    if (!pointerDownPos.current) return
    const dx = (e.clientX ?? 0) - pointerDownPos.current.x
    const dy = (e.clientY ?? 0) - pointerDownPos.current.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    pointerDownPos.current = null
    if (dist < DRAG_THRESHOLD) {
      onSelect(data.id)
    }
  }, [data.id, onSelect])

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={data.position}
      colliders={false}
      collisionGroups={GROUP_SOLDIER}
      restitution={0.3}
      friction={0.8}
      linearDamping={0.5}
      angularDamping={10}
      gravityScale={1}
      lockRotations
      ccd
      mass={1}
    >
      {/* Physics collider */}
      <CuboidCollider args={[0.32, 0.5, 0.32]} position={[0, 0.5, 0]} />

      {/* Invisible enlarged click hitbox — bigger than collider for easy taps */}
      <mesh
        visible={false}
        position={[0, 0.5, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => onHover(data.id)}
        onPointerLeave={() => onHover(null)}
      >
        <boxGeometry args={[1.0, 1.2, 1.0]} />
        <meshBasicMaterial />
      </mesh>

      <group ref={groupRef}>
        {/* The visual soldier model */}
        <SoldierUnit unit={data} physicsControlled />

        {/* Selection ring */}
        {isSelected && <SelectionRing />}

        {/* Name tag */}
        {isSelected && (
          <Html
            position={[0, 1.4, 0]}
            center
            style={{
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#44ff44',
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "'Black Ops One', monospace",
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}>
              {data.name}
            </div>
          </Html>
        )}
      </group>

      {/* Wander brain — drives this soldier's FSM */}
      <WanderBrain bodyRef={bodyRef} soldier={data} />
    </RigidBody>
  )
}

// ── Main component ──
export function AmbientSoldiers() {
  const soldiers = useMemo(() => {
    return Array.from({ length: AMBIENT_SOLDIER_COUNT }, (_, i) => createAmbientSoldier(i))
  }, [])

  // Register soldiers in campStore (persisted roster) on first mount
  useEffect(() => {
    const store = useCampStore.getState()
    for (const s of soldiers) {
      const exists = store.soldiers.find(rec => rec.id === s.id)
      if (!exists) {
        store.addSoldier({
          id: s.id,
          name: s.name,
          weapon: s.weapon,
          trained: false,
        })
      }
    }
  }, [soldiers])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Click on ground deselects
  const { gl } = useThree()
  useEffect(() => {
    const canvas = gl.domElement
    const handler = (e: MouseEvent) => {
      // Only deselect on direct canvas click, not on soldier click (which stopPropagation)
      // Use a small timeout to let stopPropagation take effect
      setTimeout(() => setSelectedId(null), 0)
    }
    // We use pointerup on canvas itself — soldiers stopPropagation on their own events
    // Actually, let's use a different approach: clicking the ground mesh deselects
    return () => {}
  }, [gl])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id)
  }, [])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  return (
    <>
      {/* Ground click catcher — deselects soldiers */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        onPointerUp={() => setSelectedId(null)}
        visible={false}
      >
        <planeGeometry args={[20, 16]} />
        <meshBasicMaterial />
      </mesh>

      {soldiers.map(s => (
        <SoldierEntry
          key={s.id}
          data={s}
          isSelected={selectedId === s.id}
          isHovered={hoveredId === s.id}
          onSelect={handleSelect}
          onHover={handleHover}
        />
      ))}
    </>
  )
}
