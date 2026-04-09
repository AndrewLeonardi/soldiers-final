/**
 * Training Grounds — the physical home of the game's entire business model.
 *
 * This building IS the training arena. When active, the GA evolves neural net
 * brains inside its walls and the player can zoom in to watch. Phase 3a wires
 * in the visible spectacle: when the player taps the building in VIEW mode,
 * the store transitions to observing, and `TrainingGroundsInterior` renders
 * the parade disk + trainee + target can as children of a local-space group
 * anchored to this building's world position.
 *
 * Destructible like everything else. When a rival knocks it below 30%
 * integrity, training pauses until the player repairs it (Phase 5+).
 *
 * ─ Slot mapping (Phase 3a) ─
 *
 * Phase 3a has exactly one training slot — `slot-rocket-ace` — and exactly
 * one Training Grounds building at any given time. Mapping the slot to this
 * building is trivially "always." When Phase 3c adds multi-trainee support,
 * the base store will gain a `slotId` field on `BuildingInstance` and this
 * wrapper will read it from there. Until then, every TrainingGrounds tap
 * observes the single seeded slot.
 */
import type { MutableRefObject } from 'react'
import { TrainingGroundsDefense, type WallBlock } from '@three/models/Defenses'
import { useBaseStore } from '@game/stores/baseStore'
import { useTrainingStore } from '@game/stores/trainingStore'
import { TrainingGroundsInterior } from '@game/training/TrainingGroundsInterior'

/** Phase 3a's single training slot. 3c generalizes. */
const PHASE_3A_SLOT_ID = 'slot-rocket-ace'
const PHASE_3A_WEAPON = 'rocketLauncher' as const

interface TrainingGroundsProps {
  id: string
  position: [number, number, number]
  rotation?: number
  blocksRef: MutableRefObject<Map<string, WallBlock[]>>
  tableBounds?: { halfWidth: number; halfDepth: number }
}

export function TrainingGrounds({
  id,
  position,
  rotation = 0,
  blocksRef,
  tableBounds,
}: TrainingGroundsProps) {
  // Only render the interior when the player is actively observing the
  // Phase 3a slot. Selecting narrowly means the subscription only
  // re-runs this wrapper when observation starts or stops, not on
  // every slot field change.
  const isObserving = useTrainingStore((s) => s.observing === PHASE_3A_SLOT_ID)

  // Phase 3a has exactly one slot, and that slot is bound to "the
  // first Training Grounds building in the base layout." If the
  // player has built multiple TG buildings in the editor (only
  // possible in dev hand-testing right now), only the first one owns
  // the slot and renders the interior. 3c replaces this with a
  // persistent `slotId → buildingId` mapping on the base store.
  const firstTrainingGroundsId = useBaseStore(
    (s) => s.layout.buildings.find((b) => b.kind === 'trainingGrounds')?.id,
  )
  const ownsPhase3ASlot = firstTrainingGroundsId === id

  // Only allow tap-to-observe when the player is in VIEW mode and
  // this is the slot-owning building. In BUILD mode the pointer is
  // already committed to the drag-to-place flow, and we don't want a
  // tap on the Training Grounds to accidentally start observing
  // while the player is trying to drop a wall next to it.
  const inViewMode = useBaseStore((s) => s.mode === 'view')

  const handlePointerUp = (e: { stopPropagation: () => void }) => {
    if (!inViewMode || !ownsPhase3ASlot) return
    e.stopPropagation()
    useTrainingStore.getState().startObserving(PHASE_3A_SLOT_ID)
  }

  return (
    <group>
      {/*
       * The destructible block pile. Wrapped in its own group so the
       * pointer-up listener only picks up taps on the building's own
       * geometry, not on the interior (which lives in a separate group
       * below that intentionally doesn't stopPropagation).
       */}
      <group onPointerUp={handlePointerUp}>
        <TrainingGroundsDefense
          position={position}
          rotation={rotation}
          wallBlocksRef={blocksRef}
          wallId={id}
          tableBounds={tableBounds}
        />
      </group>

      {isObserving && ownsPhase3ASlot && (
        <group position={position} rotation={[0, rotation, 0]}>
          <TrainingGroundsInterior
            slotId={PHASE_3A_SLOT_ID}
            weapon={PHASE_3A_WEAPON}
          />
        </group>
      )}
    </group>
  )
}
