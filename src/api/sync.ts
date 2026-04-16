/**
 * sync — write-through state sync between local zustand and Supabase.
 *
 * Production Sprint 3.
 *
 * Principles (in order of precedence):
 *   1. Local-first. Reads never block on the network. UI always reads from
 *      zustand; Supabase is a write mirror, not a read authority.
 *   2. Server-authoritative on `tokens`. Anti-cheat. If the server says
 *      the balance is X, local reconciles to X on next successful pull.
 *   3. Timestamp-win on everything else (soldiers, unlocks, progress).
 *   4. Never crash the app if sync fails. Log and retry.
 *
 * Flow:
 *   - Boot: after initUser(), if authenticated, pullProfile() + pullSoldiers()
 *     merge into zustand. First-login path uploads the local state if the
 *     server row is fresh.
 *   - Mutations: campStore actions call queueSync(). Debounced 400ms.
 *   - Field-level granularity: token changes don't push the whole profile.
 *
 * Cross-device collisions: if the local state differs materially from the
 * server state (different soldiers or a lower token balance), the UI shows
 * a modal via sceneStore.syncCollision. Sprint 3.6 renders the modal.
 *
 * See production-plan.md Subsystem 3.4.
 */

import { getSupabase, isOnline, isSupabaseEnabled } from './supabase'
import { getIdentity, onIdentityChange } from './user'
import { useCampStore, type SoldierRecord } from '@stores/campStore'

/** Fields that can be synced. New fields must be added here. */
export type SyncKey =
  | 'tokens'
  | 'soldiers'
  | 'unlockedWeapons'
  | 'unlockedSlots'
  | 'battlesCompleted'
  | 'dailyClaim'
  | 'tutorialCompleted'
  | 'muted'

export interface SyncContext {
  /** Short tag describing why the mutation happened. */
  reason: string
}

// ── Debounced queue ─────────────────────────────────────────────────────
// A dirty-field set plus a single timer. On tick, we push every dirty
// field as a minimal UPDATE. Field granularity matters for the 1 Hz
// training tick: we never push a full profile on every token change.

const DEBOUNCE_MS = 400

const _dirtyFields = new Set<SyncKey>()
let _flushTimer: ReturnType<typeof setTimeout> | null = null
let _flushing = false

/**
 * Mark a field dirty. Triggers a debounced flush. In DEV with no Supabase
 * configured, logs the intent and is otherwise a no-op.
 */
export function queueSync(key: SyncKey, _payload: unknown, ctx: SyncContext): void {
  if (import.meta.env.DEV) {
    const userId = getIdentity()?.userId ?? 'pre-init'
    // eslint-disable-next-line no-console
    console.debug(`[sync] queue ${key} (user=${userId}, reason=${ctx.reason})`)
  }

  if (!isSupabaseEnabled()) return
  if (!getIdentity()) return // pre-init — wait

  _dirtyFields.add(key)
  if (_flushTimer) return
  _flushTimer = setTimeout(() => {
    _flushTimer = null
    void flushSync()
  }, DEBOUNCE_MS)
}

/**
 * Force-flush queued writes immediately. Awaits all pending field writes
 * and resolves when the server has acknowledged (or an error was logged).
 * Intended for app-close / sign-out flows.
 */
export async function flushSync(): Promise<void> {
  if (_flushing) return
  if (_dirtyFields.size === 0) return

  const supabase = getSupabase()
  if (!supabase) return
  if (!isOnline()) return

  const identity = getIdentity()
  if (!identity) return
  if (identity.isAnonymous && !identity.userId.startsWith('local-')) {
    // Anonymous Supabase session — OK to write, server has a row for us.
  } else if (identity.userId.startsWith('local-')) {
    // Offline-fallback user id; no server row to write to.
    _dirtyFields.clear()
    return
  }

  _flushing = true
  const fields = Array.from(_dirtyFields)
  _dirtyFields.clear()

  try {
    const state = useCampStore.getState()
    const profileUpdate: Record<string, unknown> = {}
    let soldiersDirty = false

    for (const field of fields) {
      switch (field) {
        case 'tokens':
          profileUpdate['tokens'] = state.tokens
          break
        case 'unlockedWeapons':
          profileUpdate['unlocked_weapons'] = state.unlockedWeapons
          break
        case 'unlockedSlots':
          profileUpdate['unlocked_slots'] = state.unlockedSlots
          break
        case 'battlesCompleted':
          profileUpdate['battles_completed'] = state.battlesCompleted
          break
        case 'dailyClaim':
          profileUpdate['last_daily_claim_ms'] = state.lastDailyClaimMs
          break
        case 'tutorialCompleted':
          profileUpdate['tutorial_completed'] = state.tutorialCompleted
          break
        case 'muted':
          profileUpdate['muted'] = state.muted
          break
        case 'soldiers':
          soldiersDirty = true
          break
      }
    }

    // Profile fields go in one UPDATE.
    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', identity.userId)
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[sync] profile update failed:', error.message)
      }
    }

    // Soldiers are upserted as a batch — cheap since the roster is small (≤6).
    if (soldiersDirty) {
      const rows = state.soldiers.map(s => soldierToRow(s, identity.userId))
      if (rows.length > 0) {
        const { error } = await supabase
          .from('soldiers')
          .upsert(rows, { onConflict: 'id' })
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[sync] soldiers upsert failed:', error.message)
        }
      }
    }
  } finally {
    _flushing = false
    // If more writes landed while we were flushing, schedule another pass.
    if (_dirtyFields.size > 0 && !_flushTimer) {
      _flushTimer = setTimeout(() => {
        _flushTimer = null
        void flushSync()
      }, DEBOUNCE_MS)
    }
  }
}

// ── Pull: hydrate local state from server on boot / on auth change ──────

/**
 * Pull the profile row for the current user. Creates the row if missing
 * (belt-and-suspenders against trigger failures).
 * Returns the server row, or null on error/offline.
 */
export async function pullProfile(): Promise<ServerProfile | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const identity = getIdentity()
  if (!identity || identity.userId.startsWith('local-')) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', identity.userId)
    .maybeSingle()

  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sync] pullProfile failed:', error.message)
    return null
  }
  return data as ServerProfile | null
}

export async function pullSoldiers(): Promise<ServerSoldier[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const identity = getIdentity()
  if (!identity || identity.userId.startsWith('local-')) return []

  const { data, error } = await supabase
    .from('soldiers')
    .select('*')
    .eq('user_id', identity.userId)
  if (error) {
    // eslint-disable-next-line no-console
    console.warn('[sync] pullSoldiers failed:', error.message)
    return []
  }
  return (data ?? []) as ServerSoldier[]
}

/**
 * On-boot hydration. After initUser() resolves, call this to merge the
 * server state into local zustand. Handles three cases:
 *   1. Fresh Supabase user, empty profile: upload local state (first-login).
 *   2. Returning user with server state newer than local: server wins.
 *   3. Returning user with local state newer: push local on next mutation.
 *
 * Conflict rule:
 *   - tokens: server-authoritative (server value wins, always).
 *   - soldiers / unlocks / progress: server wins if server.updated_at is
 *     newer than local; local wins otherwise (local values get pushed via
 *     the normal queueSync path on next mutation).
 */
export async function hydrateFromServer(): Promise<{ collision: boolean }> {
  if (!isSupabaseEnabled()) return { collision: false }
  const identity = getIdentity()
  if (!identity || identity.userId.startsWith('local-')) return { collision: false }

  const [profile, soldiers] = await Promise.all([pullProfile(), pullSoldiers()])

  const state = useCampStore.getState()
  const hasLocalProgress = state.soldiers.length > 0 || state.battlesCompleted && Object.keys(state.battlesCompleted).length > 0

  if (!profile) {
    // No server row yet. The auth trigger should have created one, but if
    // not, we let the server defaults seed the UI and rely on the next
    // mutation to populate.
    return { collision: false }
  }

  const serverEmpty = (profile.tokens === 200)
    && (!profile.battles_completed || Object.keys(profile.battles_completed).length === 0)
    && soldiers.length === 0

  if (serverEmpty && hasLocalProgress) {
    // First-login upload: push all local fields to the server.
    await uploadLocalStateToServer()
    return { collision: false }
  }

  // Server has state. It wins on tokens (anti-cheat); timestamps decide
  // the rest. For Sprint 3 v1 we keep this simple: if server has ANY
  // progress and local has DIFFERENT progress, we flag a collision and
  // let the UI decide. Otherwise, adopt the server state.
  const localIds = new Set(state.soldiers.map(s => s.id))
  const serverIds = new Set(soldiers.map(s => s.id))
  const collision = hasLocalProgress && (
    localIds.size !== serverIds.size ||
    [...localIds].some(id => !serverIds.has(id))
  )

  if (!collision) {
    // Server wins — adopt it.
    adoptServerState(profile, soldiers)
  }

  return { collision }
}

function adoptServerState(profile: ServerProfile, soldiers: ServerSoldier[]): void {
  useCampStore.setState({
    tokens: profile.tokens,
    unlockedWeapons: profile.unlocked_weapons,
    unlockedSlots: profile.unlocked_slots,
    lastDailyClaimMs: Number(profile.last_daily_claim_ms) || 0,
    battlesCompleted: profile.battles_completed ?? {},
    tutorialCompleted: profile.tutorial_completed,
    muted: profile.muted,
    soldiers: soldiers.map(rowToSoldier),
  })
}

async function uploadLocalStateToServer(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  const identity = getIdentity()
  if (!identity) return

  const state = useCampStore.getState()

  // Profile upsert — server row exists via trigger, so this is an update.
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      tokens: state.tokens,
      unlocked_weapons: state.unlockedWeapons,
      unlocked_slots: state.unlockedSlots,
      battles_completed: state.battlesCompleted,
      tutorial_completed: state.tutorialCompleted,
      last_daily_claim_ms: state.lastDailyClaimMs,
      muted: state.muted,
    })
    .eq('user_id', identity.userId)
  if (profileErr) {
    // eslint-disable-next-line no-console
    console.warn('[sync] first-login profile upload failed:', profileErr.message)
  }

  if (state.soldiers.length > 0) {
    const rows = state.soldiers.map(s => soldierToRow(s, identity.userId))
    const { error } = await supabase
      .from('soldiers')
      .upsert(rows, { onConflict: 'id' })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[sync] first-login soldiers upload failed:', error.message)
    }
  }
}

// ── Row ⇄ zustand record shape conversion ──────────────────────────────

interface ServerProfile {
  user_id: string
  tokens: number
  unlocked_weapons: string[]
  unlocked_slots: number
  battles_completed: Record<string, { stars: number }>
  tutorial_completed: boolean
  last_daily_claim_ms: number
  muted: boolean
  updated_at: string
}

interface ServerSoldier {
  id: string
  user_id: string
  name: string
  weapon: string
  trained: boolean
  trained_brains: Record<string, number[]>
  legacy_brains?: Record<string, number[]>
  weapon_manuals_purchased: string[]
  fitness_score: number | null
  generations_trained: number
  xp: number
  injured_until_ms: number | null
  updated_at: string
}

function soldierToRow(s: SoldierRecord, userId: string): ServerSoldier {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    weapon: s.weapon,
    trained: s.trained,
    trained_brains: s.trainedBrains ?? {},
    legacy_brains: s.legacyBrains,
    weapon_manuals_purchased: (s.weaponManualsPurchased ?? []) as string[],
    fitness_score: s.fitnessScore ?? null,
    generations_trained: s.generationsTrained ?? 0,
    xp: s.xp ?? 0,
    injured_until_ms: s.injuredUntil ?? null,
    updated_at: new Date().toISOString(),
  }
}

function rowToSoldier(r: ServerSoldier): SoldierRecord {
  return {
    id: r.id,
    name: r.name,
    weapon: r.weapon,
    trained: r.trained,
    trainedBrains: r.trained_brains,
    legacyBrains: r.legacy_brains,
    weaponManualsPurchased: r.weapon_manuals_purchased as SoldierRecord['weaponManualsPurchased'],
    fitnessScore: r.fitness_score ?? undefined,
    generationsTrained: r.generations_trained,
    xp: r.xp,
    injuredUntil: r.injured_until_ms ?? undefined,
  }
}

// ── Auto-hydrate when auth flips to authenticated ──────────────────────
// If a user upgrades from anon → Google, the auth state change fires. We
// re-hydrate so any server state tied to the upgraded identity lands in UI.

let _lastUserId: string | null = null
onIdentityChange(async (identity) => {
  if (identity.userId === _lastUserId) return
  _lastUserId = identity.userId
  if (identity.userId.startsWith('local-')) return
  try {
    await hydrateFromServer()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[sync] auto-hydrate failed:', err)
  }
})
