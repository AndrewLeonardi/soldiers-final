/**
 * Collector — a small compute generator.
 *
 * Passive resource building. Phase 1a renders it as a destructible toy tank
 * with a green-glowing pipe on top. Phase 2+ wires in the actual compute
 * drip, cooldown timers, and "collect" interaction.
 *
 * Destructible like everything else; a rival that punches through the walls
 * can knock a collector offline and halt its drip.
 */
import type { MutableRefObject } from 'react'
import { CollectorDefense, type WallBlock } from '@three/models/Defenses'

interface CollectorProps {
  id: string
  position: [number, number, number]
  rotation?: number
  blocksRef: MutableRefObject<Map<string, WallBlock[]>>
  tableBounds?: { halfWidth: number; halfDepth: number }
}

export function Collector({
  id,
  position,
  rotation = 0,
  blocksRef,
  tableBounds,
}: CollectorProps) {
  return (
    <CollectorDefense
      position={position}
      rotation={rotation}
      wallBlocksRef={blocksRef}
      wallId={id}
      tableBounds={tableBounds}
    />
  )
}
