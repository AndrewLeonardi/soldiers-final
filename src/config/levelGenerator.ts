/**
 * levelGenerator — deterministic procedural level generator.
 *
 * Sprint 8. Produces CampBattleConfig objects from a level number.
 * No Math.random() — all values derived arithmetically from the level
 * number so the same level always produces the same config.
 *
 * Levels 1-3 return the exact legacy configs for backward compatibility.
 */
import { CAMP_BATTLES, type CampBattleConfig, type CampWave, type CampStarCriteria } from './campBattles'
import { getThemeForLevel } from './battleThemes'
import type { EnemyType, WeaponType } from './types'

// ── Seeded PRNG ─────────────────────────────────────────────────

/** Simple mulberry32 PRNG — deterministic from a 32-bit seed */
function mulberry32(seed: number) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Name Pools ──────────────────────────────────────────────────

const GARDEN_NAMES = [
  'Garden Patrol', 'Flower Field', 'Green Advance', 'Petal Push',
  'Hedge Assault', 'Rose Front', 'Sprout Skirmish', 'Bloom Raid',
  'Meadow March', 'Thorn Defense', 'Vine Clash', 'Daisy Chain',
  'Tulip Trench', 'Moss Ambush', 'Clover Strike', 'Ivy Offense',
  'Fern Fury', 'Pollen Storm', 'Root Rally', 'Leaf Sweep',
]

const DESERT_NAMES = [
  'Sand Sweep', 'Dune Assault', 'Scorched March', 'Mirage Strike',
  'Dust Storm', 'Oasis Raid', 'Canyon Clash', 'Sun Burn',
  'Cactus Outpost', 'Dry Gulch', 'Sandstone Siege', 'Heat Wave',
  'Vulture Pass', 'Salt Flats', 'Bedrock Push', 'Rattler Ambush',
  'Mesa Rally', 'Tumbleweed Charge', 'Bone Yard', 'Scorpion Sting',
]

const ARCTIC_NAMES = [
  'Frost Front', 'Ice Assault', 'Frozen March', 'Blizzard Raid',
  'Glacier Push', 'Snowdrift Strike', 'Tundra Clash', 'Hail Storm',
  'Permafrost Siege', 'Crystal Cave', 'Polar Advance', 'Whiteout',
  'Avalanche Run', 'Iceberg Outpost', 'Frostbite Fury', 'Sleet Sweep',
  'Cold Snap', 'Flurry Ambush', 'Rime Charge', 'Winter Wrath',
]

const VOLCANIC_NAMES = [
  'Magma March', 'Lava Flow', 'Eruption Raid', 'Cinder Strike',
  'Ash Storm', 'Caldera Clash', 'Inferno Push', 'Molten Siege',
  'Crater Assault', 'Smoke Signal', 'Obsidian Outpost', 'Flame Front',
  'Sulfur Ambush', 'Pyroclast', 'Scorch Sweep', 'Heat Sink',
  'Basalt Charge', 'Ember Rally', 'Fire Walk', 'Smolder Storm',
]

const JUNGLE_NAMES = [
  'Jungle Raid', 'Canopy Clash', 'Vine Ambush', 'Fern Fury',
  'Root Assault', 'Swamp March', 'Monsoon Strike', 'Thicket Push',
  'Bamboo Siege', 'Moss Outpost', 'Treetop Assault', 'Humid Front',
  'Orchid Offensive', 'Mudslide Run', 'Parrot Patrol', 'Fog Sweep',
  'Creek Crossing', 'Undergrowth', 'Spore Storm', 'Canopy Crawl',
]

const NAME_POOLS: Record<string, string[]> = {
  garden: GARDEN_NAMES,
  desert: DESERT_NAMES,
  arctic: ARCTIC_NAMES,
  volcanic: VOLCANIC_NAMES,
  jungle: JUNGLE_NAMES,
}

const DESCRIPTIONS: string[] = [
  'Enemy scouts spotted. Engage and eliminate!',
  'Hostiles incoming. Hold your ground!',
  'They\'re dug in. Push through!',
  'Multiple contacts. Stay sharp!',
  'Heavy resistance ahead. Advance carefully!',
  'Surrounded! Fight your way out!',
  'Reinforcements arriving. Prepare for waves!',
  'Last stand. Give everything you\'ve got!',
  'Ambush position. Strike fast!',
  'Full-scale assault. Overwhelm them!',
]

// ── Weapon Rewards ──────────────────────────────────────────────

/** Milestone levels that unlock specific weapons */
const WEAPON_MILESTONES: Record<number, WeaponType> = {
  1: 'rocketLauncher',
  2: 'grenade',
  3: 'machineGun',
  5: 'tank',
}

// ── Generator ───────────────────────────────────────────────────

function generateName(level: number, themeId: string, rng: () => number): string {
  const pool = NAME_POOLS[themeId] ?? GARDEN_NAMES
  const idx = Math.floor(rng() * pool.length)
  return pool[idx] ?? 'Skirmish'
}

function generateDescription(level: number, rng: () => number): string {
  const idx = Math.floor(rng() * DESCRIPTIONS.length)
  return DESCRIPTIONS[idx] ?? 'Engage the enemy!'
}

function getEnemyTypes(level: number): EnemyType[] {
  const types: EnemyType[] = ['infantry']
  if (level >= 6) types.push('jeep')
  if (level >= 20) types.push('tank')
  return types
}

function getEnemyWeapons(level: number): WeaponType[] {
  const weapons: WeaponType[] = ['rifle']
  if (level >= 8) weapons.push('rocketLauncher')
  if (level >= 14) weapons.push('grenade')
  if (level >= 22) weapons.push('machineGun')
  return weapons
}

const SPAWN_SIDES = ['right', 'left', 'back'] as const

function generateWaves(level: number, rng: () => number): CampWave[] {
  const waveCount = Math.min(1 + Math.floor(level / 5), 5)
  const totalEnemies = Math.min(3 + Math.floor(level * 0.8), 20)
  const enemyTypes = getEnemyTypes(level)
  const enemyWeapons = getEnemyWeapons(level)
  const waves: CampWave[] = []

  // Distribute enemies across waves (front-loaded slightly)
  const perWave: number[] = []
  let remaining = totalEnemies
  for (let w = 0; w < waveCount; w++) {
    const isLast = w === waveCount - 1
    const share = isLast ? remaining : Math.max(2, Math.ceil(remaining / (waveCount - w) + (rng() - 0.5) * 2))
    const count = Math.min(share, remaining)
    perWave.push(count)
    remaining -= count
  }

  for (let w = 0; w < waveCount; w++) {
    const delay = w === 0 ? 2.0 : 2.0 + w * (8 + level * 0.3)
    const count = perWave[w] ?? 2
    const side = SPAWN_SIDES[Math.floor(rng() * SPAWN_SIDES.length)] ?? 'right'

    // Pick enemy type — mostly infantry, sprinkle in vehicles
    const type: EnemyType = (level >= 6 && rng() > 0.7)
      ? enemyTypes[Math.floor(rng() * enemyTypes.length)] ?? 'infantry'
      : 'infantry'

    // Pick weapon for infantry
    const weapon: WeaponType = (type === 'infantry')
      ? enemyWeapons[Math.floor(rng() * enemyWeapons.length)] ?? 'rifle'
      : 'rifle'

    // Split into sub-groups for variety (large waves get 2 spawn sides)
    if (count > 5 && rng() > 0.4) {
      const half = Math.ceil(count / 2)
      const side2 = SPAWN_SIDES[Math.floor(rng() * SPAWN_SIDES.length)] ?? 'left'
      waves.push({
        delay,
        enemies: [
          { type, count: half, weapon, spawnSide: side },
          { type: 'infantry', count: count - half, weapon: 'rifle', spawnSide: side2 },
        ],
      })
    } else {
      waves.push({
        delay,
        enemies: [{ type, count, weapon, spawnSide: side }],
      })
    }
  }

  return waves
}

function generateStars(level: number): { one: CampStarCriteria; two: CampStarCriteria; three: CampStarCriteria } {
  const timeThreshold = Math.floor(25 + level * 3)
  return {
    one: { type: 'win', desc: 'Win the battle' },
    two: { type: 'no_losses', desc: 'No friendly casualties' },
    three: { type: 'time_limit', threshold: timeThreshold, desc: `Win in under ${timeThreshold} seconds` },
  }
}

// ── Public API ───────────────────────────────────────────────────

/**
 * Generate a single level config. Deterministic — same level number
 * always produces the same config.
 *
 * Levels 1-3 return the exact legacy configs for backward compatibility
 * with existing `battlesCompleted` keys.
 */
export function generateLevel(level: number): CampBattleConfig {
  // Legacy levels — exact backward compat
  if (level >= 1 && level <= 3) {
    const legacy = CAMP_BATTLES[level - 1]
    if (legacy) {
      return { ...legacy, level, themeId: 'garden' }
    }
  }

  const theme = getThemeForLevel(level)
  const rng = mulberry32(level * 2654435761) // golden ratio hash for good distribution

  const name = generateName(level, theme.id, rng)
  const description = generateDescription(level, rng)
  const waves = generateWaves(level, rng)
  const totalEnemies = waves.reduce((s, w) => s + w.enemies.reduce((se, e) => se + e.count, 0), 0)

  return {
    id: `camp-${level}`,
    name,
    description,
    level,
    themeId: theme.id,
    waves,
    reward: Math.floor(30 + level * 15),
    goldReward: Math.floor(20 + level * 10),
    maxSoldiers: Math.min(3 + Math.floor(level / 3), 10),
    stars: generateStars(level),
    weaponReward: WEAPON_MILESTONES[level],
    requires: level > 1 ? `camp-${level - 1}` : undefined,
  }
}

/**
 * Get a slice of levels. Used by the battle picker for pagination.
 */
export function getLevels(start: number, count: number): CampBattleConfig[] {
  const levels: CampBattleConfig[] = []
  for (let i = start; i < start + count; i++) {
    if (i < 1) continue
    levels.push(generateLevel(i))
  }
  return levels
}

/**
 * Get the highest level the player can access (completed + 1).
 */
export function getMaxAccessibleLevel(battlesCompleted: Record<string, { stars: number }>): number {
  let max = 1
  for (let i = 1; i <= 100; i++) {
    if (battlesCompleted[`camp-${i}`]) {
      max = i + 1
    } else {
      break
    }
  }
  return max
}
