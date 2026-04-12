/**
 * battleThemes — visual theme definitions for procedural enemy bases.
 *
 * Sprint 8. Each theme defines colors, decorations, and loading screen
 * styling for a range of levels. Pure data — no rendering logic here.
 */

export interface ThemeDecoration {
  type: string
  count: number
  scaleRange: [number, number]
  colorVariants: number[]
}

export interface BattleTheme {
  id: string
  name: string
  /** Hex color for the floating island platform */
  groundColor: number
  /** Hex color for the island underbelly / edges */
  edgeColor: number
  /** Decorations to scatter on the diorama island */
  decorations: ThemeDecoration[]
  /** Loading screen gradient [top, bottom] as hex */
  bgGradient: [number, number]
  /** Loading screen accent color (text, borders) */
  accentColor: number
  /** Optional tint for the battle ground during fighting */
  battleGroundTint?: number
  /** Optional fog color override during battle */
  fogColor?: number
}

// ── Theme Definitions ───────────────────────────────────────────

const GARDEN: BattleTheme = {
  id: 'garden',
  name: 'Garden',
  groundColor: 0x4a8c3f,
  edgeColor: 0x6b4226,
  decorations: [
    { type: 'flower', count: 5, scaleRange: [0.6, 1.2], colorVariants: [0xff88aa, 0xffdd44, 0xffffff, 0xff6688, 0xffaa33] },
    { type: 'rock', count: 3, scaleRange: [0.4, 0.9], colorVariants: [0x888888, 0x8b7355, 0x999999] },
    { type: 'grass_tuft', count: 4, scaleRange: [0.5, 1.0], colorVariants: [0x3d8b37, 0x4a9a42, 0x2d7a2d] },
  ],
  bgGradient: [0x2d5a1e, 0x1a3a10],
  accentColor: 0x88cc66,
}

const DESERT: BattleTheme = {
  id: 'desert',
  name: 'Desert',
  groundColor: 0xc4a265,
  edgeColor: 0x8b6b3d,
  decorations: [
    { type: 'cactus', count: 3, scaleRange: [0.7, 1.3], colorVariants: [0x2d6b2d, 0x3a7a3a] },
    { type: 'rock', count: 4, scaleRange: [0.5, 1.0], colorVariants: [0xb8956a, 0xc4a265, 0x9a7a50] },
    { type: 'skull', count: 1, scaleRange: [0.3, 0.5], colorVariants: [0xe8e0d0, 0xddd5c5] },
  ],
  bgGradient: [0x8b6b3d, 0x4a3520],
  accentColor: 0xdda855,
  battleGroundTint: 0xd4b88c,
}

const ARCTIC: BattleTheme = {
  id: 'arctic',
  name: 'Arctic',
  groundColor: 0xe8eef5,
  edgeColor: 0x8899aa,
  decorations: [
    { type: 'snowpile', count: 4, scaleRange: [0.5, 1.1], colorVariants: [0xeef4ff, 0xdde8f5, 0xffffff] },
    { type: 'ice_crystal', count: 3, scaleRange: [0.4, 0.8], colorVariants: [0x88ccff, 0x66aaee, 0xaaddff] },
    { type: 'pine_stump', count: 2, scaleRange: [0.5, 0.9], colorVariants: [0x5a3416, 0x6b4226] },
  ],
  bgGradient: [0x3a5577, 0x1a2a3a],
  accentColor: 0x88ccff,
  battleGroundTint: 0xdde8f0,
  fogColor: 0xc8d8e8,
}

const VOLCANIC: BattleTheme = {
  id: 'volcanic',
  name: 'Volcanic',
  groundColor: 0x3a2a2a,
  edgeColor: 0x2a1a1a,
  decorations: [
    { type: 'lava_rock', count: 4, scaleRange: [0.5, 1.0], colorVariants: [0x4a3030, 0x5a3535, 0x3a2525] },
    { type: 'smoke_vent', count: 2, scaleRange: [0.4, 0.7], colorVariants: [0x666666, 0x555555] },
    { type: 'ember', count: 3, scaleRange: [0.2, 0.4], colorVariants: [0xff4400, 0xff6600, 0xffaa00] },
  ],
  bgGradient: [0x4a1a0a, 0x1a0a05],
  accentColor: 0xff6644,
  battleGroundTint: 0x8a7060,
  fogColor: 0x6a5040,
}

const JUNGLE: BattleTheme = {
  id: 'jungle',
  name: 'Jungle',
  groundColor: 0x2d5a2d,
  edgeColor: 0x3a2a1a,
  decorations: [
    { type: 'fern', count: 4, scaleRange: [0.6, 1.2], colorVariants: [0x2d7a2d, 0x3a8a3a, 0x1d6a1d] },
    { type: 'mushroom', count: 3, scaleRange: [0.3, 0.7], colorVariants: [0xcc4444, 0xdd6644, 0xffaa44] },
    { type: 'vine', count: 2, scaleRange: [0.5, 1.0], colorVariants: [0x3a7a2d, 0x4a8a3a] },
  ],
  bgGradient: [0x1a3a1a, 0x0a1a0a],
  accentColor: 0x66cc44,
  fogColor: 0x4a6a3a,
}

// ── Registry ────────────────────────────────────────────────────

const THEMES: Record<string, BattleTheme> = {
  garden: GARDEN,
  desert: DESERT,
  arctic: ARCTIC,
  volcanic: VOLCANIC,
  jungle: JUNGLE,
}

const THEME_RANGES: { maxLevel: number; themeId: string }[] = [
  { maxLevel: 20, themeId: 'garden' },
  { maxLevel: 40, themeId: 'desert' },
  { maxLevel: 60, themeId: 'arctic' },
  { maxLevel: 80, themeId: 'volcanic' },
  { maxLevel: Infinity, themeId: 'jungle' },
]

export function getTheme(themeId: string): BattleTheme {
  return THEMES[themeId] ?? GARDEN
}

export function getThemeForLevel(level: number): BattleTheme {
  for (const range of THEME_RANGES) {
    if (level <= range.maxLevel) return THEMES[range.themeId] ?? GARDEN
  }
  return GARDEN
}
