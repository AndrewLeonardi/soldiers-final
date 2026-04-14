/**
 * AmbientSoldiers — spawns and manages wandering toy soldiers on the camp diorama.
 *
 * Sprint A refactor. Soldiers are now driven by campStore.soldiers (the source of truth).
 * Recruiting a soldier adds them to the store, and they appear on the field immediately.
 * No more hardcoded count — the camp shows exactly the soldiers you've recruited.
 *
 * Selection: invisible enlarged hitbox, drag-safe click (>6px move = ignore),
 * selection ring, hover scale, face-camera-on-select.
 */
import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { SoldierUnit } from '@three/models/SoldierUnit'
import { GROUP_SOLDIER } from '@three/physics/collisionGroups'
import { WanderBrain } from './WanderBrain'
import { SOLDIER_BOUNDS } from './campConstants'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { getRank } from '@config/ranks'

// ── Soldier data (mutable per-frame state, NOT from store) ──
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

function createAmbientData(id: string, name: string, weapon: string): AmbientSoldierData {
  const x = (Math.random() * 2 - 1) * (SOLDIER_BOUNDS.halfW - 1)
  const z = (Math.random() * 2 - 1) * (SOLDIER_BOUNDS.halfD - 1)
  return {
    id,
    name,
    team: 'green',
    position: [x, 0.5, z],
    rotation: Math.random() * Math.PI * 2,
    status: 'idle',
    weapon,
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
  xp: number
  isSelected: boolean
  isHovered: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

const DRAG_THRESHOLD = 6

function SoldierEntry({ data, xp, isSelected, isHovered, onSelect, onHover }: SoldierEntryProps) {
  const bodyRef = useRef<RapierRigidBody>(null!)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    const body = bodyRef.current
    if (!body) return
    const pos = body.translation()
    data.position[0] = pos.x
    data.position[1] = pos.y
    data.position[2] = pos.z
  })

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
      <CuboidCollider args={[0.32, 0.5, 0.32]} position={[0, 0.5, 0]} />

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
        <SoldierUnit unit={data} physicsControlled />
        {isSelected && <SelectionRing />}
        {isSelected && (
          <Html
            position={[0, 1.4, 0]}
            center
            zIndexRange={[5, 0]}
            style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
          >
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              color: getRank(xp).color,
              padding: '3px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "'Black Ops One', monospace",
              letterSpacing: 1,
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <span>{getRank(xp).badge || '—'}</span>
              <span>{data.name}</span>
            </div>
          </Html>
        )}
      </group>

      <WanderBrain bodyRef={bodyRef} soldier={data} />
    </RigidBody>
  )
}

// ── Main component ──
export function AmbientSoldiers() {
  // Source of truth: soldiers from the persistent store
  const storeSoldiers = useCampStore((s) => s.soldiers)

  // Mutable per-frame data keyed by soldier ID — persists across renders
  const dataMapRef = useRef<Map<string, AmbientSoldierData>>(new Map())

  // Sync dataMap with store soldiers — add new, remove deleted
  const now = Date.now()
  const healthyIds = new Set(
    storeSoldiers
      .filter(s => !s.injuredUntil || s.injuredUntil <= now)
      .map(s => s.id),
  )

  // Build current data array from store
  const soldierData: AmbientSoldierData[] = []
  for (const sol of storeSoldiers) {
    if (!healthyIds.has(sol.id)) continue

    let data = dataMapRef.current.get(sol.id)
    if (!data) {
      // New recruit — create ambient data
      data = createAmbientData(sol.id, sol.name, sol.weapon)
      dataMapRef.current.set(sol.id, data)
    } else {
      // Sync name/weapon from store (may have changed via training)
      data.name = sol.name
      data.weapon = sol.weapon
    }
    soldierData.push(data)
  }

  // Clean up removed/injured soldiers from the map
  for (const [id] of dataMapRef.current) {
    if (!healthyIds.has(id)) {
      dataMapRef.current.delete(id)
    }
  }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const setSoldierSheetId = useSceneStore((s) => s.setSoldierSheetId)

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => {
      const newId = prev === id ? null : id
      setSoldierSheetId(newId)
      return newId
    })
  }, [setSoldierSheetId])

  const handleHover = useCallback((id: string | null) => {
    setHoveredId(id)
  }, [])

  return (
    <>
      {/* Ground click catcher — deselects soldiers */}
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0.001, 0]}
        onPointerUp={() => { setSelectedId(null); setSoldierSheetId(null) }}
        visible={false}
      >
        <planeGeometry args={[28, 22]} />
        <meshBasicMaterial />
      </mesh>

      {soldierData.map(s => (
        <SoldierEntry
          key={s.id}
          data={s}
          xp={storeSoldiers.find(ss => ss.id === s.id)?.xp ?? 0}
          isSelected={selectedId === s.id}
          isHovered={hoveredId === s.id}
          onSelect={handleSelect}
          onHover={handleHover}
        />
      ))}
    </>
  )
}
