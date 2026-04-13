/**
 * TrainingCampBuilding — the 3D training camp structure.
 *
 * Sprint 2, Phase B1. Replaces TrainingCampFootprint from Sprint 1.
 * Procedural toy aesthetic: wooden platform + tent canopy + flag.
 * Tappable — opens training sheet when idle.
 * Shows "+TRAIN" floating label when no training is active.
 */
import { useRef, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { CAMP_FOOTPRINT } from './campConstants'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { useSceneStore } from '@stores/sceneStore'
import { ProgressRing } from './ProgressRing'
import * as sfx from '@audio/sfx'

const { centerX, centerZ, halfW, halfD } = CAMP_FOOTPRINT

/** Wooden post colors */
const WOOD_DARK = 0x5a3416
const WOOD_LIGHT = 0x8b6b3d
const CANVAS_COLOR = 0xd4c4a0
const FLAG_COLOR = 0xcc3333
const PLATFORM_COLOR = 0xc4a56e

const DRAG_THRESHOLD = 6

export function TrainingCampBuilding() {
  const slots = useCampTrainingStore((s) => s.slots)
  const trainingPhase = useCampTrainingStore((s) => s.trainingPhase)
  const setTrainingSheetOpen = useSceneStore((s) => s.setTrainingSheetOpen)
  const setObservingSlotIndex = useSceneStore((s) => s.setObservingSlotIndex)
  const battlePhase = useSceneStore((s) => s.battlePhase)
  const tutorialActive = useSceneStore((s) => s.tutorialActive)
  const anySheetOpen = useSceneStore((s) =>
    s.trainingSheetOpen || s.storeSheetOpen || s.rosterSheetOpen ||
    s.soldierSheetId !== null || s.medicalSheetOpen
  )
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const flagRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  // Flag wave animation
  useFrame((state) => {
    if (flagRef.current) {
      flagRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 2) * 0.15
    }
  })

  const isIdle = trainingPhase === 'empty' || trainingPhase === 'selecting'

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
      if (isIdle) {
        setTrainingSheetOpen(true)
      } else {
        // If any slot is running, re-enter observation for the first running slot
        const runningIdx = slots.findIndex(s => s.trainingPhase === 'running')
        if (runningIdx !== -1) {
          sfx.buttonTap()
          setObservingSlotIndex(runningIdx)
        }
      }
    }
  }, [isIdle, setTrainingSheetOpen, setObservingSlotIndex, slots])

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
          position={[pos[0]!, pos[1]! + 0.75, pos[2]!]}
          castShadow
        >
          <cylinderGeometry args={[0.05, 0.06, 1.5, 8]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.7} />
        </mesh>
      ))}

      {/* Tent/awning canopy — two sloped planes */}
      <group position={[0, 1.5, 0]}>
        {/* Left slope */}
        <mesh position={[-0.6, 0.15, 0]} rotation-z={0.3} castShadow>
          <boxGeometry args={[halfW, 0.03, halfD * 1.6]} />
          <meshStandardMaterial
            color={CANVAS_COLOR}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Right slope */}
        <mesh position={[0.6, 0.15, 0]} rotation-z={-0.3} castShadow>
          <boxGeometry args={[halfW, 0.03, halfD * 1.6]} />
          <meshStandardMaterial
            color={CANVAS_COLOR}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Ridge beam */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.06, 0.06, halfD * 1.7]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
        </mesh>
      </group>

      {/* Flagpole + flag */}
      <group position={[halfW - 0.1, 0, -halfD + 0.1]}>
        {/* Pole */}
        <mesh position={[0, 1.2, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 2.4, 6]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
        </mesh>
        {/* Flag */}
        <mesh
          ref={flagRef}
          position={[0.2, 2.2, 0]}
          castShadow
        >
          <boxGeometry args={[0.4, 0.25, 0.01]} />
          <meshStandardMaterial color={FLAG_COLOR} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Cross-beam (front) */}
      <mesh position={[0, 0.6, -halfD + 0.1]} castShadow>
        <boxGeometry args={[halfW * 1.8, 0.06, 0.06]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>

      {/* Invisible click hitbox — bigger than visual for easy taps */}
      <mesh
        visible={false}
        position={[0, 0.8, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[halfW * 2.2, 2.0, halfD * 2.2]} />
        <meshBasicMaterial />
      </mesh>

      {/* "+TRAIN" floating label when idle — hidden during battle & tutorial */}
      {isIdle && battlePhase === 'idle' && !anySheetOpen && !tutorialActive && (
        <Html
          position={[0, 2.2, 0]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            background: hovered
              ? 'linear-gradient(180deg, #5a7a4a, #4a6a3a)'
              : 'linear-gradient(180deg, #3a4a3a, #2a3a2a)',
            color: hovered ? '#e0ecd0' : '#a0b090',
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
            + TRAIN
          </div>
        </Html>
      )}

      {/* Progress ring — visible during training */}
      <ProgressRing />
    </group>
  )
}
