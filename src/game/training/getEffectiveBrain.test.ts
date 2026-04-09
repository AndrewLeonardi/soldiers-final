/**
 * Unit tests for the effective-brain read path.
 *
 * This helper is the single source of truth for "what brain does this
 * soldier have right now?" — a contract that every Phase 3+ consumer
 * relies on. The tests lock in three load-bearing invariants:
 *
 *   1. Null-brain default: untrained soldiers read as statues.
 *   2. Copy semantics: callers never mutate the roster by reference.
 *   3. Corrupted-data fallback: bad persisted data falls back to null
 *      rather than producing silent NaN vectors in forward passes.
 */
import { describe, expect, it } from 'vitest'
import type { SoldierProfile } from '@config/types'
import {
  NULL_BRAIN_WEIGHTS,
  NULL_BRAIN_WEIGHT_COUNT,
} from './nullBrain'
import { getEffectiveBrain, isUntrained } from './getEffectiveBrain'

// ── Test helpers ─────────────────────────────────────────────────

function makeSoldier(overrides: Partial<SoldierProfile> = {}): SoldierProfile {
  return {
    id: 'test-soldier-1',
    name: 'PVT TEST',
    rank: 'PVT',
    equippedWeapon: 'rocketLauncher',
    unlockedWeapons: ['rifle', 'rocketLauncher'],
    starRating: 1,
    team: 'green',
    trainedBrains: {},
    ...overrides,
  }
}

const TRAINED_WEIGHTS = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT }, (_, i) => (i - 68) / 100)

// ── getEffectiveBrain — null brain default ──────────────────────

describe('getEffectiveBrain — null brain default', () => {
  it('returns null brain weights for a soldier with empty trainedBrains', () => {
    const soldier = makeSoldier({ trainedBrains: {} })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
    for (const w of weights) expect(w).toBe(0)
  })

  it('returns null brain weights when trainedBrains is undefined', () => {
    const soldier = makeSoldier({ trainedBrains: undefined })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
    expect(weights.every((w) => w === 0)).toBe(true)
  })

  it('returns null brain weights when the weapon has no trained entry', () => {
    // Soldier trained on rocketLauncher but asked about grenade.
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: TRAINED_WEIGHTS },
    })
    const weights = getEffectiveBrain(soldier, 'grenade')
    expect(weights.every((w) => w === 0)).toBe(true)
  })
})

// ── getEffectiveBrain — trained-brain return ───────────────────

describe('getEffectiveBrain — trained brain return', () => {
  it('returns the soldier\'s trained weights for the matching weapon', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: TRAINED_WEIGHTS },
    })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toEqual(TRAINED_WEIGHTS)
  })

  it('returns different weights for different weapons on the same soldier', () => {
    const rocketWeights = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT }, () => 0.1)
    const grenadeWeights = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT }, () => 0.5)
    const soldier = makeSoldier({
      trainedBrains: {
        rocketLauncher: rocketWeights,
        grenade: grenadeWeights,
      },
    })
    expect(getEffectiveBrain(soldier, 'rocketLauncher')[0]).toBe(0.1)
    expect(getEffectiveBrain(soldier, 'grenade')[0]).toBe(0.5)
  })
})

// ── getEffectiveBrain — copy semantics ──────────────────────────

describe('getEffectiveBrain — copy semantics', () => {
  it('returns a fresh array on each call (no shared reference)', () => {
    const soldier = makeSoldier({ trainedBrains: {} })
    const a = getEffectiveBrain(soldier, 'rocketLauncher')
    const b = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('mutating the returned null-brain weights does not corrupt the frozen constant', () => {
    const soldier = makeSoldier({ trainedBrains: {} })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    weights[0] = 999
    // The frozen module constant must still be all zeros.
    expect(NULL_BRAIN_WEIGHTS[0]).toBe(0)
    // And a fresh read must still produce a clean null brain.
    const fresh = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(fresh[0]).toBe(0)
  })

  it('mutating the returned trained weights does not corrupt the soldier\'s roster entry', () => {
    const originalWeights = [...TRAINED_WEIGHTS]
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: originalWeights },
    })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    weights[0] = 999
    // The roster entry is unchanged.
    expect(soldier.trainedBrains?.rocketLauncher?.[0]).toBe(TRAINED_WEIGHTS[0])
    // The array stored in the roster is unchanged by reference.
    expect(originalWeights[0]).toBe(TRAINED_WEIGHTS[0])
  })
})

// ── getEffectiveBrain — corrupted-data fallback ─────────────────

describe('getEffectiveBrain — corrupted-data fallback', () => {
  it('falls back to null brain when the trained array is the wrong length', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: [1, 2, 3] }, // truncated to 3 values
    })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
    expect(weights.every((w) => w === 0)).toBe(true)
  })

  it('falls back to null brain when the trained array is empty', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: [] },
    })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
    expect(weights.every((w) => w === 0)).toBe(true)
  })

  it('falls back to null brain when the trained array is oversized (corrupt data)', () => {
    const oversized = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT + 10 }, () => 0.5)
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: oversized },
    })
    const weights = getEffectiveBrain(soldier, 'rocketLauncher')
    expect(weights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
    expect(weights.every((w) => w === 0)).toBe(true)
  })
})

// ── isUntrained ──────────────────────────────────────────────────

describe('isUntrained', () => {
  it('returns true for a soldier with no trained brain for the weapon', () => {
    const soldier = makeSoldier({ trainedBrains: {} })
    expect(isUntrained(soldier, 'rocketLauncher')).toBe(true)
  })

  it('returns false for a soldier with a valid trained brain', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: TRAINED_WEIGHTS },
    })
    expect(isUntrained(soldier, 'rocketLauncher')).toBe(false)
  })

  it('returns true when trainedBrains is undefined', () => {
    const soldier = makeSoldier({ trainedBrains: undefined })
    expect(isUntrained(soldier, 'rocketLauncher')).toBe(true)
  })

  it('returns true when the weapon entry exists but is corrupted (wrong length)', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: [1, 2, 3] },
    })
    expect(isUntrained(soldier, 'rocketLauncher')).toBe(true)
  })

  it('correctly distinguishes per-weapon training state', () => {
    const soldier = makeSoldier({
      trainedBrains: { rocketLauncher: TRAINED_WEIGHTS },
    })
    expect(isUntrained(soldier, 'rocketLauncher')).toBe(false)
    expect(isUntrained(soldier, 'grenade')).toBe(true)
    expect(isUntrained(soldier, 'machineGun')).toBe(true)
    expect(isUntrained(soldier, 'tank')).toBe(true)
  })
})
