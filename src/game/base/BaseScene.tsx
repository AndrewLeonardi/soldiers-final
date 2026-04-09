/**
 * BaseScene — everything rendered inside the <Canvas> + <Physics> tree.
 *
 * Composes the reusable WorldRenderer (ground, lighting, Rapier ground
 * collider, edges, table frame) with the base-specific pieces: camera
 * rig, placed buildings, placed walls, base squad, and — when BUILD
 * mode is active — the ghost placement preview, commit surface, and grid
 * overlay.
 *
 * Also hosts the Phase 3a training observation wiring:
 *   - When `observing` is set in the training store, derives a camera
 *     `observingTarget` from the associated Training Grounds building's
 *     world position and passes it to `BaseCameraRig` for the
 *     cinematic zoom-in.
 *   - Runs a useFrame that calls `trainingStore.tick(dt)` every frame
 *     a run is live, turning the headless GA into a visible spectacle.
 *     The tick is driven from the same frame loop that renders the
 *     scene, so there's no drift between sim state and render.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { WorldRenderer } from '@three/worlds/WorldRenderer'
import type { WallBlock } from '@three/models/Defenses'
import { baseKitchenWorld } from '@config/worlds/baseKitchen'
import { BaseCameraRig, type ObservingTarget } from './BaseCameraRig'
import { GhostPlacement } from './GhostPlacement'
import { PlacementSurface } from './PlacementSurface'
import { BuildGridOverlay } from './BuildGridOverlay'
import { BaseBuildings } from '@game/buildings/BaseBuildings'
import { BaseWalls } from '@game/buildings/BaseWalls'
import { BaseSquad } from '@game/soldiers/BaseSquad'
import { useBaseStore } from '@game/stores/baseStore'
import { useTrainingStore } from '@game/stores/trainingStore'

const [GROUND_W, GROUND_D] = baseKitchenWorld.ground.size
const TABLE_BOUNDS = {
  halfWidth: GROUND_W / 2,
  halfDepth: GROUND_D / 2,
} as const

/**
 * Camera observation envelope for a Training Grounds close shot. The
 * trainee sits at TG-local (+2.2, 0, 0) and the target at roughly
 * (+5.5, 0, 0), so the camera anchors on the midpoint of the parade
 * strip at (+3.85, 0.4, 0) with enough distance to frame both.
 */
const OBSERVE_MIN_DISTANCE = 6
const OBSERVE_MAX_DISTANCE = 10
const OBSERVE_STRIP_CENTER_OFFSET_X = 3.85

export function BaseScene() {
  const blocksRef = useRef<Map<string, WallBlock[]>>(new Map())
  const mode = useBaseStore((s) => s.mode)
  const brush = useBaseStore((s) => s.brush)
  const buildings = useBaseStore((s) => s.layout.buildings)

  const observing = useTrainingStore((s) => s.observing)

  const inBuildMode = mode === 'build'
  const brushActive = brush !== null

  // Derive the camera observation target from the observed slot's
  // associated building. Phase 3a hardcodes: the observed slot is
  // always the first Training Grounds building. Phase 3c will read a
  // `slotId → buildingId` map from the base store. The camera aims
  // at the CENTER of the parade strip (TG-local +3.85x) so both the
  // trainee and the target fit in frame at the default zoom.
  const observingTarget = useMemo<ObservingTarget | null>(() => {
    if (!observing) return null
    const tg = buildings.find((b) => b.kind === 'trainingGrounds')
    if (!tg) return null
    return {
      position: [
        tg.position[0] + OBSERVE_STRIP_CENTER_OFFSET_X,
        tg.position[1] + 0.4,
        tg.position[2],
      ],
      minDistance: OBSERVE_MIN_DISTANCE,
      maxDistance: OBSERVE_MAX_DISTANCE,
    }
  }, [observing, buildings])

  // Drive the GA loop from the render frame. The store's `tick()` is a
  // no-op when `live === null`, so this is cheap when nothing is
  // training — we don't gate the useFrame itself on the phase.
  useFrame((_, dt) => {
    useTrainingStore.getState().tick(dt)
  })

  return (
    <>
      <WorldRenderer worldConfig={baseKitchenWorld} />
      <BaseCameraRig brushActive={brushActive} observingTarget={observingTarget} />
      <BaseBuildings blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <BaseWalls blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <BaseSquad />

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
