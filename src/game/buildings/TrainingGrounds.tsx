/**
 * Training Grounds — the Training HQ building on the garrison half of the base.
 *
 * Phase 3b: training no longer renders adjacent to this building. The
 * TrainingGroundsInterior parade strip is gone — training happens in the
 * permanent BaseTrainingZone on the right half of the base (rendered by
 * BaseScene directly). This building is purely a tap target and visual
 * marker: "this is your Training HQ."
 *
 * Tap flow (VIEW mode):
 *   - slot is idle      → open the Training Selection Sheet
 *   - slot is running   → zoom in to observe the training zone
 *   - slot is observing → (already zoomed in; no-op)
 *   - slot is graduated → GraduationCutscene auto-shows; no tap needed
 */
import type { MutableRefObject } from 'react'
import { TrainingGroundsDefense, type WallBlock } from '@three/models/Defenses'
import { useBaseStore } from '@game/stores/baseStore'
import { useTrainingStore, PHASE_3A_SLOT_ID } from '@game/stores/trainingStore'

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
  // Only the first Training Grounds building owns the Phase 3a slot.
  const firstTrainingGroundsId = useBaseStore(
    (s) => s.layout.buildings.find((b) => b.kind === 'trainingGrounds')?.id,
  )
  const ownsPhase3ASlot = firstTrainingGroundsId === id

  const inViewMode = useBaseStore((s) => s.mode === 'view')
  const slotPhase = useTrainingStore((s) => s.slots[PHASE_3A_SLOT_ID]?.phase ?? 'idle')

  const handlePointerUp = (e: { stopPropagation: () => void }) => {
    if (!inViewMode || !ownsPhase3ASlot) return
    e.stopPropagation()

    const store = useTrainingStore.getState()

    if (slotPhase === 'idle') {
      store.openTrainingSheet()
    } else if (slotPhase === 'running') {
      store.startObserving(PHASE_3A_SLOT_ID)
    }
    // graduated: GraduationCutscene handles it; observing: already zoomed in.
  }

  return (
    <group onPointerUp={handlePointerUp}>
      <TrainingGroundsDefense
        position={position}
        rotation={rotation}
        wallBlocksRef={blocksRef}
        wallId={id}
        tableBounds={tableBounds}
      />
    </group>
  )
}
