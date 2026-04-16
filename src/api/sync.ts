/**
 * sync — server-sync seam. NO-OP in Sprint 1.
 *
 * Every token-affecting mutation in `campStore` calls `queueSync()` with a
 * field name and reason tag. Today this is a dev-mode logger so we can watch
 * the mutation stream and confirm the wrapper covers every real callsite.
 *
 * Sprint 3 replaces the body with a debounced write to Supabase. The public
 * signature is frozen — callers should not have to change.
 *
 * See production-plan.md, Subsystem 1.6.
 */

import { getUserId } from './user'

/** Fields that can be synced. Narrowed on purpose — new fields must be added here. */
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
  /** Short tag describing why the mutation happened (training-commit, daily-claim, etc). */
  reason: string
}

/**
 * Queue a field for server sync. Sprint 1: logs in dev, ignored in prod.
 * Sprint 3: debounces, batches, and pushes to Supabase.
 */
export function queueSync(key: SyncKey, _payload: unknown, ctx: SyncContext): void {
  if (import.meta.env.DEV) {
    // Intentionally quiet in prod — this is infra, not a user-visible log.
    const userId = getUserId() ?? 'pre-init'
    // eslint-disable-next-line no-console
    console.debug(`[sync] queue ${key} (user=${userId}, reason=${ctx.reason})`)
  }
}

/**
 * Force-flush queued writes immediately. Sprint 1: no-op. Sprint 3: awaits
 * pending debounced writes and resolves when the server has acknowledged.
 * Intended for app-close / sign-out flows.
 */
export async function flushSync(): Promise<void> {
  // No-op in Sprint 1.
}
