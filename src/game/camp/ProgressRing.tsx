/**
 * ProgressRing — world-space arc ring showing training timer progress.
 *
 * Sprint 2→3. Mounted above the training camp building.
 * Renders one ring per active training slot, stacked vertically.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import type { TrainingSlot } from '@stores/campTrainingStore'

const RING_RADIUS = 1.2
const RING_TUBE = 0.06
const SEGMENTS = 64
const VERTICAL_SPACING = 0.6

function SlotRing({ slot, yOffset }: { slot: TrainingSlot; yOffset: number }) {
  const ringRef = useRef<THREE.Mesh>(null!)

  const progress = slot.timerTotal > 0 ? Math.min(slot.timerElapsed / slot.timerTotal, 1) : 0
  const remaining = Math.max(0, slot.timerTotal - slot.timerElapsed)
  const tierColor = '#00e5ff'

  const arcGeometry = useMemo(() => {
    const arcAngle = progress * Math.PI * 2
    if (arcAngle < 0.01) {
      return new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, SEGMENTS, 0.01)
    }
    return new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, SEGMENTS, arcAngle)
  }, [progress])

  useFrame(() => {
    if (ringRef.current) {
      ringRef.current.rotation.z = -Math.PI / 2
    }
  })

  return (
    <group position={[0, 2.8 + yOffset, 0]}>
      {/* Background ring (dim) */}
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RING_RADIUS, RING_TUBE * 0.6, 8, SEGMENTS]} />
        <meshBasicMaterial color={tierColor} transparent opacity={0.15} />
      </mesh>

      {/* Progress arc */}
      <mesh ref={ringRef} rotation-x={-Math.PI / 2} geometry={arcGeometry}>
        <meshBasicMaterial color={tierColor} transparent opacity={0.9} />
      </mesh>

      {/* Timer countdown + stats */}
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          textAlign: 'center',
          fontFamily: "'Black Ops One', monospace",
          userSelect: 'none',
        }}>
          <div style={{
            color: tierColor,
            fontSize: 14,
            letterSpacing: 2,
            textShadow: `0 0 8px ${tierColor}40`,
          }}>
            {remaining.toFixed(1)}s
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 8,
            letterSpacing: 1,
            marginTop: 1,
            whiteSpace: 'nowrap',
          }}>
            {slot.slotSoldierName ?? ''} | GEN {slot.generation} | {(slot.bestFitness * 100).toFixed(0)}%
          </div>
        </div>
      </Html>
    </group>
  )
}

export function ProgressRing() {
  const slots = useCampTrainingStore((s) => s.slots)

  const activeSlots = slots.filter(s =>
    s.trainingPhase === 'running' || s.trainingPhase === 'graduated',
  )

  if (activeSlots.length === 0) return null

  return (
    <group>
      {activeSlots.map((slot, i) => (
        <SlotRing
          key={`ring-${i}`}
          slot={slot}
          yOffset={i * VERTICAL_SPACING}
        />
      ))}
    </group>
  )
}
