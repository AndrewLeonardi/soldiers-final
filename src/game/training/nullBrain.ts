/**
 * The null brain — the canonical "dumb soldier who does literally nothing."
 *
 * Sprint 7: Universal topology [10, 12, 6] = 210 weights.
 * All weapons share the same shape. The null brain produces all-zero
 * outputs via tanh(0)=0, so untrained soldiers don't fire or move.
 * The fire gate is outputs[3] > 0, which a zero-weight network never
 * triggers — preserving the "statue" contract from earlier sprints.
 */
import { NeuralNet } from '@engine/ml/neuralNet'

/** Universal input layer size (10 observation signals). */
export const NN_INPUT_SIZE = 10

/** Hidden layer size. */
export const NN_HIDDEN_SIZE = 12

/** Universal output layer size (6 action signals). */
export const NN_OUTPUT_SIZE = 6

/**
 * Total weight count for a 10→12→6 network.
 * `NeuralNet.weightCount(10, 12, 6) === 210`.
 */
export const NULL_BRAIN_WEIGHT_COUNT = 210

/**
 * A frozen, readonly array of 100 zeros. This is the canonical weight
 * vector for an untrained soldier.
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
