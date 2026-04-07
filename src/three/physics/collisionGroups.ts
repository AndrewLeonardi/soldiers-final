/**
 * Collision group constants for Rapier physics.
 *
 * Group 0: Environment (ground, table edges, static scenery)
 * Group 1: Soldiers (player + enemy)
 * Group 2: Wall blocks (destructible player walls)
 * Group 3: Interactive props (knockable mugs, explosive barrels, etc.)
 *
 * Soldiers collide with everything.
 * Props collide with everything (they're physics objects in the world).
 * Wall blocks collide with everything.
 */
import { interactionGroups } from '@react-three/rapier'

// Environment (ground, borders): collides with all groups
export const GROUP_ENV = interactionGroups([0], [0, 1, 2, 3])

// Soldiers: collide with environment + soldiers + walls + props
export const GROUP_SOLDIER = interactionGroups([1], [0, 1, 2, 3])

// Wall blocks (destructible): collide with environment + soldiers + walls + props
export const GROUP_WALL = interactionGroups([2], [0, 1, 2, 3])

// Interactive props (knockable, rollable, explosive): collide with everything
export const GROUP_PROP = interactionGroups([3], [0, 1, 2, 3])
