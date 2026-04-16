/**
 * purchase — token pack purchase seam.
 *
 * Sprint 1 contract (this file): looks up the pack, grants its tokens
 * locally. Same behavior as the pre-refactor direct-`addTokens()` call in
 * StoreSheet. The value of this file in Sprint 1 is the *call shape* — a
 * single function that Sprint 3 replaces with a Stripe Checkout redirect.
 *
 * Sprint 3 will:
 *   - call the `checkout-create` Edge Function
 *   - redirect to the returned Stripe URL
 *   - handle the return flow via `?purchase=success&session_id=...`
 *   - poll `purchase-status` until the webhook credits tokens
 *   - trigger the token-arrival ceremony when the credit lands
 *
 * See production-plan.md, Subsystems 1.4 and 3.5.
 */

import { TOKEN_PACKS } from '@config/store'
import { useCampStore } from '@stores/campStore'

export interface PurchaseResult {
  /** Tokens actually granted. In Sprint 1 this is synchronous. */
  granted: number
  packId: string
}

export class UnknownPackError extends Error {
  constructor(packId: string) {
    super(`Unknown token pack: ${packId}`)
    this.name = 'UnknownPackError'
  }
}

/**
 * Purchase a token pack by id. Sprint 1 grants immediately with no payment.
 * Sprint 3 replaces this with a Stripe Checkout redirect.
 */
export async function purchasePack(packId: string): Promise<PurchaseResult> {
  const pack = TOKEN_PACKS.find(p => p.id === packId)
  if (!pack) throw new UnknownPackError(packId)

  // Sprint 1: grant immediately. The `reason` tag threads through the
  // mutation wrapper so Sprint 3 telemetry/sync can attribute this credit
  // to a purchase rather than a battle reward or daily claim.
  useCampStore.getState().addTokens(pack.tokens, { reason: 'purchase' })

  return { granted: pack.tokens, packId }
}

/**
 * Grant the one-time free starter pack. Separate from `purchasePack` because
 * it's not a paid transaction — just a promo tied to a milestone.
 */
export function grantStarterPack(): PurchaseResult {
  const amount = 500
  useCampStore.getState().addTokens(amount, { reason: 'starter-pack' })
  useCampStore.getState().setStarterPackShown()
  return { granted: amount, packId: 'starter' }
}
