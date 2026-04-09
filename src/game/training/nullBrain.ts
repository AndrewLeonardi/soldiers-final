/**
 * The null brain — the canonical "dumb soldier who does literally nothing."
 *
 * This module is the game-layer entry point for the zero-weighted neural
 * network primitive added to the engine in `src/engine/ml/neuralNet.ts`
 * as `NeuralNet.fromZeros()`. Every Phase 3+ consumer that needs a brain
 * for an untrained soldier reads through here, not through the engine
 * directly, so the game/engine module boundary stays clean and the
 * "statue" contract has a single canonical implementation.
 *
 * The null brain is load-bearing for the entire training spectacle:
 *
 *   - An untrained soldier is mechanically a statue. No fires, no
 *     movement, no kills, no hits. Every weapon scenario's fire trigger
 *     is gated on `outputs[2] > 0`, and `tanh(0) === 0`, so a network
 *     with all-zero weights produces all-zero outputs and can never
 *     fire or steer. This is the "before" state of the before/after
 *     training spectacle — you cannot misread a statue as "mostly
 *     trained."
 *
 *   - It is also the runtime default for every soldier in the game who
 *     doesn't have a trained brain for their equipped weapon, via
 *     `getEffectiveBrain(soldier, weapon)`. Phase 4 combat sims, Phase
 *     3c simultaneous trainees, any future rival AI — all of them call
 *     through `getEffectiveBrain` and get the null brain as a fallback.
 *     Untrained soldiers are useless in a fight. The player learns to
 *     train them. That entire flywheel depends on this module.
 *
 * Shape constants are frozen at 6→12→4 to match the existing weapon
 * scenarios. If we ever change the network topology, this file and
 * every scenario need to be updated in lockstep — see the audit trail
 * in plan.md's Phase 3a section.
 */
import { NeuralNet } from '@engine/ml/neuralNet'

/** Input layer size used by every weapon scenario. */
export const NN_INPUT_SIZE = 6

/** Hidden layer size used by every weapon scenario. */
export const NN_HIDDEN_SIZE = 12

/** Output layer size used by every weapon scenario. */
export const NN_OUTPUT_SIZE = 4

/**
 * Total weight count for a 6→12→4 network. Matches
 * `NeuralNet.weightCount(6, 12, 4) === 136`. Hardcoded as a constant so
 * callers can allocate arrays without instantiating a `NeuralNet`.
 */
export const NULL_BRAIN_WEIGHT_COUNT = 136

/**
 * A frozen, readonly array of 136 zeros. This is the canonical weight
 * vector for an untrained soldier. Any consumer that wants to persist
 * "this soldier has a null brain" or wants to compare a brain to the
 * null brain reads through this constant — not by constructing a new
 * zero array at the call site, which would risk drift if we ever change
 * the topology.
 *
 * The array is frozen so a caller who accidentally tries to mutate it
 * (e.g. by using it as a scratch buffer) crashes loudly in strict mode
 * instead of silently corrupting every future null-brain read. We
 * `freeze` at module load; the returned reference is shared across all
 * consumers.
 */
export const NULL_BRAIN_WEIGHTS: readonly number[] = Object.freeze(
  new Array<number>(NULL_BRAIN_WEIGHT_COUNT).fill(0),
)

/**
 * Construct a fresh `NeuralNet` instance with all weights set to zero.
 * Thin wrapper over `NeuralNet.fromZeros(6, 12, 4)` — the thin wrap
 * exists so callers inside `src/game/*` don't need to know the network
 * dimensions, and so a future topology change touches one file instead
 * of every training consumer.
 *
 * Always returns a fresh instance. Callers get their own mutable
 * `NeuralNet` object; mutating the returned instance does not affect
 * any other consumer.
 */
export function createNullBrain(): NeuralNet {
  return NeuralNet.fromZeros(NN_INPUT_SIZE, NN_HIDDEN_SIZE, NN_OUTPUT_SIZE)
}
