/**
 * Base Kitchen — the peaceful variant of the kitchen world.
 *
 * This is the ground the player's command base sits on. It reuses the exact
 * theme, ground, edges, and table frame from `kitchenWorld`, but ships with
 * an empty props array — no cereal boxes, mines, or syrup bottles. Level-01
 * clutter does not belong on a base.
 *
 * Consumed by `src/game/base/BaseScene.tsx` via `<WorldRenderer worldConfig={baseKitchenWorld} />`.
 */
import type { WorldConfig } from './types'

export const baseKitchenWorld: WorldConfig = {
  id: 'base-kitchen',
  name: 'Command Base — Kitchen Table',
  description: 'Your command base, perched on the breakfast table.',

  theme: {
    groundColor: 0xd2b48c,
    fogColor: 0xe8dcc8,
    fogNear: 20,
    fogFar: 40,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.6,
    sunColor: 0xffffff,
    sunIntensity: 1.2,
    sunPosition: [5, 12, 5],
    skyColor: 0x88bbdd,
  },

  ground: {
    size: [16, 12],
    // Flat visual mesh: units must sit cleanly on the surface here.
    // The combat worlds use bumpy visuals for terrain variation, but that
    // creates visible embedding because the physics collider is flat.
    // A base is the wrong place to pay that cosmetic cost.
    flat: true,
  },

  edges: [
    { side: 'front', open: false, wallHeight: 0.8 },
    { side: 'back', open: false, wallHeight: 0.8 },
    { side: 'left', open: false, wallHeight: 0.8 },
    { side: 'right', open: false, wallHeight: 0.8 },
  ],

  props: [],

  tableFrame: {
    color: 0x8B4513,
    thickness: 0.15,
  },
}
