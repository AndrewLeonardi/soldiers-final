/**
 * campConstants — frozen layout constants for the base camp diorama.
 *
 * Sprint 1, Subsystem 1. Every camp subsystem imports from here.
 * BASE_HALF defines the playable footprint; CAMP_FOOTPRINT defines
 * the training camp area (empty in sprint 1, filled in sprint 2).
 */

/** Half-width and half-depth of the tabletop ground (matches /physics-test) */
export const BASE_HALF_W = 8
export const BASE_HALF_D = 6

/** Table bounds object for DestructibleDefense compatibility */
export const TABLE_BOUNDS = Object.freeze({
  halfWidth: BASE_HALF_W,
  halfDepth: BASE_HALF_D,
})

/**
 * Training camp footprint — a reserved rectangular area on the base.
 * In sprint 1 this is just a visual marker (sandy patch + wooden posts).
 * Sprint 2 fills it with the training spectacle.
 */
export const CAMP_FOOTPRINT = Object.freeze({
  centerX: -3,
  centerZ: -2.5,
  halfW: 2.5,
  halfD: 2,
})

/**
 * Spawn bounds for ambient soldiers — slightly inset from the table edge
 * so soldiers don't wander off the edge immediately.
 */
export const SOLDIER_BOUNDS = Object.freeze({
  halfW: BASE_HALF_W - 1.5,
  halfD: BASE_HALF_D - 1.5,
})

/** Number of ambient soldiers to spawn at boot */
export const AMBIENT_SOLDIER_COUNT = 8
