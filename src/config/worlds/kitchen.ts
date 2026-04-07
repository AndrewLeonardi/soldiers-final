/**
 * World 1: Kitchen Table
 *
 * Tutorial world. Teaches placement, knockback, edges, basic props.
 * Giant cereal boxes for cover, coffee mug that rolls, syrup bottle
 * that creates sticky zones, spoon catapult at the edge.
 */
import type { WorldConfig, BattleConfig } from './types'

export const kitchenWorld: WorldConfig = {
  id: 'kitchen',
  name: 'Kitchen Table',
  description: 'A breakfast battlefield among cereal boxes and coffee mugs.',

  theme: {
    groundColor: 0xd2b48c,       // warm tan (wood table)
    fogColor: 0xe8dcc8,
    fogNear: 20,
    fogFar: 40,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.6,
    sunColor: 0xffffff,
    sunIntensity: 1.2,
    sunPosition: [5, 12, 5],
    skyColor: 0x88bbdd,          // soft blue morning sky
  },

  ground: {
    size: [16, 12],               // 16 wide, 12 deep
  },

  edges: [
    { side: 'front', open: false, wallHeight: 0.8 },
    { side: 'back', open: false, wallHeight: 0.8 },
    { side: 'left', open: false, wallHeight: 0.8 },
    { side: 'right', open: false, wallHeight: 0.8 },
  ],

  props: [
    // Cereal box — tall destructible cover on the left side
    {
      id: 'cereal-1',
      type: 'cereal_box',
      position: [-2, 0, -1],
      tags: ['destructible'],
      health: 80,
    },
    // Second cereal box — offset for variety
    {
      id: 'cereal-2',
      type: 'cereal_box',
      position: [1, 0, 2],
      rotation: [0, 0.3, 0],
      tags: ['destructible'],
      health: 80,
    },
    // Coffee mug — knockable, will roll when hit by explosion
    {
      id: 'mug-1',
      type: 'coffee_mug',
      position: [3, 0, -2],
      tags: ['knockable'],
    },
    // Syrup bottle — breaks into sticky zone
    {
      id: 'syrup-1',
      type: 'syrup_bottle',
      position: [0, 0, 3],
      tags: ['sticky'],
      health: 40,
      params: { stickyRadius: 2.0 },
    },
  ],

  tableFrame: {
    color: 0x8B4513,             // saddle brown
    thickness: 0.15,
  },
}

// ── Battle 1-1: Breakfast Skirmish ─────────────────

export const kitchenBattle1: BattleConfig = {
  id: 'kitchen-1',
  worldId: 'kitchen',
  name: 'Breakfast Skirmish',
  description: 'Enemies march between the cereal boxes. Hold the line!',

  waves: [
    {
      delay: 1.0,
      enemies: [
        { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
      ],
    },
    {
      delay: 15.0,
      enemies: [
        { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'right' },
      ],
    },
  ],

  budget: 350,
  maxSoldiers: 4,

  placementZones: [
    {
      id: 'zone-left',
      position: [-5, 0, 0],
      size: [4, 8],
      label: 'Left flank',
    },
  ],

  stars: {
    one: { type: 'win', desc: 'Win the battle' },
    two: { type: 'no_losses', desc: 'No friendly casualties' },
    three: { type: 'edge_kills', threshold: 2, desc: 'Knock 2 enemies off the table' },
  },
}

// ── Battle 1-2: Syrup Trap ─────────────────────────

export const kitchenBattle2: BattleConfig = {
  id: 'kitchen-2',
  worldId: 'kitchen',
  name: 'Syrup Trap',
  description: 'The syrup bottle is ready to spill. Use it wisely.',

  waves: [
    {
      delay: 1.0,
      enemies: [
        { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
        { type: 'infantry', count: 2, weapon: 'rocketLauncher', spawnSide: 'right' },
      ],
    },
    {
      delay: 12.0,
      enemies: [
        { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'back' },
      ],
    },
    {
      delay: 25.0,
      enemies: [
        { type: 'jeep', count: 1, spawnSide: 'right' },
        { type: 'infantry', count: 2, weapon: 'grenade', spawnSide: 'right' },
      ],
    },
  ],

  budget: 450,
  maxSoldiers: 5,

  placementZones: [
    {
      id: 'zone-left',
      position: [-5, 0, 0],
      size: [4, 6],
      label: 'Main position',
    },
    {
      id: 'zone-center',
      position: [-1, 0, -3],
      size: [3, 3],
      label: 'Behind cereal box',
    },
  ],

  stars: {
    one: { type: 'win', desc: 'Win the battle' },
    two: { type: 'chain_reactions', threshold: 1, desc: 'Trigger a chain reaction' },
    three: { type: 'unit_limit', threshold: 2, desc: 'Win with only 2 soldiers' },
  },
}
