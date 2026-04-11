/**
 * getEffectiveBrain — the single read path for "what brain does this
 * soldier have for this weapon?"
 *
 * Every consumer that needs to drive a soldier's behavior — the Phase
 * 3a Training Grounds interior renderer, the Phase 4 rival combat sim,
 * future combat replays, anywhere a neural network gets pulled for a
 * specific (soldier, weapon) pairing — reads through this helper. The
 * contract is simple:
 *
 *   - If the soldier has a trained brain for the requested weapon,
 *     return a COPY of those weights (so callers can't mutate the
 *     roster by reference).
 *
 *   - Otherwise return a COPY of `NULL_BRAIN_WEIGHTS` — the frozen
 *     136-length array of zeros. This is the "statue" default: an
 *     untrained soldier literally does nothing when simulated.
 *
 * The copy semantic is load-bearing. The roster's `trainedBrains` field
 * is persisted state; if any consumer mutated it by reference (e.g. a
 * GA population initialization that copies the seed brain into slot 0
 * and then mutates slot 0 in-place), we'd silently corrupt the
 * player's saved progress. Returning a fresh array on every call makes
 * this impossible.
 *
 * Centralizing the read path means the "untrained soldiers are statues"
 * invariant is enforced in ONE function. If a future refactor ever
 * wants to change the fallback (e.g. "new recruits get a vestigial
 * brain with 10% random weights"), we change one line here and every
 * consumer inherits the new behavior. No scattered `?? zeros` reads.
 */
import type { SoldierProfile, WeaponType } from '@config/types'
import { NULL_BRAIN_WEIGHTS } from './nullBrain'
import { getWeightCount } from './weaponShapes'

/**
 * Return the brain weights that should drive this soldier when they're
 * using this weapon. Always returns a fresh `number[]`.
 *
 * Validates against the per-weapon weight count (via getWeightCount)
 * so that topology changes correctly invalidate stale brains.
 */
export function getEffectiveBrain(
  soldier: SoldierProfile,
  weapon: WeaponType,
): number[] {
  const expectedCount = getWeightCount(weapon)
  const trained = soldier.trainedBrains?.[weapon]
  if (trained && trained.length === expectedCount) {
    return trained.slice()
  }
  return NULL_BRAIN_WEIGHTS.slice()
}

/**
 * Convenience: is this soldier a statue for this weapon?
 */
export function isUntrained(
  soldier: SoldierProfile,
  weapon: WeaponType,
): boolean {
  const expectedCount = getWeightCount(weapon)
  const trained = soldier.trainedBrains?.[weapon]
  return !trained || trained.length !== expectedCount
}
