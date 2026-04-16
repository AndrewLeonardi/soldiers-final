export type TokenPackTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface TokenPack {
  id: string
  name: string
  tokens: number
  price: string
  description: string
  tier: TokenPackTier
  chipCount: number      // visual chip pile size on the tile
  featured?: boolean
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: 'spark',    name: 'Spark',     tokens: 100,  price: '$0.99',  description: 'Train one basic weapon',    tier: 'common',    chipCount: 1 },
  { id: 'charge',   name: 'Charge',    tokens: 300,  price: '$2.99',  description: 'Skip two days of grinding', tier: 'rare',      chipCount: 3 },
  { id: 'surge',    name: 'Surge',     tokens: 600,  price: '$4.99',  description: 'Train a full soldier',      tier: 'epic',      chipCount: 5 },
  { id: 'arsenal',  name: 'Arsenal',   tokens: 1500, price: '$9.99',  description: 'Arm your entire squad',     tier: 'legendary', chipCount: 7, featured: true },
  { id: 'warchest', name: 'War Chest', tokens: 5000, price: '$24.99', description: 'Train your entire army',    tier: 'mythic',    chipCount: 9 },
]

export const DAILY_DRIP_AMOUNT = 50
export const DAILY_DRIP_MAX_DAYS = 3
export const DAILY_DRIP_INTERVAL_MS = 24 * 60 * 60 * 1000

// ── Daily streak rewards (Sprint Economy) ──

export interface DailyStreakReward {
  day: number
  tokens: number
  label: string
  isJackpot?: boolean
}

export const DAILY_STREAK_REWARDS: readonly DailyStreakReward[] = Object.freeze([
  { day: 1, tokens: 30,  label: '30' },
  { day: 2, tokens: 40,  label: '40' },
  { day: 3, tokens: 50,  label: '50' },
  { day: 4, tokens: 75,  label: '75' },
  { day: 5, tokens: 100, label: '100' },
  { day: 6, tokens: 150, label: '150' },
  { day: 7, tokens: 250, label: '250', isJackpot: true },
])

/** Miss tolerance: streak resets after this many consecutive missed days */
export const DAILY_STREAK_FORGIVENESS = 2
