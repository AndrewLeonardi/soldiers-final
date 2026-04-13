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

// ── Gold packs (Sprint 2 — Store redesign) ──

export interface GoldPack {
  id: string
  name: string
  gold: number
  price: string
  featured?: boolean
}

export const GOLD_PACKS: readonly GoldPack[] = Object.freeze([
  { id: 'nugget',   name: 'Nugget',   gold: 200,  price: '$0.99' },
  { id: 'bar',      name: 'Gold Bar',  gold: 500,  price: '$2.99' },
  { id: 'ingot',    name: 'Ingot',     gold: 1200, price: '$4.99', featured: true },
  { id: 'treasury', name: 'Treasury',  gold: 5000, price: '$14.99' },
])

// ── Bundles: compute + gold + item combos ──

export interface StoreBundle {
  id: string
  name: string
  compute: number
  gold: number
  itemId?: string       // weapon or defense id to show 3D preview
  itemType?: 'weapon' | 'defense'
  price: string
  rarity: 'common' | 'uncommon' | 'rare' | 'epic'
  tagline: string
}

export const STORE_BUNDLES: readonly StoreBundle[] = Object.freeze([
  {
    id: 'recruit-kit',
    name: 'Recruit Kit',
    compute: 200,
    gold: 200,
    price: '$1.99',
    rarity: 'common',
    tagline: 'Everything a new soldier needs',
  },
  {
    id: 'rocket-pack',
    name: 'Rocket Pack',
    compute: 500,
    gold: 300,
    itemId: 'rocketLauncher',
    itemType: 'weapon',
    price: '$4.99',
    rarity: 'uncommon',
    tagline: 'Explosive training included',
  },
  {
    id: 'fortress-bundle',
    name: 'Fortress Bundle',
    compute: 400,
    gold: 800,
    itemId: 'tower',
    itemType: 'defense',
    price: '$6.99',
    rarity: 'rare',
    tagline: 'Build your stronghold',
  },
  {
    id: 'warlord-crate',
    name: 'Warlord Crate',
    compute: 1500,
    gold: 1500,
    itemId: 'machineGun',
    itemType: 'weapon',
    price: '$14.99',
    rarity: 'epic',
    tagline: 'The ultimate arsenal',
  },
])
