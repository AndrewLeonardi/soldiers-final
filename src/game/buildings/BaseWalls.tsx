/**
 * BaseWalls — renders the player's persisted wall placements.
 *
 * Reads `layout.walls` from `useBaseStore` and renders each wall via the
 * existing `WallDefense` component. Walls use the exact same destructible
 * block system as buildings — they're just a different `DefenseStyle`.
 */
import type { MutableRefObject } from 'react'
import { WallDefense, type WallBlock } from '@three/models/Defenses'
import { useBaseStore } from '@game/stores/baseStore'

interface BaseWallsProps {
  blocksRef: MutableRefObject<Map<string, WallBlock[]>>
  tableBounds: { halfWidth: number; halfDepth: number }
}

export function BaseWalls({ blocksRef, tableBounds }: BaseWallsProps) {
  const walls = useBaseStore((s) => s.layout.walls)

  return (
    <>
      {walls.map((w) => (
        <WallDefense
          key={w.id}
          position={w.position}
          rotation={w.rotation}
          wallBlocksRef={blocksRef}
          wallId={w.id}
          tableBounds={tableBounds}
        />
      ))}
    </>
  )
}
