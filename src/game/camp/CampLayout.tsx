/**
 * CampLayout — the hardcoded starter base layout for sprint 1.
 *
 * Perimeter of walls, two corner towers, one stretch of barbed wire,
 * and a training-camp footprint (sandy patch + wooden posts — no
 * interactive contents until sprint 2).
 *
 * Editable placement is a sprint 3 problem. This is a fixed diorama.
 */
import {
  WallDefense,
  WatchTower,
  BarbedWireDefense,
  type WallBlock,
} from '@three/models/Defenses'
import { TABLE_BOUNDS } from './campConstants'
import { TrainingCampBuilding } from './TrainingCampBuilding'

interface CampLayoutProps {
  wallBlocksRef: React.MutableRefObject<Map<string, WallBlock[]>>
}

export function CampLayout({ wallBlocksRef }: CampLayoutProps) {

  return (
    <group>
      {/* ── Perimeter walls ── */}
      {/* North wall */}
      <WallDefense
        position={[0, 0, -5]}
        wallBlocksRef={wallBlocksRef}
        wallId="wall-north"
        tableBounds={TABLE_BOUNDS}
      />
      {/* South wall */}
      <WallDefense
        position={[0, 0, 5]}
        wallBlocksRef={wallBlocksRef}
        wallId="wall-south"
        tableBounds={TABLE_BOUNDS}
      />
      {/* East wall segment */}
      <WallDefense
        position={[6, 0, 0]}
        rotation={Math.PI / 2}
        wallBlocksRef={wallBlocksRef}
        wallId="wall-east"
        tableBounds={TABLE_BOUNDS}
      />
      {/* West wall segment */}
      <WallDefense
        position={[-6, 0, 0]}
        rotation={Math.PI / 2}
        wallBlocksRef={wallBlocksRef}
        wallId="wall-west"
        tableBounds={TABLE_BOUNDS}
      />

      {/* ── Corner towers ── */}
      <WatchTower
        position={[6, 0, -5]}
        wallBlocksRef={wallBlocksRef}
        wallId="tower-ne"
        tableBounds={TABLE_BOUNDS}
      />
      <WatchTower
        position={[-6, 0, -5]}
        wallBlocksRef={wallBlocksRef}
        wallId="tower-nw"
        tableBounds={TABLE_BOUNDS}
      />

      {/* ── Barbed wire stretch ── */}
      <BarbedWireDefense
        position={[3, 0, 3]}
        wallBlocksRef={wallBlocksRef}
        wallId="wire-south-1"
        tableBounds={TABLE_BOUNDS}
      />

      {/* ── Training camp building (Sprint 2) ── */}
      <TrainingCampBuilding />
    </group>
  )
}

/** Expose wallBlocksRef for the test grenade system */
export { type WallBlock }
