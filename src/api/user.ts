/**
 * user — user identity seam.
 *
 * Sprint 1 contract (this file): returns a stable local UUID stashed in its
 * own localStorage key. No network, no auth. `initUser()` is awaitable so
 * `CampPage` can await it without caring about the implementation.
 *
 * Sprint 3 will replace the body with Supabase anonymous auth. The public
 * signatures here are frozen: callers should not have to change when Sprint 3
 * lands. If they do, this seam was designed wrong — fix it here, not there.
 */

const USER_ID_STORAGE_KEY = 'toy-soldiers-user-id'

export interface UserIdentity {
  userId: string
  isAnonymous: true  // Always true in Sprint 1; Sprint 3 will make this `boolean`.
}

/**
 * Get-or-mint a local user id. Sprint 1 uses a localStorage-backed UUID.
 * Always resolves immediately (the Promise is a shape contract for Sprint 3,
 * where this may briefly await Supabase).
 */
export async function initUser(): Promise<UserIdentity> {
  const existing = typeof localStorage !== 'undefined'
    ? localStorage.getItem(USER_ID_STORAGE_KEY)
    : null

  if (existing) {
    return { userId: existing, isAnonymous: true }
  }

  const userId = `local-${mintUuid()}`
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(USER_ID_STORAGE_KEY, userId)
  }
  return { userId, isAnonymous: true }
}

/**
 * Synchronous accessor for already-initialized user id. Returns null if
 * `initUser()` has not been called yet (or localStorage is unavailable).
 * Intended for telemetry / sync payloads that need the id without awaiting.
 */
export function getUserId(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(USER_ID_STORAGE_KEY)
}

/** crypto.randomUUID() fallback for environments without it. */
function mintUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // RFC4122-ish fallback: 16 random bytes as hex.
  const bytes = new Uint8Array(16)
  for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}
