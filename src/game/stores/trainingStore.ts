/**
 * useTrainingStore — the /game-concept training surface.
 *
 * Owns every piece of state needed for the Phase 3a "zero-to-one
 * spectacle" and nothing more. Scoped deliberately to what 3a ships;
 * 3b adds passive ticks, 3c adds simultaneous trainees and compute
 * costs, 3d adds schema migrations for injury/quirk fields on the
 * roster side. This store is the spine those later phases plug into.
 *
 * ─ State shape ─
 *
 *   `slots` — a keyed map of `TrainingSlot`, persisted. 3a seeds a
 *   single slot pointing at the existing PVT ACE recruit (soldier-2
 *   in STARTER_ROSTER) with `weapon: 'rocketLauncher'`. The slot
 *   holds identity data (which soldier, which weapon) + session
 *   stats (phase, generation, bestFitness, fitnessHistory) that get
 *   reset on reload via partialize.
 *
 *   `observing` — which slot the player is currently zoomed into, or
 *   null. Session-only.
 *
 *   `simSpeed` — 1x / 10x / 50x toggle for the GA loop. Per the plan,
 *   50x is the current perf-safe cap; we can lift to 100x after step
 *   11's perf budget measurement. Session-only.
 *
 *   `live` — the non-persisted GA evaluation context. Holds the
 *   population, current-individual index, fitness-so-far, the live
 *   simulation state, config, GA instance, and brain. Null when no
 *   slot is currently running. Session-only, nuked on reload.
 *
 * ─ Why a new store, not an extension of src/stores/trainingStore.ts ─
 *
 * The existing `src/stores/trainingStore.ts` is tightly coupled to the
 * battle-phase flow at /play: it calls `setPhase('training')`, graduates
 * into the loadout screen, assumes a single global training session.
 * All of that retires with /play at the end of Phase 4. We do not
 * extend it. We write a fresh, purpose-built slice that shares only
 * the underlying ML engine (`src/engine/ml/*`) and nothing else.
 *
 * ─ Multi-trainee readiness ─
 *
 * 3a only ever seeds one slot, but every iteration site in this file
 * reads from the `slots` map and every action takes a `slotId`. Dropping
 * simultaneous trainees in 3c is a seeding change, not a refactor.
 *
 * ─ Persistence ─
 *
 * `partialize` exports `slots` with every session-mutable field reset
 * (phase → 'idle', generation → 0, bestFitness → 0, fitnessHistory →
 * []). The slot's identity (`slotId`, `soldierId`, `weapon`) is
 * preserved. `observing`, `simSpeed`, and `live` are NOT persisted —
 * reloading always drops the player back in the default base view
 * with no observation active. This matches the "no mid-run
 * persistence for 3a" decision (plan.md, 2026-04-09). Passive ticks
 * and wall-clock catch-up land in 3b.
 *
 * The persisted roster entry (`rosterStore.soldiers[id].trainedBrains`)
 * IS the source of truth for "what brain does this soldier have." The
 * training store's slot never holds the commit directly — it hands
 * `bestWeights` off to the roster via `commitGraduation()` and then
 * clears its own live context. This keeps the training surface
 * orthogonal to roster state and prevents a "two sources of truth"
 * divergence.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WeaponType, SoldierProfile } from '@config/types'
import { WEAPON_TRAINING } from '@config/roster'
import { NeuralNet } from '@engine/ml/neuralNet'
import { GeneticAlgorithm } from '@engine/ml/geneticAlgorithm'
import {
  initSim,
  simTick,
  scoreFitness,
  type SimState,
  type SimConfig,
} from '@engine/ml/simulationRunner'
import { useRosterStore } from '@stores/rosterStore'
import { track } from '@game/analytics/events'
import {
  NN_INPUT_SIZE,
  NN_HIDDEN_SIZE,
  NN_OUTPUT_SIZE,
  NULL_BRAIN_WEIGHT_COUNT,
} from '@game/training/nullBrain'
import { getEffectiveBrain, isUntrained } from '@game/training/getEffectiveBrain'

// ── Types ────────────────────────────────────────────────

/** Lifecycle of a single training slot. */
export type TrainingPhase = 'idle' | 'observing' | 'running' | 'graduated'

/** Supported observation speed multipliers. Capped at 50 per plan.md perf notes. */
export type TrainingSpeed = 1 | 10 | 50

/**
 * A training slot — the persistent identity of "this soldier is being
 * trained on this weapon." 3a seeds exactly one slot for PVT ACE +
 * rocketLauncher; 3c drops additional slots without touching this file.
 */
export interface TrainingSlot {
  slotId: string
  soldierId: string
  weapon: WeaponType
  phase: TrainingPhase
  generation: number
  bestFitness: number
  /** Last ~20 generation best fitnesses for the sparkline. Session-only, reset on reload. */
  fitnessHistory: number[]
}

/**
 * Live, non-persisted GA evaluation context. Holds everything needed
 * to advance the genetic algorithm from a tick function. Held in the
 * store so a React component can pull it via a selector; never written
 * to localStorage (see `partialize` below). Null when no slot is
 * running or observing.
 */
export interface LiveTrainingContext {
  slotId: string
  ga: GeneticAlgorithm
  population: number[][]
  currentIndividual: number
  fitnesses: number[]
  brain: NeuralNet
  simState: SimState
  simConfig: SimConfig
  /** The best weight vector discovered so far across all generations. */
  bestWeights: number[]
}

// ── Store interface ──────────────────────────────────────

interface TrainingState {
  slots: Record<string, TrainingSlot>
  observing: string | null
  simSpeed: TrainingSpeed
  live: LiveTrainingContext | null

  // ── Seeding ──
  /** Idempotent: seeds the Phase 3a default slot if no slots exist yet. */
  seedFirstTimeTrainingSlot: () => void

  // ── Observation ──
  startObserving: (slotId: string) => void
  stopObserving: () => void

  // ── Training run ──
  startTraining: (slotId: string) => boolean
  stopTraining: (slotId: string) => void
  setSpeed: (speed: TrainingSpeed) => void

  // ── GA tick (driven by a useFrame in the scene) ──
  tick: (dt: number) => void

  // ── Graduation ──
  /** Called from the cutscene's "Save & Continue" button. Commits the brain to the roster. */
  commitGraduation: (slotId: string) => boolean
}

// ── Constants ────────────────────────────────────────────

/** Fixed 60fps sim tick. Matches the GA's assumption throughout the engine. */
const SIM_DT = 1 / 60

/** Soft cap on fitness history length (so the sparkline doesn't grow unbounded). */
const FITNESS_HISTORY_CAP = 30

/**
 * The Phase 3a default slot. Points at the existing PVT ACE recruit
 * already present in `STARTER_ROSTER` with an empty `trainedBrains`
 * map, so the first `getEffectiveBrain` read returns the null brain
 * and the player sees a statue on first load. Matches plan.md decision
 * 1 ("one trainee, keep architecture multi-trainee-ready").
 */
const PHASE_3A_SEED_SLOT: Readonly<TrainingSlot> = Object.freeze({
  slotId: 'slot-rocket-ace',
  soldierId: 'soldier-2',
  weapon: 'rocketLauncher',
  phase: 'idle',
  generation: 0,
  bestFitness: 0,
  fitnessHistory: Object.freeze([]) as readonly number[] as number[],
})

// ── Helpers ──────────────────────────────────────────────

/**
 * Look up a soldier on the live roster store. Returns `undefined` if
 * the soldier was removed (e.g. deleted across a schema migration).
 */
function lookupSoldier(soldierId: string): SoldierProfile | undefined {
  const roster = useRosterStore.getState().soldiers
  return roster.find((s) => s.id === soldierId)
}

/**
 * Reset a slot's session fields to pristine values. Preserves identity
 * (slotId / soldierId / weapon) and the `phase`. Used when graduation
 * commits or a training run stops.
 */
function resetSessionFields(slot: TrainingSlot): TrainingSlot {
  return {
    ...slot,
    generation: 0,
    bestFitness: 0,
    fitnessHistory: [],
  }
}

// ── Store ────────────────────────────────────────────────

export const useTrainingStore = create<TrainingState>()(
  persist(
    (set, get) => ({
      slots: {},
      observing: null,
      simSpeed: 10,
      live: null,

      // ── Seeding ────────────────────────────────────────

      seedFirstTimeTrainingSlot: () => {
        const { slots } = get()
        if (slots[PHASE_3A_SEED_SLOT.slotId]) return
        const slot: TrainingSlot = {
          slotId: PHASE_3A_SEED_SLOT.slotId,
          soldierId: PHASE_3A_SEED_SLOT.soldierId,
          weapon: PHASE_3A_SEED_SLOT.weapon,
          phase: 'idle',
          generation: 0,
          bestFitness: 0,
          fitnessHistory: [],
        }
        set({ slots: { ...slots, [slot.slotId]: slot } })
        track('training_slot_seeded', {
          slotId: slot.slotId,
          soldierId: slot.soldierId,
          weapon: slot.weapon,
        })
      },

      // ── Observation ────────────────────────────────────

      startObserving: (slotId) => {
        const { slots } = get()
        const slot = slots[slotId]
        if (!slot) return
        set({
          observing: slotId,
          slots: {
            ...slots,
            [slotId]: { ...slot, phase: slot.phase === 'running' ? 'running' : 'observing' },
          },
        })
        track('training_observe_started', {
          slotId,
          soldierId: slot.soldierId,
          weapon: slot.weapon,
        })
      },

      stopObserving: () => {
        const { observing, slots, live } = get()
        if (observing === null) return
        const slot = slots[observing]
        // If a run is in progress, stopping observation aborts the run.
        // Players who want to keep training should leave the base view
        // alone, not exit observation.
        const nextLive = slot && live?.slotId === slot.slotId ? null : live
        const nextSlots: Record<string, TrainingSlot> = { ...slots }
        if (slot) {
          nextSlots[slot.slotId] = {
            ...resetSessionFields(slot),
            phase: 'idle',
          }
        }
        set({ observing: null, slots: nextSlots, live: nextLive })
        track('training_observe_stopped', { slotId: observing })
      },

      // ── Training run ───────────────────────────────────

      startTraining: (slotId) => {
        const { slots } = get()
        const slot = slots[slotId]
        if (!slot) return false

        const config = WEAPON_TRAINING[slot.weapon]
        if (!config) return false

        const soldier = lookupSoldier(slot.soldierId)
        if (!soldier) return false

        // Initialize GA + sim for this run. We always start with a
        // fresh GA instance — no cross-run contamination. Seeding
        // depends on whether the soldier already has a trained brain:
        //   - Untrained (null brain) → fully random population.
        //     This is critical for the spectacle: if we seeded from
        //     null weights, gen 0 would be near-statue behavior and
        //     the player would tap TRAIN and see nothing change for
        //     several seconds. Random init makes the very first frame
        //     after TRAIN visibly chaotic — "he immediately starts
        //     trying, poorly." That contrast is the whole emotional
        //     beat of the spectacle.
        //   - Already trained → seeded mutation of their existing
        //     brain, so re-training refines an existing skill rather
        //     than starting from scratch.
        const ga = new GeneticAlgorithm(30, 6, 0.2, 0.6, 0.35)
        const seeded = !isUntrained(soldier, slot.weapon)
        const population = seeded
          ? ga.initSeededPopulation(NULL_BRAIN_WEIGHT_COUNT, getEffectiveBrain(soldier, slot.weapon))
          : ga.initPopulation(NULL_BRAIN_WEIGHT_COUNT)

        const simConfig: SimConfig = {
          weaponType: slot.weapon,
          simDuration: config.simDuration,
        }
        const simState = initSim(simConfig)

        const brain = new NeuralNet(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)
        const firstIndividual = population[0]
        if (!firstIndividual) return false
        brain.setWeights(firstIndividual)

        const live: LiveTrainingContext = {
          slotId,
          ga,
          population,
          currentIndividual: 0,
          fitnesses: [],
          brain,
          simState,
          simConfig,
          bestWeights: [...firstIndividual],
        }

        set({
          live,
          slots: {
            ...slots,
            [slotId]: {
              ...slot,
              phase: 'running',
              generation: 0,
              bestFitness: 0,
              fitnessHistory: [],
            },
          },
        })
        track('training_run_started', {
          slotId,
          weapon: slot.weapon,
          seeded,
        })
        return true
      },

      stopTraining: (slotId) => {
        const { slots, live } = get()
        const slot = slots[slotId]
        if (!slot) return
        const nextLive = live?.slotId === slotId ? null : live
        set({
          live: nextLive,
          slots: {
            ...slots,
            [slotId]: {
              ...resetSessionFields(slot),
              phase: 'observing',
            },
          },
        })
      },

      setSpeed: (speed) => {
        if (get().simSpeed === speed) return
        set({ simSpeed: speed })
        const observing = get().observing
        if (observing !== null) {
          track('training_speed_changed', { slotId: observing, speed })
        }
      },

      // ── GA tick (driven by useFrame) ──────────────────

      tick: (_dt) => {
        const { live, slots, simSpeed } = get()
        if (!live) return
        const slot = slots[live.slotId]
        if (!slot || slot.phase !== 'running') return

        const config = WEAPON_TRAINING[slot.weapon]
        if (!config) return

        // Advance the GA loop for this frame. At 1x we do 1 tick per
        // frame (60fps sim time matches real time); at 10x/50x we
        // run more ticks per frame to accelerate training while
        // keeping the display sim (step 4) readable.
        //
        // Note: the old /play TrainingScene uses the same pattern.
        // We deliberately cap stepsPerFrame at simSpeed (not dt-based)
        // so frame stutters don't cause variable-length generations.
        const stepsPerFrame = simSpeed
        let localLive = live
        let generation = slot.generation
        let bestFitness = slot.bestFitness
        let fitnessHistory = slot.fitnessHistory
        let phaseChangedToGraduated = false
        let newestGenerationBest = bestFitness

        for (let step = 0; step < stepsPerFrame; step++) {
          simTick(localLive.simState, localLive.brain, SIM_DT, localLive.simConfig)

          if (localLive.simState.elapsed < config.simDuration) continue

          // Individual evaluation finished — score it.
          const individualFitness = scoreFitness(localLive.simState, localLive.simConfig)
          const nextFitnesses = [...localLive.fitnesses, individualFitness]
          const nextIndividualIdx = localLive.currentIndividual + 1

          if (nextIndividualIdx < localLive.ga.populationSize) {
            // Move on to next individual in this generation.
            const nextWeights = localLive.population[nextIndividualIdx]
            if (!nextWeights) break
            const nextBrain = new NeuralNet(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)
            nextBrain.setWeights(nextWeights)
            const nextSimState = initSim(localLive.simConfig)
            localLive = {
              ...localLive,
              currentIndividual: nextIndividualIdx,
              fitnesses: nextFitnesses,
              brain: nextBrain,
              simState: nextSimState,
            }
          } else {
            // Full generation complete — evolve.
            let genBestFitness = -Infinity
            let genBestIndex = 0
            for (let i = 0; i < nextFitnesses.length; i++) {
              const f = nextFitnesses[i] ?? -Infinity
              if (f > genBestFitness) {
                genBestFitness = f
                genBestIndex = i
              }
            }
            const genBestWeights = localLive.population[genBestIndex]
            const nextBestWeights =
              genBestFitness > bestFitness && genBestWeights
                ? [...genBestWeights]
                : localLive.bestWeights
            newestGenerationBest = Math.max(bestFitness, genBestFitness)

            const nextPopulation = localLive.ga.evolve(
              localLive.population,
              nextFitnesses,
              generation,
            )
            generation += 1
            bestFitness = newestGenerationBest
            fitnessHistory = [...fitnessHistory, newestGenerationBest].slice(-FITNESS_HISTORY_CAP)

            // Reset to first individual of next generation.
            const firstOfNextGen = nextPopulation[0]
            if (!firstOfNextGen) break
            const nextBrain = new NeuralNet(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)
            nextBrain.setWeights(firstOfNextGen)
            const nextSimState = initSim(localLive.simConfig)
            localLive = {
              ...localLive,
              population: nextPopulation,
              currentIndividual: 0,
              fitnesses: [],
              brain: nextBrain,
              simState: nextSimState,
              bestWeights: nextBestWeights,
            }

            track('training_generation_evolved', {
              slotId: slot.slotId,
              generation,
              bestFitness,
            })

            // Check graduation threshold. Once the best fitness in
            // this generation clears the weapon's threshold, we're
            // done — the player gets the cutscene on the next frame.
            if (bestFitness >= config.fitnessThreshold) {
              phaseChangedToGraduated = true
              break
            }
          }
        }

        const nextSlot: TrainingSlot = {
          ...slot,
          phase: phaseChangedToGraduated ? 'graduated' : 'running',
          generation,
          bestFitness,
          fitnessHistory,
        }

        set({
          live: localLive,
          slots: { ...slots, [slot.slotId]: nextSlot },
        })

        if (phaseChangedToGraduated) {
          track('training_graduated', {
            slotId: slot.slotId,
            weapon: slot.weapon,
            generation,
            bestFitness,
          })
        }
      },

      // ── Graduation ─────────────────────────────────────

      commitGraduation: (slotId) => {
        const { slots, live } = get()
        const slot = slots[slotId]
        if (!slot || slot.phase !== 'graduated' || !live || live.slotId !== slotId) {
          return false
        }

        const soldier = lookupSoldier(slot.soldierId)
        if (!soldier) return false

        // Write the best weights to the roster. This is the single
        // point where a training run's output leaves the training
        // store and becomes a persisted fact about the soldier. After
        // this commit, every future `getEffectiveBrain(soldier, weapon)`
        // read returns the trained brain instead of the null brain,
        // and the soldier stops being a statue forever.
        const weightsToCommit = [...live.bestWeights]
        useRosterStore.setState((state) => {
          const nextSoldiers = state.soldiers.map((s) => {
            if (s.id !== soldier.id) return s
            return {
              ...s,
              trainedBrains: {
                ...(s.trainedBrains ?? {}),
                [slot.weapon]: weightsToCommit,
              },
            }
          })
          return { soldiers: nextSoldiers }
        })

        // Reset the slot back to observing with cleared session
        // fields — the camera stays zoomed in (observing !== null)
        // so the player can see their newly-trained soldier in
        // action on the very next frame via the render layer's
        // display sim.
        set({
          live: null,
          slots: {
            ...slots,
            [slotId]: {
              ...resetSessionFields(slot),
              phase: 'observing',
            },
          },
        })

        track('training_committed_to_roster', {
          slotId,
          soldierId: soldier.id,
          weapon: slot.weapon,
          bestFitness: slot.bestFitness,
        })
        return true
      },
    }),
    {
      // Distinct key from the old `/play` trainingStore (which uses
      // `toy-soldiers-training`). Both stores exist in parallel until
      // `/play` retires at the end of Phase 4; sharing a localStorage
      // key would trample the other store's schema on every rehydrate
      // and fire `migrate` warnings. The `-game-concept` suffix
      // guarantees isolation.
      name: 'toy-soldiers-training-game-concept',
      version: 1,
      // Only persist slot identity. Every session-mutable field is
      // reset on rehydrate so the player never lands mid-run on
      // reload. `observing`, `simSpeed`, and `live` are dropped
      // entirely because they're session-only.
      partialize: (state) => ({
        slots: Object.fromEntries(
          Object.entries(state.slots).map(([k, slot]) => [
            k,
            {
              slotId: slot.slotId,
              soldierId: slot.soldierId,
              weapon: slot.weapon,
              phase: 'idle' as TrainingPhase,
              generation: 0,
              bestFitness: 0,
              fitnessHistory: [],
            },
          ]),
        ),
      }),
      migrate: (persisted, version) => {
        if (version < 1 || !persisted) {
          return { slots: {} }
        }
        return persisted as { slots: Record<string, TrainingSlot> }
      },
    },
  ),
)

// ── Dev-only window exposure ─────────────────────────────
//
// Mirrors the `window.__events` analytics hook in `events.ts`. Lets
// Andrew poke at the store from browser devtools to hand-verify the
// training lifecycle before step 4/5 lands the visible spectacle. Same
// discipline: dev-gated, not an API, do not rely on in runtime code.
//
// Usage:
//   window.__training.getState()
//   window.__training.actions.seedFirstTimeTrainingSlot()
//   window.__training.actions.startObserving('slot-rocket-ace')
//   window.__training.actions.startTraining('slot-rocket-ace')
//   for (let i = 0; i < 500; i++) window.__training.actions.tick(1/60)
//   window.__training.getState().slots['slot-rocket-ace']
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __training?: unknown }).__training = {
    getState: () => useTrainingStore.getState(),
    actions: {
      seedFirstTimeTrainingSlot: () => useTrainingStore.getState().seedFirstTimeTrainingSlot(),
      startObserving: (slotId: string) => useTrainingStore.getState().startObserving(slotId),
      stopObserving: () => useTrainingStore.getState().stopObserving(),
      startTraining: (slotId: string) => useTrainingStore.getState().startTraining(slotId),
      stopTraining: (slotId: string) => useTrainingStore.getState().stopTraining(slotId),
      setSpeed: (speed: TrainingSpeed) => useTrainingStore.getState().setSpeed(speed),
      tick: (dt: number) => useTrainingStore.getState().tick(dt),
      commitGraduation: (slotId: string) => useTrainingStore.getState().commitGraduation(slotId),
    },
  }
}
