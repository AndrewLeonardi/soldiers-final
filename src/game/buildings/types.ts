/**
 * Building types for the player's command base.
 *
 * A BuildingInstance is a lightweight descriptor — just enough to place a
 * destructible structure on the table. The heavy physics state (block list,
 * integrity, rubble) lives inside the `DestructibleDefense` components
 * themselves and is tracked through a shared `wallBlocksRef` map.
 *
 * Phase 1a uses a hardcoded starter layout. Phase 2 will replace that with
 * a player-editable, persisted layout.
 */

export type BuildingKind = 'vault' | 'trainingGrounds' | 'collector'

export interface BuildingInstance {
  id: string
  kind: BuildingKind
  position: [number, number, number]
  /** Radians around the Y axis. 0 = default orientation. */
  rotation: number
}

export interface BaseLayout {
  buildings: BuildingInstance[]
  // Walls, turrets, decorations, etc. land in later phases.
}
