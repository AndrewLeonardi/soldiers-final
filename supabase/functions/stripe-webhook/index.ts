/**
 * stripe-webhook — Edge Function.
 *
 * Receives Stripe webhook events and atomically applies purchase outcomes:
 *   • checkout.session.completed → grant_tokens RPC
 *   • charge.refunded            → revoke_tokens RPC
 *
 * Idempotency: every event is keyed by stripe_event_id. The RPC checks
 * the purchases row status before crediting and returns null on re-run.
 * Stripe may retry events multiple times; we're safe under either path.
 *
 * Signature verification uses STRIPE_WEBHOOK_SECRET. Unsigned requests
 * are rejected with 400.
 *
 * See production-plan.md Subsystem 3.5.
 */
// deno-lint-ignore-file no-explicit-any

import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing stripe-signature', { status: 400 })

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
  if (!webhookSecret) return new Response('Webhook secret not configured', { status: 500 })

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  } as any)

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed:', (err as Error).message)
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const sessionId = session.id
      const packId = session.metadata?.pack_id
      const userId = session.client_reference_id ?? session.metadata?.user_id
      const tokens = Number(session.metadata?.tokens_granted ?? 0)

      if (!userId || !packId || tokens <= 0) {
        console.warn('[stripe-webhook] completed event missing metadata:', { sessionId, packId, userId, tokens })
        return new Response('OK', { status: 200 })
      }

      // Find the purchase row by session id (created by checkout-create).
      // If missing for any reason, create it here so the grant_tokens RPC
      // can run.
      const { data: existing } = await admin
        .from('purchases')
        .select('id, status')
        .eq('stripe_session_id', sessionId)
        .maybeSingle()

      let purchaseId: string
      if (existing) {
        purchaseId = existing.id
        if (existing.status === 'completed') {
          // Already credited. Idempotent return.
          return new Response('OK', { status: 200 })
        }
      } else {
        const { data, error } = await admin
          .from('purchases')
          .insert({
            user_id: userId,
            stripe_session_id: sessionId,
            pack_id: packId,
            tokens_granted: tokens,
            status: 'pending',
          })
          .select('id')
          .single()
        if (error || !data) {
          console.error('[stripe-webhook] could not create purchase row:', error)
          return new Response('DB error', { status: 500 })
        }
        purchaseId = data.id
      }

      const { data: newBalance, error: rpcErr } = await admin.rpc('grant_tokens', {
        p_user_id: userId,
        p_purchase_id: purchaseId,
        p_tokens: tokens,
        p_stripe_event_id: event.id,
      })
      if (rpcErr) {
        console.error('[stripe-webhook] grant_tokens failed:', rpcErr.message)
        return new Response('RPC error', { status: 500 })
      }
      console.log(`[stripe-webhook] credited ${tokens} tokens to ${userId}, new balance ${newBalance}`)

    } else if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      // Find the purchase from the session via payment intent → charge.
      // Stripe charges carry payment_intent; we stored the session id on the
      // purchase row, but Stripe's checkout.session has a payment_intent too.
      const paymentIntent = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id
      if (!paymentIntent) {
        console.warn('[stripe-webhook] refund had no payment_intent')
        return new Response('OK', { status: 200 })
      }
      // Look up the original session from Stripe to get the session_id.
      const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 })
      const session = sessions.data[0]
      if (!session) {
        console.warn('[stripe-webhook] no session found for refunded charge')
        return new Response('OK', { status: 200 })
      }
      const { data: purchase, error: purchErr } = await admin
        .from('purchases')
        .select('id, user_id, tokens_granted, status')
        .eq('stripe_session_id', session.id)
        .maybeSingle()
      if (purchErr || !purchase) {
        console.warn('[stripe-webhook] refund: purchase not found')
        return new Response('OK', { status: 200 })
      }
      if (purchase.status === 'refunded') {
        return new Response('OK', { status: 200 })
      }
      const { error: rpcErr } = await admin.rpc('revoke_tokens', {
        p_user_id: purchase.user_id,
        p_purchase_id: purchase.id,
        p_tokens: purchase.tokens_granted,
        p_stripe_event_id: event.id,
      })
      if (rpcErr) {
        console.error('[stripe-webhook] revoke_tokens failed:', rpcErr.message)
        return new Response('RPC error', { status: 500 })
      }
      console.log(`[stripe-webhook] refunded ${purchase.tokens_granted} tokens for purchase ${purchase.id}`)
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err)
    return new Response('Server error', { status: 500 })
  }
})
