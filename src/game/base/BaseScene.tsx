/**
 * BaseScene — everything rendered inside the <Canvas> + <Physics> tree.
 *
 * Composes the reusable WorldRenderer (ground, lighting, Rapier ground
 * collider, edges, table frame) with the base-specific pieces: camera
 * rig, placed buildings, placed walls, starter squad, and — when BUILD
 * mode is active — the ghost placement preview, commit surface, and grid
 * overlay.
 */
import { useRef } from 'react'
import { WorldRenderer } from '@three/worlds/WorldRenderer'
import type { WallBlock } from '@three/models/Defenses'
import { baseKitchenWorld } from '@config/worlds/baseKitchen'
import { BaseCameraRig } from './BaseCameraRig'
import { GhostPlacement } from './GhostPlacement'
import { PlacementSurface } from './PlacementSurface'
import { BuildGridOverlay } from './BuildGridOverlay'
import { BaseBuildings } from '@game/buildings/BaseBuildings'
import { BaseWalls } from '@game/buildings/BaseWalls'
import { StarterSquad } from '@game/soldiers/StarterSquad'
import { useBaseStore } from '@game/stores/baseStore'

const [GROUND_W, GROUND_D] = baseKitchenWorld.ground.size
const TABLE_BOUNDS = {
  halfWidth: GROUND_W / 2,
  halfDepth: GROUND_D / 2,
} as const

export function BaseScene() {
  const blocksRef = useRef<Map<string, WallBlock[]>>(new Map())
  const mode = useBaseStore((s) => s.mode)
  const brush = useBaseStore((s) => s.brush)

  const inBuildMode = mode === 'build'
  const brushActive = brush !== null

  return (
    <>
      <WorldRenderer worldConfig={baseKitchenWorld} />
      <BaseCameraRig brushActive={brushActive} />
      <BaseBuildings blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <BaseWalls blocksRef={blocksRef} tableBounds={TABLE_BOUNDS} />
      <StarterSquad />

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
