/**
 * Collision group constants for Rapier physics.
 *
 * Group 0: Environment (ground, table edges, props)
 * Group 1: Soldiers (player + enemy)
 * Group 2: Wall blocks (destructible)
 *
 * Soldiers collide with environment + walls + OTHER soldiers.
 * Wall blocks collide with environment + soldiers + other blocks.
 */
import { interactionGroups } from '@react-three/rapier'

// Environment: collides with everything
export const GROUP_ENV = interactionGroups([0], [0, 1, 2])

// Soldiers: collide with environment + walls + other soldiers
export const GROUP_SOLDIER = interactionGroups([1], [0, 1, 2])

// Wall blocks: collide with environment + soldiers + other blocks
export const GROUP_WALL = interactionGroups([2], [0, 1, 2])
