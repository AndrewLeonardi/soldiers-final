/**
 * supabase — singleton Supabase client + capability probe.
 *
 * Production Sprint 3. Safe-by-default: when env vars are missing, this
 * module exposes `null` for the client and `false` for capability flags,
 * letting the rest of the app run in pure-offline mode. All callers must
 * check `isSupabaseEnabled()` before using `client`.
 *
 * Env vars (Vite-prefixed so they ship to the browser):
 *   VITE_SUPABASE_URL  — project URL (https://xxx.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  — public anon key (NOT service role)
 *
 * Auth storage key is namespaced so it can't collide with other apps on
 * the same origin. Matches the pattern from ToySoldiersTwo.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Vite env access — typed below. These are empty strings (not undefined)
// when unset, per Vite convention. The guard below treats both as "off".
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/** Lazily constructed singleton. null when env unset. */
let _client: SupabaseClient | null = null

function buildClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'soldiers-supabase-auth',
      },
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[supabase] client init failed:', err)
    return null
  }
}

/**
 * Get the Supabase client singleton. Returns null when env vars are unset.
 * Callers: always check for null before use, or use `isSupabaseEnabled()`
 * as a guard.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client
  _client = buildClient()
  return _client
}

/** Is Supabase wired up (URL + key present)? */
export function isSupabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

/** Is the user currently online AND Supabase configured? */
export function isOnline(): boolean {
  if (!isSupabaseEnabled()) return false
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine
  }
  return true
}
