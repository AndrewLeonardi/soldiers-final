/**
 * purchase — token pack purchase via Stripe Checkout.
 *
 * Production Sprint 3.
 *
 * Flow:
 *   1. Client calls `purchasePack(packId)` from StoreSheet.
 *   2. We hit the `checkout-create` Edge Function which returns a Stripe
 *      Checkout URL.
 *   3. Browser redirects to Stripe. User pays.
 *   4. On success, Stripe redirects back to `/camp?purchase=success&session_id=...`
 *      and fires the `checkout.session.completed` webhook in parallel.
 *   5. `pollPurchaseStatus()` polls the `purchase-status` Edge Function
 *      until the row flips to 'completed', then the UI plays the
 *      token-arrival ceremony (and `sync.hydrateFromServer()` pulls the
 *      new balance).
 *
 * Offline behavior: if Supabase is not configured, `purchasePack` falls
 * back to the Sprint 1 grant-locally path — tokens arrive instantly with
 * no real payment. This is the single switch that flips Sprint 3 on or off.
 *
 * See production-plan.md Subsystem 3.5.
 */

import { TOKEN_PACKS } from '@config/store'
import { useCampStore } from '@stores/campStore'
import { getSupabase, isSupabaseEnabled } from './supabase'

export interface PurchaseResult {
  /** Was a checkout started (real mode) or tokens granted (offline mode)? */
  mode: 'stripe' | 'offline'
  /** Only set in offline mode. */
  granted?: number
  packId: string
}

export class UnknownPackError extends Error {
  constructor(packId: string) {
    super(`Unknown token pack: ${packId}`)
    this.name = 'UnknownPackError'
  }
}

/**
 * Start a purchase. In Supabase-configured mode, opens Stripe Checkout
 * (redirects the browser). In offline mode, grants tokens instantly.
 */
export async function purchasePack(packId: string): Promise<PurchaseResult> {
  const pack = TOKEN_PACKS.find(p => p.id === packId)
  if (!pack) throw new UnknownPackError(packId)

  if (!isSupabaseEnabled()) {
    // Offline / dev mode: Sprint 1 behavior — grant immediately.
    useCampStore.getState().addTokens(pack.tokens, { reason: 'purchase-offline' })
    return { mode: 'offline', granted: pack.tokens, packId }
  }

  const supabase = getSupabase()
  if (!supabase) {
    useCampStore.getState().addTokens(pack.tokens, { reason: 'purchase-offline' })
    return { mode: 'offline', granted: pack.tokens, packId }
  }

  // Real Stripe flow. Ask the Edge Function for a checkout URL.
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const successUrl = `${origin}/camp?purchase=success&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${origin}/camp?purchase=cancelled`

  const { data, error } = await supabase.functions.invoke('checkout-create', {
    body: { packId, successUrl, cancelUrl },
  })

  if (error || !data?.url) {
    // eslint-disable-next-line no-console
    console.warn('[purchase] checkout-create failed, falling back to offline:', error)
    useCampStore.getState().addTokens(pack.tokens, { reason: 'purchase-fallback' })
    return { mode: 'offline', granted: pack.tokens, packId }
  }

  // Redirect the browser to Stripe. The user will return to /camp?purchase=success.
  if (typeof window !== 'undefined') {
    window.location.href = data.url
  }
  return { mode: 'stripe', packId }
}

/**
 * Grant the one-time free starter pack. Bypasses Stripe entirely — it's
 * a promo, not a real transaction.
 */
export function grantStarterPack(): PurchaseResult {
  const amount = 500
  useCampStore.getState().addTokens(amount, { reason: 'starter-pack' })
  useCampStore.getState().setStarterPackShown()
  return { mode: 'offline', granted: amount, packId: 'starter' }
}

// ── Return-from-Stripe flow ────────────────────────────────────────────
// After the user pays and redirects back, CampPage calls this to poll
// the webhook-updated purchases row and surface the token-arrival event.

export interface PollResult {
  status: 'pending' | 'completed' | 'refunded' | 'failed' | 'unknown' | 'timeout'
  tokensGranted?: number
  packId?: string
}

/**
 * Poll the purchase-status Edge Function until the row flips to completed
 * (webhook finalized) or we time out. Typically completes in ~1-3s.
 */
export async function pollPurchaseStatus(sessionId: string, opts?: { timeoutMs?: number; intervalMs?: number }): Promise<PollResult> {
  const supabase = getSupabase()
  if (!supabase) return { status: 'unknown' }

  const timeoutMs = opts?.timeoutMs ?? 12_000
  const intervalMs = opts?.intervalMs ?? 1_000
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    const { data, error } = await supabase.functions.invoke('purchase-status', {
      body: { sessionId },
    })
    if (!error && data?.status === 'completed') {
      return { status: 'completed', tokensGranted: data.tokensGranted, packId: data.packId }
    }
    if (!error && (data?.status === 'refunded' || data?.status === 'failed')) {
      return { status: data.status, tokensGranted: data.tokensGranted, packId: data.packId }
    }
    await new Promise(r => setTimeout(r, intervalMs))
  }
  return { status: 'timeout' }
}
