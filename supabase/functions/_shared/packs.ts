/**
 * packs.ts — SERVER-SIDE pack catalog. The source of truth for prices.
 *
 * The client-side TOKEN_PACKS in `src/config/store.ts` is for rendering
 * only. All purchase validation happens against THIS file via the Edge
 * Functions. Never trust client-sent prices.
 *
 * Each pack maps to a Stripe price_id — set these after creating the
 * matching Stripe Products in your Stripe dashboard. The `price_id` is
 * what Stripe accepts; `display_price` is only here so webhook logs make
 * sense to humans.
 */

export interface ServerPack {
  id: string
  name: string
  tokens: number
  price_id: string       // Stripe price id (price_xxx)
  display_price: string  // human-readable, for logs
}

// Populate price_id values after running `stripe products create` for each
// pack. Use `stripe prices list` to grab the ids. Keep tokens in sync with
// src/config/store.ts.
export const SERVER_PACKS: Record<string, ServerPack> = {
  spark: {
    id: 'spark',
    name: 'Spark',
    tokens: 100,
    price_id: Deno.env.get('STRIPE_PRICE_SPARK') ?? '',
    display_price: '$0.99',
  },
  charge: {
    id: 'charge',
    name: 'Charge',
    tokens: 300,
    price_id: Deno.env.get('STRIPE_PRICE_CHARGE') ?? '',
    display_price: '$2.99',
  },
  surge: {
    id: 'surge',
    name: 'Surge',
    tokens: 600,
    price_id: Deno.env.get('STRIPE_PRICE_SURGE') ?? '',
    display_price: '$4.99',
  },
  arsenal: {
    id: 'arsenal',
    name: 'Arsenal',
    tokens: 1500,
    price_id: Deno.env.get('STRIPE_PRICE_ARSENAL') ?? '',
    display_price: '$9.99',
  },
  warchest: {
    id: 'warchest',
    name: 'War Chest',
    tokens: 5000,
    price_id: Deno.env.get('STRIPE_PRICE_WARCHEST') ?? '',
    display_price: '$24.99',
  },
}

export function getPack(id: string): ServerPack | null {
  return SERVER_PACKS[id] ?? null
}
