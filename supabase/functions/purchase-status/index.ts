/**
 * purchase-status — Edge Function.
 *
 * Client polls this on return from Stripe Checkout to learn when the
 * webhook has finalized a purchase. The client drives the token-arrival
 * ceremony once the row flips to 'completed'.
 *
 * POST body: { sessionId: string }
 * Returns:   { status, tokensGranted, packId } — shape matches the purchases row
 *
 * Auth: requires the client JWT. RLS makes sure only the purchase owner
 * can read their own row.
 */
// deno-lint-ignore-file no-explicit-any

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse, handlePreflight } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req)
  if (preflight) return preflight

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ error: 'Missing auth' }, 401)

  try {
    const { sessionId } = await req.json()
    if (!sessionId) return jsonResponse({ error: 'Missing sessionId' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data, error } = await supabase
      .from('purchases')
      .select('status, tokens_granted, pack_id, updated_at')
      .eq('stripe_session_id', sessionId)
      .maybeSingle()

    if (error) return jsonResponse({ error: error.message }, 500)
    if (!data) return jsonResponse({ status: 'unknown' })

    return jsonResponse({
      status: data.status,
      tokensGranted: data.tokens_granted,
      packId: data.pack_id,
      updatedAt: data.updated_at,
    })
  } catch (err) {
    console.error('[purchase-status] error:', err)
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
