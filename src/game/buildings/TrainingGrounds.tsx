/**
 * Training Grounds — the physical home of the game's entire business model.
 *
 * This building IS the training arena. When active, the GA evolves neural net
 * brains inside its walls and the player can zoom in to watch. Phase 1a is
 * static scaffolding; Phase 3 wires in the real GA and spectacle rendering.
 *
 * Destructible like everything else. When a rival knocks it below 30%
 * integrity, training pauses until the player repairs it (Phase 5+).
 */
import type { MutableRefObject } from 'react'
import { TrainingGroundsDefense, type WallBlock } from '@three/models/Defenses'

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
  return (
    <TrainingGroundsDefense
      position={position}
      rotation={rotation}
      wallBlocksRef={blocksRef}
      wallId={id}
      tableBounds={tableBounds}
    />
  )
}
