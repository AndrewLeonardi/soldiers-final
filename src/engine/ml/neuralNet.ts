/**
 * Hand-rolled feedforward neural network.
 * No dependencies — just math.
 *
 * Architecture: inputs → hidden (tanh) → outputs (tanh)
 * For 6→12→4: (6*12+12) + (12*4+4) = 136 weights total
 *
 * The default-constructed network starts with a Float64Array of zeros
 * (JS spec guarantee). A zero-weighted network is the "null brain" used
 * for untrained soldiers: with all weights and biases at 0, every layer
 * sum is 0, `tanh(0) === 0`, and `forward()` returns all zeros for every
 * input. Combined with scenarios that gate firing on `output[2] > 0`, a
 * null-brain soldier literally does nothing — the visual anchor for the
 * Phase 3 training spectacle ("dumb soldier stands still"). Use the
 * `NeuralNet.fromZeros()` factory when you want this intent to be
 * explicit at the call site; never call `.randomize()` on a network you
 * want to be a statue.
 */

export class NeuralNet {
  inputSize: number
  hiddenSize: number
  outputSize: number
  weights: Float64Array

  constructor(inputSize: number, hiddenSize: number, outputSize: number) {
    this.inputSize = inputSize
    this.hiddenSize = hiddenSize
    this.outputSize = outputSize
    const total = NeuralNet.weightCount(inputSize, hiddenSize, outputSize)
    this.weights = new Float64Array(total)
  }

  static weightCount(input: number, hidden: number, output: number): number {
    return (input * hidden + hidden) + (hidden * output + output)
  }

  /**
   * Construct a zero-weighted "null brain." Every weight and bias is
   * explicitly set to 0, so `forward()` returns all zeros regardless of
   * input. This is the default state for every untrained soldier in the
   * game: no firing, no steering, no fitness. It is the "before" side of
   * the training spectacle. A soldier whose equipped weapon has no
   * trained brain on their roster entry reads through this factory.
   *
   * The plain constructor already zero-initializes (via `Float64Array`),
   * but this factory is load-bearing for intent: when a caller writes
   * `NeuralNet.fromZeros(6, 12, 4)` the reader knows "this is the null
   * brain, the untrained state, on purpose." Do not remove in favor of
   * the bare constructor.
   */
  static fromZeros(inputSize: number, hiddenSize: number, outputSize: number): NeuralNet {
    const nn = new NeuralNet(inputSize, hiddenSize, outputSize)
    // Float64Array is already zero-initialized by spec, but we fill
    // explicitly so a future refactor of the constructor (e.g. adding
    // default randomization) can never silently break the null-brain
    // contract.
    nn.weights.fill(0)
    return nn
  }

  randomize(): void {
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = Math.random() * 2 - 1
    }
  }

  setWeights(w: number[]): void {
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] = w[i] ?? 0
    }
  }

  getWeights(): number[] {
    return Array.from(this.weights)
  }

  forward(inputs: number[]): number[] {
    const { inputSize, hiddenSize, outputSize, weights } = this

    // The `?? 0` fallbacks on indexed reads are load-bearing for strict
    // `noUncheckedIndexedAccess` only — in practice every offset here
    // is guaranteed in-bounds because we iterate with sizes that match
    // the weight layout exactly. A short-input array or a truncated
    // weight array cleanly falls back to zero contribution instead of
    // producing NaN via undefined arithmetic.

    // Layer 1: input → hidden
    let offset = 0
    const hidden = new Array<number>(hiddenSize)
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0
      for (let i = 0; i < inputSize; i++) {
        sum += (inputs[i] ?? 0) * (weights[offset++] ?? 0)
      }
      sum += weights[offset++] ?? 0 // bias
      hidden[h] = Math.tanh(sum)
    }

    // Layer 2: hidden → output
    const output = new Array<number>(outputSize)
    for (let o = 0; o < outputSize; o++) {
      let sum = 0
      for (let h = 0; h < hiddenSize; h++) {
        sum += (hidden[h] ?? 0) * (weights[offset++] ?? 0)
      }
      sum += weights[offset++] ?? 0 // bias
      output[o] = Math.tanh(sum)
    }

    return output
  }
}
