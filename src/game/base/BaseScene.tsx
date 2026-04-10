/**
 * BaseScene — everything rendered inside the <Canvas> + <Physics> tree.
 *
 * Composes the reusable WorldRenderer (ground, lighting, Rapier ground
 * collider, edges, table frame) with the base-specific pieces: camera
 * rig, placed buildings, placed walls, base squad, fence, props, the
 * permanent training zone, and — when BUILD mode is active — the ghost
 * placement preview, commit surface, and grid overlay.
 *
 * Phase 3b training wiring:
 *   - BaseTrainingZone renders permanently on the right half of the
 *     base. It receives all non-idle slots and renders the appropriate
 *     TraineeSoldier + TargetCan inside each active training lane.
 *   - When `observing` is set, the camera zooms to the training zone
 *     center (world [+5, 0.4, 0]) — NOT the Training Grounds building
 *     position, since training now happens in the zone.
 *   - useFrame drives trainingStore.tick(dt) every frame; the store is
 *     a no-op when nothing is live, so this is always cheap.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { WorldRenderer } from '@three/worlds/WorldRenderer'
import type { WallBlock } from '@three/models/Defenses'
import { baseKitchenWorld } from '@config/worlds/baseKitchen'
import { BaseCameraRig, type ObservingTarget } from './BaseCameraRig'
import { BaseFence } from './BaseFence'
import { BaseProps } from './BaseProps'
import { GhostPlacement } from './GhostPlacement'
import { PlacementSurface } from './PlacementSurface'
import { BuildGridOverlay } from './BuildGridOverlay'
import { BaseBuildings } from '@game/buildings/BaseBuildings'
import { BaseWalls } from '@game/buildings/BaseWalls'
import { BaseSquad } from '@game/soldiers/BaseSquad'
import { BaseTrainingZone } from '@game/training/BaseTrainingZone'
import { useBaseStore } from '@game/stores/baseStore'
import { useTrainingStore } from '@game/stores/trainingStore'
import type { ActiveSlot } from '@game/training/BaseTrainingZone'

const [GROUND_W, GROUND_D] = baseKitchenWorld.ground.size
const TABLE_BOUNDS = {
  halfWidth: GROUND_W / 2,
  halfDepth: GROUND_D / 2,
} as const

/**
 * The training zone group is anchored at world [+5, 0, 0] in BaseTrainingZone.
 * Observation zoom targets the midpoint between the firing line (x=+3) and
 * the target stands (x=+8.5) — zone-local x=+0.75 → world x=+5.75, close
 * enough to call the zone center at [+5, 0.4, 0] for the camera anchor.
 */
const OBSERVE_ZONE_CENTER: [number, number, number] = [5, 0.4, 0]
const OBSERVE_MIN_DISTANCE = 8
const OBSERVE_MAX_DISTANCE = 16

export function BaseScene() {
  const blocksRef = useRef<Map<string, WallBlock[]>>(new Map())
  const mode = useBaseStore((s) => s.mode)
  const brush = useBaseStore((s) => s.brush)

  const observing  = useTrainingStore((s) => s.observing)
  const slots      = useTrainingStore((s) => s.slots)

  const inBuildMode = mode === 'build'
  const brushActive = brush !== null

  // Collect all non-idle slots for BaseTrainingZone.
  const activeSlots = useMemo<ActiveSlot[]>(
    () =>
      Object.entries(slots)
        .filter(([, slot]) => slot.phase !== 'idle')
        .map(([id, slot]) => ({
          slotId: id,
          phase: slot.phase,
          weapon: slot.weapon,
        })),
    [slots],
  )

  // Observation zoom always targets the training zone, not the building.
  const observingTarget = useMemo<ObservingTarget | null>(() => {
    if (!observing) return null
    return {
      position: OBSERVE_ZONE_CENTER,
      minDistance: OBSERVE_MIN_DISTANCE,
      maxDistance: OBSERVE_MAX_DISTANCE,
    }
  }, [observing])

  // Drive the GA loop from the render frame. No-op when nothing is live.
  useFrame((_, dt) => {
    useTrainingStore.getState().tick(dt)
  })

  return (
    <>
      <WorldRenderer worldConfig={baseKitchenWorld} />
      <BaseCameraRig brushActive={brushActive} observingTarget={observingTarget} />
      <BaseFence />
      <BaseProps />
      <BaseBuildings blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <BaseWalls blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <BaseSquad />
      <BaseTrainingZone slots={activeSlots} />

      {inBuildMode && (
        <>
          <BuildGridOverlay tableBounds={TABLE_BOUNDS} />
          <GhostPlacement tableBounds={TABLE_BOUNDS} />
          {brushActive && <PlacementSurface tableBounds={TABLE_BOUNDS} />}
        </>
      )}
    </>
  )
}
