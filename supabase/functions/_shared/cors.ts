/**
 * Shared CORS headers for Edge Functions. Mobile browsers + PWA shells can
 * be strict; this gives every function a consistent preflight response.
 *
 * ALLOWED_ORIGIN should be set to the production site in Supabase env.
 * Locally it falls back to '*' for convenience.
 */

export function corsHeaders(): Record<string, string> {
  const origin = Deno.env.get('ALLOWED_ORIGIN') ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

export function handlePreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }
  return null
}
