/**
 * TrainingSpectacle — the ghost-plus-best training visualization.
 *
 * Sprint 2→3. Mounts in CampScene when any training slot is running.
 * Iterates all slots — each slot's ghosts are offset spatially.
 * 24 at opacity 0.18, champion at opacity 1.0 per slot.
 * Also renders 3 training targets per slot.
 */
import { useMemo } from 'react'
import { useCampTrainingStore } from '@stores/campTrainingStore'
import { CAMP_FOOTPRINT } from './campConstants'
import { GhostSoldier } from './GhostSoldier'
import { TrainingTarget } from './TrainingTarget'
import { TRAINING_POP_SIZE } from './trainingConstants'

const GHOST_OPACITY = 0.18
const CHAMPION_OPACITY = 1.0

// Spatial offsets per slot so parallel trainings don't overlap
const SLOT_OFFSETS = [
  { x: 0, z: 0 },      // Slot 0 — centered
  { x: -3.5, z: 0 },   // Slot 1 — left
  { x: 3.5, z: 0 },    // Slot 2 — right
]

/** Map sim-space positions into camp footprint world-space with slot offset */
function simToWorld(simX: number, simZ: number, slotOffset: { x: number; z: number }): { x: number; z: number } {
  const scale = 0.4
  return {
    x: CAMP_FOOTPRINT.centerX + simX * scale + slotOffset.x,
    z: CAMP_FOOTPRINT.centerZ + simZ * scale + slotOffset.z,
  }
}

export function TrainingSpectacle() {
  const slots = useCampTrainingStore((s) => s.slots)

  // Training targets — fixed positions relative to camp footprint + slot offset
  const baseTargetOffsets = useMemo(() => [
    { x: 1.5, z: -0.8 },
    { x: 1.8, z: 0.5 },
    { x: 1.2, z: 1.2 },
  ], [])

  // Only render slots that are running or graduated
  const activeSlots = slots.filter(s =>
    s.trainingPhase === 'running' || s.trainingPhase === 'graduated',
  )

  if (activeSlots.length === 0) return null

  return (
    <group>
      {slots.map((slot, slotIndex) => {
        if (slot.trainingPhase !== 'running' && slot.trainingPhase !== 'graduated') return null
        const offset = SLOT_OFFSETS[slotIndex] ?? SLOT_OFFSETS[0]!

        return (
          <group key={`slot-${slotIndex}`}>
            {/* Training targets for this slot */}
            {baseTargetOffsets.map((tOff, i) => (
              <TrainingTarget
                key={`target-${slotIndex}-${i}`}
                x={CAMP_FOOTPRINT.centerX + tOff.x + offset.x}
                z={CAMP_FOOTPRINT.centerZ + tOff.z + offset.z}
              />
            ))}

            {/* Ghost soldiers for this slot */}
            {slot.ghostSnapshots.map((snap, i) => {
              if (i >= TRAINING_POP_SIZE) return null
              const isChampion = i === slot.championIndex
              const world = simToWorld(snap.x, snap.z, offset)
              return (
                <GhostSoldier
                  key={`ghost-${slotIndex}-${i}`}
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
      })}
    </group>
  )
}
