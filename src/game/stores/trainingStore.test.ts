/**
 * Unit tests for the Phase 3a training store.
 *
 * Mirrors the baseStore.test.ts pattern: mock `track` at the module
 * boundary, stub `localStorage` with an in-memory Map, reset store
 * state between tests, assert both the mutation surface AND the
 * analytics event shapes fired from each mutation.
 *
 * Coverage targets the full mutation surface of the Phase 3a store —
 * seeding, observation, training run lifecycle, speed toggles,
 * graduation, and roster commit — plus invariants that shouldn't
 * drift (e.g. iterating `slots` by map rather than assuming a
 * singleton, session-only fields reset on reload, live context
 * nulling on stop). The GA tick loop itself is exercised by
 * integration-style tests that advance the store through multiple
 * ticks and assert progress; we do NOT attempt to mock the GA or
 * scenario code — the real stack runs deterministically fast enough
 * for unit tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mock analytics BEFORE importing the store ─────────────
vi.mock('@game/analytics/events', () => ({
  track: vi.fn(),
  readDevEventLog: vi.fn(() => []),
}))

// ── Stub localStorage ──────────────────────────────────────
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  get length(): number {
    return this.store.size
  }
}
vi.stubGlobal('localStorage', new MemoryStorage())

// ── Imports ────────────────────────────────────────────────
import { track } from '@game/analytics/events'
import { useRosterStore } from '@stores/rosterStore'
import { useTrainingStore, type TrainingSlot } from './trainingStore'
import {
  NULL_BRAIN_WEIGHT_COUNT,
  NULL_BRAIN_WEIGHTS,
} from '@game/training/nullBrain'

// ── Test helpers ──────────────────────────────────────────

const SEED_SLOT_ID = 'slot-1'
const SEED_SOLDIER_ID = 'soldier-2'

function freshSlot(overrides: Partial<TrainingSlot> = {}): TrainingSlot {
  return {
    slotId: SEED_SLOT_ID,
    soldierId: SEED_SOLDIER_ID,
    weapon: 'rocketLauncher',
    phase: 'idle',
    generation: 0,
    bestFitness: 0,
    fitnessHistory: [],
    ...overrides,
  }
}

function resetRoster() {
  // Restore a clean copy of STARTER_ROSTER's PVT ACE (soldier-2) with
  // empty trainedBrains, so every test starts from a null-brain state.
  useRosterStore.setState({
    soldiers: [
      {
        id: 'soldier-1',
        name: 'SGT RICO',
        rank: 'SGT',
        equippedWeapon: 'rifle',
        unlockedWeapons: ['rifle'],
        starRating: 2,
        team: 'green',
        trainedBrains: {},
      },
      {
        id: 'soldier-2',
        name: 'PVT ACE',
        rank: 'PVT',
        equippedWeapon: 'rocketLauncher',
        unlockedWeapons: ['rifle', 'rocketLauncher'],
        starRating: 1,
        team: 'green',
        trainedBrains: {},
      },
    ],
    selectedSoldierId: 'soldier-1',
    detailSoldierId: null,
  })
}

beforeEach(() => {
  useTrainingStore.setState({
    slots: {},
    observing: null,
    simSpeed: 10,
    liveSlots: {},
  })
  resetRoster()
  vi.mocked(track).mockClear()
})

afterEach(() => {
  vi.mocked(track).mockClear()
})

// ── Seeding ───────────────────────────────────────────────

describe('useTrainingStore — seedFirstTimeTrainingSlot', () => {
  it('seeds the Phase 3a slot pointing at PVT ACE + rocketLauncher', () => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    const slots = useTrainingStore.getState().slots
    const slot = slots[SEED_SLOT_ID]
    expect(slot).toBeDefined()
    expect(slot?.soldierId).toBe(SEED_SOLDIER_ID)
    expect(slot?.weapon).toBe('rocketLauncher')
    expect(slot?.phase).toBe('idle')
    expect(slot?.generation).toBe(0)
    expect(slot?.bestFitness).toBe(0)
    expect(slot?.fitnessHistory).toEqual([])
  })

  it('fires a training_slot_seeded analytics event with the slot identity', () => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    expect(track).toHaveBeenCalledWith('training_slot_seeded', {
      slotId: SEED_SLOT_ID,
      soldierId: SEED_SOLDIER_ID,
      weapon: 'rocketLauncher',
    })
  })

  it('is idempotent — calling twice does not create duplicate slots or re-fire analytics', () => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    // All 3 slots seeded on first call.
    expect(Object.keys(useTrainingStore.getState().slots)).toHaveLength(3)
    vi.mocked(track).mockClear()
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    // Second call is a no-op — no new slots, no new events.
    expect(Object.keys(useTrainingStore.getState().slots)).toHaveLength(3)
    expect(track).not.toHaveBeenCalled()
  })
})

// ── Observation ───────────────────────────────────────────

describe('useTrainingStore — observation', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    vi.mocked(track).mockClear()
  })

  it('startObserving sets observing and transitions the slot phase', () => {
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    const { observing, slots } = useTrainingStore.getState()
    expect(observing).toBe(SEED_SLOT_ID)
    expect(slots[SEED_SLOT_ID]?.phase).toBe('observing')
    expect(track).toHaveBeenCalledWith('training_observe_started', {
      slotId: SEED_SLOT_ID,
      soldierId: SEED_SOLDIER_ID,
      weapon: 'rocketLauncher',
    })
  })

  it('startObserving is a no-op when the slotId does not exist', () => {
    useTrainingStore.getState().startObserving('bogus-slot')
    expect(useTrainingStore.getState().observing).toBeNull()
    expect(track).not.toHaveBeenCalled()
  })

  it('stopObserving clears observing and resets the slot back to idle', () => {
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    vi.mocked(track).mockClear()
    useTrainingStore.getState().stopObserving()
    const { observing, slots } = useTrainingStore.getState()
    expect(observing).toBeNull()
    expect(slots[SEED_SLOT_ID]?.phase).toBe('idle')
    expect(track).toHaveBeenCalledWith('training_observe_stopped', { slotId: SEED_SLOT_ID })
  })

  it('stopObserving is a no-op when nothing is being observed', () => {
    useTrainingStore.getState().stopObserving()
    expect(track).not.toHaveBeenCalled()
  })
})

// ── Speed toggle ──────────────────────────────────────────

describe('useTrainingStore — setSpeed', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    vi.mocked(track).mockClear()
  })

  it('changes simSpeed between valid values', () => {
    useTrainingStore.getState().setSpeed(1)
    expect(useTrainingStore.getState().simSpeed).toBe(1)
    useTrainingStore.getState().setSpeed(50)
    expect(useTrainingStore.getState().simSpeed).toBe(50)
  })

  it('fires training_speed_changed with the slotId under observation', () => {
    useTrainingStore.getState().setSpeed(50)
    expect(track).toHaveBeenCalledWith('training_speed_changed', {
      slotId: SEED_SLOT_ID,
      speed: 50,
    })
  })

  it('is a no-op and silent when setting the same speed twice', () => {
    const startingSpeed = useTrainingStore.getState().simSpeed
    useTrainingStore.getState().setSpeed(startingSpeed)
    expect(track).not.toHaveBeenCalled()
  })
})

// ── Training run — startTraining ──────────────────────────

describe('useTrainingStore — startTraining', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    vi.mocked(track).mockClear()
  })

  it('returns true for a valid slot and transitions phase to running', () => {
    const ok = useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    expect(ok).toBe(true)
    expect(useTrainingStore.getState().slots[SEED_SLOT_ID]?.phase).toBe('running')
  })

  it('initializes the live GA context with a full population', () => {
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    const live = useTrainingStore.getState().liveSlots[SEED_SLOT_ID]
    expect(live).toBeDefined()
    expect(live?.slotId).toBe(SEED_SLOT_ID)
    expect(live?.population).toHaveLength(30) // default populationSize
    expect(live?.currentIndividual).toBe(0)
    expect(live?.fitnesses).toEqual([])
    expect(live?.bestWeights).toHaveLength(NULL_BRAIN_WEIGHT_COUNT)
  })

  it('fires training_run_started with seeded=false for an untrained soldier', () => {
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    expect(track).toHaveBeenCalledWith('training_run_started', {
      slotId: SEED_SLOT_ID,
      weapon: 'rocketLauncher',
      seeded: false,
    })
  })

  it('fires training_run_started with seeded=true for a soldier with an existing brain', () => {
    // Pre-seed PVT ACE's trainedBrains with a valid-length weight vector
    useRosterStore.setState((state) => ({
      soldiers: state.soldiers.map((s) =>
        s.id === SEED_SOLDIER_ID
          ? {
              ...s,
              trainedBrains: {
                rocketLauncher: [...NULL_BRAIN_WEIGHTS].map((_, i) => (i - 68) / 200),
              },
            }
          : s,
      ),
    }))
    vi.mocked(track).mockClear()
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    expect(track).toHaveBeenCalledWith('training_run_started', {
      slotId: SEED_SLOT_ID,
      weapon: 'rocketLauncher',
      seeded: true,
    })
  })

  it('returns false for a slot that does not exist', () => {
    const ok = useTrainingStore.getState().startTraining('bogus-slot')
    expect(ok).toBe(false)
    expect(useTrainingStore.getState().liveSlots['bogus-slot']).toBeUndefined()
  })

  it('returns false when the slot weapon has no WEAPON_TRAINING entry (e.g. rifle)', () => {
    // Manually create a slot with weapon: 'rifle' (which has no training config).
    useTrainingStore.setState((state) => ({
      slots: {
        ...state.slots,
        'rifle-slot': freshSlot({ slotId: 'rifle-slot', weapon: 'rifle' }),
      },
    }))
    const ok = useTrainingStore.getState().startTraining('rifle-slot')
    expect(ok).toBe(false)
  })
})

// ── Training run — stopTraining ───────────────────────────

describe('useTrainingStore — stopTraining', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
  })

  it('removes the live context and resets session fields', () => {
    useTrainingStore.getState().stopTraining(SEED_SLOT_ID)
    const { liveSlots, slots } = useTrainingStore.getState()
    expect(liveSlots[SEED_SLOT_ID]).toBeUndefined()
    expect(slots[SEED_SLOT_ID]?.phase).toBe('observing')
    expect(slots[SEED_SLOT_ID]?.generation).toBe(0)
    expect(slots[SEED_SLOT_ID]?.bestFitness).toBe(0)
  })

  it('is a no-op for an unknown slot', () => {
    useTrainingStore.getState().stopTraining('bogus-slot')
    // Live context of the real slot is unchanged
    expect(useTrainingStore.getState().liveSlots[SEED_SLOT_ID]).toBeDefined()
  })
})

// ── GA tick integration ───────────────────────────────────

describe('useTrainingStore — tick (GA integration)', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    vi.mocked(track).mockClear()
    // Crank the sim speed to 50x so a few ticks produce real progress.
    useTrainingStore.getState().setSpeed(50)
    vi.mocked(track).mockClear()
  })

  it('is a no-op when there is no live context', () => {
    useTrainingStore.getState().stopTraining(SEED_SLOT_ID)
    const snapshotGen = useTrainingStore.getState().slots[SEED_SLOT_ID]?.generation ?? 0
    useTrainingStore.getState().tick(1 / 60)
    expect(useTrainingStore.getState().slots[SEED_SLOT_ID]?.generation).toBe(snapshotGen)
  })

  it('advances the sim state over multiple tick() calls', () => {
    // At simSpeed=50, one tick() call runs 50 simTicks = 50/60 ≈ 0.83
    // sim-seconds. A rocket individual is 6 sim-seconds, so crossing
    // one individual boundary takes ~8 tick() calls. We do 15 calls
    // to be comfortably past the first individual in all cases.
    const initialElapsed = useTrainingStore.getState().liveSlots[SEED_SLOT_ID]?.simState.elapsed ?? 0
    for (let i = 0; i < 15; i++) {
      useTrainingStore.getState().tick(1 / 60)
    }
    const live = useTrainingStore.getState().liveSlots[SEED_SLOT_ID]
    expect(live).toBeDefined()
    // Sim time has advanced OR we've moved past individual 0 OR we've
    // evolved at least one generation. Any of those proves progress.
    const advanced =
      (live?.simState.elapsed ?? 0) > initialElapsed ||
      (live?.currentIndividual ?? 0) > 0 ||
      (useTrainingStore.getState().slots[SEED_SLOT_ID]?.generation ?? 0) > 0
    expect(advanced).toBe(true)
  })

  it('eventually evolves the generation and fires training_generation_evolved', () => {
    // 30 individuals × 6 sim-sec / (50 sim-ticks × 1/60 sec) ≈ 216
    // tick() calls per generation boundary. We budget 500 for safety.
    for (let i = 0; i < 500; i++) {
      useTrainingStore.getState().tick(1 / 60)
      if ((useTrainingStore.getState().slots[SEED_SLOT_ID]?.generation ?? 0) > 0) break
    }
    const generation = useTrainingStore.getState().slots[SEED_SLOT_ID]?.generation ?? 0
    expect(generation).toBeGreaterThan(0)
    // At least one generation-evolved event must have fired.
    const calls = vi.mocked(track).mock.calls
    const evolvedCall = calls.find(([event]) => event === 'training_generation_evolved')
    expect(evolvedCall).toBeDefined()
  })

  it('appends to fitnessHistory as generations complete (bounded length)', () => {
    for (let i = 0; i < 800; i++) {
      useTrainingStore.getState().tick(1 / 60)
      const slot = useTrainingStore.getState().slots[SEED_SLOT_ID]
      if (slot && slot.phase === 'graduated') break
      if ((slot?.generation ?? 0) >= 2) break // enough generations for the assertion
    }
    const slot = useTrainingStore.getState().slots[SEED_SLOT_ID]
    expect(slot?.fitnessHistory.length).toBeGreaterThan(0)
    expect(slot?.fitnessHistory.length).toBeLessThanOrEqual(30)
  })
})

// ── Graduation ────────────────────────────────────────────

describe('useTrainingStore — graduation + commit', () => {
  beforeEach(() => {
    useTrainingStore.getState().seedFirstTimeTrainingSlot()
    useTrainingStore.getState().startObserving(SEED_SLOT_ID)
  })

  it('commitGraduation returns false when the slot is not graduated', () => {
    // Slot is still 'observing', no live context, no graduation
    const ok = useTrainingStore.getState().commitGraduation(SEED_SLOT_ID)
    expect(ok).toBe(false)
  })

  it('commitGraduation returns false when the slot does not exist', () => {
    const ok = useTrainingStore.getState().commitGraduation('bogus-slot')
    expect(ok).toBe(false)
  })

  it('manually-triggered graduation commits to the roster and clears live', () => {
    // Start a run, then force the slot into the graduated state with a
    // known best-weights vector so we can test the commit path in
    // isolation. This is the same transition tick() makes automatically
    // when fitness crosses the threshold.
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    const testWeights = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT }, (_, i) => (i - 68) / 200)
    useTrainingStore.setState((state) => {
      const slot = state.slots[SEED_SLOT_ID]
      const liveCtx = state.liveSlots[SEED_SLOT_ID]
      if (!slot || !liveCtx) return state
      return {
        slots: {
          ...state.slots,
          [SEED_SLOT_ID]: {
            ...slot,
            phase: 'graduated',
            bestFitness: 0.8,
          },
        },
        liveSlots: {
          ...state.liveSlots,
          [SEED_SLOT_ID]: {
            ...liveCtx,
            bestWeights: testWeights,
          },
        },
      }
    })

    const ok = useTrainingStore.getState().commitGraduation(SEED_SLOT_ID)
    expect(ok).toBe(true)

    // Roster should have the trained brain now
    const ace = useRosterStore.getState().soldiers.find((s) => s.id === SEED_SOLDIER_ID)
    expect(ace?.trainedBrains?.rocketLauncher).toEqual(testWeights)

    // Live context cleared, slot back to observing
    const { liveSlots, slots } = useTrainingStore.getState()
    expect(liveSlots[SEED_SLOT_ID]).toBeUndefined()
    expect(slots[SEED_SLOT_ID]?.phase).toBe('observing')
    expect(slots[SEED_SLOT_ID]?.generation).toBe(0)
    expect(slots[SEED_SLOT_ID]?.bestFitness).toBe(0)
  })

  it('commitGraduation fires training_committed_to_roster analytics', () => {
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    useTrainingStore.setState((state) => {
      const slot = state.slots[SEED_SLOT_ID]
      if (!slot || !state.liveSlots[SEED_SLOT_ID]) return state
      return {
        slots: { ...state.slots, [SEED_SLOT_ID]: { ...slot, phase: 'graduated' as const, bestFitness: 0.75 } },
      }
    })
    vi.mocked(track).mockClear()
    useTrainingStore.getState().commitGraduation(SEED_SLOT_ID)
    expect(track).toHaveBeenCalledWith('training_committed_to_roster', {
      slotId: SEED_SLOT_ID,
      soldierId: SEED_SOLDIER_ID,
      weapon: 'rocketLauncher',
      bestFitness: 0.75,
    })
  })

  it('does not mutate the roster by reference (defensive copy on commit)', () => {
    useTrainingStore.getState().startTraining(SEED_SLOT_ID)
    const committedWeights = Array.from({ length: NULL_BRAIN_WEIGHT_COUNT }, () => 0.5)
    useTrainingStore.setState((state) => {
      const slot = state.slots[SEED_SLOT_ID]
      const liveCtx = state.liveSlots[SEED_SLOT_ID]
      if (!slot || !liveCtx) return state
      return {
        slots: { ...state.slots, [SEED_SLOT_ID]: { ...slot, phase: 'graduated' as const } },
        liveSlots: { ...state.liveSlots, [SEED_SLOT_ID]: { ...liveCtx, bestWeights: committedWeights } },
      }
    })
    useTrainingStore.getState().commitGraduation(SEED_SLOT_ID)

    // Mutate the "live" weights after commit — the roster must NOT change.
    committedWeights[0] = 999
    const ace = useRosterStore.getState().soldiers.find((s) => s.id === SEED_SOLDIER_ID)
    expect(ace?.trainedBrains?.rocketLauncher?.[0]).toBe(0.5)
  })
})
