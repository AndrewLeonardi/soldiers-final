/**
 * World 2: Workshop Bench
 *
 * Intermediate world. Teaches prop chains, elevation, faster enemies.
 * Dark metal bench with harsh overhead lighting. Industrial feel.
 * Jeeps appear (fast flankers). Tanks in Battle 2-2.
 */
import type { WorldConfig, BattleConfig } from './types'

export const workshopWorld: WorldConfig = {
  id: 'workshop',
  name: 'Workshop Bench',
  description: 'A cluttered workbench with heavy tools and scattered hardware.',

  theme: {
    groundColor: 0x555566,       // steel gray metal bench
    fogColor: 0x2a2a3a,
    fogNear: 16,
    fogFar: 35,
    ambientColor: 0x8899aa,
    ambientIntensity: 0.3,       // dim — harsh shadows
    sunColor: 0xffffff,
    sunIntensity: 1.8,           // bright overhead lamp
    sunPosition: [0, 15, 0],     // directly above (workshop lamp)
    skyColor: 0x1a1a2a,          // dark ceiling
  },

  ground: {
    size: [14, 10],               // smaller, tighter battles
  },

  edges: [
    { side: 'front', open: false, wallHeight: 0.6 },
    { side: 'back', open: false, wallHeight: 0.6 },
    { side: 'left', open: false, wallHeight: 0.6 },
    { side: 'right', open: false, wallHeight: 0.6 },
  ],

  props: [
    // Tape measure — flat cover/wall
    {
      id: 'tape-1',
      type: 'tape_measure',
      position: [-1, 0, -1],
      tags: ['destructible'],
      health: 120,
    },
    // Hammer — heavy knockable prop
    {
      id: 'hammer-1',
      type: 'hammer',
      position: [2, 0, 1],
      tags: ['knockable'],
    },
    // Nuts and bolts scatter — small debris cluster
    {
      id: 'nuts-1',
      type: 'nuts_bolts',
      position: [0, 0, 2.5],
      tags: ['knockable'],
    },
    {
      id: 'nuts-2',
      type: 'nuts_bolts',
      position: [3, 0, -1.5],
      tags: ['knockable'],
    },
    // Wood block — elevated platform for height advantage
    {
      id: 'block-1',
      type: 'wood_block',
      position: [-3, 0, 0],
      tags: [],
    },
    // Mine for chain reaction fun
    {
      id: 'mine-w1',
      type: 'mine',
      position: [1, 0, -2],
      tags: ['explosive'],
      params: { blastRadius: 3.5, blastForce: 9.0 },
    },
  ],

  tableFrame: {
    color: 0x444455,             // dark steel
    thickness: 0.2,
  },
}

// ── Battle 2-1: Nuts and Bolts ─────────────────────

export const workshopBattle1: BattleConfig = {
  id: 'workshop-1',
  worldId: 'workshop',
  name: 'Nuts and Bolts',
  description: 'Jeeps are fast and flank around walls. Adapt or lose.',

  waves: [
    {
      delay: 1.0,
      enemies: [
        { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
      ],
    },
    {
      delay: 12.0,
      enemies: [
        { type: 'infantry', count: 2, weapon: 'rifle', spawnSide: 'right' },
        { type: 'jeep', count: 1, spawnSide: 'right' },
      ],
    },
    {
      delay: 22.0,
      enemies: [
        { type: 'jeep', count: 2, spawnSide: 'right' },
        { type: 'infantry', count: 2, weapon: 'rocketLauncher', spawnSide: 'right' },
      ],
    },
  ],

  budget: 400,
  maxSoldiers: 4,

  placementZones: [
    {
      id: 'zone-left',
      position: [-4, 0, 0],
      size: [4, 7],
      label: 'Behind cover',
    },
  ],

  stars: {
    one: { type: 'win', desc: 'Win the battle' },
    two: { type: 'no_losses', desc: 'No friendly casualties' },
    three: { type: 'time_limit', threshold: 45, desc: 'Win in under 45 seconds' },
  },
}

// ── Battle 2-2: Hammer Time ────────────────────────

export const workshopBattle2: BattleConfig = {
  id: 'workshop-2',
  worldId: 'workshop',
  name: 'Hammer Time',
  description: 'Tanks roll in. The hammer is your secret weapon.',

  waves: [
    {
      delay: 1.0,
      enemies: [
        { type: 'infantry', count: 4, weapon: 'rifle', spawnSide: 'right' },
      ],
    },
    {
      delay: 14.0,
      enemies: [
        { type: 'infantry', count: 2, weapon: 'rocketLauncher', spawnSide: 'right' },
        { type: 'jeep', count: 1, spawnSide: 'back' },
      ],
    },
    {
      delay: 28.0,
      enemies: [
        { type: 'tank', count: 1, spawnSide: 'right' },
        { type: 'infantry', count: 3, weapon: 'rifle', spawnSide: 'right' },
      ],
    },
  ],

  budget: 500,
  maxSoldiers: 5,

  placementZones: [
    {
      id: 'zone-left',
      position: [-4, 0, 0],
      size: [3, 6],
      label: 'Main position',
    },
    {
      id: 'zone-platform',
      position: [-3, 0.8, 0],
      size: [2, 2],
      label: 'On wood block',
    },
  ],

  stars: {
    one: { type: 'win', desc: 'Win the battle' },
    two: { type: 'edge_kills', threshold: 3, desc: 'Knock 3 enemies off the bench' },
    three: { type: 'unit_limit', threshold: 3, desc: 'Win with 3 or fewer soldiers' },
  },
}
