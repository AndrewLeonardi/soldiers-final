/**
 * TrainingSpectacle — the ghost-plus-best training visualization.
 *
 * Sprint 2, Phase C1. Mounts in CampScene when training is running.
 * 25 GhostSoldier instances positioned within the CAMP_FOOTPRINT area.
 * 24 at opacity 0.18, champion at opacity 1.0.
 * Also renders 3 training targets (wooden stands).
 */
import { useMemo } from 'react'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { CAMP_FOOTPRINT } from './campConstants'
import { GhostSoldier } from './GhostSoldier'
import { TrainingTarget } from './TrainingTarget'
import { TRAINING_POP_SIZE } from './trainingConstants'

const GHOST_OPACITY = 0.18
const CHAMPION_OPACITY = 1.0

/** Map sim-space positions into camp footprint world-space */
function simToWorld(simX: number, simZ: number): { x: number; z: number } {
  // Sim coordinates are roughly -2..5 x, -3..3 z
  // Map into camp footprint area
  const scale = 0.4
  return {
    x: CAMP_FOOTPRINT.centerX + simX * scale,
    z: CAMP_FOOTPRINT.centerZ + simZ * scale,
  }
}

export function TrainingSpectacle() {
  const trainingPhase = useCampTrainingStore((s) => s.trainingPhase)
  const ghostSnapshots = useCampTrainingStore((s) => s.ghostSnapshots)
  const championIndex = useCampTrainingStore((s) => s.championIndex)
  const tickCounter = useCampTrainingStore((s) => s.tickCounter)

  // Training targets — fixed positions relative to camp footprint
  const targetPositions = useMemo(() => [
    { x: CAMP_FOOTPRINT.centerX + 1.5, z: CAMP_FOOTPRINT.centerZ - 0.8 },
    { x: CAMP_FOOTPRINT.centerX + 1.8, z: CAMP_FOOTPRINT.centerZ + 0.5 },
    { x: CAMP_FOOTPRINT.centerX + 1.2, z: CAMP_FOOTPRINT.centerZ + 1.2 },
  ], [])

  const isVisible = trainingPhase === 'running' || trainingPhase === 'graduated'
  if (!isVisible) return null

  return (
    <group>
      {/* Training targets */}
      {targetPositions.map((pos, i) => (
        <TrainingTarget key={`target-${i}`} x={pos.x} z={pos.z} />
      ))}

      {/* Ghost soldiers */}
      {ghostSnapshots.map((snap, i) => {
        if (i >= TRAINING_POP_SIZE) return null
        const isChampion = i === championIndex
        const world = simToWorld(snap.x, snap.z)
        return (
          <GhostSoldier
            key={`ghost-${i}`}
            x={world.x}
            z={world.z}
            rotation={snap.rotation}
            opacity={isChampion ? CHAMPION_OPACITY : GHOST_OPACITY}
            isChampion={isChampion}
            justFired={snap.justFired}
          />
        )
      })}
    </group>
  )
}
