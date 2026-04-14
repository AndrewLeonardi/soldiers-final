export interface ComputePack {
  id: string
  name: string
  compute: number
  price: string
  description: string
  featured?: boolean
}

export const COMPUTE_PACKS: ComputePack[] = [
  { id: 'spark',    name: 'Spark',     compute: 100,  price: '$0.99',  description: 'Train one basic weapon' },
  { id: 'charge',   name: 'Charge',    compute: 300,  price: '$2.99',  description: 'Skip two days of grinding' },
  { id: 'surge',    name: 'Surge',     compute: 600,  price: '$4.99',  description: 'Train a full soldier' },
  { id: 'arsenal',  name: 'Arsenal',   compute: 1500, price: '$9.99',  description: 'Arm your entire squad', featured: true },
  { id: 'warchest', name: 'War Chest', compute: 5000, price: '$24.99', description: 'Train your entire army' },
]

export const DAILY_DRIP_AMOUNT = 50
export const DAILY_GOLD_DRIP_AMOUNT = 50
export const DAILY_DRIP_MAX_DAYS = 3
export const DAILY_DRIP_INTERVAL_MS = 24 * 60 * 60 * 1000

// ── Daily streak rewards (Sprint Economy) ──

export interface DailyStreakReward {
  day: number
  compute: number
  gold: number
  label: string
  isJackpot?: boolean
}

export const DAILY_STREAK_REWARDS: readonly DailyStreakReward[] = Object.freeze([
  { day: 1, compute: 30,  gold: 0,  label: '30' },
  { day: 2, compute: 40,  gold: 0,  label: '40' },
  { day: 3, compute: 50,  gold: 0,  label: '50' },
  { day: 4, compute: 50,  gold: 25, label: '50 + 25g' },
  { day: 5, compute: 75,  gold: 0,  label: '75' },
  { day: 6, compute: 100, gold: 0,  label: '100' },
  { day: 7, compute: 200, gold: 50, label: '200', isJackpot: true },
])

/** Miss tolerance: streak resets after this many consecutive missed days */
export const DAILY_STREAK_FORGIVENESS = 2

