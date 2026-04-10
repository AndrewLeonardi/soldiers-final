/**
 * ProgressRing — world-space arc ring showing training timer progress.
 *
 * Sprint 2, Phase B2. Mounted above the training camp building.
 * Partial arc fills 0→2π as timer progresses.
 * Color from tier config. Timer countdown text via Html.
 * Only visible when trainingPhase === 'running'.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { COMPUTE_TIERS } from './trainingConstants'

const RING_RADIUS = 1.2
const RING_TUBE = 0.06
const SEGMENTS = 64

export function ProgressRing() {
  const trainingPhase = useCampTrainingStore((s) => s.trainingPhase)
  const timerTotal = useCampTrainingStore((s) => s.timerTotal)
  const timerElapsed = useCampTrainingStore((s) => s.timerElapsed)
  const computeTier = useCampTrainingStore((s) => s.computeTier)
  const generation = useCampTrainingStore((s) => s.generation)
  const bestFitness = useCampTrainingStore((s) => s.bestFitness)

  const ringRef = useRef<THREE.Mesh>(null!)

  const isVisible = trainingPhase === 'running' || trainingPhase === 'graduated'
  const progress = timerTotal > 0 ? Math.min(timerElapsed / timerTotal, 1) : 0
  const remaining = Math.max(0, timerTotal - timerElapsed)
  const tierConfig = COMPUTE_TIERS[computeTier - 1]
  const tierColor = tierConfig?.color ?? '#00e5ff'

  // Create arc geometry based on progress
  const arcGeometry = useMemo(() => {
    const arcAngle = progress * Math.PI * 2
    if (arcAngle < 0.01) {
      return new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, SEGMENTS, 0.01)
    }
    return new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, SEGMENTS, arcAngle)
  }, [progress])

  // Slowly rotate the ring
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = -Math.PI / 2 // Start from top
    }
  })

  if (!isVisible) return null

  return (
    <group position={[0, 2.8, 0]}>
      {/* Background ring (dim) */}
      <mesh rotation-x={-Math.PI / 2}>
        <torusGeometry args={[RING_RADIUS, RING_TUBE * 0.6, 8, SEGMENTS]} />
        <meshBasicMaterial color={tierColor} transparent opacity={0.15} />
      </mesh>

      {/* Progress arc */}
      <mesh
        ref={ringRef}
        rotation-x={-Math.PI / 2}
        geometry={arcGeometry}
      >
        <meshBasicMaterial color={tierColor} transparent opacity={0.9} />
      </mesh>

      {/* Timer countdown + stats */}
      <Html center style={{ pointerEvents: 'none' }}>
        <div style={{
          textAlign: 'center',
          fontFamily: "'Black Ops One', monospace",
          userSelect: 'none',
        }}>
          {/* Timer */}
          <div style={{
            color: tierColor,
            fontSize: 18,
            letterSpacing: 2,
            textShadow: `0 0 8px ${tierColor}40`,
          }}>
            {remaining.toFixed(1)}s
          </div>
          {/* Gen + fitness */}
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 9,
            letterSpacing: 1,
            marginTop: 2,
          }}>
            GEN {generation} | FIT {(bestFitness * 100).toFixed(0)}%
          </div>
        </div>
      </Html>
    </group>
  )
}
