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
export const DAILY_DRIP_MAX_DAYS = 3
export const DAILY_DRIP_INTERVAL_MS = 24 * 60 * 60 * 1000
