/**
 * checkout-create — Edge Function.
 *
 * Creates a Stripe Checkout Session for a token pack purchase.
 * Inserts a 'pending' purchases row so the webhook can finalize it
 * idempotently via stripe_session_id.
 *
 * POST body: { packId: string, successUrl: string, cancelUrl: string }
 * Returns:   { url: string, sessionId: string }
 *
 * Auth: client JWT passed via Authorization header. The Supabase client
 * created with this JWT is RLS-scoped to the caller's user_id, so we
 * never trust a client-supplied user_id.
 *
 * See production-plan.md Subsystem 3.5.
 */
// deno-lint-ignore-file no-explicit-any

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getPack } from '../_shared/packs.ts'
import { jsonResponse, handlePreflight } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const { packId, successUrl, cancelUrl } = await req.json()

    const pack = getPack(packId)
    if (!pack) return jsonResponse({ error: 'Unknown pack' }, 400)
    if (!pack.price_id) return jsonResponse({ error: 'Pack not configured with a Stripe price_id' }, 500)

    // Extract the client JWT so we respect RLS + get the caller's user_id.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Missing auth' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return jsonResponse({ error: 'Invalid session' }, 401)

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    } as any)

    // Create Stripe Checkout session FIRST so we have the real session id
    // to store. Using client_reference_id ties the session to the user.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: pack.price_id, quantity: 1 }],
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        pack_id: pack.id,
        tokens_granted: String(pack.tokens),
        user_id: user.id,
      },
    })

    if (!session.url) return jsonResponse({ error: 'Stripe returned no URL' }, 502)

    // Insert the pending purchase row. Use service-role client so we can
    // write purchases (client RLS forbids inserts).
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { error } = await adminSupabase
      .from('purchases')
      .insert({
        user_id: user.id,
        stripe_session_id: session.id,
        pack_id: pack.id,
        tokens_granted: pack.tokens,
        status: 'pending',
      })
    if (error) {
      // Log but don't fail — the webhook is the source of truth.
      // If the row is missing, the webhook creates one via upsert semantics
      // (see stripe-webhook).
      console.error('[checkout-create] purchase insert failed:', error.message)
    }

    return jsonResponse({ url: session.url, sessionId: session.id })
  } catch (err) {
    console.error('[checkout-create] error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
