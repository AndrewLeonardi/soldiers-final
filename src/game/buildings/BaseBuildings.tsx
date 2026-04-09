/**
 * BaseBuildings — renders the player's persisted building layout.
 *
 * Reads `layout.buildings` from `useBaseStore` and dispatches each
 * instance to the appropriate thin wrapper (Vault / TrainingGrounds /
 * Collector). This is what replaced the hardcoded `StarterBuildings` from
 * Phase 1a — buildings now live in a persisted store, seeded with the
 * same starter layout so visual parity is preserved on first load.
 */
import type { MutableRefObject } from 'react'
import type { WallBlock } from '@three/models/Defenses'
import { useBaseStore } from '@game/stores/baseStore'
import { Vault } from './Vault'
import { TrainingGrounds } from './TrainingGrounds'
import { Collector } from './Collector'

interface BaseBuildingsProps {
  blocksRef: MutableRefObject<Map<string, WallBlock[]>>
  tableBounds: { halfWidth: number; halfDepth: number }
}

export function BaseBuildings({ blocksRef, tableBounds }: BaseBuildingsProps) {
  const buildings = useBaseStore((s) => s.layout.buildings)

  return (
    <>
      {buildings.map((b) => {
        const common = {
          id: b.id,
          position: b.position,
          rotation: b.rotation,
          blocksRef,
          tableBounds,
        }
        switch (b.kind) {
          case 'vault':
            return <Vault key={b.id} {...common} />
          case 'trainingGrounds':
            return <TrainingGrounds key={b.id} {...common} />
          case 'collector':
            return <Collector key={b.id} {...common} />
        }
      })}
    </>
  )
}
