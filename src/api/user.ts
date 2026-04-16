/**
 * user — user identity + upgrade flow.
 *
 * Production Sprint 3. Anonymous-first: every visitor gets a session the
 * instant the page loads. No wall, ever. Upgrade flow (Google SSO or email
 * magic link) preserves the anonymous user_id via Supabase's linkIdentity.
 *
 * Offline behavior: when Supabase env vars are unset OR the network is
 * down, this module falls back to a localStorage-backed UUID (the Sprint 1
 * behavior). The app works identically in either mode — the server-aware
 * code paths in sync.ts are what differ.
 *
 * See production-plan.md Subsystem 3.2.
 */

import { getSupabase, isSupabaseEnabled } from './supabase'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'

const USER_ID_STORAGE_KEY = 'toy-soldiers-user-id'

export interface UserIdentity {
  userId: string
  isAnonymous: boolean
  /** User's email if they've upgraded; null while guest or offline. */
  email: string | null
}

// Cached identity for synchronous reads (telemetry, sync writes).
let _identity: UserIdentity | null = null
const _listeners = new Set<(id: UserIdentity) => void>()

function emitChange(identity: UserIdentity): void {
  _identity = identity
  for (const l of _listeners) {
    try { l(identity) } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[user] identity listener threw:', err)
    }
  }
}

/**
 * Subscribe to identity changes (e.g. anon -> authenticated after upgrade).
 * Returns an unsubscribe function.
 */
export function onIdentityChange(listener: (id: UserIdentity) => void): () => void {
  _listeners.add(listener)
  if (_identity) listener(_identity)
  return () => { _listeners.delete(listener) }
}

function userFromSession(u: User): UserIdentity {
  return {
    userId: u.id,
    // Supabase anon sessions have user.is_anonymous; authenticated have email.
    isAnonymous: Boolean((u as unknown as { is_anonymous?: boolean }).is_anonymous),
    email: u.email ?? null,
  }
}

/**
 * Offline fallback — stable local UUID in localStorage.
 * Identical shape to the Sprint 1 implementation so upstream code doesn't
 * need to branch on the transport.
 */
function offlineIdentity(): UserIdentity {
  if (typeof localStorage === 'undefined') {
    return { userId: `ephemeral-${mintUuid()}`, isAnonymous: true, email: null }
  }
  const existing = localStorage.getItem(USER_ID_STORAGE_KEY)
  if (existing) return { userId: existing, isAnonymous: true, email: null }
  const userId = `local-${mintUuid()}`
  localStorage.setItem(USER_ID_STORAGE_KEY, userId)
  return { userId, isAnonymous: true, email: null }
}

/**
 * Initialize identity at app boot. Resolves with the current identity.
 * - If Supabase is configured AND reachable: restore session, or create
 *   an anonymous session.
 * - Otherwise: fall back to a local UUID.
 *
 * Also initializes telemetry once the user_id is known.
 */
export async function initUser(): Promise<UserIdentity> {
  let identity: UserIdentity

  const supabase = getSupabase()
  if (!supabase) {
    identity = offlineIdentity()
  } else {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        identity = userFromSession(session.user)
      } else {
        // No session — mint an anonymous one. This is the "no wall" guarantee.
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error || !data.user) throw error ?? new Error('anon signup returned no user')
        identity = userFromSession(data.user)
      }

      // Keep our cache in sync with future auth changes (upgrade, sign out).
      supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          emitChange(userFromSession(session.user))
        } else {
          // Session gone — re-mint anon on next boot. For now, just reflect offline.
          emitChange(offlineIdentity())
        }
      })
    } catch (err) {
      // Any network/config failure: fall back to offline. The game never blocks.
      // eslint-disable-next-line no-console
      console.warn('[user] Supabase init failed, falling back to offline:', err)
      identity = offlineIdentity()
    }
  }

  emitChange(identity)

  // Kick off telemetry. Lazy imports avoid circular deps and keep tests clean.
  try {
    const { initTelemetry } = await import('@analytics/telemetry')
    initTelemetry(identity.userId)
    const { track } = await import('@analytics/events')
    track('boot', { userId: identity.userId })
  } catch {
    // Telemetry failure must never block boot.
  }

  return identity
}

/**
 * Synchronous accessor for already-initialized user id. Returns null if
 * `initUser()` has not been called yet. Intended for telemetry / sync
 * payloads that need the id without awaiting.
 */
export function getUserId(): string | null {
  return _identity?.userId ?? null
}

/** Full current identity (or null before init). */
export function getIdentity(): UserIdentity | null {
  return _identity
}

/** Is the current user an authenticated (upgraded) account? */
export function isAuthenticated(): boolean {
  return _identity !== null && !_identity.isAnonymous
}

// ── Upgrade flow ────────────────────────────────────────────────────────
// Guest (anonymous) -> authenticated account. Preserves the user_id via
// Supabase's linkIdentity so the player's camp, soldiers, tokens, and
// purchases remain attached to the same row.

export interface UpgradeResult {
  /** True if the identity is now authenticated. */
  success: boolean
  /** If Google/email is already linked to a DIFFERENT account, we surface this. */
  collision?: {
    /** The email that collided. */
    existingEmail: string
  }
  error?: string
}

/**
 * Trigger Google OAuth to upgrade the current anonymous session. Returns
 * a redirect-promise: the browser navigates to Google, then returns to
 * `returnTo` (defaults to current URL). Completion is observed via the
 * onAuthStateChange listener.
 *
 * Supabase handles merge-conflict internally: if the Google account is
 * already linked to another Supabase user, the provider returns an error
 * and the UI shows the collision modal.
 */
export async function upgradeWithGoogle(returnTo?: string): Promise<UpgradeResult> {
  const supabase = getSupabase()
  if (!supabase) return { success: false, error: 'Supabase is not configured.' }

  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: {
      redirectTo: returnTo ?? (typeof window !== 'undefined' ? window.location.href : undefined),
    },
  })

  if (error) {
    // Supabase returns identity_already_exists when the provider account
    // is linked to a different user row. We surface this as a collision
    // so the UI can offer "keep current" vs "switch to existing."
    if (error.message?.includes('already') || error.message?.includes('identity_already_exists')) {
      return { success: false, collision: { existingEmail: '' }, error: error.message }
    }
    return { success: false, error: error.message }
  }

  // The OAuth redirect happens asynchronously. Completion fires via
  // onAuthStateChange after the user returns from Google.
  return { success: true }
}

/**
 * Attach an email to the current anonymous session. Supabase sends a
 * confirmation email; clicking the link verifies and upgrades the user.
 * The user_id is preserved across the upgrade.
 *
 * This is the email equivalent of `upgradeWithGoogle`. No passwords —
 * verification is magic-link only for v1 per user_privacy rules.
 */
export async function upgradeWithEmail(email: string): Promise<UpgradeResult> {
  const supabase = getSupabase()
  if (!supabase) return { success: false, error: 'Supabase is not configured.' }

  // updateUser on an anon session attaches the email and triggers the
  // confirmation email flow. When confirmed, the user becomes non-anonymous
  // under the same user_id.
  const { error } = await supabase.auth.updateUser({ email })
  if (error) {
    if (error.message?.includes('already') || error.message?.includes('registered')) {
      return { success: false, collision: { existingEmail: email }, error: error.message }
    }
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Sign the user out. Next boot mints a fresh anonymous session.
 * Note: signing out from an authenticated account INTENTIONALLY loses
 * access to the camp on this device. The user can sign back in and their
 * state returns. Warn them in the UI.
 */
export async function signOut(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut()
  // onAuthStateChange will refresh the cache.
}

// ── UUID fallback (for offline mode) ────────────────────────────────────

function mintUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

// Expose whether supabase is wired (for UI conditionals).
export { isSupabaseEnabled }
