/**
 * store — token pack catalog + daily economy constants.
 *
 * Production Sprint 2: daily simplified to one flat grant per 24h.
 * No streak, no escalation, no forgiveness math. One tap, one reward.
 *
 * Pack prices/values are intentionally unchanged in Sprint 2. Any pack
 * tuning waits for real Sprint-2 telemetry data and happens in Sprint 3.
 */

export type TokenPackTier = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface TokenPack {
  id: string
  name: string
  tokens: number
  price: string
  description: string
  tier: TokenPackTier
  /** Size of the TokenChip stack rendered on the pack tile (1/2/3/5/8). */
  stackCount: number
  featured?: boolean
}

export const TOKEN_PACKS: TokenPack[] = [
  { id: 'spark',    name: 'Spark',     tokens: 100,  price: '$0.99',  description: 'Train one basic weapon',    tier: 'common',    stackCount: 1 },
  { id: 'charge',   name: 'Charge',    tokens: 300,  price: '$2.99',  description: 'Skip two days of grinding', tier: 'rare',      stackCount: 2 },
  { id: 'surge',    name: 'Surge',     tokens: 600,  price: '$4.99',  description: 'Train a full soldier',      tier: 'epic',      stackCount: 3 },
  { id: 'arsenal',  name: 'Arsenal',   tokens: 1500, price: '$9.99',  description: 'Arm your entire squad',     tier: 'legendary', stackCount: 5, featured: true },
  { id: 'warchest', name: 'War Chest', tokens: 5000, price: '$24.99', description: 'Train your entire army',    tier: 'mythic',    stackCount: 8 },
]

// ── Daily grant (v14 — flat, no streak) ──

/** Tokens granted per daily claim. 150 = 2.5 minutes of training. */
export const DAILY_GRANT = 150

/** Cooldown between claims. 24h. */
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000
