/**
 * MedicalTentBuilding — the 3D field hospital structure.
 *
 * Sprint 6, Phase 3. Procedural toy aesthetic: white/cream tent with
 * red cross, wooden posts, visible cots with injured soldiers.
 * Tappable — opens medical sheet.
 * Shows "+HEAL" floating label when soldiers are injured.
 */
import { useRef, useCallback, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { MEDICAL_FOOTPRINT } from './campConstants'
import { useCampStore } from '@stores/campStore'
import { useSceneStore } from '@stores/sceneStore'
import { createFlexSoldier } from '@three/models/flexSoldier'
import { TOY } from '@three/models/materials'

const { centerX, centerZ, halfW, halfD } = MEDICAL_FOOTPRINT

/** Colors */
const WOOD_DARK = 0x5a3416
const WOOD_LIGHT = 0x8b6b3d
const CANVAS_COLOR = 0xf0ebe0
const CROSS_COLOR = 0xcc2222
const PLATFORM_COLOR = 0xc4a56e
const COT_COLOR = 0xe8e0d0
const BLANKET_COLOR = 0x4a6a4a

const DRAG_THRESHOLD = 6

/** A toy soldier model lying on its back — used on medical cots */
function LyingSoldier() {
  const soldierObj = useMemo(() => {
    const { group, parts } = createFlexSoldier(TOY.armyGreen)
    // Hide the circular base stand — soldiers on cots don't need it
    parts.base.visible = false
    return group
  }, [])

  return (
    <group position={[0, 0.06, 0]}>
      {/* Rotate soldier to lie on its back along Z axis, scaled to fit cot */}
      <group rotation={[-Math.PI / 2, 0, 0]} scale={0.75} position={[0, 0, 0]}>
        <primitive object={soldierObj} />
      </group>
    </group>
  )
}

export function MedicalTentBuilding() {
  const soldiers = useCampStore((s) => s.soldiers)
  const setMedicalSheetOpen = useSceneStore((s) => s.setMedicalSheetOpen)
  const anySheetOpen = useSceneStore((s) =>
    s.trainingSheetOpen || s.storeSheetOpen || s.rosterSheetOpen ||
    s.soldierSheetId !== null || s.medicalSheetOpen
  )
  const battlePhase = useSceneStore((s) => s.battlePhase)

  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const crossRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  const injuredSoldiers = soldiers.filter(
    (s) => s.injuredUntil && s.injuredUntil > Date.now(),
  )
  const hasInjured = injuredSoldiers.length > 0

  // Pulsing red cross when soldiers are healing
  useFrame((state) => {
    if (crossRef.current) {
      const pulse = hasInjured
        ? 0.6 + Math.sin(state.clock.getElapsedTime() * 3) * 0.4
        : 0.3
      ;(crossRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse
    }
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
      setMedicalSheetOpen(true)
    }
  }, [setMedicalSheetOpen])

  return (
    <group position={[centerX, 0, centerZ]}>
      {/* Wooden platform base */}
      <mesh position={[0, 0.04, 0]} receiveShadow castShadow>
        <boxGeometry args={[halfW * 2, 0.08, halfD * 2]} />
        <meshStandardMaterial color={PLATFORM_COLOR} roughness={0.85} />
      </mesh>

      {/* Sandy ground underneath */}
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[halfW * 2 + 0.4, halfD * 2 + 0.4]} />
        <meshStandardMaterial color={0xe8d5a3} roughness={0.95} />
      </mesh>

      {/* Four corner posts */}
      {[
        [-halfW + 0.1, 0, -halfD + 0.1],
        [halfW - 0.1, 0, -halfD + 0.1],
        [-halfW + 0.1, 0, halfD - 0.1],
        [halfW - 0.1, 0, halfD - 0.1],
      ].map((pos, i) => (
        <mesh
          key={`post-${i}`}
          position={[pos[0]!, pos[1]! + 0.6, pos[2]!]}
          castShadow
        >
          <cylinderGeometry args={[0.04, 0.05, 1.2, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}

      {/* Tent canopy — single A-frame, lower profile than training camp */}
      <group position={[0, 1.2, 0]}>
        {/* Left slope */}
        <mesh position={[-0.5, 0.1, 0]} rotation-z={0.25} castShadow>
          <boxGeometry args={[halfW * 0.9, 0.025, halfD * 1.6]} />
          <meshStandardMaterial
            color={CANVAS_COLOR}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Right slope */}
        <mesh position={[0.5, 0.1, 0]} rotation-z={-0.25} castShadow>
          <boxGeometry args={[halfW * 0.9, 0.025, halfD * 1.6]} />
          <meshStandardMaterial
            color={CANVAS_COLOR}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Ridge beam */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <boxGeometry args={[0.05, 0.05, halfD * 1.7]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
        </mesh>
      </group>

      {/* Flagpole with red cross flag — visible from all directions */}
      <group position={[halfW - 0.1, 0, -halfD + 0.1]}>
        {/* Pole */}
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 2.2, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
        {/* Flag background (white) */}
        <mesh position={[0.25, 2.0, 0]} castShadow>
          <boxGeometry args={[0.5, 0.35, 0.015]} />
          <meshStandardMaterial color={0xffffff} roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        {/* Red cross on flag — vertical bar */}
        <mesh ref={crossRef} position={[0.25, 2.0, 0.01]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.005]} />
          <meshStandardMaterial
            color={CROSS_COLOR}
            emissive={CROSS_COLOR}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
        {/* Red cross on flag — horizontal bar */}
        <mesh position={[0.25, 2.0, 0.01]} castShadow>
          <boxGeometry args={[0.28, 0.06, 0.005]} />
          <meshStandardMaterial
            color={CROSS_COLOR}
            emissive={CROSS_COLOR}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
        {/* Back side cross — vertical bar */}
        <mesh position={[0.25, 2.0, -0.01]} castShadow>
          <boxGeometry args={[0.06, 0.28, 0.005]} />
          <meshStandardMaterial
            color={CROSS_COLOR}
            emissive={CROSS_COLOR}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
        {/* Back side cross — horizontal bar */}
        <mesh position={[0.25, 2.0, -0.01]} castShadow>
          <boxGeometry args={[0.28, 0.06, 0.005]} />
          <meshStandardMaterial
            color={CROSS_COLOR}
            emissive={CROSS_COLOR}
            emissiveIntensity={0.3}
            roughness={0.6}
          />
        </mesh>
        {/* Pole cap sphere */}
        <mesh position={[0, 2.22, 0]} castShadow>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={0xdddddd} metalness={0.4} roughness={0.3} />
        </mesh>
      </group>

      {/* Medical cots (3 beds) — running along Z so soldiers lie head-to-toe */}
      {[
        { x: -1.1, z: 0 },
        { x: 0,    z: 0 },
        { x: 1.1,  z: 0 },
      ].map((bed, i) => (
        <group key={`cot-${i}`} position={[bed.x, 0.12, bed.z]}>
          {/* Cot frame — long along Z */}
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.06, 1.4]} />
            <meshStandardMaterial color={COT_COLOR} roughness={0.8} />
          </mesh>
          {/* Cot legs */}
          {[[-0.25, -0.05, -0.6], [0.25, -0.05, -0.6], [-0.25, -0.05, 0.6], [0.25, -0.05, 0.6]].map((leg, j) => (
            <mesh key={`leg-${j}`} position={[leg[0]!, leg[1]!, leg[2]!]}>
              <cylinderGeometry args={[0.02, 0.02, 0.06, 4]} />
              <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
            </mesh>
          ))}
          {/* Injured soldier lying on bed — full-size toy soldier on its back */}
          {i < injuredSoldiers.length && (
            <LyingSoldier />
          )}
        </group>
      ))}

      {/* Cross-beam (front) */}
      <mesh position={[0, 0.5, -halfD + 0.1]} castShadow>
        <boxGeometry args={[halfW * 1.8, 0.05, 0.05]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>

      {/* Invisible click hitbox */}
      <mesh
        visible={false}
        position={[0, 0.7, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[halfW * 2.2, 1.6, halfD * 2.2]} />
        <meshBasicMaterial />
      </mesh>

      {/* "+HEAL" floating label when injured soldiers exist — hidden during battle and sheets */}
      {hasInjured && battlePhase === 'idle' && !anySheetOpen && (
        <Html
          position={[0, 1.8, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: hovered
              ? 'linear-gradient(180deg, #7a3a3a, #6a2a2a)'
              : 'linear-gradient(180deg, #4a2a2a, #3a1a1a)',
            color: hovered ? '#ffd0d0' : '#c09090',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 11,
            fontFamily: "'Black Ops One', monospace",
            letterSpacing: 2,
            textTransform: 'uppercase',
            borderBottom: '3px solid rgba(0,0,0,0.3)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 8px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
          }}>
            + HEAL ({injuredSoldiers.length})
          </div>
        </Html>
      )}
    </group>
  )
}
