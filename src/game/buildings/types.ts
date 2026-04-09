/**
 * Building types for the player's command base.
 *
 * A BuildingInstance is a lightweight descriptor — just enough to place a
 * destructible structure on the table. The heavy physics state (block list,
 * integrity, rubble) lives inside the `DestructibleDefense` components
 * themselves and is tracked through a shared `wallBlocksRef` map.
 *
 * The full persisted layout type (`BaseLayout`) lives in
 * `@game/stores/baseStore` alongside the store that owns it — single source
 * of truth for the shape that actually gets written to localStorage.
 */

export type BuildingKind = 'vault' | 'trainingGrounds' | 'collector'

export interface BuildingInstance {
  id: string
  kind: BuildingKind
  position: [number, number, number]
  /** Radians around the Y axis. 0 = default orientation. */
  rotation: number
}
